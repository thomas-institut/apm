/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import * as SubEntryType from '@/Edition/SubEntryType';
import ApparatusEntryEditor from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/ApparatusEntryEditor';

// Quill needs a real browser; the wrapper is replaced by a stub
vi.mock('@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/FmtTextQuillEditor', () => ({
  default: ({initialText}: { initialText: unknown }) => <div className="quill-stub">{JSON.stringify(initialText)}</div>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buildEntry(): ApparatusEntry {
  const entry = new ApparatusEntry();
  entry.from = 0;
  entry.to = 0;
  entry.mainTextWords = ['word'];
  const auto = new ApparatusSubEntry();
  auto.type = SubEntryType.VARIANT;
  auto.source = 'auto';
  auto.fmtText = [{type: 'text', text: 'foo'}] as any;
  auto.witnessData = [new WitnessDataItem().setWitnessIndex(0).setHand(0)];
  auto.position = 0;
  entry.subEntries = [auto];
  return entry;
}

async function renderEditor(onUpdate = vi.fn(), onCancel = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onParentClick = vi.fn();
  await act(async () => {
    root.render(<div onClick={onParentClick}>
      <ApparatusEntryEditor entry={buildEntry()} ctRange={{from: 2, to: 3}} lang="la"
                            sigla={['A', 'B']} siglaGroups={[]}
                            onUpdate={onUpdate} onCancel={onCancel}/>
    </div>);
  });
  return {container, root, onUpdate, onCancel, onParentClick};
}

const click = async (element: Element | null) => {
  expect(element).not.toBeNull();
  await act(async () => {
    element!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
};

describe('ApparatusEntryEditor', () => {
  it('shows the entry data and no Update button until something changes', async () => {
    const {container, root} = await renderEditor();
    expect(container.querySelector('.entry-text')!.textContent).toBe('word');
    expect(container.querySelector('.ct-table-cols')!.textContent).toBe('3\u20134');
    expect(container.querySelector('.update-btn')).toBeNull();
    expect(container.querySelectorAll('.sub-entry-editor-row')).toHaveLength(1);
    await act(async () => root.unmount());
  });

  it('commits a disabled sub-entry when Update Apparatus is clicked', async () => {
    const {container, root, onUpdate} = await renderEditor();
    await click(container.querySelector('.sub-entry-enabled-checkbox'));
    await click(container.querySelector('.update-btn'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const edited = onUpdate.mock.calls[0][0] as ApparatusEntry;
    expect(edited.subEntries[0].enabled).toBe(false);
    await act(async () => root.unmount());
  });

  it('does not bubble cancel or commit clicks to the composer', async () => {
    const {container, root, onParentClick} = await renderEditor();
    await click(container.querySelector('.sub-entry-enabled-checkbox'));
    onParentClick.mockClear();
    await click(container.querySelector('.update-btn'));
    expect(onParentClick).not.toHaveBeenCalled();
    await click(container.querySelector('.cancel-btn'));
    expect(onParentClick).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('adds a custom sub-entry with its editor open', async () => {
    const {container, root, onUpdate} = await renderEditor();
    await click(container.querySelector('.add-custom-sub-entry-btn'));
    expect(container.querySelectorAll('.sub-entry-editor-row')).toHaveLength(2);
    expect(container.querySelector('.quill-stub')).not.toBeNull();
    await click(container.querySelector('.update-btn'));
    const edited = onUpdate.mock.calls[0][0] as ApparatusEntry;
    expect(edited.subEntries).toHaveLength(2);
    expect(edited.subEntries[1].source).toBe('user');
    await act(async () => root.unmount());
  });

  it('changes the lemma type and calls onCancel', async () => {
    const {container, root, onUpdate, onCancel} = await renderEditor();
    const options = Array.from(container.querySelectorAll('.multi-toggle .mt-option'));
    const dash = options.find(o => o.textContent === 'dash');
    await click(dash ?? null);
    await click(container.querySelector('.update-btn'));
    expect((onUpdate.mock.calls[0][0] as ApparatusEntry).lemmaType).toBe('dash');
    await click(container.querySelector('.cancel-btn'));
    expect(onCancel).toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
