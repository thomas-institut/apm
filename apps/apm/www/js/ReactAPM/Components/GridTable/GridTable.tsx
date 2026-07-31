import {CSSProperties, Fragment, JSX} from "react";
import './grid-table.css';

export interface GridTableColumnDef<T> {
  /**
   * Title of the column.
   */
  title: string;
  /**
   * Width of the column in pixels of ems, e.g. '10px' or '10em'. If not specified, the column will have a width of 'max-content'.
   */
  width?: string;
  headerClassName?: string;
  className?: string;
  /**
   * Function to render the content of a row. The function receives the row index and a boolean indicating whether the row is highlighted.
   */
  cellContent: (row: T, rowIndex: number, isHighlighted: boolean) => JSX.Element;
  /**
   * Whether to wrap the content in a div. Defaults to true.
   */
  wrapContentInDiv?: boolean;
}

interface GridTableProps<T> {
  columnDefs: GridTableColumnDef<T>[];
  rows: T[];
  className?: string;
  oddEvenHighlight?: boolean;
  oddRowClassName?: string;
  evenRowClassName?: string;
  highlightedRow?: number;
  highlightedRowClassName?: string;
  stickyHeader?: boolean;
}


export default function GridTable<T>(props: GridTableProps<T>) {

  const oddRowClassName = props.oddRowClassName || "odd-row";
  const evenRowClassName = props.evenRowClassName || "even-row";
  const highlightedRowClassName = props.highlightedRowClassName || "highlighted-row";
  const oddEvenHighlight = props.oddEvenHighlight ?? true;

  const tableCssGridTemplate = props.columnDefs.map((column) => {
    if (column.width !== undefined) {
      if (isValidWidth(column.width)) {
        return column.width;
      } else {
        console.warn(`Invalid width for column: ${column.title}. Width must be a positive number followed by 'px' or 'em'.`);
        return 'max-content';
      }
    }
    return 'max-content';
  }).join(" ");

  const header = props.columnDefs.map((column) => {
    return <div className={column.headerClassName ?? 'header'}>{column.title}</div>;
  });

  const rowFragment = (row: T, index: number) => {
    return <Fragment key={`row-${index}`}>
      {props.columnDefs.map((columnDef) => {
        const isRowHighlighted = props.highlightedRow === index;
        const content = columnDef.cellContent(row, index, isRowHighlighted);
        const wrapContentInDiv = columnDef.wrapContentInDiv ?? true;
        if (!wrapContentInDiv) {
          return content;
        }
        const isEvenRow = index % 2 === 0;
        const rowContentClasses: string[] = ['cell'];
        if (columnDef.className !== undefined) {
          rowContentClasses.push(columnDef.className);
        }
        if (oddEvenHighlight) {
          if (isEvenRow) {
            rowContentClasses.push(evenRowClassName);
          } else {
            rowContentClasses.push(oddRowClassName);
          }
        }
        if (isRowHighlighted) {
          rowContentClasses.push(highlightedRowClassName);
        }

        if (wrapContentInDiv) {
          return <div className={rowContentClasses.join(' ')}>{content}</div>;
        }
        return content;
      })}</Fragment>;
  };

  const tableStyle: CSSProperties = {
    alignItems: "center",
    display: 'grid',
    gridTemplateColumns: tableCssGridTemplate,
  };

  const divClasses = ['grid-table'];
  if (props.className !== undefined) {
    divClasses.push(props.className);
  }

  return <div style={tableStyle} className={divClasses.join(' ')}>
    <Fragment key="header">{header}</Fragment>
    { props.rows.map( (row, index) => rowFragment(row, index))}
  </div>;

}

function isValidWidth(width: string): boolean {
  return width !== '' && (width.endsWith("px") || width.endsWith('em'));
}