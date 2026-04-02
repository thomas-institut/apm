/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TableEditor } from '@/pages/common/TableEditor';

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
});
