import {CSSProperties, JSX} from "react";

import './nice-table.css';

export interface NiceTableColumnDef<T> {
  title: string;
  key: string;
  width?: string;
  /**
   * Class name for the <td> elements
   */
  tdClassName?: string;
  /**
   * Class name for the <th> elements
   */
  thClassName?: string;
  cellContent: (data: T, rowIndex: number) => JSX.Element;
}

export interface NiceTableProps<T> {
  columnDefs: NiceTableColumnDef<T>[];
  rows: T[];
  stickyHeader?: boolean;
  highlightedRow?: number | null;
  getRowKey?: (row: T, index: number) => string | number;
  getRowClassName?: (row: T, index: number) => string;
  /**
   * Class name for the <table> element
   */
  className?: string;
  oddEvenHighlight?: boolean;
  oddRowClassName?: string;
  evenRowClassName?: string;
}

export default function NiceTable<T>(props: NiceTableProps<T>) {

  const oddEvenHighlight = props.oddEvenHighlight ?? false;
  const oddRowClassName = props.oddRowClassName ?? 'odd';
  const evenRowClassName = props.evenRowClassName ?? 'even';
  const tableClasses = ['nice-table'];
  const highlightedRow = props.highlightedRow ?? null;
  const stickyHeader = props.stickyHeader ?? false;
  if (props.className) {
    tableClasses.push(props.className);
  }

  const getTh = (columnDef: NiceTableColumnDef<T>) => {
    const style: CSSProperties = columnDef.width !== undefined ? {width: columnDef.width} : {};
    const classes: string[] = [];
    if (stickyHeader) {
      classes.push('sticky');
    }
    if (columnDef.thClassName !== undefined) {
      classes.push(columnDef.thClassName);
    }
    return <th key={columnDef.key + 'head'} style={style} className={classes.join(' ')}>
      {columnDef.title}
    </th>;
  };

  const getTd = (columnDef: NiceTableColumnDef<T>, row: T, rowIndex: number) => {
    return <td key={columnDef.key + rowIndex.toString()} className={columnDef.tdClassName ?? ''}>
      {columnDef.cellContent(row, rowIndex)}
    </td>;
  };

  const getTrClass = (row: T, rowIndex: number) => {
    const classes: string[] = [];
    if (props.getRowClassName) {
      classes.push(props.getRowClassName(row, rowIndex));
    }
    if (highlightedRow !== null && highlightedRow === rowIndex) {
      classes.push('highlighted');
    }
    if (oddEvenHighlight) {
      classes.push(rowIndex % 2 === 0 ? evenRowClassName : oddRowClassName);
    }
    return classes.join(' ');
  };

  return <table className={tableClasses.join(' ')}>
    <thead>
    <tr key={'head'}>
      {props.columnDefs.map((columnDef) => getTh(columnDef))}
    </tr>
    </thead>
    <tbody>
    {props.rows.map((row, rowIndex) => {
      const rowKey = props.getRowKey ? props.getRowKey(row, rowIndex) : rowIndex;
      return (
        <tr key={rowKey} className={getTrClass(row, rowIndex)}>
          {props.columnDefs.map((columnDef) => getTd(columnDef, row, rowIndex)
          )}
        </tr>
      );
    })}
    </tbody>
  </table>;
}