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
  default: ({isOn, onTitle, offTitle, onClick}: {
    isOn: boolean,
    onTitle: string,
    offTitle: string,
    onClick?: (newState: boolean) => void | Promise<void>,
  }) => <button type="button" data-is-on={isOn} title={isOn ? onTitle : offTitle}
                 onClick={() => onClick?.(!isOn)}>Toggle</button>
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
          }
        ]}
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
    expect(rows[0].textContent).toContain('Witness C');
    expect(rows[1].textContent).toContain('Witness A');
    expect((rows[0].querySelector('[aria-label="Move Witness C up"]') as HTMLButtonElement).disabled).toBe(true);
    expect((rows[0].querySelector('[aria-label="Move Witness C down"]') as HTMLButtonElement).disabled).toBe(false);
    expect((rows[1].querySelector('[aria-label="Move Witness A up"]') as HTMLButtonElement).disabled).toBe(false);
    expect((rows[1].querySelector('[aria-label="Move Witness A down"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('[data-testid="sigla-groups"]')?.textContent).toBe('A,B,C');

    await act(async () => {
      (rows[0].querySelector('[aria-label="Move Witness C down"]') as HTMLButtonElement).click();
      (rows[0].querySelector('.confirm-siglum') as HTMLButtonElement).click();
      (rows[0].querySelector('[title="Click to include Witness C in the automatic critical apparatus"]') as HTMLButtonElement).click();
      (rows[0].querySelector('[title="Click to include Witness C in auto marginal foliation"]') as HTMLButtonElement).click();
    });

    expect(onMoveWitness).toHaveBeenCalledWith(2, 'down');
    expect(onChangeSiglum).toHaveBeenCalledWith(2, 'NEW');
    expect(isSiglumValid).toHaveBeenCalledWith(2, 'NEW');
    expect(onChangeExcludeFromAutoCriticalApparatus).toHaveBeenCalledWith(2, false);
    expect(onChangeIncludeInAutoMarginalFoliation).toHaveBeenCalledWith(2, true);

    await act(async () => root.unmount());
    container.remove();
  });
});