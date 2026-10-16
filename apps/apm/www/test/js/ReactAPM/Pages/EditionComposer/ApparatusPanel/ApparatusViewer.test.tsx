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
                                   hoveredEntryIndices={[0]}
                                   onSelectLemma={onSelectLemma}/>);
    });

    const lemma = container.querySelector('.lemma');
    expect(lemma).not.toBeNull();
    expect(lemma!.classList.contains('main-text-hover')).toBe(true);
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
describe('ApparatusViewer editing', () => {
  it('requests the entry editor when a lemma is double clicked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const entry = new ApparatusEntry();
    entry.from = 1;
    entry.to = 1;
    entry.mainTextWords = ['one'];
    apparatus.entries.push(entry);
    const onEditLemma = vi.fn();

    await act(async () => {
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={vi.fn()} selectedLemmaIndex={null}
                                   onSelectLemma={vi.fn()} onEditLemma={onEditLemma}/>);
    });
    await act(async () => {
      container.querySelector('.lemma')!.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    });
    expect(onEditLemma).toHaveBeenCalledWith(0);
    await act(async () => root.unmount());
  });
});
