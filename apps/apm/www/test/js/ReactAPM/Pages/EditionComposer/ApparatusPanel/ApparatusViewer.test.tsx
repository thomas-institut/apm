/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusViewer} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusViewer';
import {MainTextTokenRange} from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ApparatusViewer', () => {
  it('reports the hovered lemma range and clears it on leave', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const entry = new ApparatusEntry();
    entry.from = 2;
    entry.to = 4;
    entry.mainTextWords = ['two', 'three', 'four'];
    apparatus.entries.push(entry);
    const onHoverRange = vi.fn<(range: MainTextTokenRange | null) => void>();
    const onSelectLemma = vi.fn();

    await act(async () => {
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={onHoverRange} selectedLemmaIndex={null}
                                   onSelectLemma={onSelectLemma}/>);
    });

    const lemma = container.querySelector('.lemma');
    expect(lemma).not.toBeNull();
    await act(async () => {
      lemma!.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(onHoverRange).toHaveBeenLastCalledWith({from: 2, to: 4});

    await act(async () => {
      lemma!.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
    });
    expect(onHoverRange).toHaveBeenLastCalledWith(null);

    await act(async () => {
      lemma!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(onSelectLemma).toHaveBeenLastCalledWith({entryIndex: 0, range: {from: 2, to: 4}});

    await act(async () => {
      container.querySelector('.range-text')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(onSelectLemma).toHaveBeenLastCalledWith(null);

    await act(async () => root.unmount());
    container.remove();
  });
});