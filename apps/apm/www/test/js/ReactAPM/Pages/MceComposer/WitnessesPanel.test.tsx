/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import WitnessesPanel from '@/ReactAPM/Pages/MceComposer/WitnessesPanel';

vi.mock('@/ReactAPM/Components/NiceTable/NiceTable', () => ({
  default: ({rows, columnDefs}: {rows: any[]; columnDefs: any[]}) => <div>
    {rows.map((row, rowIndex) => <div key={`row-${rowIndex}`}>
      {columnDefs.map((columnDef) => <div key={`${columnDef.key}-${rowIndex}`}>
        {columnDef.cellContent(row, rowIndex)}
      </div>)}
    </div>)}
  </div>
}));

vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: () => <div/>
}));

vi.mock('@/ReactAPM/Components/NiceToggle/NiceToggle', () => ({
  default: () => <div/>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/EditSiglaGroup', () => ({
  default: () => null
}));

vi.mock('@/ReactAPM/Components/ConfirmDialog', () => ({
  default: ({show, body, onAccept, onCancel}: {
    show: boolean,
    body: React.ReactNode,
    onAccept: () => void,
    onCancel?: () => void
  }) => {
    if (!show) {
      return null;
    }
    return <div>
      <div>{body}</div>
      <button type="button" className="accept-btn" onClick={onAccept}>Accept</button>
      <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
    </div>;
  }
}));

vi.mock('react-bootstrap-icons', () => {
  const Trash = ({onClick}: {onClick?: () => void}) => <button type={'button'} className={'trash-btn'}
                                                                onClick={onClick}>Delete</button>;
  const Pencil = ({onClick}: {onClick?: () => void}) => <button type={'button'} className={'pencil-btn'}
                                                                 onClick={onClick}>Edit</button>;
  return {
    Trash,
    Pencil,
  };
});

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('WitnessesPanel', () => {
  it('opens a confirmation dialog before deleting a sigla group and only deletes on accept', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const onDeleteSiglaGroup = vi.fn(() => true);

    await act(async () => {
      root.render(
        <WitnessesPanel
          witnesses={[
            {
              siglum: 'A',
              title: 'Witness A',
              includeInAutoMarginalFoliation: true,
            }
          ]}
          siglaGroups={[
            {
              siglum: 'G1',
              witnesses: [0],
            }
          ]}
          isSiglaGroupValid={() => true}
          onDeleteSiglaGroup={onDeleteSiglaGroup}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.trash-btn') as HTMLButtonElement).click();
    });

    expect(onDeleteSiglaGroup).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Are you sure you want to remove sigla group G1 => A from the edition?');

    await act(async () => {
      (container.querySelector('.accept-btn') as HTMLButtonElement).click();
    });

    expect(onDeleteSiglaGroup).toHaveBeenCalledOnce();
    expect(onDeleteSiglaGroup).toHaveBeenCalledWith(0);

    await act(async () => {
      root.unmount();
    });
  });

  it('does not delete a sigla group when confirmation is cancelled', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const onDeleteSiglaGroup = vi.fn(() => true);

    await act(async () => {
      root.render(
        <WitnessesPanel
          witnesses={[
            {
              siglum: 'A',
              title: 'Witness A',
              includeInAutoMarginalFoliation: true,
            }
          ]}
          siglaGroups={[
            {
              siglum: 'G1',
              witnesses: [0],
            }
          ]}
          isSiglaGroupValid={() => true}
          onDeleteSiglaGroup={onDeleteSiglaGroup}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.trash-btn') as HTMLButtonElement).click();
    });

    await act(async () => {
      (container.querySelector('.cancel-btn') as HTMLButtonElement).click();
    });

    expect(onDeleteSiglaGroup).not.toHaveBeenCalled();
    expect(container.querySelector('.accept-btn')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
