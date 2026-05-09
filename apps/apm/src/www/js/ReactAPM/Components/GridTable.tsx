import {flexRender, Table} from "@tanstack/react-table";

import './GridTable.css';
import {CSSProperties, JSX} from "react";
import {randomAlphaString} from "@/toolbox/ToolBox";
import {Code, SortDown, SortUp} from "react-bootstrap-icons";

interface SortingIcons {
  asc: JSX.Element;
  desc: JSX.Element;
  none?: JSX.Element;
}

const DefaultSortingIcons: SortingIcons = {
  asc: <SortDown style={{fontSize: "1.2em"}}/>, desc: <SortUp/>, none: <Code style={{transform: 'rotate(90deg)', color: "gray"}}/>

};

interface GridTableProps<T> {
  table: Table<T>;
  tableId?: string;
  gridColumnDef: string;
  style?: CSSProperties;
  className?: string;
  enableSorting?: boolean;
  sortingIcons?: SortingIcons;
}

export default function GridTable<T>(props: GridTableProps<T>) {
  const table = props.table;
  const enableSorting = props.enableSorting ?? true;
  const sortingIcons = props.sortingIcons ?? DefaultSortingIcons;
  const tableId = props.tableId ?? randomAlphaString(5);
  let style = props.style ?? {};
  style = {...style, gridTemplateColumns: props.gridColumnDef};
  return (<div className={"gridTable " + (props.className ?? '')} key={tableId} id={tableId} style={style}>
    <div className="gridTableHeaderContainer" style={{fontWeight: 'bold'}}>
      {table.getHeaderGroups().map(headerGroup => (<div className="gridTableHeaderGroupContainer" key={headerGroup.id}>
        {headerGroup.headers.map(header => (<div key={header.id} className="gridTableHeaderItem" style={{display: 'flex', flexDirection: 'row', gap: '0.5em', justifyContent: 'space-between', alignItems: 'center'}}>
          <span>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
          {enableSorting && header.column.getCanSort() && (<span className="gridTableHeaderSortIcon"
                                                                 onClick={enableSorting ? header.column.getToggleSortingHandler() : undefined}
                                                                 style={{cursor: enableSorting && header.column.getCanSort() ? 'pointer' : ''}}>
              {header.column.getIsSorted() === 'asc' ? sortingIcons.asc : header.column.getIsSorted() === 'desc' ? sortingIcons.desc : sortingIcons.none}
            </span>)}
        </div>))}
      </div>))}
    </div>
    <div className="gridTableMainContainer">
      {table.getRowModel().rows.map(((row, i) => (<div key={row.id} className={"gridTableRow"}>
        {row.getVisibleCells().map(cell => (
          <div key={cell.id} className={"gridTableCell" + ((i % 2) === 0 ? ' evenRow' : ' oddRow')}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>))}
      </div>)))}
    </div>
  </div>);
}