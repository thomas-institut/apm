/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {SiglaGroup} from '@/Edition/SiglaGroup';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import {ApparatusViewer} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusViewer';
import QuickSubEntryForm from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickSubEntryForm';
import {QuickEntryOperation} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buildApparatus(): Apparatus {
  const apparatus = new Apparatus();
  const entry = new ApparatusEntry();
  entry.from = 1;
  entry.to = 1;
  entry.mainTextWords = ['word'];
  ['one', 'two'].forEach((text, index) => {
    const subEntry = new ApparatusSubEntry();
    subEntry.type = 'variant';
    subEntry.source = 'auto';
    subEntry.fmtText = [{type: 'text', text}] as never;
    subEntry.witnessData = [new WitnessDataItem().setWitnessIndex(index).setHand(0)];
    subEntry.position = index;
    entry.subEntries.push(subEntry);
  });
  apparatus.entries.push(entry);
  return apparatus;
}

async function render(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return container;
}

function change(el: Element, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', {bubbles: true}));
}

describe('ApparatusViewer quick edit controls', () => {
  const baseProps = {
    lineNumberMap: null, useLineNumbers: false, sigla: ['A', 'B'], onHoverRange: () => undefined,
    selectedLemmaIndex: null, onSelectLemma: () => undefined
  };

  it('shows no controls unless editing is available', async () => {
    const container = await render(<ApparatusViewer {...baseProps} apparatus={buildApparatus()}/>);
    expect(container.querySelector('.sub-entry-controls')).toBeNull();
    expect(container.querySelector('.quick-add-sub-entry')).toBeNull();
  });

  it('emits toggle and move operations, without back arrow on the first and forward arrow on the last sub-entry', async () => {
    const onQuickEdit = vi.fn<(i: number, op: QuickEntryOperation) => Promise<true | string>>().mockResolvedValue(true);
    const container = await render(<ApparatusViewer {...baseProps} apparatus={buildApparatus()} canEdit
                                                    onQuickEdit={onQuickEdit}/>);
    const wrappers = container.querySelectorAll('.sub-entry-wrapper');
    expect(wrappers).toHaveLength(2);
    expect(wrappers[0].querySelector('.quick-move-backward')).toBeNull();
    expect(wrappers[0].querySelector('.quick-move-forward')).not.toBeNull();
    expect(wrappers[1].querySelector('.quick-move-forward')).toBeNull();
    expect(wrappers[0].querySelector('.quick-add-sub-entry')).toBeNull();
    expect(wrappers[1].querySelector('.quick-add-sub-entry')).not.toBeNull();

    await act(async () => {
      wrappers[1].querySelector<HTMLElement>('.quick-toggle')!.click();
    });
    expect(onQuickEdit).toHaveBeenLastCalledWith(0, {kind: 'toggleSubEntry', subEntryIndex: 1});
    await act(async () => {
      wrappers[0].querySelector<HTMLElement>('.quick-move-forward')!.click();
    });
    expect(onQuickEdit).toHaveBeenLastCalledWith(0, {kind: 'moveSubEntry', subEntryIndex: 0, direction: 'forward'});
  });

  it('adds a sub-entry through the quick form and rejects an identical one', async () => {
    const onQuickEdit = vi.fn<(i: number, op: QuickEntryOperation) => Promise<true | string>>().mockResolvedValue(true);
    const container = await render(<ApparatusViewer {...baseProps} apparatus={buildApparatus()} canEdit
                                                    onQuickEdit={onQuickEdit}/>);
    await act(async () => {
      container.querySelector<HTMLElement>('.quick-add-sub-entry')!.click();
    });
    const confirm = container.querySelector<HTMLButtonElement>('.quick-confirm')!;
    expect(confirm.disabled).toBe(true);

    await act(async () => change(container.querySelector('input[aria-label="Sub-entry text"]')!, 'one'));
    await act(async () => container.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    await act(async () => container.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[0].click());
    // same text and witness (A) as the first sub-entry
    expect(container.querySelector('.quick-form-message')?.textContent).toContain('Identical to an existing sub-entry');
    expect(container.querySelector<HTMLButtonElement>('.quick-confirm')!.disabled).toBe(true);

    await act(async () => change(container.querySelector('input[aria-label="Sub-entry text"]')!, 'three'));
    expect(container.querySelector<HTMLButtonElement>('.quick-confirm')!.disabled).toBe(false);
    await act(async () => container.querySelector<HTMLElement>('.quick-confirm')!.click());
    expect(onQuickEdit).toHaveBeenLastCalledWith(0, {
      kind: 'addSubEntry', subEntry: {type: 'variant', text: 'three', witnesses: [0]}
    });
    expect(container.querySelector('.quick-sub-entry-form')).toBeNull();
  });

  it('keeps the form open and shows the error when the edit is refused', async () => {
    const onQuickEdit = vi.fn().mockResolvedValue('Some error');
    const container = await render(<ApparatusViewer {...baseProps} apparatus={buildApparatus()} canEdit
                                                    onQuickEdit={onQuickEdit}/>);
    await act(async () => container.querySelector<HTMLElement>('.quick-add-sub-entry')!.click());
    await act(async () => change(container.querySelector('select[aria-label="Sub-entry type"]')!, 'omission'));
    await act(async () => container.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    await act(async () => container.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[1].click());
    await act(async () => container.querySelector<HTMLElement>('.quick-confirm')!.click());
    expect(container.querySelector('.quick-sub-entry-form')).not.toBeNull();
    expect(container.querySelector('.quick-edit-error')?.textContent).toBe('Some error');
  });

  it('hides the controls while the full entry editor is open', async () => {
    const container = await render(<ApparatusViewer {...baseProps} apparatus={buildApparatus()} canEdit
                                                    editingEntryIndex={0} onQuickEdit={vi.fn()}/>);
    expect(container.querySelector('.sub-entry-controls')).toBeNull();
  });
});

describe('QuickSubEntryForm', () => {
  it('selects all witnesses of a sigla group and shows partial selection', async () => {
    const onConfirm = vi.fn();
    const group = SiglaGroup.fromObject({siglum: 'Γ', witnesses: [0, 1]});
    const container = await render(<QuickSubEntryForm sigla={['A', 'B', 'C']} witnessOrder={[0, 1, 2]}
                                                      siglaGroups={[group]} targetEntry={null} lang="la"
                                                      onConfirm={onConfirm} onCancel={() => undefined}/>);
    await act(async () => container.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    const inputs = container.querySelectorAll<HTMLInputElement>('.quick-witness-item input');
    expect(inputs).toHaveLength(4);
    await act(async () => inputs[0].click());
    expect(inputs[3].indeterminate).toBe(true);
    await act(async () => inputs[3].click());
    expect(container.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[1].checked).toBe(true);
    expect(container.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[3].checked).toBe(true);

    await act(async () => change(container.querySelector('input[aria-label="Sub-entry text"]')!, 'word'));
    await act(async () => container.querySelector<HTMLElement>('.quick-confirm')!.click());
    expect(onConfirm).toHaveBeenCalledWith({type: 'variant', text: 'word', witnesses: [0, 1]});
  });

  it('offers to enable an identical disabled sub-entry', async () => {
    const entry = buildApparatus().entries[0];
    entry.subEntries[0].enabled = false;
    const onEnableExisting = vi.fn();
    const container = await render(<QuickSubEntryForm sigla={['A', 'B']} witnessOrder={[0, 1]} siglaGroups={[]}
                                                      targetEntry={entry} lang="la" onConfirm={vi.fn()}
                                                      onCancel={() => undefined}
                                                      onEnableExisting={onEnableExisting}/>);
    await act(async () => change(container.querySelector('input[aria-label="Sub-entry text"]')!, 'one'));
    await act(async () => container.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    await act(async () => container.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[0].click());
    expect(container.querySelector('.quick-form-message')?.textContent).toContain('Identical to a disabled sub-entry');
    await act(async () => container.querySelector<HTMLElement>('.quick-form-message a')!.click());
    expect(onEnableExisting).toHaveBeenCalledWith(0);
  });
});
