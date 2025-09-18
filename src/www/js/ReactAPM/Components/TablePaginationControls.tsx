import {PaginationState, Table} from "@tanstack/react-table";
import {Button, ButtonProps} from "react-bootstrap";
import {JSX} from "react";
import {ChevronBarLeft, ChevronBarRight, ChevronLeft, ChevronRight} from "react-bootstrap-icons";


interface PaginationControlIcons {
  firstPage: JSX.Element;
  prevPage: JSX.Element;
  nextPage: JSX.Element;
  lastPage: JSX.Element;
}

const DefaultIcons: PaginationControlIcons = {
  firstPage: <ChevronBarLeft/>, prevPage: <ChevronLeft/>, nextPage: <ChevronRight/>, lastPage: <ChevronBarRight/>
};

interface TablePaginationControlsProps<DataType> {
  table: Table<DataType>;
  icons?: PaginationControlIcons;
  className?: string;
}


export function TablePaginationControls<DataType>(props: TablePaginationControlsProps<DataType>) {
  const icons = props.icons ?? DefaultIcons;
  const table = props.table;
  const tableState = table.getState();
  const pagination = tableState.pagination;
  const setPagination = table.setPagination;
  const filteredNumRows = table.getFilteredRowModel().rows.length;
  const firstDocIndex = pagination.pageIndex * pagination.pageSize;
  const lastDocIndex = Math.min(firstDocIndex + pagination.pageSize, filteredNumRows);
  const isFirstPage = pagination.pageIndex === 0;
  const isLastPage = lastDocIndex >= filteredNumRows;
  const realPageCount = Math.ceil(filteredNumRows / pagination.pageSize);
  const commonButtonProps: ButtonProps = {size: 'sm', variant: 'outline-secondary', style: {fontSize: '0.8em'}};

  return (
    <div className={props.className} style={{display: 'flex', flexDirection: 'row', gap: '1em', alignItems: 'center'}}>
      <Button {...commonButtonProps}
              disabled={isFirstPage ? true : undefined}
              title="Go to first page"
              onClick={() => table.firstPage()}>
        {icons.firstPage}
      </Button>
      <Button {...commonButtonProps}
              disabled={isFirstPage ? true : undefined}
              title="Go to previous page"
              onClick={() => table.previousPage()}
      >
        {icons.prevPage}
      </Button>
      <span>Page {pagination.pageIndex+1} of {realPageCount}</span>
      <Button {...commonButtonProps}
              disabled={isLastPage ? true : undefined}
              title="Go to next page"
              onClick={() => table.nextPage()}
      >
        {icons.nextPage}
      </Button>
      <Button {...commonButtonProps}
              disabled={isLastPage ? true : undefined}
              title="Go to last page"
              onClick={() => { setPagination({pageSize: pagination.pageSize, pageIndex: realPageCount-1})}}
      >
        {icons.lastPage}
      </Button>
    </div>);
}