/**
 * @vitest-environment happy-dom
 */

import {act, JSX} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import NiceTable, {NiceTableColumnDef} from '@/ReactAPM/Components/NiceTable/NiceTable';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface TestRow {
  id: number;
  name: string;
}

const rows: TestRow[] = [
  {id: 10, name: 'Alpha'},
  {id: 11, name: 'Beta'},
  {id: 12, name: 'Gamma'},
];

const createColumns = (cellSpy?: (data: TestRow, rowIndex: number) => JSX.Element): NiceTableColumnDef<TestRow>[] => [
  {
    title: 'Id',
    key: 'id',
    width: '30%',
    thClassName: 'id-head',
    tdClassName: 'id-cell',
    cellContent: cellSpy ?? ((row) => <span>{row.id}</span>),
  },
  {
    title: 'Name',
    key: 'name',
    cellContent: cellSpy ?? ((row) => <span>{row.name}</span>),
  },
];

const mount = async (element: JSX.Element): Promise<{container: HTMLElement; root: Root}> => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {container, root};
};

describe('NiceTable', () => {
  it('renders base table structure and default classes', async () => {
    const {container} = await mount(<NiceTable columnDefs={createColumns()} rows={rows}/>);

    const table = container.querySelector('table') as HTMLTableElement;
    const headers = Array.from(container.querySelectorAll('th'));
    const bodyRows = Array.from(container.querySelectorAll('tbody tr'));

    expect(table.className).toBe('nice-table');
    expect(headers.map((h) => h.textContent)).toEqual(['Id', 'Name']);
    expect(headers[0].className).toBe('id-head');
    expect(headers[0].style.width).toBe('30%');
    expect(headers[1].className).toBe('');
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0].className).toBe('');
    expect(container.querySelectorAll('td.id-cell')).toHaveLength(3);
    expect(container.querySelectorAll('tbody td')[1].textContent).toBe('Alpha');
  });

  it('applies sticky header and additional table class name', async () => {
    const {container} = await mount(
      <NiceTable
        columnDefs={createColumns()}
        rows={rows}
        stickyHeader={true}
        className={'extra-table-class'}
      />,
    );

    const table = container.querySelector('table') as HTMLTableElement;
    const headers = Array.from(container.querySelectorAll('th'));

    expect(table.className).toBe('nice-table extra-table-class');
    expect(headers[0].className).toBe('sticky id-head');
    expect(headers[1].className).toBe('sticky');
  });

  it('combines row classes from callback, highlighted row, and odd/even highlight', async () => {
    const getRowClassName = vi.fn((row: TestRow) => `row-${row.id}`);

    const {container} = await mount(
      <NiceTable
        columnDefs={createColumns()}
        rows={rows}
        highlightedRow={1}
        oddEvenHighlight={true}
        getRowClassName={getRowClassName}
      />,
    );

    const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
    expect(bodyRows[0].className).toBe('row-10 even');
    expect(bodyRows[1].className).toBe('row-11 highlighted odd');
    expect(bodyRows[2].className).toBe('row-12 even');
    expect(getRowClassName).toHaveBeenNthCalledWith(1, rows[0], 0);
    expect(getRowClassName).toHaveBeenNthCalledWith(2, rows[1], 1);
    expect(getRowClassName).toHaveBeenNthCalledWith(3, rows[2], 2);
  });

  it('supports custom odd/even class names and does not highlight when row is null', async () => {
    const {container} = await mount(
      <NiceTable
        columnDefs={createColumns()}
        rows={rows}
        oddEvenHighlight={true}
        oddRowClassName={'row-odd'}
        evenRowClassName={'row-even'}
        highlightedRow={null}
      />,
    );

    const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
    expect(bodyRows[0].className).toBe('row-even');
    expect(bodyRows[1].className).toBe('row-odd');
    expect(bodyRows[2].className).toBe('row-even');
    expect(container.querySelector('tbody tr.highlighted')).toBeNull();
  });

  it('calls cell and row key callbacks with row data and indexes', async () => {
    const cellContent = vi.fn((row: TestRow, rowIndex: number) => <span>{`${row.name}-${rowIndex}`}</span>);
    const getRowKey = vi.fn((row: TestRow, rowIndex: number) => `${row.id}-${rowIndex}`);

    const {container} = await mount(
      <NiceTable
        columnDefs={createColumns(cellContent)}
        rows={rows}
        getRowKey={getRowKey}
      />,
    );

    expect(cellContent).toHaveBeenCalledTimes(6);
    expect(cellContent).toHaveBeenNthCalledWith(1, rows[0], 0);
    expect(cellContent).toHaveBeenNthCalledWith(4, rows[1], 1);
    expect(cellContent).toHaveBeenNthCalledWith(6, rows[2], 2);

    expect(getRowKey).toHaveBeenCalledTimes(3);
    expect(getRowKey).toHaveBeenNthCalledWith(1, rows[0], 0);
    expect(getRowKey).toHaveBeenNthCalledWith(2, rows[1], 1);
    expect(getRowKey).toHaveBeenNthCalledWith(3, rows[2], 2);

    const tdTexts = Array.from(container.querySelectorAll('tbody td')).map((td) => td.textContent);
    expect(tdTexts).toContain('Alpha-0');
    expect(tdTexts).toContain('Beta-1');
    expect(tdTexts).toContain('Gamma-2');
  });
});
