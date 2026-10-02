/**
 * @vitest-environment happy-dom
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import $ from 'jquery';
import {CollationTablePanel} from '@/EditionComposer/CollationTablePanel';
import {TableEditor} from '@/pages/common/TableEditor/TableEditor';

Object.assign(globalThis, {$});

describe('CollationTablePanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
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
  });
});