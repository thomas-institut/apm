import {Table} from "@tanstack/react-table";

interface TableStateSummaryProps<T> {
  table: Table<T>;
  rowNounPlural?: string;
}

export default function TableStateSummary<T>(props: TableStateSummaryProps<T>) {

  const table = props.table;
  const rowNounPlural = props.rowNounPlural ?? 'rows';
  const tableState = table.getState();
  const pagination = tableState.pagination;
  const totalNumRows = table.getCoreRowModel().rows.length;
  const filteredNumRows = table.getFilteredRowModel().rows.length;
  const isFiltered = filteredNumRows !== totalNumRows;
  const firstDocIndex = pagination.pageIndex * pagination.pageSize;
  const lastDocIndex = Math.min(firstDocIndex + pagination.pageSize, filteredNumRows);


  return (<>
    Showing {rowNounPlural} {firstDocIndex + 1} to {lastDocIndex} of {filteredNumRows} {isFiltered ? `(out of ${totalNumRows} in total)` : ''}
  </>)

}