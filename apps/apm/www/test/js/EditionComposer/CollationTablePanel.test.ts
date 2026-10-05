/**
 * @vitest-environment happy-dom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import $ from 'jquery';
import {CollationTablePanel} from '@/EditionComposer/CollationTablePanel';
import {TableDrawnEvent, TableEditor} from '@/pages/common/TableEditor/TableEditor';
import {CollationTableSearchMatch} from '@/EditionComposer/CollationTableSearch';
import {act} from 'react';
import {createRoot} from 'react-dom/client';

Object.assign(globalThis, {$, IS_REACT_ACT_ENVIRONMENT: true});

interface SearchPanelHarness {
  searchQuery: string;
  searchMatches: CollationTableSearchMatch[];
  selectedSearchMatch: number;
  updateSearchMatches: () => void;
  doSearchHighlight: () => void;
  renderSearchControls: () => void;
  navigateSearchMatch: (direction: -1 | 1) => void;
  setPanelMode: (mode: 'search' | 'move' | 'group') => void;
}

describe('CollationTablePanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  function setupSearchPanel(nRows = 2, nCols = 6) {
    const rows = Array.from({length: nRows}, () => Array<string>(nCols).fill('other'));
    rows[0][0] = 'in';
    rows[0][1] = 'principio';
    rows[nRows - 1][nCols - 2] = 'in';
    rows[nRows - 1][nCols - 1] = 'principio';
    const tableEditor = new TableEditor({
      id: 'test-container',
      rowDefinition: rows.map((row, index) => ({
        title: `Row ${index}`,
        values: row.map((_text, col) => col),
        isEditable: false
      })),
      showInMultipleRows: true,
      columnsPerRow: 10,
      getEmptyValue: () => -1,
      isEmptyValue: (_row: number, _col: number, value: number) => value === -1,
      generateCellContent: (row: number, col: number) => rows[row][col],
      generateCellContentEditMode: (row: number, col: number) => rows[row][col],
      onCellConfirmEdit: (_row: number, _col: number, value: string) => ({valueChange: true, value: parseInt(value)}),
      cellValidationFunction: () => ({isValid: true, warnings: [], errors: []})
    });
    const panel = Object.assign(Object.create(CollationTablePanel.prototype), {
      ctData: {
        witnessOrder: [nRows, ...rows.map((_row, index) => index)],
        witnesses: [...rows.map(row => ({witnessType: 'edition', tokens: row.map(text => ({text}))})),
          {witnessType: 'source', tokens: []}]
      },
      searchQuery: 'in principio',
      searchMatches: [],
      selectedSearchMatch: -1,
      searchIsActive: true,
      containerSelector: '#test-container',
      tableEditor
    }) as SearchPanelHarness;
    tableEditor.on(TableDrawnEvent, () => panel.doSearchHighlight());
    tableEditor.redrawTable(true);
    panel.updateSearchMatches();
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    return {panel, tableEditor};
  }

  it('highlights all matches and navigates from the first or last with wrapping', () => {
    const {panel} = setupSearchPanel();
    expect(panel.searchMatches).toHaveLength(2);
    expect(container.querySelectorAll('td.search-match')).toHaveLength(4);
    expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(0);
    panel.navigateSearchMatch(-1);
    expect(panel.selectedSearchMatch).toBe(1);
    expect(container.querySelector('td.te-cell-1-4')?.classList.contains('selected')).toBe(true);
    panel.navigateSearchMatch(1);
    expect(panel.selectedSearchMatch).toBe(0);
    expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(2);
    panel.selectedSearchMatch = -1;
    panel.navigateSearchMatch(1);
    expect(panel.selectedSearchMatch).toBe(0);
    panel.navigateSearchMatch(-1);
    expect(panel.selectedSearchMatch).toBe(1);
  });

  it('preserves the query, matches and selection while removing highlights in other modes', async () => {
    const {panel, tableEditor} = setupSearchPanel();
    panel.navigateSearchMatch(1);
    const matches = panel.searchMatches;
    for (const mode of ['move', 'group'] as const) {
      panel.setPanelMode(mode);
      await Promise.resolve();
      expect(tableEditor.getTableEditMode()).toBe(mode);
      expect(container.querySelectorAll('td.search-match, td.selected')).toHaveLength(0);
      expect(panel.searchQuery).toBe('in principio');
      expect(panel.searchMatches).toBe(matches);
      panel.setPanelMode('search');
      await Promise.resolve();
      expect(tableEditor.getTableEditMode()).toBe('off');
      expect(container.querySelectorAll('td.search-match')).toHaveLength(4);
      expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(2);
    }
  });

  it('restores highlights after page changes and navigates to off-page matches', () => {
    const {panel, tableEditor} = setupSearchPanel(100, 101);
    expect(panel.searchMatches).toHaveLength(2);
    expect(container.querySelectorAll('td.search-match')).toHaveLength(2);
    panel.navigateSearchMatch(-1);
    expect(container.querySelector('td.te-cell-99-100')?.classList.contains('selected')).toBe(true);
    tableEditor.showColumnRange(0, 1);
    expect(container.querySelectorAll('td.search-match')).toHaveLength(2);
    expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(0);
    tableEditor.showColumnRange(99, 100);
    expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(2);
  });

  it('clears matches and selection when the query changes or is emptied', () => {
    const {panel} = setupSearchPanel();
    panel.navigateSearchMatch(1);
    panel.searchQuery = 'principio';
    panel.updateSearchMatches();
    expect(container.querySelectorAll('td.search-match')).toHaveLength(2);
    expect(panel.selectedSearchMatch).toBe(-1);
    panel.searchQuery = '';
    panel.updateSearchMatches();
    panel.navigateSearchMatch(1);
    expect(panel.searchMatches).toEqual([]);
    expect(container.querySelectorAll('td.search-match, td.selected')).toHaveLength(0);
    expect(panel.selectedSearchMatch).toBe(-1);
  });

  it('refreshes matches after table contents change', () => {
    const {panel, tableEditor} = setupSearchPanel();
    panel.navigateSearchMatch(1);
    tableEditor.matrix.setValue(0, 0, -1);
    panel.updateSearchMatches();
    expect(panel.searchMatches).toEqual([{row: 1, colFrom: 4, colTo: 5}]);
    expect(panel.selectedSearchMatch).toBe(-1);
    expect(container.querySelectorAll('td.search-match')).toHaveLength(2);
  });

  it('connects typing, counts, navigation and mode changes to the search controls', async () => {
    const {panel} = setupSearchPanel();
    const controls = document.createElement('div');
    container.appendChild(controls);
    const root = createRoot(controls);
    Object.assign(panel, {searchControlsRoot: root, textDirection: 'rtl'});
    try {
      await act(async () => panel.renderSearchControls());
      const input = controls.querySelector('input')!;
      expect(input.value).toBe('in principio');
      expect(input.dir).toBe('rtl');
      expect(controls.querySelector('[role="status"]')?.textContent).toBe('2 matches');
      await act(async () => {
        controls.querySelector<HTMLButtonElement>('[aria-label="Next match"]')!.click();
      });
      expect(controls.querySelector('[role="status"]')?.textContent).toBe('1 / 2');
      expect(container.querySelectorAll('td.search-match.selected')).toHaveLength(2);
      await act(async () => panel.setPanelMode('move'));
      expect(controls.querySelector('input')).toBeNull();
      await act(async () => panel.setPanelMode('search'));
      const restoredInput = controls.querySelector('input')!;
      expect(restoredInput.value).toBe('in principio');
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(restoredInput, 'not found');
        restoredInput.dispatchEvent(new Event('input', {bubbles: true}));
      });
      expect(panel.searchQuery).toBe('not found');
      expect(controls.querySelector('[role="status"]')).toBeNull();
      expect(controls.querySelectorAll('button')).toHaveLength(0);
      expect(controls.querySelector('input')?.value).toBe('not found');
      expect(container.querySelectorAll('td.search-match')).toHaveLength(0);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('highlights a column range outside the current window', () => {
    const nRows = 100;
    const nCols = 101;
    const tableEditor = new TableEditor({
      id: 'test-container',
      rowDefinition: Array.from({length: nRows}, (_, row) => ({
        title: `Row ${row}`,
        values: Array(nCols).fill(row),
        isEditable: false
      })),
      showInMultipleRows: true,
      columnsPerRow: 10,
      getEmptyValue: () => -1,
      isEmptyValue: (_row: number, _col: number, value: number) => value === -1,
      generateCellContent: (_row: number, _col: number, value: number) => value.toString(),
      generateCellContentEditMode: (_row: number, _col: number, value: number) => value.toString(),
      onCellConfirmEdit: (_row: number, _col: number, value: string) => ({valueChange: true, value: parseInt(value)}),
      cellValidationFunction: () => ({isValid: true, warnings: [], errors: []})
    });
    tableEditor.redrawTable(true);

    const panel = Object.assign(Object.create(CollationTablePanel.prototype), {
      ctData: {collationMatrix: [Array(nCols).fill(0)]},
      containerSelector: '#test-container',
      tableEditor
    }) as CollationTablePanel;

    panel.highlightColumnRange(80, 82, false);

    const highlightedColumns = [80, 81, 82].map(col =>
      container.querySelector(`th.te-col-${col}`)?.classList.contains('highlight')
    );
    expect(highlightedColumns).toEqual([true, true, true]);

    const header = container.querySelector('th.te-col-80') as HTMLElement;
    const scrollCalls: ScrollIntoViewOptions[] = [];
    header.scrollIntoView = options => scrollCalls.push(options ?? {});
    panel.highlightColumnRange(80);

    expect(scrollCalls).toEqual([{behavior: 'smooth', block: 'center'}]);
  });
});