/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import WitnessesPanel from '@/ReactAPM/Pages/EditionComposer/WitnessesPanel/WitnessesPanel';

vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: ({text, validator, onConfirm}: {
    text: string,
    validator: (text: string) => true | string,
    onConfirm: (newText: string) => void,
  }) => <div data-testid="editable-siglum" data-text={text} data-valid={String(validator('NEW'))}>
    <button type="button" className="confirm-siglum" onClick={() => onConfirm('NEW')}>Update Siglum</button>
  </div>
}));

vi.mock('@/ReactAPM/Components/NiceToggle/NiceToggle', () => ({
  default: ({isOn, on = 'ON', off = 'OFF', onTitle, offTitle, onClick}: {
    isOn: boolean,
    on?: string,
    off?: string,
    onTitle: string,
    offTitle: string,
    onClick?: (newState: boolean) => void | Promise<void>,
  }) => <button type="button" data-is-on={isOn} title={isOn ? onTitle : offTitle}
                 onClick={() => onClick?.(!isOn)}>{isOn ? on : off}</button>
}));

vi.mock('@/ReactAPM/Components/SiglaGroupsPanel/SiglaGroupsPanel', () => ({
  default: ({sigla}: {sigla: string[]}) => <div data-testid="sigla-groups">{sigla.join(',')}</div>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('EditionComposer WitnessesPanel', () => {
  it('shows witnesses in supplied order and delegates row edits by CtData witness index', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const onMoveWitness = vi.fn(() => true);
    const onChangeSiglum = vi.fn(() => true);
    const onChangeExcludeFromAutoCriticalApparatus = vi.fn(() => true);
    const onChangeIncludeInAutoMarginalFoliation = vi.fn(() => true);
    const isSiglumValid = vi.fn(() => true as const);

    await act(async () => {
      root.render(<WitnessesPanel
        witnesses={[
          {
            witnessIndex: 2,
            siglum: 'C',
            title: 'Witness C',
            excludeFromAutoCriticalApparatus: true,
            includeInAutoMarginalFoliation: false,
          },
          {
            witnessIndex: 0,
            siglum: 'A',
            title: 'Witness A',
            excludeFromAutoCriticalApparatus: false,
            includeInAutoMarginalFoliation: true,
          },
          {
            witnessIndex: 1,
            siglum: 'B',
            title: 'Witness B',
            excludeFromAutoCriticalApparatus: false,
            includeInAutoMarginalFoliation: false,
          }
        ]}
        editionWitnessIndex={2}
        sigla={['A', 'B', 'C']}
        siglaGroups={[]}
        isSiglumValid={isSiglumValid}
        isSiglaGroupValid={() => true}
        onMoveWitness={onMoveWitness}
        onChangeSiglum={onChangeSiglum}
        onChangeExcludeFromAutoCriticalApparatus={onChangeExcludeFromAutoCriticalApparatus}
        onChangeIncludeInAutoMarginalFoliation={onChangeIncludeInAutoMarginalFoliation}
        onDeleteSiglaGroup={() => true}
        onChangeSiglaGroup={() => true}
      />);
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Witness A');
    expect(rows[1].textContent).toContain('Witness B');
    expect((rows[0].querySelector('[aria-label="Move Witness A up"]') as HTMLButtonElement).disabled).toBe(true);
    expect((rows[0].querySelector('[aria-label="Move Witness A down"]') as HTMLButtonElement).disabled).toBe(false);
    expect((rows[1].querySelector('[aria-label="Move Witness B up"]') as HTMLButtonElement).disabled).toBe(false);
    expect((rows[1].querySelector('[aria-label="Move Witness B down"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('[data-testid="sigla-groups"]')?.textContent).toBe('A,B,C');

    await act(async () => {
      (rows[0].querySelector('[aria-label="Move Witness A down"]') as HTMLButtonElement).click();
      (rows[0].querySelector('.confirm-siglum') as HTMLButtonElement).click();
      (rows[0].querySelector('[title="Click to exclude Witness A from the automatic critical apparatus"]') as HTMLButtonElement).click();
      (rows[0].querySelector('[title="Click to exclude Witness A from auto marginal foliation"]') as HTMLButtonElement).click();
    });

    expect(onMoveWitness).toHaveBeenCalledWith(0, 'down');
    expect(onChangeSiglum).toHaveBeenCalledWith(0, 'NEW');
    expect(isSiglumValid).toHaveBeenCalledWith(0, 'NEW');
    expect(onChangeExcludeFromAutoCriticalApparatus).toHaveBeenCalledWith(0, true);
    expect(onChangeIncludeInAutoMarginalFoliation).toHaveBeenCalledWith(0, false);

    await act(async () => root.unmount());
    container.remove();
  });

  it('omits the edition witness from the table', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<WitnessesPanel
        witnesses={[
          {witnessIndex: 2, siglum: 'C', title: 'Edition Witness', excludeFromAutoCriticalApparatus: false, includeInAutoMarginalFoliation: false},
          {witnessIndex: 0, siglum: 'A', title: 'Witness A', excludeFromAutoCriticalApparatus: false, includeInAutoMarginalFoliation: false},
          {witnessIndex: 1, siglum: 'B', title: 'Witness B', excludeFromAutoCriticalApparatus: true, includeInAutoMarginalFoliation: false}
        ]}
        editionWitnessIndex={2}
        sigla={['A', 'B', 'C']}
        siglaGroups={[]}
        isSiglumValid={() => true}
        isSiglaGroupValid={() => true}
        onMoveWitness={() => true}
        onChangeSiglum={() => true}
        onChangeExcludeFromAutoCriticalApparatus={() => true}
        onChangeIncludeInAutoMarginalFoliation={() => true}
        onDeleteSiglaGroup={() => true}
        onChangeSiglaGroup={() => true}
      />);
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(container.textContent).not.toContain('Edition Witness');
    expect(container.textContent).toContain('Crit. App');
    expect(container.textContent).not.toContain('Auto Crit. App.');
    expect(rows[0].textContent).toContain('Witness A');
    expect(rows[1].textContent).toContain('Witness B');
    expect(rows[0].textContent).toContain('AUTO');
    expect(rows[1].textContent).toContain('EXCLUDED');

    await act(async () => root.unmount());
    container.remove();
  });
});