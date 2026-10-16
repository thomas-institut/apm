/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {Apparatus} from '@/Edition/Apparatus';
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
});
