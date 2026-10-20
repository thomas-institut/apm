/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
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
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={onHoverRange} selectedLemmaIndex={0}
                                   hoveredEntryIndices={[0]} onSelectLemma={onSelectLemma}/>);
    });
    await act(async () => {
      container.querySelector('.lemma')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(onSelectLemma).toHaveBeenLastCalledWith(null);

    await act(async () => {
      container.querySelector('.range-text')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(onSelectLemma).toHaveBeenLastCalledWith(null);

    await act(async () => root.unmount());
    container.remove();
  });
});
describe('ApparatusViewer editing', () => {
  it('keeps the edited lemma selected and ignores lemma clicks while editing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const firstEntry = new ApparatusEntry();
    firstEntry.from = 0;
    firstEntry.to = 0;
    firstEntry.mainTextWords = ['first'];
    const secondEntry = new ApparatusEntry();
    secondEntry.from = 1;
    secondEntry.to = 1;
    secondEntry.mainTextWords = ['second'];
    apparatus.entries.push(firstEntry, secondEntry);
    const onSelectLemma = vi.fn();

    await act(async () => {
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={vi.fn()} selectedLemmaIndex={1} editingEntryIndex={0}
                                   onSelectLemma={onSelectLemma}/>);
    });

    const lemmas = container.querySelectorAll('.lemma');
    expect(lemmas[0].classList.contains('selected')).toBe(true);
    expect(lemmas[1].classList.contains('selected')).toBe(false);
    await act(async () => {
      lemmas[1].dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    expect(onSelectLemma).not.toHaveBeenCalled();
    expect(lemmas[0].classList.contains('selected')).toBe(true);
    expect(lemmas[1].classList.contains('selected')).toBe(false);

    await act(async () => root.unmount());
    container.remove();
  });

  it('uses the vanilla sub-entry style classes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const entry = new ApparatusEntry();
    entry.from = 0;
    entry.to = 0;
    entry.mainTextWords = ['word'];
    const subEntry = new ApparatusSubEntry();
    subEntry.type = 'variant';
    subEntry.source = 'auto';
    subEntry.enabled = false;
    entry.subEntries.push(subEntry);
    apparatus.entries.push(entry);

    await act(async () => {
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={vi.fn()} selectedLemmaIndex={null} onSelectLemma={vi.fn()}/>);
    });

    const renderedSubEntry = container.querySelector('.sub-entry');
    expect(renderedSubEntry?.classList.contains('sub-entry-0')).toBe(true);
    expect(renderedSubEntry?.classList.contains('sub-entry-type-variant')).toBe(true);
    expect(renderedSubEntry?.classList.contains('sub-entry-source-auto')).toBe(true);
    expect(renderedSubEntry?.classList.contains('sub-entry-disabled')).toBe(true);

    await act(async () => root.unmount());
    container.remove();
  });

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
    const doubleClickEvent = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    await act(async () => {
      container.querySelector('.lemma')!.dispatchEvent(doubleClickEvent);
    });
    expect(onEditLemma).toHaveBeenCalledWith(0);
    expect(doubleClickEvent.defaultPrevented).toBe(true);
    await act(async () => root.unmount());
  });

  it('prevents the browser from selecting lemma text on mouse down', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const apparatus = new Apparatus();
    const entry = new ApparatusEntry();
    entry.from = 1;
    entry.to = 1;
    entry.mainTextWords = ['one'];
    apparatus.entries.push(entry);

    await act(async () => {
      root.render(<ApparatusViewer apparatus={apparatus} lineNumberMap={null} useLineNumbers={false} sigla={[]}
                                   onHoverRange={vi.fn()} selectedLemmaIndex={null} onSelectLemma={vi.fn()}/>);
    });
    const mouseDownEvent = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    await act(async () => {
      container.querySelector('.lemma')!.dispatchEvent(mouseDownEvent);
    });
    expect(mouseDownEvent.defaultPrevented).toBe(true);

    await act(async () => root.unmount());
    container.remove();
  });
});
