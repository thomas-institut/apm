/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TableEditor } from '@/pages/common/TableEditor/TableEditor';

describe('TableEditor', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should render a table with correct structure', () => {
    const te = new TableEditor({
      id: 'test-container',
      rowDefinition: [
        { title: 'Row 1', values: [100, 200], isEditable: true }
      ],
      getEmptyValue: () => -1,
      isEmptyValue: (v: number) => v === -1,
      generateCellContent: (_r: number, _c: number, v: number) => v.toString(),
      generateCellContentEditMode: (_r: number, _c: number, v: number) => v.toString(),
      onCellConfirmEdit: (_r: number, _c: number, v: string) => ({ valueChange: true, value: parseInt(v) }),
      cellValidationFunction: () => ({ isValid: true, warnings: [], errors: [] })
    });

    te.redrawTable(true);

    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    
    // Check row title
    const rowTitle = container.querySelector('.te-row-title');
    expect(rowTitle?.textContent).toBe('Row 1');

    // Check cells
    const cells = container.querySelectorAll('.te-cell');
    expect(cells.length).toBe(2);
    expect(cells[0].textContent).toContain('100');
    expect(cells[1].textContent).toContain('200');
  });

  it('should handle edit mode transitions', () => {
    const te = new TableEditor({
      id: 'test-container',
      rowDefinition: [
        { title: 'Row 1', values: [100], isEditable: true }
      ],
      getEmptyValue: () => -1,
      isEmptyValue: (v: number) => v === -1,
      generateCellContent: (_r: number, _c: number, v: number) => v.toString(),
      generateCellContentEditMode: (_r: number, _c: number, v: number) => v.toString(),
      onCellConfirmEdit: (_r: number, _c: number, v: string) => ({ valueChange: true, value: parseInt(v) }),
      cellValidationFunction: () => ({ isValid: true, warnings: [], errors: [] })
    });

    te.redrawTable(true);
    // Move buttons should NOT be present in EditModeOff
    expect(container.querySelector('.button-move-mode')).toBeFalsy();

    te.setEditMode('move', false);
    te.redrawTable(true);
    
    expect(container.classList.contains('table-edit-mode-move')).toBe(true);
    
    // Check if move buttons are present now
    expect(container.querySelector('.button-move-mode')).toBeTruthy();
  });

  it('should activate windowing for large matrices', async () => {
    // 100 rows, 101 columns = 10100 cells (> 10000 threshold)
    const nRows = 100;
    const nCols = 101;
    const rowDefinition = [];
    for (let r = 0; r < nRows; r++) {
      rowDefinition.push({
        title: `Row ${r}`,
        values: Array(nCols).fill(r),
        isEditable: true
      });
    }

    const te = new TableEditor({
      id: 'test-container',
      rowDefinition: rowDefinition,
      showInMultipleRows: true,
      columnsPerRow: 10,
      getEmptyValue: () => -1,
      isEmptyValue: (v: number) => v === -1,
      generateCellContent: (_r: number, _c: number, v: number) => v.toString(),
      generateCellContentEditMode: (_r: number, _c: number, v: number) => v.toString(),
      onCellConfirmEdit: (_r: number, _c: number, v: string) => ({ valueChange: true, value: parseInt(v) }),
      cellValidationFunction: () => ({ isValid: true, warnings: [], errors: [] })
    });

    te.redrawTable(true);

    // Should have windowing navigation
    const nav = container.querySelector('.te-windowing-nav');
    expect(nav).toBeTruthy();

    // With 100 rows and 10 cols per table, each table has 1000 cells.
    // MAX_CELLS is 2000, so it should show 2 tables.
    const tables = container.querySelectorAll('.te-table');
    expect(tables.length).toBe(2);

    // Check slider properties
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.min).toBe("0");
    // numTables = ceil(101 / 10) = 11. Shown = 2. Max = 11 - 2 = 9.
    expect(slider.max).toBe("9");

    // Check first shown table's first column index
    // let firstTh = container.querySelector('.te-th:not(:empty)') as HTMLElement; 
    // Actually, in genTableVNode:
    // let headerChildren: VNode[] = [h('th')]; 
    // The first th is empty (for row titles).
    // The rest are from genThVNode(col).
    // Header row (tr) has class "te-th". 
    // Individual th have classes like "te-th-0".
    const dataThs = container.querySelectorAll('th[class*="te-th-"]');
    expect((dataThs[0] as HTMLElement).classList.contains('te-th-0')).toBe(true);

    // Move slider to position 5
    slider.value = "5";
    slider.dispatchEvent(new Event('input'));
    
    // Wait for debounced redraw
    // @ts-ignore
    await new Promise(  resolve =>queueMicrotask(resolve));
    
    // Now startTable should be 5. Table 5 has column 5 * 10 = 50.
    const dataThsAfter = container.querySelectorAll('th[class*="te-th-"]');
    expect((dataThsAfter[0] as HTMLElement).classList.contains('te-th-50')).toBe(true);
  });
});
