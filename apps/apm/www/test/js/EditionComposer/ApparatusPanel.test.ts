/**
 * @vitest-environment happy-dom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import $ from 'jquery';
import {ApparatusPanel} from '@/EditionComposer/ApparatusPanel';

Object.assign(globalThis, {$});

describe('ApparatusPanel lemma selection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    container.innerHTML = `
      <div class="panel-content">
        <span class="lemma lemma-0-0"></span>
        <span class="lemma lemma-0-1"></span>
        <span class="lemma lemma-1-0"><sup class="occurrence-number">1</sup></span>
      </div>
      <a class="edit-entry-btn"></a>
      <div class="add-entry-dropdown"></div>
      <div class="clear-selection-btn"></div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function createPanel(apparatusIndex = 0) {
    const highlightCollationTableRange = vi.fn();
    const mainText = Array.from({length: 10}, (_, editionWitnessTokenIndex) => ({editionWitnessTokenIndex}));
    const panel = Object.assign(Object.create(ApparatusPanel.prototype), {
      containerSelector: '#test-container',
      options: {
        apparatusIndex,
        highlightCollationTableRange,
        highlightMainText: vi.fn()
      },
      ctData: {
        type: 'edition',
        editionWitnessIndex: 0,
        collationMatrix: [Array.from({length: 10}, (_, index) => index)]
      },
      edition: {mainText},
      apparatus: {
        entries: [
          {from: 3, to: 4, metadata: {ctGroup: {from: 3, to: 4}}},
          {from: 8, to: 9, metadata: {ctGroup: {from: 8, to: 9}}}
        ]
      },
      currentSelectedEntryIndex: -1,
      apparatusEntryFormIsVisible: false,
      entryInEditor: null,
      fitDivs: vi.fn()
    }) as ApparatusPanel;

    return {panel, highlightCollationTableRange};
  }

  it('highlights the selected lemma range on a single click', () => {
    const {panel, highlightCollationTableRange} = createPanel();
    const lemma = container.querySelector('.lemma-0-0') as HTMLElement;

    panel._genOnClickLemma()({target: lemma} as any);

    expect(panel['currentSelectedEntryIndex']).toBe(0);
    expect(highlightCollationTableRange).toHaveBeenLastCalledWith(3, 4);
  });

  it('ignores a single click while editing, but a double click switches the edited lemma', () => {
    const {panel, highlightCollationTableRange} = createPanel();
    panel['currentSelectedEntryIndex'] = 0;
    panel['apparatusEntryFormIsVisible'] = true;
    const loadEntryIntoEntryForm = vi.fn();
    const showApparatusEntryForm = vi.fn();
    panel['_loadEntryIntoEntryForm'] = loadEntryIntoEntryForm;
    panel['_showApparatusEntryForm'] = showApparatusEntryForm;
    const lemma = container.querySelector('.lemma-0-1') as HTMLElement;
    lemma.scrollIntoView = vi.fn();

    panel._genOnClickLemma()({target: lemma} as any);
    expect(panel['currentSelectedEntryIndex']).toBe(0);

    panel._genOnDoubleClickLemma()({target: lemma} as any);

    expect(panel['currentSelectedEntryIndex']).toBe(1);
    expect(highlightCollationTableRange).toHaveBeenLastCalledWith(8, 9);
    expect(loadEntryIntoEntryForm).toHaveBeenCalledWith(1);
    expect(showApparatusEntryForm).toHaveBeenCalledOnce();
  });

  it('restores the selected lemma range when the apparatus is shown', () => {
    const {panel, highlightCollationTableRange} = createPanel();
    panel['currentSelectedEntryIndex'] = 1;

    panel.onShown();

    expect(highlightCollationTableRange).toHaveBeenLastCalledWith(8, 9);
  });

  it('selects nested lemma content and opens the editor in a non-first apparatus', () => {
    const {panel, highlightCollationTableRange} = createPanel(1);
    const lemma = container.querySelector('.lemma-1-0') as HTMLElement;
    const nestedLemmaContent = lemma.querySelector('.occurrence-number') as HTMLElement;
    lemma.scrollIntoView = vi.fn();
    const loadEntryIntoEntryForm = vi.fn();
    const showApparatusEntryForm = vi.fn();
    panel['_loadEntryIntoEntryForm'] = loadEntryIntoEntryForm;
    panel['_showApparatusEntryForm'] = showApparatusEntryForm;

    panel._genOnClickLemma()({target: nestedLemmaContent} as any);
    expect(panel['currentSelectedEntryIndex']).toBe(0);
    expect(highlightCollationTableRange).toHaveBeenLastCalledWith(3, 4);

    panel._genOnDoubleClickLemma()({target: nestedLemmaContent} as any);

    expect(loadEntryIntoEntryForm).toHaveBeenCalledWith(0);
    expect(showApparatusEntryForm).toHaveBeenCalledOnce();
  });
});