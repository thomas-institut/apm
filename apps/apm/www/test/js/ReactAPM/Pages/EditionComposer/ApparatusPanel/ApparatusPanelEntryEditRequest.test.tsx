/**
 * @vitest-environment happy-dom
 */

import React, {act, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {MainTextToken} from '@/Edition/MainTextToken';
import {ApparatusPanel} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusPanel';

// Quill needs a real browser; the wrapper is replaced by a stub
vi.mock('@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/FmtTextQuillEditor', () => ({
  default: () => <div className="quill-stub"/>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ApparatusPanel entry edit request', () => {
  it('opens the full editor with a new custom sub-entry for the requested range and reports it handled', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const token = new MainTextToken().setText('word', 0);
    token.originalIndex = 0;
    const onHandled = vi.fn();

    await act(async () => root.render(<ApparatusPanel apparatus={new Apparatus()} lineNumberMap={null} lang="la"
                                                      sigla={['A']} siglaGroups={[]}
                                                      ctData={{type: 'ctable', lang: 'la'} as unknown as CtDataInterface}
                                                      mainText={[token]} canEdit
                                                      onHoverRange={() => undefined} selectedLemmaIndex={null}
                                                      onSelectLemma={() => undefined}
                                                      onUpdateEntry={async () => true}
                                                      entryEditRequest={{range: {from: 0, to: 0}, nonce: 1}}
                                                      onEntryEditRequestHandled={onHandled}/>));

    expect(onHandled).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.apparatus-entry-editor')).not.toBeNull();
    expect(container.querySelectorAll('.apparatus-entry-editor .sub-entry-editor-row, .apparatus-entry-editor [class*="sub-entry"]').length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('No apparatus entries');
  });

  it.each(['cancel', 'commit'])('selects a lemma on double click and keeps it selected after editor %s', async (closeAction) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const entry = new ApparatusEntry();
    entry.from = 0;
    entry.to = 0;
    entry.mainTextWords = ['word'];
    apparatus.entries.push(entry);
    const token = new MainTextToken().setText('word', 0);
    token.originalIndex = 0;
    const onUpdateEntry = vi.fn(async () => true);

    function TestPanel() {
      const [selectedLemmaIndex, setSelectedLemmaIndex] = useState<number | null>(null);
      return <ApparatusPanel apparatus={apparatus} lineNumberMap={null} lang="la" sigla={['A']} siglaGroups={[]}
                             ctData={{type: 'ctable', lang: 'la'} as unknown as CtDataInterface}
                             mainText={[token]} canEdit onHoverRange={() => undefined}
                             selectedLemmaIndex={selectedLemmaIndex}
                             onSelectLemma={(lemma) => setSelectedLemmaIndex(lemma?.entryIndex ?? null)}
                             onUpdateEntry={onUpdateEntry}/>;
    }

    await act(async () => root.render(<TestPanel/>));
    const lemma = container.querySelector('.lemma')!;
    const click = async () => act(async () => {
      lemma.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    await click();
    await click();
    await act(async () => {
      lemma.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));
    });
    expect(container.querySelector('.apparatus-entry-editor')).not.toBeNull();

    if (closeAction === 'cancel') {
      await act(async () => {
        container.querySelector('.cancel-btn')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
    } else {
      await act(async () => {
        container.querySelector('.add-custom-sub-entry-btn')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      await act(async () => {
        container.querySelector('.update-btn')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(onUpdateEntry).toHaveBeenCalledTimes(1);
    }

    expect(container.querySelector('.apparatus-entry-editor')).toBeNull();
    expect(container.querySelector('.lemma')!.classList.contains('selected')).toBe(true);
    await act(async () => root.unmount());
    container.remove();
  });
});
