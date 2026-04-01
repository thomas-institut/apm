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

import {escapeHtml} from '@/toolbox/Util';
// @ts-ignore
import {Matrix} from '@thomas-inst/matrix';
import {SequenceWithGroups} from '@/Edition/SequenceWithGroups';
import {SimpleProfiler} from '@/SimpleProfiler';

// Table Edit Modes
export const EditModeOff = 'off';
export const EditModeMove = 'move';
export const EditModeGroup = 'group';

export type EditMode = 'off' | 'move' | 'group';

// events
export const cellDrawnEvent = 'cell-drawn';
export const tableDrawnEvent = 'table-drawn';

export const CellPreShiftEvent = 'cell-pre-shift';
export const CellPostShiftEvent = 'cell-post-shift';

export const CellShiftContentChangedEvent = 'cell-shift content-changed';

export const PreTableDrawnEvent = 'table-drawn-pre';
export const columnAddEvent = 'column-add';
export const contentChangedEvent = 'content-changed';
export const columnGroupEvent = 'column-group';
export const columnUngroupEvent = 'column-ungroup';
export const columnSelectEvent = 'column-select';
export const columnClearSelectionEvent = 'column-clear-selection';


//icons
const defaultIcons: TableEditorIcons = {
  moveCellLeft: '&triangleleft;', // ◁
  moveCellRight: '&triangleright;', // ▷
  pushCellsRight: '&#x21a3;',   // ↣
  pushCellsLeft: '&#x21a2;', // ↢
  editCell: '&#x270D;', //	✍
  addColumnLeft: '<sup>&#x25c3;</sup>+',
  addColumnRight: '+<sup>&#x25b9;',
  deleteColumn: '&#x2715;', // ✕
  confirmCellEdit: '&#x2714;', // ✔
  cancelCellEdit: ' &#x2718;',  // ✘
  groupedColumn: '&ndash;',
  unGroupedColumn: '&vert;'
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
  groupedColumns: number[];

  // Icon set
  icons?: TableEditorIcons;

  // the html id of the container where the table will appear
  id: string;

  textDirection: string;

  // if false, the table will not be drawn in the constructor,
  // the user would have to redraw it manually later.
  // If the user attaches event handlers that reference the TableEditor,
  // drawing the table before the object is constructed will cause
  // an error. Setting this option to false avoids that.
  drawTableInConstructor: boolean;

  // if true, the table will be split into multiple tables of the number of columns given in columnsPerRow.
  showInMultipleRows: boolean;
  columnsPerRow?: number;

  // if true, the editor will redraw every cell that has moved when the
  // user clicks the move/shift buttons. If false, it is up to the
  // external event handlers to redraw
  redrawOnCellShift: boolean;

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
  isCellEditable: (row: number, col: number, value: T) => boolean;

  // a function to be called when the user clicks on an editable cell, before any cell editing setup
  // is done. If the function returns false, editing will not occur
  // The default function returns true, thereby making all cells editable.
  onCellEnterEditMode?: (row: number, col: number) => boolean;


  // Event handlers


  // a function to be called for each cell that was in edit mode before
  // going to any other mode. The default function does nothing.
  onCellLeaveEditMode?: (row: number, col: number) => void;
  onCellDrawnEventHandler?: (row: number, col: number) => void;
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
  private container: HTMLElement | null;
  private icons: TableEditorIcons;
  private selectedColumnsStart: number;
  // private emptyCellHtml: string = '&mdash;';
  private waitingForScrollZero: boolean = false;
  private selectedColumnsEnd: number;
  private currentYScroll!: number;
  private currentXScroll!: number;


  constructor(options: TableEditorOptions<T>) {


    const defaults = {
      groupedColumns: [],
      textDirection: 'ltr',
      redrawOnCellShift: true,
      showInMultipleRows: false,
      columnsPerRow: 10,
      drawTableInConstructor: true,
      isCellEditable: () => true,
      onCellEnterEditMode:  (row: number, col: number) => {
        this.debug && console.log(`Cell Enter Edit Mode ${row}:${col}`);
        return true;
      },
      onCellLeaveEditMode: (row: number, col: number) => {
        this.debug && console.log(`Cell Leave Edit Mode ${row}:${col}`);
      },
      generateTableClasses: () => [] as string[],
      generateCellClasses: () => [] as string[],
      generateCellTdExtraAttributes: () => [] as TdExtraAttributes[],
      onCellDrawnEventHandler: () => {},
      onTableDrawnEventHandler: () => {},
      canDeleteColumn: () => true,
      onContentChangedEventHandler: () => {},
      onColumnGroupEventHandler: () => {},
      onColumnAdd: () => {},
      onColumnDelete: () => {},
      onColumnUngroupEventHandler: () => {},
      onCellCancelEdit: () => {},
      emptyCellHtml: '&mdash;',
      debug: false,
      icons: defaultIcons
    }

    this.options = {...defaults, ...options};
    this.debug = this.options.debug;

    this.rowDefinition = this.options.rowDefinition;
    this.matrix = new Matrix(0, 0, this.options.getEmptyValue());
    this.matrix.setFromArray(this.rowDefinition.map( r => r.values));
    this.columnSequence = new SequenceWithGroups(this.matrix.nCols, this.options.groupedColumns);
    this.editFlagMatrix = new Matrix(this.matrix.nRows, this.matrix.nCols, false);
    this.containerSelector = '#' + this.options.id;
    this.container = document.querySelector(this.containerSelector);
    this.icons = this.options.icons ?? defaultIcons;
    this.tableEditMode = EditModeOff;
    this.selectedColumnsStart = -1;
    this.selectedColumnsEnd = -1;

    if (this.options.onCellDrawnEventHandler !== null) {
      this.on(cellDrawnEvent, this.options.onCellDrawnEventHandler);
    }

    if (this.options.onTableDrawnEventHandler !== null) {
      this.on(tableDrawnEvent, this.options.onTableDrawnEventHandler);
    }

    if (this.options.onContentChangedEventHandler !== null) {
      this.on(contentChangedEvent, this.options.onContentChangedEventHandler);
    }

    if (this.options.onColumnGroupEventHandler !== null) {
      this.on(columnGroupEvent, this.options.onColumnGroupEventHandler);
    }
    if (this.options.onColumnUngroupEventHandler !== null) {
      this.on(columnGroupEvent, this.options.onColumnUngroupEventHandler);
    }
    if (this.options.drawTableInConstructor) {
      this.redrawTable();
    }

    window.addEventListener('scroll',  () => {
      if (this.waitingForScrollZero && window.scrollY === 0) {
        this.waitingForScrollZero = false;
        this.restoreScrollNow();
      }
    });
  }

  static genTextIconSet() {
    return defaultIcons;
  }

  getColumnGroups() {
    return this.columnSequence.getGroups();
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

  getRow(row: number) {
    return this.matrix.getRow(row);
  }

  getColumn(col: number) {
    return this.matrix.getColumn(col);
  }

  getMatrix() {
    return this.matrix;
  }

  getRowTitle(row: number) {
    return this.rowDefinition[row].title;
  }

  isTableInEditMode() {
    return this.tableEditMode !== EditModeOff;
  }

  getTableEditMode() {
    return this.tableEditMode;
  }

  toggleTableEditMode() {
    if (this.tableEditMode === EditModeOff) {
      this.setEditMode(EditModeMove);
    } else {
      this.setEditMode(EditModeOff);
    }
  }

  setEditMode(newEditMode: EditMode, redraw = false) {
    if (this.getValidEditModes().indexOf(newEditMode) === -1) {
      console.error('Invalid edit mode: ' + newEditMode);
      return;
    }

    this.tableEditMode = newEditMode;
    if (this.container) {
      this.getValidEditModes().forEach((m) => {
        this.container?.classList.remove(tableEditModeClassPrefix + m);
      });
      this.container.classList.add(tableEditModeClassPrefix + newEditMode);
    }
    if (redraw) {
      this.redrawTable();
    } else {
      this.setupTableForEditMode(this.tableEditMode);
    }
  }

  private setupTableForEditMode(mode: string) {
    if (!this.container) return;
    let groupColumnButtons = this.container.querySelectorAll(`a.${linkButtonClass}`);

    switch (mode) {
      case EditModeOff:
        groupColumnButtons.forEach(btn => btn.classList.add(hiddenClass));
        this.clearColumnSelection();
        break;

      case EditModeMove:
        groupColumnButtons.forEach(btn => btn.classList.add(hiddenClass));
        this.clearColumnSelection();
        break;

      case EditModeGroup:
        groupColumnButtons.forEach(btn => btn.classList.remove(hiddenClass));
        break;
    }
  }

  private getValidEditModes() {
    return [EditModeOff, EditModeMove, EditModeGroup];
  }

  editModeOn(redraw = true) {
    this.setEditMode(EditModeMove, redraw);
  }

  isTableShownInMultipleRows() {
    return this.options.showInMultipleRows;
  }

  showInMultipleRows(numCols = -1, redrawIfNeeded = true) {
    let redrawRequired = false;

    if (!this.options.showInMultipleRows) {
      redrawRequired = true;
    }
    let newNumCols = this.options.columnsPerRow;
    if (numCols >= 5) {
      newNumCols = numCols;
      if (newNumCols !== this.options.columnsPerRow) {
        redrawRequired = true;
      }
    }
    this.options.showInMultipleRows = true;
    this.options.columnsPerRow = newNumCols;
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable();
    }
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

  redrawTable() {
    //console.log("Redrawing table")
    let profiler = new SimpleProfiler('TableRedraw');
    this.dispatchTableDrawnPreEvent();
    let tableHtml = this.genTableHtml();
    console.log(`Table html is ${tableHtml.length} bytes long`);
    profiler.lap('table generated');
    if (this.container) {
      this.container.innerHTML = tableHtml;
    }
    profiler.lap('container filled');
    this.setupTableForEditMode(this.tableEditMode);
    this.setupTableEventHandlers();
    profiler.lap('event handlers setup');
    // dispatch redraw callbacks
    if (this.options.onCellDrawnEventHandler !== null) {
      for (let row = 0; row < this.matrix.nRows; row++) {
        for (let col = 0; col < this.matrix.nCols; col++) {
          this.dispatchCellDrawnEvent(row, col);
        }
      }
    }
    if (this.options.onTableDrawnEventHandler !== null) {
      this.dispatchTableDrawnEvent();
    }
    profiler.stop();
  }

  private genTableHtml() {
    let html = '';

    html += `<div class="${tablesDivClass}">`;
    let numTables = 1;
    let columnsPerTable = this.matrix.nCols;
    if (this.options.showInMultipleRows) {
      numTables = Math.ceil(this.matrix.nCols / this.options.columnsPerRow);
      columnsPerTable = this.options.columnsPerRow;
    }

    for (let tableNumber = 0; tableNumber < numTables; tableNumber++) {
      let currentTableFirstColumn = tableNumber * columnsPerTable;
      let currentTableLastColumnPlusOne = Math.min(this.matrix.nCols, currentTableFirstColumn + columnsPerTable);
      let tableClasses = [tableClass, this.getTableClass(tableNumber)].concat(this.options.generateTableClasses());

      html += `<table class="${tableClasses.join(' ')}">`;
      html += `<tr class="${headerClass}">`;
      html += '<th></th>';
      let tableColumnNumber = 0;
      for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
        let thClasses = [this.getThClass(col), this.getColClass(col)];
        html += `<th class="${thClasses.join(' ')}">`;
        let addColumnBeforeIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnLeft : this.icons.addColumnRight;
        let addColumnAfterIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnRight : this.icons.addColumnLeft;
        html += this.genButtonHtml(addColumnBeforeIcon, [addColumnLeftButtonClass, headerButtonClass, moveModeButtonClass], 'Add column before');
        html += (col + 1);
        html += this.genButtonHtml(this.icons.deleteColumn, [deleteColumnButtonClass, headerButtonClass, moveModeButtonClass], 'Delete this column');
        html += this.genButtonHtml(addColumnAfterIcon, [addColumnRightButtonClass, headerButtonClass, moveModeButtonClass], 'Add column after');

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
          html += this.genButtonHtml(linkIcon, [linkButtonClass, `${specificColumnLinkButtonClassPrefix}${col}`, groupClass, floatClass], title);
        }
        html += '</th>';
        tableColumnNumber++;
      }

      html += '</tr>';
      for (let row = 0; row < this.matrix.nRows; row++) {
        html += `<tr class="${tableRowClass} ${tableSpecificRowClassPrefix}${row}'">`;
        let rowTitleClasses = [tableRowTitleClass];
        if (this.rowDefinition[row].title === 'Edition') {
          rowTitleClasses.push(tableRowTitleEdition);
        }
        html += `<td class="${rowTitleClasses.join(' ')}">${this.rowDefinition[row].title}</td>`;
        tableColumnNumber = 0;
        for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
          html += this.generateCellHtml(row, col, tableColumnNumber);
          tableColumnNumber++;
        }
        html += '</tr>';
      }
      html += '</table>';
    }
    html += '</div>';
    return html;
  }

  generateCellHtml(row: number, col: number, tableColumnNumber = -1) {
    let html = '';
    let value = this.matrix.getValue(row, col);
    let cellClasses = [cellClass, this.getTdClass(row, col), this.getColClass(col)];
    if (tableColumnNumber === 0) {
      cellClasses.push(tableFirstColClass);
    }
    cellClasses = cellClasses.concat(this.getGroupClasses(col));
    cellClasses = cellClasses.concat(this.options.generateCellClasses(row, col, value));
    let tdExtraArray = this.options.generateCellTdExtraAttributes ? this.options.generateCellTdExtraAttributes(row, col, value) : [];

    html += '<td class="' + cellClasses.join(' ') + '" ' + this.getTdExtraStringFromArray(tdExtraArray) + '>';
    html += this.generateTdHtml(row, col);
    html += '</td>';
    return html;
  }

  getTdExtraStringFromArray(tdExtraArray: TdExtraAttributes[]) {
    let tdExtraStringArray = [];
    for (let i = 0; i < tdExtraArray.length; i++) {
      let attr = tdExtraArray[i]['attr'];
      let val = tdExtraArray[i]['val'] ?? '';
      tdExtraStringArray.push(`${attr}="${escapeHtml(val)}"`);
    }
    return tdExtraStringArray.join(' ');
  }

  isRowEditable(row: number) {
    return this.rowDefinition[row].isEditable;
  }

  isCellEditable(row: number, col: number) {
    return this.isRowEditable(row) && this.options.isCellEditable(row, col, this.matrix.getValue(row, col));
  }

  generateTdHtml(row: number, col: number) {
    let html = '';

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

    if (this.tableEditMode !== EditModeOff) {
      html += this.genButtonHtml(moveCellBackwardIcon, [moveCellLeftButtonClass, cellButtonClass, moveModeButtonClass], 'Move backward');
      html += this.genButtonHtml(pushCellsBackwardIcon, [pushCellsLeftButtonClass, cellButtonClass, moveModeButtonClass], 'Push backward');
    }
    html += `<span class="${cellContentClass}">`;
    html += this.options.generateCellContent(row, col, this.matrix.getValue(row, col));
    html += '</span>';
    if (this.tableEditMode !== EditModeOff && this.isCellEditable(row, col)) {
      html += this.genButtonHtml(this.icons.editCell, [editCellButtonClass, cellButtonClass], 'Edit');
    }
    if (this.tableEditMode !== EditModeOff) {
      html += this.genButtonHtml(pushCellsForwardIcon, [pushCellsRightButtonClass, cellButtonClass, moveModeButtonClass], 'Push forward');
      html += this.genButtonHtml(moveCellForwardIcon, [moveCellRightButtonClass, cellButtonClass, moveModeButtonClass], 'Move forward');
    }
    return html;
  }

  generateTdHtmlCellEditMode(row: number, col: number) {
    let html = '';
    let value = this.getValue(row, col);
    let textToEdit = this.options.generateCellContentEditMode(row, col, value);
    let inputSize = Math.min(textToEdit.length, 8);
    if (textToEdit === '') {
      inputSize = 5;
    }

    html += `<input type="text" class="${inputClass}" value="${textToEdit}" size="${inputSize}">`;

    html += this.genButtonHtml(this.icons.confirmCellEdit, [confirmEditButtonClass], 'Confirm edit');
    html += this.genButtonHtml(this.icons.cancelCellEdit, [cancelEditButtonClass], 'Cancel edit');
    return html;
  }

  setupTableEventHandlers() {
    //let profiler = new SimpleProfiler('SetupEventHandlers')
    if (this.container) {
      this.container.querySelectorAll(this.getThSelectorAll()).forEach(th => {
        th.addEventListener('mouseenter', this.genOnMouseEnterHeader());
        th.addEventListener('mouseleave', this.genOnMouseLeaveHeader());
        th.addEventListener('click', this.genOnClickColumnHeader());

        th.querySelectorAll(`.${addColumnLeftButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickAddColumnLeftButton()));
        th.querySelectorAll(`.${addColumnRightButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickAddColumnRightButton()));
        th.querySelectorAll(`.${deleteColumnButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickDeleteColumnButton()));
        th.querySelectorAll(`.${headerButtonClass}`).forEach(btn => btn.classList.add(hiddenClass));
        th.querySelectorAll(`.${linkButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickGroupColumnButton()));
      });

      this.container.addEventListener('click', this.genOnClickTableEditor());
    }

    this.setupCellEventHandlersAll();
    for (let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
        this.setupCellEventHandlers(row, col, false);
      }
    }
    //profiler.stop()
  }

  private genOnClickTableEditor() {
    return (ev: Event) => {
      if (this.tableEditMode !== EditModeGroup) {
        return;
      }
      let target = ev.target as HTMLElement|null;
      if (target === null) {
        return;
      }
      if (target.nodeName !== 'DIV') {
        return;
      }
      if (target.classList.contains('tables-div') || target.classList.contains('panel-content')) {
        console.log(`Click on table editor outside of table`);
        this.clearColumnSelection();
      }
    };
  }

  setupCellEventHandlersAll() {
    if (!this.container) return;
    this.container.querySelectorAll(this.getTdSelectorAll()).forEach(td => {
      // Note: native doesn't have .off() for all events easily without keeping track of listeners.
      // But since we are likely calling this after a redraw where elements are new, it might be fine.
      // If elements are reused, we'd need to be more careful.
      // However, TableEditor seems to redraw a lot.
      
      // We'll use a fresh listener by removing if possible, but genOnClickCell() returns a new function each time...
      // This is a common problem when migrating from jQuery's .off().
      // For now, let's assume redraw handles it or we'll need to store handlers.
      
      td.addEventListener('click', this.genOnClickCell());
      if (this.tableEditMode !== EditModeOff) {
        td.addEventListener('mouseenter', this.genOnMouseEnterCell());
        td.addEventListener('mouseleave', this.genOnMouseLeaveCell());
      }
      td.querySelectorAll(`.${cellButtonClass}`).forEach(btn => btn.classList.add(hiddenClass));
    });
  }

  genOnClickCell() {
    return (ev: Event) => {
      if (this.tableEditMode === EditModeOff) {
        return true;
      }
      let cellIndex = this.getCellIndexFromElement(ev.currentTarget as HTMLElement|null);
      if (cellIndex === null) {
        return true;
      }
      let row = cellIndex.row;
      let col = cellIndex.col;

      //console.log('Edit mode click on cell ' + row + ':' + col)

      let theElement = ev.target as HTMLElement|null;
      if (theElement === null) {
        return true;
      }
      let depth = 5;
      while (depth > 0) {
        //console.log(`Testing element's node name, depth ${depth}, nodeName '${theElement.prop('nodeName')}'`)
        if (theElement.nodeName === 'TD' || theElement.nodeName === 'A') break;
        theElement = theElement.parentElement as HTMLElement;
        if (!theElement) break;
        depth--;
      }
      if (depth === 0 || !theElement) {
        console.error(`Max depth reached trying to get A or TD in cell ${row}:${col}`);
        return true;
      }

      if (theElement.nodeName === 'TD') {
        //console.log('Not a button')
        if (this.isCellEditable(row, col)) {
          //console.log('Editable cell clicked, row ' + row + ' col ' + col)
          this.enterCellEditMode(row, col);
          ev.preventDefault();
          return false;
        }
        return true;
      }

      // click on an 'A'  node
      let elementClasses = this.getClassList(theElement);
      //console.log(elementClasses)

      if (elementClasses.indexOf(moveCellLeftButtonClass) !== -1) {
        // move cell left
        console.log('move cell left button clicked');
        this.shiftCells(row, col, col, 'left', 1);
        ev.preventDefault();
        return false;
      }
      if (elementClasses.indexOf(pushCellsLeftButtonClass) !== -1) {
        console.log('PUSH cells LEFT button clicked');
        let emptyCol = this.getFirstEmptyCellToTheLeft(row, col);
        this.shiftCells(row, emptyCol + 1, col, 'left', 1);
        ev.preventDefault();
        return false;
      }

      if (elementClasses.indexOf(moveCellRightButtonClass) !== -1) {
        // move cell right
        console.log('move cell right button clicked');
        this.shiftCells(row, col, col, 'right', 1);
        return false;
      }

      if (elementClasses.indexOf(pushCellsRightButtonClass) !== -1) {
        console.log('PUSH cells RIGHT button clicked');
        let emptyCol = this.getFirstEmptyCellToTheRight(row, col);
        this.shiftCells(row, col, emptyCol - 1, 'right', 1);
        return false;
      }

      if (elementClasses.indexOf(editCellButtonClass) !== -1) {
        //edit cell
        //console.log(`Edit cell button clicked on ${row}:${col}`)
        this.enterCellEditMode(row, col);
        return false;
      }
      console.warn(`Click on an unknown cell button on ${row}:${col}, nodeName ${theElement.nodeName}`);
      return true;
    };
  }

  shiftCells(row: number, firstCol: number, lastCol: number, direction: string, numCols = 1) {
    //let profiler = new SimpleProfiler('ShiftCells')
    //console.log(`Shifting cells ${firstCol} to ${lastCol} ${direction} ${numCols} column(s)`)

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
    let currentValues = [];
    for (let col = firstCol; col <= lastCol; col++) {
      currentValues[col] = this.matrix.getValue(row, col);
    }
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
    //profiler.lap('matrix updated')
    // refresh html table cells
    if (this.options.redrawOnCellShift) {
      //console.log('Redrawing cells')
      let firstColToRedraw = direction === 'right' ? firstCol : firstCol - numCols;
      let lastColToRedraw = direction === 'right' ? lastCol + numCols : lastCol;
      for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
        this.redrawCell(row, col);
        this.setupCellEventHandlers(row, col, true);
        this.dispatchCellDrawnEvent(row, col);
      }
      //profiler.lap('cells redrawn')
    } else {
      //console.log('Not redrawing cells')
    }
    // dispatch post move events
    //console.log('Dispatching post move events')
    this.dispatchCellShiftEvents('post', direction, row, firstCol, lastCol, numCols);

    //profiler.stop()
  }

  setupCellEventHandlers(row: number, col: number, restoreClickEvent = true) {
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!td) return;
    // console.log(`setting up event handlers for cell ${row}:${col}, restoreClick = ${restoreClickEvent}`)
    if (this.tableEditMode !== EditModeOff && restoreClickEvent) {
      if (this.isCellEditable(row, col)) {
        // Since we can't easily do .off() without a reference to the handler, 
        // we'll replace the element with its clone to clear listeners if needed, 
        // but redrawCell already replaces the element.
        // If we are here, we might just want to add the listener.
        td.addEventListener('click', this.genOnClickCell());
      }
    }
  }

  setupCellEventHandlersCellEditMode(row: number, col: number) {
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col));
    if (!td) return;
    
    td.querySelectorAll(`.${cancelEditButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickCancelEditButton(row, col)));
    td.querySelectorAll(`.${confirmEditButtonClass}`).forEach(btn => btn.addEventListener('click', this.genOnClickConfirmEditButton(row, col)));
    td.querySelectorAll<HTMLInputElement>(`.${inputClass}`).forEach(btn => btn.addEventListener('keyup', this.genOnKeyPressCellInputField(row, col)));
  }

  genButtonHtml(icon: string, classes: string[], title = '') {
    return `<a href="#" class="${classes.join(' ')}" title="${title}">${icon}</a>`;
  }

  genOnKeyPressCellInputField(row: number, col: number) {
    return (ev: KeyboardEvent) => {
      if (!this.container) return true;
      let td = this.container.querySelector(this.getTdSelector(row, col));
      if (!td) return true;
      let input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
      let currentText = input?.value ?? '';
      
      if (ev.key === 'Enter') {
        // Enter key
        //console.log(`Enter key press on ${row}:${col}`)
        return this.confirmEdit(row, col);
      }
      if (ev.key === 'Escape') {
        // Escape key
        //console.log(`Escape key press on ${row}:${col}`)
        this.leaveCellEditMode(row, col);
        if (this.options.onCellCancelEdit !== null) {
          if (this.options.onCellCancelEdit) {
            this.options.onCellCancelEdit(row, col, currentText);
          }
        }
        ev.preventDefault();
        return false;
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
          //console.log(validationResult)
        }
      }
      return true;
    };
  }

  getClassList(element: HTMLElement): string[] {
    if (!(element instanceof HTMLElement)) {
      console.warn('Element is not an HTMLElement, returning empty array', element, typeof element);
      console.trace()
      return [];
    }
    if (element.classList === undefined) {
      console.warn('Element has no classList, returning empty array', element, typeof element);
      return [];
    }

    const classes: string[] = [];
    element.classList.forEach( (c) => classes.push(c));
    return classes;
  }

  private getThIndexFromElement(element: HTMLElement|null) {
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


  private getCellIndexFromElement(element: HTMLElement|null) {
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

  genOnMouseEnterHeader() {
    return (ev: Event) => {
      switch (this.tableEditMode) {
        case EditModeOff:
        case EditModeGroup:
          return true;

        case EditModeMove:
          let target = ev.currentTarget as HTMLElement|null;
          if (target === null) {
            return true;
          }
          let col = this.getThIndexFromElement(target);
          if (col === -1) {
            return true;
          }
          target.querySelectorAll('.add-column-left-button').forEach(btn => btn.classList.remove(hiddenClass));
          target.querySelectorAll('.add-column-right-button').forEach(btn => btn.classList.remove(hiddenClass));
          if (this.canDeleteColumn(col)) {
            target.querySelectorAll('.delete-column-button').forEach(btn => btn.classList.remove(hiddenClass));
          }
          return true;

        default:
          console.error(`Unknown tableEditMode in MouseEnterHeader:  ${this.tableEditMode}`);
          return false;
      }
    };
  }

  genOnMouseLeaveHeader() {
    return (ev: Event) => {
      //console.log('Mouse leave')
      switch (this.tableEditMode) {
        case EditModeOff:
        case EditModeGroup:
          return true;

        case EditModeMove:
          let target = ev.currentTarget as HTMLElement|null;
          if (target === null) return true;
          let col = this.getThIndexFromElement(target);
          if (col !== -1) {
            target.querySelectorAll('.header-button').forEach(btn => btn.classList.add(hiddenClass));
          }
          return true;

        default:
          console.error(`Unknown tableEditMode in MouseLeaveHeader:  ${this.tableEditMode}`);
          return false;
      }
    };
  }

  genOnMouseEnterCell() {
    return (ev: Event) => {
      switch (this.tableEditMode) {
        case EditModeOff:
        case EditModeGroup:
          // console.log(`Mouse enter cell in off or group mode`)
          return true;

        case EditModeMove:
          // console.log(`Mouse enter cell in edit mode`)
          let target = ev.currentTarget as HTMLElement|null;
          if (target === null) return true;
          let cellIndex = this.getCellIndexFromElement(target);
          if (cellIndex === null) {
            console.log(`Mouse enter cell on move mode, but no cell index`);
            return true;
          }
          // console.log(cellIndex)
          let row = cellIndex.row;
          let col = cellIndex.col;
          // console.log('Mouse enter cell move mode: ' + row + ':' + col)
          if (this.canMoveCellLeft(row, col)) {
            target.querySelectorAll('.move-cell-left-button').forEach(btn => btn.classList.remove(hiddenClass));
          }
          if (this.canPushCellsLeft(row, col)) {
            let firstCol = this.getFirstEmptyCellToTheLeft(row, col) + 1;
            target.querySelectorAll('.push-cells-left-button').forEach(btn => {
              btn.classList.remove(hiddenClass);
              btn.setAttribute('title', `Push ${firstCol + 1}-${col + 1} back 1 column`);
            });
          }
          if (this.canMoveCellRight(row, col)) {
            target.querySelectorAll('.move-cell-right-button').forEach(btn => btn.classList.remove(hiddenClass));
          }
          if (this.canPushCellsRight(row, col)) {
            let lastCol = this.getFirstEmptyCellToTheRight(row, col) - 1;
            target.querySelectorAll('.push-cells-right-button').forEach(btn => {
              btn.classList.remove(hiddenClass);
              btn.setAttribute('title', `Push ${col + 1}-${lastCol + 1} forward 1 column`);
            });
          }
          if (this.isCellEditable(row, col)) {
            target.querySelectorAll('.edit-cell-button').forEach(btn => btn.classList.remove(hiddenClass));
          }
          return true;

        default:
          console.error(`Unknown tableEditMode in MouseEnterCell:  ${this.tableEditMode}`);
          return false;
      }
    };
  }

  genOnMouseLeaveCell() {
    return (ev: Event) => {
      switch (this.tableEditMode) {
        case EditModeOff:
        case EditModeGroup:
          return true;

        case EditModeMove:
          let target = ev.currentTarget as HTMLElement|null;
          if (target === null) return true;

          target.querySelectorAll('.cell-button').forEach(btn => btn.classList.add(hiddenClass));
          return true;

        default:
          console.error(`Unknown tableEditMode in MouseLeaveCell:  ${this.tableEditMode}`);
          return false;
      }
    };
  }

  redrawCell(row: number, col: number) {
    if (!this.container) return;
    let oldTd = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!oldTd) return;
    
    // Replace with new cell HTML
    let newCellHtml = this.generateCellHtml(row, col, this.getTableNumberForColumn(col));
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = newCellHtml;
    let newTd = tempDiv.firstChild as HTMLElement;
    
    oldTd.replaceWith(newTd);
    
    // re-establish the cell's event handlers
    newTd.addEventListener('click', this.genOnClickCell());
    if (this.tableEditMode !== EditModeOff) {
      newTd.addEventListener('mouseenter', this.genOnMouseEnterCell());
      newTd.addEventListener('mouseleave', this.genOnMouseLeaveCell());
    }
    newTd.querySelectorAll('.cell-button').forEach(btn => btn.classList.add(hiddenClass));
  }

  refreshCell(row: number, col: number) {
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!td) return;
    this.refreshCellContent(row, col);
    this.refreshCellClassesTd(td, row, col);
    this.refreshCellAttributes(row, col);
    td.querySelectorAll('.cell-button').forEach(btn => btn.classList.add(hiddenClass));
  }

  isColumnGroupedWithNext(col: number) {
    return this.columnSequence.isGroupedWithNext(col);
  }

  isColumnGroupedWithPrevious(col: number) {
    return this.columnSequence.isGroupedWithPrevious(col);
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

  refreshCellContent(row: number, col: number) {
    if (!this.container) return;
    let contentEl = this.container.querySelector(this.getCellContentSelector(row, col));
    if (contentEl) {
      contentEl.innerHTML = this.options.generateCellContent(row, col, this.matrix.getValue(row, col));
    }
  }

  refreshCellClassesTd(td: HTMLElement, row: number, col: number) {
    let newClasses = this.options.generateCellClasses(row, col, this.matrix.getValue(row, col));
    if (td.classList.contains(tableFirstColClass)) {
      // preserve first col class
      newClasses.push(tableFirstColClass);
    }
    let standardCellClasses = ['te-cell', this.getTdClass(row, col), this.getColClass(col)];
    standardCellClasses = standardCellClasses.concat(this.getGroupClasses(col));
    td.setAttribute('class', (standardCellClasses.concat(newClasses)).join(' '));
  }

  refreshCellClasses(row: number, col: number) {
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (td) {
      this.refreshCellClassesTd(td, row, col);
    }
  }

  refreshColumnClasses(col: number) {
    for (let r = 0; r < this.matrix.nRows; r++) {
      this.refreshCellClasses(r, col);
    }
  }

  refreshCellAttributes(row: number, col: number) {
    if (!this.container) return;
    let tdExtraArray = this.options.generateCellTdExtraAttributes ? this.options.generateCellTdExtraAttributes(row, col, this.matrix.getValue(row, col)) : [];
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!td) return;
    for (let i = 0; i < tdExtraArray.length; i++) {
      const attr = tdExtraArray[i]['attr'];
      const val = tdExtraArray[i]['val'];
      if (attr !== undefined && val !== undefined) {
        td.setAttribute(attr, val);
      }
    }
  }

  redrawColumn(col: number) {
    for (let row = 0; row < this.matrix.nRows; row++) {
      this.redrawCell(row, col);
    }
  }

  refreshColumn(col: number) {
    for (let row = 0; row < this.matrix.nRows; row++) {
      this.refreshCell(row, col);
    }
  }

  enterCellEditMode(row: number, col: number) {
    //console.log('Entering edit mode, ' + row + ':' + col)
    if (!this.options.onCellEnterEditMode(row, col)) {
      return;
    }
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!td) return;
    this.editFlagMatrix.setValue(row, col, true);
    td.innerHTML = this.generateTdHtmlCellEditMode(row, col);
    td.classList.add('edit-mode');
    this.setupCellEventHandlersCellEditMode(row, col);
    let input = td.querySelector(`.${inputClass}`) as HTMLInputElement;
    if (input) {
      input.addEventListener('focus', function () {
        input.setSelectionRange(10000, 10000);
      });
      input.focus();
    }
  }

  isCellInEditMode(row: number, col: number) {
    return this.editFlagMatrix.getValue(row, col);
  }

  leaveCellEditMode(row: number, col: number) {
    //console.log('Leaving edit mode, ' + row + ':' + col)
    if (!this.container) return;
    let td = this.container.querySelector(this.getTdSelector(row, col)) as HTMLElement;
    if (!td) return;
    this.editFlagMatrix.setValue(row, col, false);
    td.innerHTML = this.generateTdHtml(row, col);
    td.classList.remove('edit-mode');
    td.querySelectorAll('.cell-button').forEach(btn => btn.classList.add(hiddenClass));
    this.setupCellEventHandlers(row, col, true);
    // reinstate mouseenter and mouseleave events
    td.addEventListener('mouseenter', this.genOnMouseEnterCell());
    td.addEventListener('mouseleave', this.genOnMouseLeaveCell());
    this.options.onCellLeaveEditMode(row, col);
    this.dispatchCellDrawnEvent(row, col);
  }

  genOnClickEditableCell(row: number, col: number) {
    return () => {
      console.log('Editable cell clicked, row ' + row + ' col ' + col);
      this.enterCellEditMode(row, col);
      return false;
    };
  }

  genOnClickCancelEditButton(row: number, col: number) {
    return () => {
      if (!this.container) return false;
      let td = this.container.querySelector(this.getTdSelector(row, col));
      let input = td?.querySelector(`.${inputClass}`) as HTMLInputElement;
      let newText = input?.value ?? '';
      //console.log(`Cancel button clicked on ${row}:${col}`)
      this.leaveCellEditMode(row, col);
      if (this.options.onCellCancelEdit !== null) {
        if (this.options.onCellCancelEdit) {
          this.options.onCellCancelEdit(row, col, newText);
        }
      }
      return false;
    };
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
    this.leaveCellEditMode(row, col);
    if (confirmResult.valueChange) {
      //console.log('Change in value')
      this.setValue(row, col, confirmResult.value);
      this.dispatchContentChangedEvent(row, col);
    }
    return false;
  }

  genOnClickConfirmEditButton(row: number, col: number) {
    return () => {
      //console.log(`Confirm button clicked on ${row}:${col}`)
      return this.confirmEdit(row, col);
    };
  }

  genOnClickColumnHeader() {
    return (ev: Event) => {
      if (this.tableEditMode !== EditModeGroup) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      const currentTarget = ev.currentTarget as HTMLElement|null;
      if (currentTarget === null) return;
      let col = this.getColFromColumnHeader(currentTarget);
      console.log(`Click on column header in group mode, col = ${col}`);
      if (col < 0) {
        console.warn(`Invalid column detected: ${col}`);
        return;
      }
      if (this.selectedColumnsStart !== -1) {
        // there is a selection
        console.log(`Current selection: ${this.selectedColumnsStart} to ${this.selectedColumnsEnd}`);
        if (this.selectedColumnsStart === this.selectedColumnsEnd) {
          // only 1 column selected
          if (col === this.selectedColumnsStart) {
            console.log(`Clearing column selection`);
            this.clearColumnSelection();
          } else {
            if (col === this.selectedColumnsStart - 1) {
              console.log(`Expanding column selection to the left`);
              this.selectColumnRange(col, this.selectedColumnsEnd);
            }
            if (col === this.selectedColumnsEnd + 1) {
              console.log(`Expanding column selection to the right`);
              this.selectColumnRange(this.selectedColumnsStart, col);
            }
          }
        } else {
          // more than 1 column selected: unselect only if col is the first or the last column in the selected
          // column range
          if (col === this.selectedColumnsStart) {
            this.selectColumnRange(this.selectedColumnsStart + 1, this.selectedColumnsEnd);
          } else if (col === this.selectedColumnsEnd) {
            this.selectColumnRange(this.selectedColumnsStart, this.selectedColumnsEnd - 1);
          } else {
            if (col === this.selectedColumnsStart - 1) {
              console.log(`Expanding column selection to the left`);
              this.selectColumnRange(col, this.selectedColumnsEnd);
            }
            if (col === this.selectedColumnsEnd + 1) {
              console.log(`Expanding column selection to the right`);
              this.selectColumnRange(this.selectedColumnsStart, col);
            }
          }
        }
      } else {
        // there is no selection
        console.log(`There is no current selection, selecting ${col} to ${col}`);
        this.selectColumnRange(col, col);
      }
    };
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
    this.dispatchEvent(columnSelectEvent, {from: this.selectedColumnsStart, to: this.selectedColumnsEnd});
  }

  clearColumnSelection() {
    if (this.container) {
      for (let i = this.selectedColumnsStart; i <= this.selectedColumnsEnd; i++) {
        this.container.querySelector(this.getThSelector(i))?.classList.remove('selected');
      }
    }
    this.selectedColumnsStart = -1;
    this.selectedColumnsEnd = -1;
    this.dispatchEvent(columnClearSelectionEvent, {});
  }

  // private isColumnSelected(col: number) {
  //   return (this.selectedColumnsStart !== -1 && col >= this.selectedColumnsStart && col <= this.selectedColumnsEnd);
  // }

  genOnClickGroupColumnButton() {
    return (ev: Event) => {
      if (this.tableEditMode !== EditModeGroup) {
        return false;
      }
      let target = ev.currentTarget as HTMLElement|null;
      if (target === null) return false;
      let col = this.getColFromGroupColumnButton(target);
      //console.log(`Click on groupColumn Button, col = ${col}`)
      let grouped = true;
      if (this.isColumnGroupedWithNext(col)) {
        // ungroup
        //console.log(`Ungrouping`)
        grouped = false;
        this.columnSequence.ungroupWithNext(col);
        target.innerHTML = this.icons.unGroupedColumn;
      } else {
        // group with next
        //console.log(`Grouping with next`)
        this.columnSequence.groupWithNext(col);
        target.innerHTML = this.icons.groupedColumn;
      }
      let columnGroup = this.columnSequence.getGroupForNumber(col);
      this.dispatchColumnGroupChangeEvent(col, grouped);
      //console.log(columnGroup)
      let minC = columnGroup.from > 0 ? columnGroup.from - 1 : 0;
      let maxC = columnGroup.to < this.matrix.nCols - 1 ? columnGroup.to + 1 : this.matrix.nCols - 1;
      for (let c = minC; c <= maxC; c++) {
        this.refreshColumnClasses(c);
      }
      return false;
    };
  }

  private getColFromColumnHeader(domElement: HTMLElement) {
    let classes = this.getClassList(domElement);
    let col = -1;
    for (const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^te-col-/) !== -1) {
        col = parseInt(theClass.replace('te-col-', ''));
        break;
      }
    }
    return col;
  }


  private getColFromGroupColumnButton(domElement: HTMLElement) {
    let classes = this.getClassList(domElement);
    let col = -1;
    for (const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^link-button-/) !== -1) {
        col = parseInt(theClass.replace('link-button-', ''));
        break;
      }
    }
    return col;
  }

  genOnClickAddColumnRightButton() {
    return (ev: Event) => {
      let target = ev.currentTarget as HTMLElement|null;
      if (target === null) return false;
      let col = this.getThIndexFromElement(target.parentElement as HTMLElement);
      if (col === -1) {
        return false;
      }
      console.log('Add column right, col = ' + col);
      this.currentYScroll = window.scrollY;
      this.currentXScroll = window.scrollX;
      this.waitingForScrollZero = true;
      //this.matrix.addColumnAfter(col,  this.options.getEmptyValue())
      this.insertColumnAfter(col);
      if (this.options.onColumnAdd) {
        this.options.onColumnAdd(col + 1);
      }
      this.redrawTable();
      this.forceRestoreScroll(250);
      return true;
    };
  }

  genOnClickAddColumnLeftButton() {

    return (ev: Event) => {
      let target = ev.currentTarget as HTMLElement|null;
      if (target === null) return false;
      let col = this.getThIndexFromElement(target.parentElement as HTMLElement);
      if (col === -1) {
        return false;
      }
      console.log('Add column left, col = ' + col);
      this.currentYScroll = window.scrollY;
      this.currentXScroll = window.scrollX;
      this.waitingForScrollZero = true;
      this.insertColumnAfter(col - 1);
      if (this.options.onColumnAdd) {
        this.options.onColumnAdd(col);
      }
      this.redrawTable();
      this.forceRestoreScroll(250);
      return true;
    };
  }

  insertColumnAfter(col: number) {
    this.matrix.addColumnAfter(col, this.options.getEmptyValue());
    this.columnSequence.insertNumberAfter(col);
  }

  forceRestoreScroll(timeOut = 250) {
  
    setTimeout( () => {
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


  genOnClickDeleteColumnButton() {
    return (ev: Event) => {
      let target = ev.currentTarget as HTMLElement|null;
      if (target === null) return false;
      let col = this.getThIndexFromElement(target.parentElement);
      if (col === -1) {
        return true;
      }
      if (this.canDeleteColumn(col)) {
        if (this.container) {
          this.container.querySelector(this.getThSelector(col))?.classList.add('te-deleting');
        }
        console.log('Deleting column ' + col);
        this.currentYScroll = window.scrollY;
        this.currentXScroll = window.scrollX;
        this.waitingForScrollZero = true;
        this.matrix.deleteColumn(col);
        this.columnSequence.removeNumber(col);
        if (this.options.onColumnDelete) {
          this.options.onColumnDelete(col, false);
        }
        this.redrawTable();
        this.forceRestoreScroll(250);
        this.redrawTable();
        this.forceRestoreScroll(250);
      } else {
        console.log('Column NOT empty, cannot delete');
      }
      return true;
    };
  }

  getTableClass(tableNumber: number) {
    return 'te-table-' + tableNumber;
  }

  getTableSelector(tableNumber: number) {
    return '#' + this.options.id + ' .' + this.getTableClass(tableNumber);
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

  getColClass(col: number) {
    return 'te-col-' + col;
  }

  getTdSelector(row: number, col: number) {
    return '#' + this.options.id + ' .' + this.getTdClass(row, col);
  }

  getTdSelectorAll() {
    return '#' + this.options.id + ' .' + cellClass;
  }

  getThSelector(col: number) {
    return '#' + this.options.id + ' .' + this.getThClass(col);
  }

  getThSelectorAll() {
    return '#' + this.options.id + ' .' + tableClass + ' th';
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
    this.dispatchEvent(cellDrawnEvent, {
      row: row, col: col, selector: this.getCellContentSelector(row, col)
    });
  }

  dispatchTableDrawnEvent() {
    this.dispatchEvent(tableDrawnEvent, {});
  }

  dispatchColumnGroupChangeEvent(col: number, grouped: boolean) {
    let event = grouped ? columnGroupEvent : columnUngroupEvent;
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
      this.dispatchEvent('cell-shift', {
        row: row, firstCol: firstCol, lastCol: lastCol, numCols: numCols, direction: direction, selectors: selectors
      });
    }
    // profiler.stop()
  }

  dispatchContentChangedEvent(row: number, col: number) {
    this.dispatchEvent(contentChangedEvent, {
      row: row, col: col
    });
  }

  dispatchEvent(eventName: string, data: any = {}) {
    const event = new CustomEvent(eventName, {detail: data});
    this.container?.dispatchEvent(event);
  }

  /**
   * Attaches a callback function to an editor event
   */
  on(eventName: string, f: any) {
    this.container?.addEventListener(eventName, f);
  }

}