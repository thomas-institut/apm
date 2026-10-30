/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {Apparatus} from '@/Edition/Apparatus';
import {MainTextToken} from '@/Edition/MainTextToken';
import MainTextPanel from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buildToken(text: string, index: number): MainTextToken {
  const token = new MainTextToken().setText(text, index);
  token.originalIndex = index;
  return token;
}

async function renderPanel(activeApparatusIndex: number | null, onQuickEdit = vi.fn().mockResolvedValue(true),
                           onEditApparatusEntry = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const criticus = new Apparatus();
  criticus.type = 'criticus';
  const marginalia = new Apparatus();
  marginalia.type = 'marginalia';
  await act(async () => root.render(<MainTextPanel mainText={[buildToken('one', 0), buildToken('two', 1)]}
                                                   ctData={{type: 'ctable', lang: 'la', witnessOrder: [0, 1]} as unknown as CtDataInterface}
                                                   apparatuses={[criticus, marginalia]}
                                                   activeApparatusIndex={activeApparatusIndex}
                                                   sigla={['A', 'B']} canEdit highlightedTokenRange={null}
                                                   onQuickEdit={onQuickEdit}
                                                   onEditApparatusEntry={onEditApparatusEntry}/>));
  await act(async () => {
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Apparatus')!.click();
  });
  return {container, onQuickEdit, onEditApparatusEntry};
}

async function selectTokens(container: HTMLElement) {
  await act(async () => {
    container.querySelector('.mtt-0')!.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    container.querySelector('.mtt-1')!.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    container.querySelector('.mtt-1')!.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
  });
}

function change(el: Element, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', {bubbles: true}));
}

describe('MainTextPanel quick add', () => {
  it('quick adds a sub-entry to the visible apparatus for the selected range', async () => {
    const {container, onQuickEdit} = await renderPanel(1);
    expect(container.querySelector('select[aria-label="Add to"]')).not.toBeNull();
    await selectTokens(container);

    const popover = document.querySelector('.main-text-quick-add-popover');
    expect(popover).not.toBeNull();
    expect(popover!.textContent).toContain('one two');
    expect(popover!.textContent).toContain('marginalia');
    await act(async () => popover!.querySelector<HTMLElement>('.quick-add-sub-entry')!.click());
    const quickAddPopover = document.querySelector('.quick-sub-entry-popover');
    expect(quickAddPopover).not.toBeNull();
    expect(quickAddPopover!.querySelector('.popover-header')?.textContent).toContain('Quick add: one two');
    expect(quickAddPopover!.querySelector('.popover-body .quick-sub-entry-form')).not.toBeNull();
    await act(async () => change(document.querySelector('input[aria-label="Sub-entry text"]')!, 'word'));
    await act(async () => document.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    await act(async () => document.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[1].click());
    await act(async () => document.querySelector<HTMLElement>('.quick-confirm')!.click());

    expect(onQuickEdit).toHaveBeenCalledWith({
      kind: 'addSubEntryToRange', apparatusType: 'marginalia', mainTextRange: {from: 0, to: 1},
      subEntry: {type: 'variant', text: 'word', witnesses: [1]}
    });
    // the selection is cleared after a successful add
    expect(document.querySelector('.main-text-quick-add-popover')).toBeNull();
    expect(container.querySelectorAll('.selected-token')).toHaveLength(0);
  });

  it('uses the apparatus chosen in the "Add to" menu instead of the visible one', async () => {
    const {container, onQuickEdit} = await renderPanel(1);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Add to"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, '0');
      select.dispatchEvent(new Event('change', {bubbles: true}));
    });
    await selectTokens(container);
    expect(document.querySelector('.main-text-quick-add-popover')!.textContent).toContain('criticus');
    await act(async () => document.querySelector<HTMLElement>('.quick-add-sub-entry')!.click());
    await act(async () => change(document.querySelector('input[aria-label="Sub-entry text"]')!, 'word'));
    await act(async () => document.querySelector<HTMLElement>('.quick-witness-toggle')!.click());
    await act(async () => document.querySelectorAll<HTMLInputElement>('.quick-witness-item input')[0].click());
    await act(async () => document.querySelector<HTMLElement>('.quick-confirm')!.click());
    expect(onQuickEdit.mock.calls[0][0].apparatusType).toBe('criticus');
  });

  it('disables the add actions when the visible tab is not an apparatus', async () => {
    const {container} = await renderPanel(null);
    await selectTokens(container);
    const quickAddButton = document.querySelector<HTMLButtonElement>('.main-text-quick-add-popover .quick-add-sub-entry');
    const editButton = document.querySelector<HTMLButtonElement>('.main-text-quick-add-popover .quick-add-buttons button');
    expect(quickAddButton).not.toBeNull();
    expect(editButton).toBeNull();
    expect(quickAddButton!.disabled).toBe(true);
  });

  it('opens the full editor for the selection and target apparatus', async () => {
    const {container, onEditApparatusEntry} = await renderPanel(1);
    await selectTokens(container);
    const edit = Array.from(document.querySelectorAll<HTMLButtonElement>('.quick-add-buttons button'))
      .find((b) => b.textContent!.includes('Edit New Entry'))!;
    await act(async () => edit.click());
    expect(onEditApparatusEntry).toHaveBeenCalledWith(1, {from: 0, to: 1});
  });
});
