/*
 *  Copyright (C) 2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


/*
   A generic table editor that allows for operations suitable for
   editing a collation table. The class takes a matrix with values
   and creates a set of tables that can be edited as a whole:
    - a cell can be moved to the left or to the right provided there's an
      empty cell where it will go
    - new columns can be created adding empty cells
    - columns with empty values can be deleted
    - columns can be grouped with contiguous columns

   The editor is agnostic to actual matrix values. The user can provide functions
   to generate the table's contents and to detect empty values

 */

import {deepCopy} from '@/toolbox/Util';
// @ts-ignore
import {Matrix} from '@thomas-inst/matrix';
import {SequenceWithGroups} from '@/Edition/SequenceWithGroups';
import {SimpleProfiler} from '@/SimpleProfiler';
import {OptionalPropsRequired} from "@/toolbox/OptionalProps";
import {
  init,
  classModule,
  propsModule,
  styleModule,
  eventListenersModule,
  h,
  VNode,
  attributesModule
} from 'snabbdom';

const patch = init([
  classModule,
  propsModule,
  styleModule,
  eventListenersModule,
  attributesModule
]);

// Table Edit Modes
export const EditModeOff = 'off';
export const EditModeMove = 'move';
export const EditModeGroup = 'group';

export type EditMode = 'off' | 'move' | 'group';

// events
export const CellDrawnEvent = 'cell-drawn';
export const TableDrawnEvent = 'table-drawn';
export const CellPreShiftEvent = 'cell-pre-shift';
export const CellPostShiftEvent = 'cell-post-shift';
export const CellShiftEvent = 'cell-shift';
export const ContentChangedEvent = 'content-changed';
export const PreTableDrawnEvent = 'table-drawn-pre';
// export const ColumnAddEvent = 'column-add';
export const ColumnGroupEvent = 'column-group';
export const ColumnUngroupEvent = 'column-ungroup';
export const ColumnSelectEvent = 'column-select';
export const ColumnClearSelectionEvent = 'column-clear-selection';


//icons
const defaultIcons: TableEditorIcons = {
  moveCellLeft: '&triangleleft;', // ◁
  moveCellRight: '&triangleright;', // ▷
  pushCellsRight: '&#x21a3;',   // ↣
  pushCellsLeft: '&#x21a2;', // ↢
  editCell: '&#x270D;', //	✍
  addColumnLeft: '<sup>&#x25c3;</sup>+', addColumnRight: '+<sup>&#x25b9;', deleteColumn: '&#x2715;', // ✕
  confirmCellEdit: '&#x2714;', // ✔
  cancelCellEdit: ' &#x2718;',  // ✘
  groupedColumn: '&ndash;', unGroupedColumn: '&vert;'
};

interface TableEditorIcons {
  moveCellLeft: string;
  moveCellRight: string;
  pushCellsRight: string;
  pushCellsLeft: string;
  editCell: string;
  addColumnLeft: string;
  addColumnRight: string;
  deleteColumn: string;
  confirmCellEdit: string;
  unGroupedColumn: string;
  groupedColumn: string;
  cancelCellEdit: string;
}

interface TableEditorOptions<T> {

  // Row definitions
  rowDefinition: RowDefinition<T>[];

  // :ist of columns that are grouped with the next
  //
  // e.g. [ 1, 5] means that column 1 is grouped with column 2 and column 5 is grouped with column 6.
  groupedColumns?: number[];

  // Icon set
  icons?: TableEditorIcons;

  // the html id of the container where the table will appear
  id: string;

  textDirection?: string;

  // if false, the table will not be drawn in the constructor,
  // the user would have to redraw it manually later.
  // If the user attaches event handlers that reference the TableEditor,
  // drawing the table before the object is constructed will cause
  // an error. Setting this option to false avoids that.
  drawTableInConstructor?: boolean;

  // if true, the table will be split into multiple tables of the number of columns given in columnsPerRow.
  showInMultipleRows?: boolean;
  columnsPerRow?: number;

  // if true, the editor will redraw every cell that has moved when the
  // user clicks the move/shift buttons. If false, it is up to the
  // external event handlers to redraw
  redrawOnCellShift?: boolean;

  // a function to be called to generate the html content of a table cell
  generateCellContent: (row: number, col: number, value: T) => string;

  // a function to be called to generate the text to be edited in edit mode
  generateCellContentEditMode: (row: number, col: number, value: T) => string;

  getEmptyValue: () => T;
  isEmptyValue: (row: number, col: number, value: T) => boolean;

  // a function to test whether a particular cell is editable
  // It will only be called on rows marked as editable, which means that a
  // particular cell is only editable if belongs to an editable row and this function returns 'true
  // The default function returns true, thereby making all cells in an editable row editable
  isCellEditable?: (row: number, col: number, value: T) => boolean;

  // a function to be called when the user clicks on an editable cell, before any cell editing setup
  // is done. If the function returns false, editing will not occur
  // The default function returns true, thereby making all cells editable.
  onCellEnterEditMode?: (row: number, col: number) => boolean;


  // Event handlers
  // a function to be called for each cell that was in edit mode before
  // going to any other mode. The default function does nothing.
  onCellLeaveEditMode?: (row: number, col: number) => void;
  onCellDrawnEventHandler?: ((row: number, col: number) => void) | null;
  onTableDrawnEventHandler?: () => void;
  onContentChangedEventHandler?: (row: number, col: number) => void;
  onColumnGroupEventHandler?: (column: number, direction: string) => void;
  onColumnAdd?: (newCol: number) => void;
  onColumnDelete?: (deletedCol: number, isLastDeletedColumnInOperation: boolean) => void;
  onColumnUngroupEventHandler?: (column: number) => void;
  onCellCancelEdit?: (row: number, col: number, editorTextValue: string) => void;

  // a function to be called when the user clicks on the confirm edit button in edit mode
  onCellConfirmEdit: (row: number, col: number, editorTextValue: string) => ValueChangeReport<T>;
  generateTableClasses?: () => string[];
  generateCellClasses?: (row: number, col: number, value: T) => string[];
  generateCellTdExtraAttributes?: (row: number, col: number, value: T) => TdExtraAttributes[];
  cellValidationFunction: (row: number, col: number, currentText: string) => CellValidationReport;
  canDeleteColumn?: (col: number) => boolean;
  emptyCellHtml?: string;
  debug?: boolean;
}

export interface RowDefinition<T> {
  title: string;
  isEditable: boolean;
  values: T[];
}

export interface TdExtraAttributes {
  attr?: string;
  val?: string;
}

export interface ValueChangeReport<T> {
  valueChange: boolean;
  value: T;
}

export interface CellValidationReport {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// classes
const hiddenClass = 'hidden';
const headerButtonClass = 'header-button';
const moveModeButtonClass = 'button-move-mode';
const cellButtonClass = 'cell-button';
const editCellButtonClass = 'edit-cell-button';
const moveCellLeftButtonClass = 'move-cell-left-button';
const moveCellRightButtonClass = 'move-cell-right-button';
const pushCellsLeftButtonClass = 'push-cells-left-button';
const pushCellsRightButtonClass = 'push-cells-right-button';
const addColumnLeftButtonClass = 'add-column-left-button';
const addColumnRightButtonClass = 'add-column-right-button';
const deleteColumnButtonClass = 'delete-column-button';
const tableEditModeClassPrefix = 'table-edit-mode-';
const tablesDivClass = 'tables-div';
const tableClass = 'te-table';
const headerClass = 'te-th';
const specificHeaderClassPrefix = 'te-th-';
const cellClass = 'te-cell';
const specificCellClassPrefix = 'te-cell-';
const cellContentClass = 'te-cell-content';
const tableRowClass = 'te-tr';
const tableSpecificRowClassPrefix = 'te-tr-';
const tableRowTitleClass = 'te-row-title';
const tableRowTitleEdition = 'te-row-title-edition';
const tableFirstColClass = 'te-table-first-col';
const linkButtonClass = 'link-button';
const specificColumnLinkButtonClassPrefix = 'link-button-';
const inputClass = 'te-input';
const confirmEditButtonClass = 'confirm-edit-button';
const cancelEditButtonClass = 'cancel-edit-button';

const groupNoneClass = 'group-none';
const groupNextClass = 'group-next';
const groupPreviousClass = 'group-previous';
const groupBothClass = 'group-both';

const groupIconFloatLeftClass = 'group-icon-float-left';
const groupIconFloatRightClass = 'group-icon-float-right';


export class TableEditor<T> {

  public matrix: Matrix;
  public columnSequence: SequenceWithGroups;
  public tableEditMode: EditMode;
  private readonly options: Required<TableEditorOptions<T>>;
  private readonly debug: boolean;
  private rowDefinition: RowDefinition<T>[];
  private editFlagMatrix: Matrix;
  private readonly containerSelector: string;
  private readonly container: HTMLElement | null;
  private icons: TableEditorIcons;
  private selectedColumnsStart: number;
  // private emptyCellHtml: string = '&mdash;';
  private waitingForScrollZero: boolean = false;
  private selectedColumnsEnd: number;
  private currentYScroll!: number;
  private currentXScroll!: number;
  private eventHandlersSetup = false;
  // private lastHoveredCell: HTMLElement | null = null;
  private vnode: VNode | HTMLElement | null = null;
  private redrawScheduled = false;

  constructor(options: TableEditorOptions<T>) {
    const defaults: OptionalPropsRequired<TableEditorOptions<T>> = {
      groupedColumns: [],
      textDirection: 'ltr',
      redrawOnCellShift: true,
      showInMultipleRows: false,
      columnsPerRow: 10,
      drawTableInConstructor: true,
      isCellEditable: () => true,
      onCellEnterEditMode: (row: number, col: number) => {
        this.debug && console.log(`Cell Enter Edit Mode ${row}:${col}`);
        return true;
      },
      onCellLeaveEditMode: (row: number, col: number) => {
        this.debug && console.log(`Cell Leave Edit Mode ${row}:${col}`);
      },
      generateTableClasses: () => [] as string[],
      generateCellClasses: () => [] as string[],
      generateCellTdExtraAttributes: () => [] as TdExtraAttributes[],
      onCellDrawnEventHandler: null,
      onTableDrawnEventHandler: () => {
      },
      canDeleteColumn: () => true,
      onContentChangedEventHandler: () => {
      },
      onColumnGroupEventHandler: () => {
      },
      onColumnAdd: () => {
      },
      onColumnDelete: () => {
      },
      onColumnUngroupEventHandler: () => {
      },
      onCellCancelEdit: () => {
      },
      emptyCellHtml: '&mdash;',
      debug: false,
      icons: defaultIcons
    };

    this.options = {...defaults, ...options};
    this.debug = this.options.debug;

    this.rowDefinition = this.options.rowDefinition;
    this.matrix = new Matrix(0, 0, this.options.getEmptyValue());
    this.matrix.setFromArray(this.rowDefinition.map(r => r.values));
    this.columnSequence = new SequenceWithGroups(this.matrix.nCols, this.options.groupedColumns);
    this.editFlagMatrix = new Matrix(this.matrix.nRows, this.matrix.nCols, false);
    this.containerSelector = '#' + this.options.id;
    this.container = document.querySelector(this.containerSelector);
    this.icons = this.options.icons ?? defaultIcons;
    this.tableEditMode = EditModeOff;
    this.selectedColumnsStart = -1;
    this.selectedColumnsEnd = -1;

    if (this.container) {
      this.container.classList.add('te-container');
      this.container.classList.add(tableEditModeClassPrefix + this.tableEditMode);
      this.injectCss();
    }

    if (this.options.onCellDrawnEventHandler !== null) {
      this.on(CellDrawnEvent, this.options.onCellDrawnEventHandler);
    }

    if (this.options.onTableDrawnEventHandler !== null) {
      this.on(TableDrawnEvent, this.options.onTableDrawnEventHandler);
    }

    if (this.options.onContentChangedEventHandler !== null) {
      this.on(ContentChangedEvent, this.options.onContentChangedEventHandler);
    }

    if (this.options.onColumnGroupEventHandler !== null) {
      this.on(ColumnGroupEvent, this.options.onColumnGroupEventHandler);
    }
    if (this.options.onColumnUngroupEventHandler !== null) {
      this.on(ColumnGroupEvent, this.options.onColumnUngroupEventHandler);
    }
    if (this.options.drawTableInConstructor) {
      this.redrawTable();
    }

    window.addEventListener('scroll', () => {
      if (this.waitingForScrollZero && window.scrollY === 0) {
        this.waitingForScrollZero = false;
        this.restoreScrollNow();
      }
    });
  }

  private injectCss() {
    if (document.getElementById('te-style')) return;
    const style = document.createElement('style');
    style.id = 'te-style';
    style.innerHTML = `
      .te-container:not(.${tableEditModeClassPrefix}${EditModeMove}) .${moveModeButtonClass}, 
      .te-container:not(.${tableEditModeClassPrefix}${EditModeMove}) .${editCellButtonClass} { display: none; }
      .te-container:not(.${tableEditModeClassPrefix}${EditModeGroup}) .${linkButtonClass} { display: none; }
      
      .te-container.${tableEditModeClassPrefix}${EditModeMove} .${cellClass} .${cellButtonClass} { display: none; }
      .te-container.${tableEditModeClassPrefix}${EditModeMove} .${cellClass}:hover .${cellButtonClass} { display: inline-block; }
      
      .te-container.${tableEditModeClassPrefix}${EditModeMove} .${headerClass} .${headerButtonClass} { display: none; }
      .te-container.${tableEditModeClassPrefix}${EditModeMove} .${headerClass}:hover .${headerButtonClass} { display: inline-block; }
    `;
    document.head.appendChild(style);
  }

  static genTextIconSet() {
    return defaultIcons;
  }

  getValue(row: number, col: number) {
    return this.matrix.getValue(row, col);
  }

  setValue(row: number, col: number, value: any) {
    this.matrix.setValue(row, col, value);
  }

  setOption(optionName: string, value: any) {
    // TODO: validate the value!
    // @ts-ignore
    this.options[optionName] = value;
  }

  getMatrix() {
    return this.matrix;
  }

  getTableEditMode() {
    return this.tableEditMode;
  }

  setEditMode(newEditMode: EditMode, redraw = true) {
    if (this.tableEditMode === newEditMode) return;
    if (this.getValidEditModes().indexOf(newEditMode) === -1) {
      console.error('Invalid edit mode: ' + newEditMode);
      return;
    }

    const oldEditMode = this.tableEditMode;
    this.tableEditMode = newEditMode;

    if (this.container) {
      this.getValidEditModes().forEach((m) => {
        this.container?.classList.remove(tableEditModeClassPrefix + m);
      });
      this.container.classList.add(tableEditModeClassPrefix + newEditMode);
    }

    if (redraw && (oldEditMode === EditModeOff || newEditMode === EditModeOff)) {
      this.redrawTable();
    } else {
      this.setupTableForEditMode(this.tableEditMode);
    }
  }

  editModeOn(redraw = true) {
    this.setEditMode(EditModeMove, redraw);
  }

  showInSingleRow(redrawIfNeeded = true) {
    let redrawRequired = false;
    if (this.options.showInMultipleRows) {
      redrawRequired = true;
    }
    this.options.showInMultipleRows = false;
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable();
    }
  }

  redrawTable(force = false) {
    if (force) {
      this._doRedrawTable();
      this.redrawScheduled = false;
      return;
    }

    if (this.redrawScheduled) return;
    this.redrawScheduled = true;

    queueMicrotask(() => {
      if (!this.redrawScheduled) return;
      this.redrawScheduled = false;
      this._doRedrawTable();
    });
  }

  private _doRedrawTable() {
    //console.log("Redrawing table")
    let profiler = new SimpleProfiler('TableRedraw');
    this.dispatchTableDrawnPreEvent();
    if (this.container) {
      const newVNode = this.genTableVNode();
      profiler.lap('vnode generated');
      if (!this.vnode) {
        this.container.innerHTML = '';
        const placeholder = document.createElement('div');
        this.container.appendChild(placeholder);
        this.vnode = placeholder;
      }
      this.vnode = patch(this.vnode, newVNode);
    }
    profiler.lap('vnode patched');
    this.setupTableForEditMode(this.tableEditMode);
    this.setupTableEventHandlers();
    // dispatch redraw callbacks
    if (this.options.onTableDrawnEventHandler !== null) {
      this.dispatchTableDrawnEvent();
    }
    profiler.stop();
  }

  private genCellVNode(row: number, col: number, tableColumnNumber = -1): VNode {
    let value = this.matrix.getValue(row, col);
    let cellClasses: Record<string, boolean> = {
      [cellClass]: true,
      [this.getTdClass(row, col)]: true,
      [this.getColClass(col)]: true
    };
    if (tableColumnNumber === 0) {
      cellClasses[tableFirstColClass] = true;
    }
    this.getGroupClasses(col).forEach(c => cellClasses[c] = true);
    this.options.generateCellClasses(row, col, value).forEach(c => cellClasses[c] = true);
    let tdExtraArray = this.options.generateCellTdExtraAttributes ? this.options.generateCellTdExtraAttributes(row, col, value) : [];

    const attrs: Record<string, string> = {};
    tdExtraArray.forEach(attr => {
      if (attr.attr) attrs[attr.attr] = attr.val ?? '';
    });

    const isEditing = this.editFlagMatrix.getValue(row, col);

    return h('td', {
      class: cellClasses,
      attrs: attrs,
      hook: {
        insert: () => this.dispatchCellDrawnEvent(row, col),
        update: (oldVNode, vnode) => {
          if (oldVNode.data?.attrs?.class !== vnode.data?.attrs?.class || oldVNode.children !== vnode.children) {
             this.dispatchCellDrawnEvent(row, col);
          }
        }
      }
    }, isEditing ? this.genTdChildrenVNodesCellEditMode(row, col) : this.genTdChildrenVNodes(row, col));
  }

  private genThVNode(col: number): VNode {
    let thClasses: Record<string, boolean> = {
      [this.getThClass(col)]: true,
      [this.getColClass(col)]: true
    };

    if (this.tableEditMode === EditModeOff) {
      return h('th', {class: thClasses}, [(col + 1).toString()]);
    }

    let addColumnBeforeIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnLeft : this.icons.addColumnRight;
    let addColumnAfterIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnRight : this.icons.addColumnLeft;

    let children: (VNode | string)[] = [];
    children.push(this.genButtonVNode(addColumnBeforeIcon, [addColumnLeftButtonClass, headerButtonClass, moveModeButtonClass], 'Add column before'));
    children.push((col + 1).toString());
    if (this.canDeleteColumn(col)) {
      children.push(this.genButtonVNode(this.icons.deleteColumn, [deleteColumnButtonClass, headerButtonClass, moveModeButtonClass], 'Delete this column'));
    }
    children.push(this.genButtonVNode(addColumnAfterIcon, [addColumnRightButtonClass, headerButtonClass, moveModeButtonClass], 'Add column after'));

    if (col !== this.matrix.nCols - 1) {
      let linkIcon = this.icons.unGroupedColumn;
      let groupClass = groupNoneClass;
      let title = "Click to group with next column";
      let floatClass = this.options.textDirection === 'ltr' ? groupIconFloatRightClass : groupIconFloatLeftClass;
      if (this.isColumnGroupedWithNext(col)) {
        groupClass = groupNextClass;
        linkIcon = this.icons.groupedColumn;
        title = "Click to ungroup with next column";
      }
      children.push(this.genButtonVNode(linkIcon, [linkButtonClass, `${specificColumnLinkButtonClassPrefix}${col}`, groupClass, floatClass], title));
    }
    return h('th', {class: thClasses}, children);
  }

  public redrawHeader(_col: number) {
    this.redrawTable();
  }

  // getColumnGroups() {
  //   return this.columnSequence.getGroups();
  // }


  isRowEditable(row: number) {
    return this.rowDefinition[row].isEditable;
  }

  isCellEditable(row: number, col: number) {
    return this.isRowEditable(row) && this.options.isCellEditable(row, col, this.matrix.getValue(row, col));
  }

  // getRow(row: number) {
  //   return this.matrix.getRow(row);
  // }

  // getColumn(col: number) {
  //   return this.matrix.getColumn(col);
  // }

  private genTdChildrenVNodes(row: number, col: number): (VNode | string)[] {
    if (this.tableEditMode === EditModeOff) {
      return [h('span', {
        class: {[cellContentClass]: true},
        props: {innerHTML: this.options.generateCellContent(row, col, this.matrix.getValue(row, col))}
      })];
    }

    let children: (VNode | string)[] = [];

    let moveCellBackwardIcon = this.icons.moveCellLeft;
    let pushCellsBackwardIcon = this.icons.pushCellsLeft;
    let moveCellForwardIcon = this.icons.moveCellRight;
    let pushCellsForwardIcon = this.icons.pushCellsRight;

    if (this.options.textDirection === 'rtl') {
      moveCellBackwardIcon = this.icons.moveCellRight;
      pushCellsBackwardIcon = this.icons.pushCellsRight;
      moveCellForwardIcon = this.icons.moveCellLeft;
      pushCellsForwardIcon = this.icons.pushCellsLeft;
    }

    if (this.canMoveCellLeft(row, col)) {
      children.push(this.genButtonVNode(moveCellBackwardIcon, [moveCellLeftButtonClass, cellButtonClass, moveModeButtonClass], 'Move backward'));
    }
    if (this.canPushCellsLeft(row, col)) {
      let firstCol = this.getFirstEmptyCellToTheLeft(row, col) + 1;
      children.push(this.genButtonVNode(pushCellsBackwardIcon, [pushCellsLeftButtonClass, cellButtonClass, moveModeButtonClass], `Push ${firstCol + 1}-${col + 1} back 1 column`));
    }
    children.push(h('span', {
      class: {[cellContentClass]: true},
      props: {innerHTML: this.options.generateCellContent(row, col, this.matrix.getValue(row, col))}
    }));
    if (this.isCellEditable(row, col)) {
      children.push(this.genButtonVNode(this.icons.editCell, [editCellButtonClass, cellButtonClass], 'Edit'));
    }
    if (this.canPushCellsRight(row, col)) {
      let lastCol = this.getFirstEmptyCellToTheRight(row, col) - 1;
      children.push(this.genButtonVNode(pushCellsForwardIcon, [pushCellsRightButtonClass, cellButtonClass, moveModeButtonClass], `Push ${col + 1}-${lastCol + 1} forward 1 column`));
    }
    if (this.canMoveCellRight(row, col)) {
      children.push(this.genButtonVNode(moveCellForwardIcon, [moveCellRightButtonClass, cellButtonClass, moveModeButtonClass], 'Move forward'));
    }
    return children;
  }


  // getRowTitle(row: number) {
  //   return this.rowDefinition[row].title;
  // }

  // isTableInEditMode() {
  //   return this.tableEditMode !== EditModeOff;
  // }

  private genTdChildrenVNodesCellEditMode(row: number, col: number): (VNode | string)[] {
    let value = this.getValue(row, col);
    let textToEdit = this.options.generateCellContentEditMode(row, col, value);
    let inputSize = Math.min(textToEdit.length, 8);
    if (textToEdit === '') {
      inputSize = 5;
    }

    return [
      h('input', {
        props: {type: 'text', value: textToEdit, size: inputSize},
        class: {[inputClass]: true}
      }),
      this.genButtonVNode(this.icons.confirmCellEdit, [confirmEditButtonClass], 'Confirm edit'),
      this.genButtonVNode(this.icons.cancelCellEdit, [cancelEditButtonClass], 'Cancel edit')
    ];
  }


  // toggleTableEditMode() {
  //   if (this.tableEditMode === EditModeOff) {
  //     this.setEditMode(EditModeMove);
  //   } else {
  //     this.setEditMode(EditModeOff);
  //   }
  // }

  private setupTableEventHandlers() {
    if (this.container && !this.eventHandlersSetup) {
      this.container.addEventListener('click', this.onContainerClick);
      this.container.addEventListener('keyup', this.onContainerKeyUp);
      this.eventHandlersSetup = true;
    }
  }

  shiftCells(row: number, firstCol: number, lastCol: number, direction: 'left' | 'right', numCols = 1) {
    //let profiler = new SimpleProfiler('ShiftCells')
    console.log(`Shifting cells ${firstCol} to ${lastCol} ${direction} ${numCols} column(s)`);

    // Check if the shift makes sense
    if (firstCol > lastCol || firstCol < 0 || lastCol >= this.matrix.nCols || numCols < 1) {
      console.log('Given columns do not make sense');
      return false;
    }
    if (direction === 'right' && lastCol + numCols >= this.matrix.nCols) {
      console.log(`This ${direction} shift overflows the matrix ;)`);
      return false;
    }
    if (direction === 'left' && firstCol - numCols < 0) {
      console.log(`This ${direction} shift under flows the matrix ;)`);
      return false;
    }
    //profiler.lap('checks done')
    // dispatch pre cell shift events
    this.dispatchCellShiftEvents('pre', direction, row, firstCol, lastCol, numCols);

    //profiler.lap('pre shift events dispatched')
    // move values in matrix
    let emptyValue = this.options.getEmptyValue();
    const currentValues = deepCopy(this.matrix.getRow(row) as T[]);

    if (direction === 'right') {
      for (let i = 0; i < numCols; i++) {
        this.matrix.setValue(row, firstCol + i, emptyValue);
      }
      for (let col = firstCol + numCols; col <= lastCol + numCols; col++) {
        this.matrix.setValue(row, col, currentValues[col - numCols]);
      }
    } else {
      for (let i = 0; i < numCols; i++) {
        this.matrix.setValue(row, lastCol - i, emptyValue);
      }
      for (let col = lastCol - numCols; col >= firstCol - numCols; col--) {
        this.matrix.setValue(row, col, currentValues[col + numCols]);
      }
    }
    this.redrawTable();
    // dispatch post move events
    //console.log('Dispatching post move events')
    this.dispatchCellShiftEvents('post', direction, row, firstCol, lastCol, numCols);

    //profiler.stop()
  }

  private genButtonVNode(icon: string, classes: string[], title = '') {
    const classObj: Record<string, boolean> = {};
    classes.forEach(c => {
      if (c && c !== hiddenClass) classObj[c] = true;
    });
    return h('a', {
      props: {href: '#', title: title, innerHTML: icon},
      class: classObj
    });
  }


  getClassList(element: HTMLElement): string[] {
    if (!(element instanceof HTMLElement)) {
      console.warn('Element is not an HTMLElement, returning empty array', element, typeof element);
      console.trace();
      return [];
    }
    if (element.classList === undefined) {
      console.warn('Element has no classList, returning empty array', element, typeof element);
      return [];
    }

    const classes: string[] = [];
    element.classList.forEach((c) => classes.push(c));
    return classes;
  }

  // isTableShownInMultipleRows() {
  //   return this.options.showInMultipleRows;
  // }

  // showInMultipleRows(numCols = -1, redrawIfNeeded = true) {
  //   let redrawRequired = false;
  //
  //   if (!this.options.showInMultipleRows) {
  //     redrawRequired = true;
  //   }
  //   let newNumCols = this.options.columnsPerRow;
  //   if (numCols >= 5) {
  //     newNumCols = numCols;
  //     if (newNumCols !== this.options.columnsPerRow) {
  //       redrawRequired = true;
  //     }
  //   }
  //   this.options.showInMultipleRows = true;
  //   this.options.columnsPerRow = newNumCols;
  //   if (redrawIfNeeded && redrawRequired) {
  //     this.redrawTable();
  //   }
  // }

  redrawCell(_row: number, _col: number) {
    this.redrawTable();
  }

  refreshCell(_row: number, _col: number) {
    this.redrawTable();
  }

  isColumnGroupedWithNext(col: number) {
    return this.columnSequence.isGroupedWithNext(col);
  }

  isColumnGroupedWithPrevious(col: number) {
    return this.columnSequence.isGroupedWithPrevious(col);
  }

  refreshCellContent(_row: number, _col: number) {
    this.redrawTable();
  }

  refreshCellClassesTd(_td: HTMLElement, _row: number, _col: number) {
    this.redrawTable();
  }

  refreshCellClasses(_row: number, _col: number) {
    this.redrawTable();
  }

  public refreshColumn(_col: number) {
    this.redrawTable();
  }

  public refreshColumnClasses(_col: number) {
    this.redrawTable();
  }

  refreshCellAttributes(_row: number, _col: number) {
    this.redrawTable();
  }

  enterCellEditMode(row: number, col: number) {
    //console.log('Entering edit mode, ' + row + ':' + col)
    if (!this.options.onCellEnterEditMode(row, col)) {
      return;
    }
    if (!this.container) return;
    this.editFlagMatrix.setValue(row, col, true);
    this.redrawTable(true);
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (td) {
      td.classList.add('edit-mode');
      let input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
      if (input) {
        input.addEventListener('focus', function () {
          input.setSelectionRange(10000, 10000);
        });
        input.focus();
      }
    }
  }

  isCellInEditMode(row: number, col: number): boolean {
    return this.editFlagMatrix.getValue(row, col);
  }

  leaveCellEditMode(row: number, col: number) {
    //console.log('Leaving edit mode, ' + row + ':' + col)
    if (!this.container) return;
    this.editFlagMatrix.setValue(row, col, false);
    this.redrawTable();
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (td) {
      td.classList.remove('edit-mode');
    }
    this.options.onCellLeaveEditMode(row, col);
    this.dispatchCellDrawnEvent(row, col);
  }

  confirmEdit(row: number, col: number) {
    if (!this.container) return false;
    let td = this.container.querySelector(this.getTdSelector(row, col));
    if (!td) return false;
    let confirmBtn = td.querySelector('.confirm-edit-button');
    if (confirmBtn?.classList.contains('invalid')) {
      return false;
    }
    let input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
    let newText = input?.value ?? '';
    let confirmResult = this.options.onCellConfirmEdit(row, col, newText);

    if (confirmResult.valueChange) {
      this.setValue(row, col, confirmResult.value);
      this.dispatchContentChangedEvent(row, col);
    }

    this.leaveCellEditMode(row, col);
    return false;
  }

  clearColumnSelection() {
    if (this.container) {
      for (let i = this.selectedColumnsStart; i <= this.selectedColumnsEnd; i++) {
        this.container.querySelector(this.getThSelector(i))?.classList.remove('selected');
      }
    }
    this.selectedColumnsStart = -1;
    this.selectedColumnsEnd = -1;
    this.dispatchEvent(ColumnClearSelectionEvent, {});
  }

  insertColumnAfter(col: number) {
    this.matrix.addColumnAfter(col, this.options.getEmptyValue());
    this.columnSequence.insertNumberAfter(col);
  }

  forceRestoreScroll(timeOut = 250) {

    setTimeout(() => {
      if (this.waitingForScrollZero) {
        console.log('Tired of waiting for scroll zero, restoring scroll after ' + timeOut + ' ms');
        this.restoreScrollNow();
        this.waitingForScrollZero = false;
      }
    }, timeOut);
  }

  restoreScrollNow() {
    window.scrollTo(this.currentXScroll, this.currentYScroll);
  }

  /**
   * Deletes a single column from the table inner data
   * (nothing is done in the UI)
   * @param {number}col
   */
  deleteSingleColumnData(col: number) {
    this.matrix.deleteColumn(col);
    this.columnSequence.removeNumber(col);
  }

  getEmptyColumnCount() {
    let count = 0;
    for (let col = 0; col < this.matrix.nCols; col++) {
      if (this.canDeleteColumn(col)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Deletes all empty columns in the table
   */
  compactTable() {
    console.log(`Compacting table`);
    // 1. make a list of all columns to delete
    let columnsToDelete = [];
    for (let col = 0; col < this.matrix.nCols; col++) {
      if (this.canDeleteColumn(col)) {
        columnsToDelete.push(col);
      }
    }
    if (columnsToDelete.length === 0) {
      console.log(`No columns that can be deleted found in table`);
      return;
    }
    console.log(`Deleting ${columnsToDelete.length} empty columns from table`);
    let countDeletedColumns = 0;
    this.currentYScroll = window.scrollY;
    this.currentXScroll = window.scrollX;
    this.waitingForScrollZero = true;
    columnsToDelete.forEach((col) => {
      if (this.container) {
        this.container.querySelector(this.getThSelector(col))?.classList.add('te-deleting');
      }
      let actualColumnNumberToDelete = col - countDeletedColumns;

      this.deleteSingleColumnData(actualColumnNumberToDelete);
      countDeletedColumns++;
      let isLastOne = (columnsToDelete.length - countDeletedColumns) === 0;
      console.log(`Deleting column ${col + 1}, which is now number ${actualColumnNumberToDelete + 1} ${isLastOne ? '(last one)' : ''}`);
      if (this.options.onColumnDelete) {
        this.options.onColumnDelete(actualColumnNumberToDelete, isLastOne);
      }
    });
    this.redrawTable();
    this.forceRestoreScroll(250);
  }

  getTableClass(tableNumber: number) {
    return 'te-table-' + tableNumber;
  }

  getTableNumberForColumn(col: number) {
    if (this.options.showInMultipleRows) {
      return Math.floor(col / this.options.columnsPerRow);
    } else {
      return 0;
    }

  }

  getTdClass(row: number, col: number) {
    return specificCellClassPrefix + row + '-' + col;
  }

  getThClass(col: number) {
    return specificHeaderClassPrefix + col;
  }

  // refreshColumnClasses(col: number) {
  //   for (let r = 0; r < this.matrix.nRows; r++) {
  //     this.refreshCellClasses(r, col);
  //   }
  // }

  getColClass(col: number) {
    return 'te-col-' + col;
  }

  // redrawColumn(col: number) {
  //   for (let row = 0; row < this.matrix.nRows; row++) {
  //     this.redrawCell(row, col);
  //   }
  // }

  // refreshColumn(col: number) {
  //   for (let row = 0; row < this.matrix.nRows; row++) {
  //     this.refreshCell(row, col);
  //   }
  // }

  getTdSelector(row: number, col: number) {
    return '#' + this.options.id + ' .' + this.getTdClass(row, col);
  }

  getThSelector(col: number) {
    return '#' + this.options.id + ' .' + this.getThClass(col);
  }

  getCellContentSelector(row: number, col: number) {
    return this.getTdSelector(row, col) + ' .' + cellContentClass;
  }

  isColumnEmpty(col: number) {
    return this.matrix.isColumnEmpty(col, this.options.isEmptyValue);
  }

  canDeleteColumn(col: number) {
    return this.options.canDeleteColumn ? this.options.canDeleteColumn(col) : this.isColumnEmpty(col);
  }

  canMoveCellLeft(row: number, col: number) {
    return col !== 0 && !this.options.isEmptyValue(row, col, this.matrix.getValue(row, col)) && this.options.isEmptyValue(row, col, this.matrix.getValue(row, col - 1));
  }

  // private isColumnSelected(col: number) {
  //   return (this.selectedColumnsStart !== -1 && col >= this.selectedColumnsStart && col <= this.selectedColumnsEnd);
  // }


  // private getColFromColumnHeader(domElement: HTMLElement) {
  //   let classes = this.getClassList(domElement);
  //   let col = -1;
  //   for (const theClass of classes) {
  //     // TODO: use class constant in regex
  //     if (theClass.search(/^te-col-/) !== -1) {
  //       col = parseInt(theClass.replace('te-col-', ''));
  //       break;
  //     }
  //   }
  //   return col;
  // }


  // private getColFromGroupColumnButton(domElement: HTMLElement) {
  //   let classes = this.getClassList(domElement);
  //   let col = -1;
  //   for (const theClass of classes) {
  //     // TODO: use class constant in regex
  //     if (theClass.search(/^link-button-/) !== -1) {
  //       col = parseInt(theClass.replace('link-button-', ''));
  //       break;
  //     }
  //   }
  //   return col;
  // }

  canPushCellsLeft(row: number, col: number) {
    if (this.options.isEmptyValue(row, col, this.matrix.getValue(row, col)) || this.canMoveCellLeft(row, col)) {
      // no pushing a cell that is empty or that can be simply moved
      return false;
    }
    return this.getFirstEmptyCellToTheLeft(row, col) !== -1;

  }

  /**
   * Get the index of the first empty cell to the left
   * of the given cell position. Returns -1 if no such cell
   * could be found
   * @param row
   * @param col
   */
  getFirstEmptyCellToTheLeft(row: number, col: number) {
    if (col === 0) {
      return -1;
    }
    for (let i = col - 1; i >= 0; i--) {
      if (this.options.isEmptyValue(row, col, this.matrix.getValue(row, i))) {
        return i;
      }
    }
    return -1;
  }

  canMoveCellRight(row: number, col: number) {
    return col !== (this.matrix.nCols - 1) && !this.options.isEmptyValue(row, col, this.matrix.getValue(row, col)) && this.options.isEmptyValue(row, col, this.matrix.getValue(row, col + 1));
  }

  canPushCellsRight(row: number, col: number) {
    if (this.options.isEmptyValue(row, col, this.matrix.getValue(row, col)) || this.canMoveCellRight(row, col)) {
      // no pushing a cell that is empty or that can be simply moved
      return false;
    }
    return this.getFirstEmptyCellToTheRight(row, col) !== -1;

  }

  /**
   * Get the index of the first empty cell to the left
   * of the given cell position. Returns -1 if no such cell
   * could be found
   * @param row
   * @param col
   */
  getFirstEmptyCellToTheRight(row: number, col: number) {
    if (col === (this.matrix.nCols - 1)) {
      return -1;
    }
    for (let i = col + 1; i < this.matrix.nCols; i++) {
      if (this.options.isEmptyValue(row, col, this.matrix.getValue(row, i))) {
        return i;
      }
    }
    return -1;
  }

  dispatchCellDrawnEvent(row: number, col: number) {
    this.dispatchEvent(CellDrawnEvent, {
      row: row, col: col, selector: this.getCellContentSelector(row, col)
    });
  }

  dispatchTableDrawnEvent() {
    this.dispatchEvent(TableDrawnEvent, {});
  }

  // getTableSelector(tableNumber: number) {
  //   return '#' + this.options.id + ' .' + this.getTableClass(tableNumber);
  // }

  dispatchColumnGroupChangeEvent(col: number, grouped: boolean) {
    let event = grouped ? ColumnGroupEvent : ColumnUngroupEvent;
    this.dispatchEvent(event, {
      col: col, groupedColumns: this.getGroupedColumns()
    });
  }

  getGroupedColumns() {
    return this.columnSequence.getGroupedNumbers();
  }

  dispatchTableDrawnPreEvent() {
    this.dispatchEvent(PreTableDrawnEvent, {});
  }

  dispatchCellShiftEvents(type: string, direction: string, row: number, firstCol: number, lastCol: number, numCols: number) {
    //let profiler = new SimpleProfiler('DispatchCellShiftEvents')
    let selectors = [];
    for (let c = firstCol; c <= lastCol; c++) {
      selectors.push(this.getTdSelector(row, c));
    }
    // profiler.lap('selectors calculated')
    // 1st event: specific type/direction
    let eventName = 'cell-' + type + '-shift-' + direction;
    this.dispatchEvent(eventName, {
      row: row, firstCol: firstCol, lastCol: lastCol, numCols: numCols, selectors: selectors
    });
    // profiler.lap(`Event '${eventName}' dispatched`)
    // 2nd event: generic type, cell-pre-move or cell-post-move
    eventName = 'cell-' + type + '-shift';
    this.dispatchEvent(eventName, {
      row: row, firstCol: firstCol, lastCol: lastCol, numCols: numCols, direction: direction, selectors: selectors
    });
    // profiler.lap(`Event '${eventName}' dispatched`)

    // 3rd event: generic move: cell-shift, only for type 'post'
    if (type === 'post') {
      this.dispatchEvent(CellShiftEvent, {
        row: row, firstCol: firstCol, lastCol: lastCol, numCols: numCols, direction: direction, selectors: selectors
      });
    }
    // profiler.stop()
  }

  dispatchContentChangedEvent(row: number, col: number) {
    this.dispatchEvent(ContentChangedEvent, {
      row: row, col: col
    });
  }

  // getTdSelectorAll() {
  //   return '#' + this.options.id + ' .' + cellClass;
  // }

  dispatchEvent(eventName: string, data: any = {}) {
    const event = new CustomEvent(eventName, {detail: data});
    this.container?.dispatchEvent(event);
  }

  // getThSelectorAll() {
  //   return '#' + this.options.id + ' .' + tableClass + ' th';
  // }

  /**
   * Attaches a callback function to an editor event
   */
  on(eventName: string | string[], f: any) {
    const events = typeof eventName === 'string' ? [eventName] : eventName;
    events.forEach((eventName) => {
      this.container?.addEventListener(eventName, f);
    });
  }

  // private lastHoveredHeader: HTMLElement | null = null;
  private onContainerClick = (ev: Event) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    // 1. Table Editor Click (outside of tables)
    if (this.tableEditMode === EditModeGroup && (target.classList.contains(tablesDivClass) || target.classList.contains('panel-content'))) {
      this.clearColumnSelection();
      return;
    }

    // 2. Button clicks and interactions
    // Column header buttons and header clicks
    const th = target.closest('th');
    if (th) {
      const col = this.getThIndexFromElement(th);
      if (col !== -1) {
        if (target.closest(`.${addColumnLeftButtonClass}`)) {
          this.currentYScroll = window.scrollY;
          this.currentXScroll = window.scrollX;
          this.waitingForScrollZero = true;
          this.insertColumnAfter(col - 1);
          if (this.options.onColumnAdd) {
            this.options.onColumnAdd(col);
          }
          this.redrawTable();
          this.forceRestoreScroll(250);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${addColumnRightButtonClass}`)) {
          this.currentYScroll = window.scrollY;
          this.currentXScroll = window.scrollX;
          this.waitingForScrollZero = true;
          this.insertColumnAfter(col);
          if (this.options.onColumnAdd) {
            this.options.onColumnAdd(col + 1);
          }
          this.redrawTable();
          this.forceRestoreScroll(250);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${deleteColumnButtonClass}`)) {
          if (this.canDeleteColumn(col)) {
            if (this.container) {
              this.container.querySelector(this.getThSelector(col))?.classList.add('te-deleting');
            }
            this.currentYScroll = window.scrollY;
            this.currentXScroll = window.scrollX;
            this.waitingForScrollZero = true;
            this.deleteSingleColumnData(col);
            if (this.options.onColumnDelete) {
              this.options.onColumnDelete(col, false);
            }
            this.redrawTable();
            this.forceRestoreScroll(250);
          }
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${linkButtonClass}`)) {
          if (this.tableEditMode === EditModeGroup) {
            let grouped = this.isColumnGroupedWithNext(col);
            if (grouped) {
              this.columnSequence.ungroupWithNext(col);
            } else {
              this.columnSequence.groupWithNext(col);
            }
            this.dispatchColumnGroupChangeEvent(col, !grouped);

            this.redrawHeader(col);
            for (let r = 0; r < this.matrix.nRows; r++) {
              this.refreshCellClasses(r, col);
              this.refreshCellClasses(r, col + 1);
            }

            ev.preventDefault();
          }
          return;
        }
        // Header click itself
        if (this.tableEditMode === EditModeGroup) {
          this.handleColumnHeaderClick(col, ev);
          ev.preventDefault();
          return;
        }
      }
    }

    // Cell buttons and cell click
    const td = target.closest('.' + cellClass) as HTMLElement;
    if (td) {
      const cellIndex = this.getCellIndexFromElement(td);
      if (cellIndex) {
        const {row, col} = cellIndex;

        // Confirm/Cancel buttons in edit mode
        if (target.closest(`.${confirmEditButtonClass}`)) {
          this.confirmEdit(row, col);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${cancelEditButtonClass}`)) {
          const input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
          this.leaveCellEditMode(row, col);
          if (this.options.onCellCancelEdit) {
            this.options.onCellCancelEdit(row, col, input?.value ?? '');
          }
          ev.preventDefault();
          return;
        }

        // Move/Edit buttons
        if (target.closest(`.${moveCellLeftButtonClass}`)) {
          this.shiftCells(row, col, col, 'left', 1);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${moveCellRightButtonClass}`)) {
          this.shiftCells(row, col, col, 'right', 1);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${pushCellsLeftButtonClass}`)) {
          const emptyCol = this.getFirstEmptyCellToTheLeft(row, col);
          this.shiftCells(row, emptyCol + 1, col, 'left', 1);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${pushCellsRightButtonClass}`)) {
          const emptyCol = this.getFirstEmptyCellToTheRight(row, col);
          this.shiftCells(row, col, emptyCol - 1, 'right', 1);
          ev.preventDefault();
          return;
        }
        if (target.closest(`.${editCellButtonClass}`)) {
          this.enterCellEditMode(row, col);
          ev.preventDefault();
          return;
        }

        // Cell click
        if (this.tableEditMode !== EditModeOff) {
          if (this.isCellEditable(row, col)) {
            this.enterCellEditMode(row, col);
            ev.preventDefault();
          }
        }
      }
    }
  };

  private onContainerKeyUp = (ev: KeyboardEvent) => {
    const target = ev.target as HTMLElement;
    if (target.classList.contains(inputClass)) {
      const td = target.closest('.' + cellClass) as HTMLElement;
      const cellIndex = this.getCellIndexFromElement(td);
      if (cellIndex) {
        this.handleCellInputKeyUp(cellIndex.row, cellIndex.col, ev);
      }
    }
  };

  private handleColumnHeaderClick(col: number, _ev: Event) {
    if (this.selectedColumnsStart !== -1) {
      if (this.selectedColumnsStart === this.selectedColumnsEnd) {
        if (col === this.selectedColumnsStart) {
          this.clearColumnSelection();
        } else {
          if (col === this.selectedColumnsStart - 1) {
            this.selectColumnRange(col, this.selectedColumnsEnd);
          }
          if (col === this.selectedColumnsEnd + 1) {
            this.selectColumnRange(this.selectedColumnsStart, col);
          }
        }
      } else {
        if (col === this.selectedColumnsStart) {
          this.selectColumnRange(this.selectedColumnsStart + 1, this.selectedColumnsEnd);
        } else if (col === this.selectedColumnsEnd) {
          this.selectColumnRange(this.selectedColumnsStart, this.selectedColumnsEnd - 1);
        } else {
          if (col === this.selectedColumnsStart - 1) {
            this.selectColumnRange(col, this.selectedColumnsEnd);
          }
          if (col === this.selectedColumnsEnd + 1) {
            this.selectColumnRange(this.selectedColumnsStart, col);
          }
        }
      }
    } else {
      this.selectColumnRange(col, col);
    }
  }

  private handleCellInputKeyUp(row: number, col: number, ev: KeyboardEvent) {
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col));
    if (!td) return;
    let input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
    let currentText = input?.value ?? '';

    if (ev.key === 'Enter') {
      this.confirmEdit(row, col);
      return;
    }
    if (ev.key === 'Escape') {
      this.leaveCellEditMode(row, col);
      if (this.options.onCellCancelEdit) {
        this.options.onCellCancelEdit(row, col, currentText);
      }
      ev.preventDefault();
      return;
    }
    // validate!
    let validationResult = this.options.cellValidationFunction(row, col, currentText);
    let confirmEditButton = td.querySelector(`.${confirmEditButtonClass}`) as HTMLElement;
    if (confirmEditButton) {
      if (validationResult.isValid) {
        confirmEditButton.classList.remove('invalid');
        confirmEditButton.setAttribute('title', 'Click to confirm');
      } else {
        confirmEditButton.classList.add('invalid');
        let warningText = 'ERROR: ' + validationResult.errors.join('. ') + validationResult.warnings.join('. ');
        if (warningText !== '') {
          confirmEditButton.setAttribute('title', warningText);
        }
      }
    }
  }

  private setupTableForEditMode(mode: string) {
    if (!this.container) return;

    switch (mode) {
      case EditModeOff:
        this.clearColumnSelection();
        break;

      case EditModeMove:
        this.clearColumnSelection();
        break;

      case EditModeGroup:
        break;
    }
  }

  private getValidEditModes() {
    return [EditModeOff, EditModeMove, EditModeGroup];
  }

  private genTableVNode(): VNode {
    let numTables = 1;
    let columnsPerTable = this.matrix.nCols;
    if (this.options.showInMultipleRows) {
      numTables = Math.ceil(this.matrix.nCols / this.options.columnsPerRow);
      columnsPerTable = this.options.columnsPerRow;
    }

    let tables: VNode[] = [];

    for (let tableNumber = 0; tableNumber < numTables; tableNumber++) {
      let currentTableFirstColumn = tableNumber * columnsPerTable;
      let currentTableLastColumnPlusOne = Math.min(this.matrix.nCols, currentTableFirstColumn + columnsPerTable);

      let tableClasses: Record<string, boolean> = {
        [tableClass]: true,
        [this.getTableClass(tableNumber)]: true
      };
      this.options.generateTableClasses().forEach(c => tableClasses[c] = true);

      let rows: VNode[] = [];

      // Header row
      let headerChildren: VNode[] = [h('th')];
      for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
        headerChildren.push(this.genThVNode(col));
      }
      rows.push(h('tr', {class: {[headerClass]: true}}, headerChildren));

      // Data rows
      for (let row = 0; row < this.matrix.nRows; row++) {
        let rowChildren: VNode[] = [];

        let rowTitleClasses: Record<string, boolean> = {
          [tableRowTitleClass]: true
        };
        if (this.rowDefinition[row].title === 'Edition') {
          rowTitleClasses[tableRowTitleEdition] = true;
        }
        rowChildren.push(h('td', {class: rowTitleClasses}, [this.rowDefinition[row].title]));

        let tableColumnNumber = 0;
        for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
          rowChildren.push(this.genCellVNode(row, col, tableColumnNumber));
          tableColumnNumber++;
        }

        rows.push(h('tr', {
          class: {
            [tableRowClass]: true,
            [`${tableSpecificRowClassPrefix}${row}`]: true
          }
        }, rowChildren));
      }

      tables.push(h('table', {class: tableClasses}, rows));
    }

    return h('div', {class: {[tablesDivClass]: true}}, tables);
  }


  private getThIndexFromElement(element: HTMLElement | null) {
    if (element === null) {
      return -1;
    }
    let thIndex = -1;
    let classes = this.getClassList(element);
    for (const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^te-th-/) !== -1) {
        thIndex = parseInt(theClass.replace('te-th-', ''));
        break;
      }
    }
    return thIndex;
  }

  getCellIndexFromElement(element: HTMLElement | null) {
    if (element === null) {
      return null;
    }
    let cellIndex = null;
    let classes = this.getClassList(element);
    // console.log(`Get cell index from element`)
    // console.log(classes)
    for (const theClass of classes) {
      if (theClass.search(/^te-cell-/) !== -1) {
        // TODO: use class constant in regex
        let cellIndexArray = theClass.replace('te-cell-', '').split('-');
        if (cellIndexArray.length !== 2) {
          console.error('Found cell class with invalid cell index, class: ' + theClass);
          break;
        }
        cellIndex = {
          row: parseInt(cellIndexArray[0]), col: parseInt(cellIndexArray[1])
        };
        break;
      }
    }
    return cellIndex;
  }

  private getGroupClasses(col: number) {
    let isGroupNext = this.isColumnGroupedWithNext(col);
    let isGroupPrev = this.isColumnGroupedWithPrevious(col);

    if (!isGroupNext && !isGroupPrev) {
      return [groupNoneClass];
    }
    if (isGroupNext && isGroupPrev) {
      return [groupBothClass];
    }
    if (isGroupNext) {
      return [groupNextClass];
    }
    return [groupPreviousClass];
  }

  private selectColumnRange(col1: number, col2: number) {
    this.clearColumnSelection();
    this.selectedColumnsStart = Math.min(col1, col2);
    this.selectedColumnsEnd = Math.max(col1, col2);
    if (this.container) {
      for (let i = this.selectedColumnsStart; i <= this.selectedColumnsEnd; i++) {
        this.container.querySelector(this.getThSelector(i))?.classList.add('selected');
      }
    }
    this.dispatchEvent(ColumnSelectEvent, {from: this.selectedColumnsStart, to: this.selectedColumnsEnd});
  }

}