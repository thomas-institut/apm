/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import WitnessesPanel from '@/ReactAPM/Pages/MceComposer/WitnessesPanel/WitnessesPanel';

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
  default: ({validator, onConfirm}: {
    validator?: (text: string) => true | string,
    onConfirm?: (text: string) => void | Promise<void>
  }) => <div className={'editable-text-field-mock'}>
    {validator === undefined ? 'no-validator' : String(validator('NEW'))}
    <button type="button" className="editable-confirm-btn" onClick={() => onConfirm?.('NEW')}>Confirm</button>
  </div>
}));

vi.mock('@/ReactAPM/Components/NiceToggle/NiceToggle', () => ({
  default: ({isOn, onClick}: {isOn: boolean, onClick?: (newState: boolean) => void | Promise<void>}) =>
    <button type="button" className="nice-toggle-btn" onClick={() => onClick?.(!isOn)}>Toggle</button>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/WitnessesPanel/EditSiglaGroup', () => ({
  default: ({
              siglaGroup,
              siglaGroupIndex,
              onClickConfirm,
              onClickCancel
            }: {
    siglaGroup: {siglum: string, witnesses: number[]},
    siglaGroupIndex: number,
    onClickConfirm: (siglaGroupIndex: number, group: {siglum: string, witnesses: number[]}) => void | Promise<void>,
    onClickCancel: () => void
  }) => <div className={'edit-sigla-group-mock'}>
    <div className={'sigla-group-index'}>{siglaGroupIndex}</div>
    <div className={'sigla-group-siglum'}>{siglaGroup.siglum}</div>
    <button type="button" className="sigla-group-confirm-btn" onClick={() => onClickConfirm(siglaGroupIndex, {
      siglum: `${siglaGroup.siglum === '' ? 'new' : siglaGroup.siglum}-confirmed`,
      witnesses: [0]
    })}>Confirm Sigla Group</button>
    <button type="button" className="sigla-group-cancel-btn" onClick={onClickCancel}>Cancel Sigla Group</button>
  </div>
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
  it('opens add and edit sigla-group modal flows and confirms with expected callback payloads', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const onChangeSiglaGroup = vi.fn(() => true);

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
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
          onChangeSiglaGroup={onChangeSiglaGroup}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.add-sigla-group') as HTMLButtonElement).click();
    });

    expect(container.querySelector('.edit-sigla-group-mock')).not.toBeNull();
    expect(container.querySelector('.sigla-group-index')?.textContent).toBe('-1');
    expect(container.querySelector('.sigla-group-siglum')?.textContent).toBe('');

    await act(async () => {
      (container.querySelector('.sigla-group-confirm-btn') as HTMLButtonElement).click();
    });

    expect(onChangeSiglaGroup).toHaveBeenCalledWith(-1, {
      siglum: 'new-confirmed',
      witnesses: [0],
    });
    expect(container.querySelector('.edit-sigla-group-mock')).toBeNull();

    await act(async () => {
      (container.querySelector('.pencil-btn') as HTMLButtonElement).click();
    });

    expect(container.querySelector('.sigla-group-index')?.textContent).toBe('0');
    expect(container.querySelector('.sigla-group-siglum')?.textContent).toBe('G1');

    await act(async () => {
      (container.querySelector('.sigla-group-confirm-btn') as HTMLButtonElement).click();
    });

    expect(onChangeSiglaGroup).toHaveBeenCalledWith(0, {
      siglum: 'G1-confirmed',
      witnesses: [0],
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('shows no-witnesses branch when there are no witnesses', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WitnessesPanel
          witnesses={[]}
          siglaGroups={[]}
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
        />
      );
    });

    expect(container.querySelector('.witnesses-panel.no-edition')?.textContent).toContain('No witnesses defined');
    expect(container.querySelector('.add-sigla-group')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('passes witness siglum validation to EditableTextField', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const isSiglumValid = vi.fn((witnessIndex: number, siglum: string) => `invalid ${witnessIndex}:${siglum}`);

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
          siglaGroups={[]}
          isSiglumValid={isSiglumValid}
          isSiglaGroupValid={() => true}
        />
      );
    });

    expect(isSiglumValid).toHaveBeenCalledWith(0, 'NEW');
    expect(container.textContent).toContain('invalid 0:NEW');

    await act(async () => {
      root.unmount();
    });
  });

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
          isSiglumValid={() => true}
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
          isSiglumValid={() => true}
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

  it('does not execute another witness action while one action is pending', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    let resolveSiglumChange: (() => void) | null = null;
    const onChangeSiglum = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveSiglumChange = () => resolve(true);
    }));
    const onChangeIncludeInAutoMarginalFoliation = vi.fn(() => true);

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
          siglaGroups={[]}
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
          onChangeSiglum={onChangeSiglum}
          onChangeIncludeInAutoMarginalFoliation={onChangeIncludeInAutoMarginalFoliation}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.editable-confirm-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onChangeSiglum).toHaveBeenCalledOnce();

    await act(async () => {
      (container.querySelector('.nice-toggle-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onChangeIncludeInAutoMarginalFoliation).not.toHaveBeenCalled();

    await act(async () => {
      resolveSiglumChange?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      (container.querySelector('.nice-toggle-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onChangeIncludeInAutoMarginalFoliation).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
  });

  it('clears pending witness action when siglum change throws', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const onChangeSiglum = vi.fn().mockRejectedValue(new Error('Could not update siglum'));
    const onChangeIncludeInAutoMarginalFoliation = vi.fn(() => true);

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
          siglaGroups={[]}
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
          onChangeSiglum={onChangeSiglum}
          onChangeIncludeInAutoMarginalFoliation={onChangeIncludeInAutoMarginalFoliation}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.editable-confirm-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onChangeSiglum).toHaveBeenCalledOnce();

    await act(async () => {
      (container.querySelector('.nice-toggle-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onChangeIncludeInAutoMarginalFoliation).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
  });

  it('shows pending UI while siglum and marginal-foliation updates are in flight', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    let resolveSiglumChange: (() => void) | null = null;
    let resolveMarginalChange: (() => void) | null = null;
    const onChangeSiglum = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveSiglumChange = () => resolve(true);
    }));
    const onChangeIncludeInAutoMarginalFoliation = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveMarginalChange = () => resolve(true);
    }));

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
          siglaGroups={[]}
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
          onChangeSiglum={onChangeSiglum}
          onChangeIncludeInAutoMarginalFoliation={onChangeIncludeInAutoMarginalFoliation}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.editable-confirm-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('.editable-confirm-btn')).toBeNull();
    expect(container.querySelector('.spinner-border')).not.toBeNull();

    await act(async () => {
      resolveSiglumChange?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('.editable-confirm-btn')).not.toBeNull();

    await act(async () => {
      (container.querySelector('.nice-toggle-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('.nice-toggle-btn')).toBeNull();
    expect(container.querySelector('.spinner-border')).not.toBeNull();

    await act(async () => {
      resolveMarginalChange?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('.nice-toggle-btn')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('handles omitted delete and edit callbacks without crashing', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

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
          isSiglumValid={() => true}
          isSiglaGroupValid={() => true}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.add-sigla-group') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.edit-sigla-group-mock')).not.toBeNull();

    await act(async () => {
      (container.querySelector('.sigla-group-confirm-btn') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.edit-sigla-group-mock')).toBeNull();

    await act(async () => {
      (container.querySelector('.trash-btn') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.accept-btn')).not.toBeNull();

    await act(async () => {
      (container.querySelector('.accept-btn') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('.accept-btn')).not.toBeNull();

    await act(async () => {
      (container.querySelector('.cancel-btn') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.accept-btn')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
