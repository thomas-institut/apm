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

import {escapeHtml} from './toolbox/Util.js'
import { Matrix } from '@thomas-inst/matrix'
import { SequenceWithGroups } from './SequenceWithGroups'
import {OptionsChecker} from '@thomas-inst/optionschecker'

// Table Edit Modes
export const editModeOff = 'off'
export const editModeMove = 'move'
export const editModeGroup = 'group'

// events
export const cellDrawnEvent = 'cell-drawn'
export const tableDrawnEvent = 'table-drawn'
export const columnAddEvent = 'column-add'
export const contentChangedEvent = 'content-changed'
export const columnGroupEvent = 'column-group'
export const columnUngroupEvent = 'column-ungroup'


//icons
const defaultIcons = {
  moveCellLeft: '&#x25c1;', // ◁
  moveCellRight: '&#x25b7;', // ▷
  pushCellsRight: '&#x21a3;',   // ↣
  pushCellsLeft: '&#x21a2;', // ↢
  editCell: '&#x270D;', //	✍
  addColumnLeft: '<sup>&#x25c3;</sup>+',
  addColumnRight: '+<sup>&#x25b9;',
  deleteColumn: '&#x2715;', // ✕
  confirmCellEdit: '&#x2714;', // ✔
  cancelCellEdit: ' &#x2718;',  // ✘
  // groupedColumn: '&diams;', // ♦
  // ungroupedColumn: '&#9826;' // ♢
  groupedColumn: '&ndash;',
  ungroupedColumn: '&vert;'
}


// classes
const hiddenClass = 'hidden'
const headerButtonClass = 'header-button'
const moveModeButtonClass = 'button-move-mode'
const cellButtonClass = 'cell-button'
const editCellButtonClass = 'edit-cell-button'
const moveCellLeftButtonClass = 'move-cell-left-button'
const moveCellRightButtonClass = 'move-cell-right-button'
const pushCellsLeftButtonClass = 'push-cells-left-button'
const pushCellsRightButtonClass = 'push-cells-right-button'
const addColumnLeftButtonClass = 'add-column-left-button'
const addColumnRightButtonClass = 'add-column-right-button'
const deleteColumnButtonClass = 'delete-column-button'
const tableEditModeClassPrefix = 'table-edit-mode-'
const tablesDivClass = 'tables-div'
const tableClass = 'te-table'
const headerClass = 'te-th'
const specificHeaderClassPrefix = 'te-th-'
const cellClass = 'te-cell'
const specificCellClassPrefix = 'te-cell-'
const cellContentClass = 'te-cell-content'
const tableRowClass = 'te-tr'
const tableSpecificRowClassPrefix = 'te-tr-'
const tableRowTitleClass = 'te-row-title'
const tableRowTitleEdition = 'te-row-title-edition'
const tableFirstColClass = 'te-table-first-col'
const linkButtonClass = 'link-button'
const specificColumnLinkButtonClassPrefix = 'link-button-'
const inputClass = 'te-input'
const confirmEditButtonClass = 'confirm-edit-button'
const cancelEditButtonClass = 'cancel-edit-button'

const groupNoneClass = 'group-none'
const groupNextClass = 'group-next'
const groupPreviousClass = 'group-previous'
const groupBothClass = 'group-both'

const groupIconFloatLeftClass = 'group-icon-float-left'
const groupIconFloatRightClass = 'group-icon-float-right'



export class TableEditor {

  constructor(options) {

    //console.log("Constructing TableEditor")
    let thisObject = this

    let optionsDefinition = {
      rowDefinition: {
        // data definition: rows and values, see definition below
        // TableEditor is agnostic to the value types
        required: true,
        type: 'Array'
      },
      groupedColumns: {
        // list of columns that are grouped with the next
        required: false,
        type: 'Array',
        default: []
      },
      id: {
        // the html id of the container where the table will appear
        required: true,
        type: 'string'
      },
      textDirection: {
        type: 'string',
        required: false,
        default: 'ltr'
      },
      // if true, the editor will redraw every cell that has moved when the
      // user clicks the move/shift buttons. If false, it is up to the
      // external event handlers to redraw
      redrawOnCellShift: {
        type: 'boolean',
        required: false,
        default: true
      },
      showInMultipleRows: {
        // if true, the table will be split and shown in multiple
        // tables of  the number of rows given in options.columnsPerRow
        required: false,
        type: 'boolean',
        default: false
      },
      columnsPerRow: {
        // columns to show per row if options.showInMultipleRows is true
        required: false,
        type: 'number',
        default: 10
      },
      drawTableInConstructor: {
        // if false, the table will not be drawn in the constructor,
        // the user would have to redraw it manually later.
        // If the user attaches event handlers that reference the TableEditor,
        // drawing the table before the object is constructed will cause
        // an error. Setting this option to false avoids that.
        required: false,
        type: 'boolean',
        default: true
      },
      generateCellContent: {
        // a function to be called to generate the html content of a table cell
        // the default function simply prints the value if it's not empty
        required: false,
        type: 'function',
        default: (row,col,value) => thisObject.options.isEmptyValue(row, col,value) ? thisObject.options.emptyCellHtml : value
      },
      generateCellContentEditMode: {
        // a function to be called to generate the text to be edited in edit mode
        // the default function simply prints the value
        required: false,
        type: 'function',
        default: (row, col, value) => thisObject.options.isEmptyValue(row, col,value) ? '' : value
      },
      onCellConfirmEdit: {
        // a function to be called when the user clicks on the confirm edit button in edit mode
        // return the new value for the cell
        //   (row, col, newText) => { ... do something...  return { valueChange: true|false, value: someValue} }
        // the default function returns the emptyValue on an empty string or the newText
        required: false,
        type: 'function',
        default: (row, col, newText) => newText === '' ?
              { valueChange: true, value: thisObject.options.getEmptyValue()} :
              { valueChange: true, value: newText }
      },
      onCellCancelEdit: {
        // a function to be called when the user clicks on the cancel edit button in edit mode
        //   (row, col, newText) => { ... do something, return nothing... }
        required: false,
        type: 'function',
        default: null
      },
      cellValidationFunction: {
        // a function to be called in edit mode every time there is a change in the edited text.
        // (row, col, currentTxt) => { ... check, return resultObject }
        // the resultObject is of the form:
        //     result = {
        //         isValid:  true|false
        //         warnings: [ 'some warning text', 'another warning', ... ]
        //         errors: [ 'some error text', 'another error', ... ]
        required: false,
        type: 'function',
        default: () => { return {isValid: true, warnings:[], errors: []} }
      },
      onCellDrawnEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onTableDrawnEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onColumnAddHandler: {
        // a function to be called when a column is added before any redrawing of cells
        // it can be used to change the value matrix
        //   (newCol) => { .. return nothing ... }
        required: false,
        type: 'function',
        default: null
      },
      onContentChangedEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onColumnGroupEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      onColumnUngroupEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      generateTableClasses: {
        // a function to generate classes for the collation table
        // the default function is an empty array
        required: false,
        type: 'function',
        default: () => []
      },
      generateCellClasses: {
        // a function to generate an array of html classes for a table cell
        // the default function returns an empty array
        //  (row, col, value) => { ... return someArray }
        required: false,
        type: 'function',
        default : () => []
      },
      generateCellTdExtraAttributes : {
        // a function to generate html attributes to be included in a cell's
        // td element.
        // This can be used to generate Bootstrap popover data for a cell,
        // by returning  { attr='data-content', val:"popover text"}
        //  (row, col, value) => { .... return someString }
        required: false,
        type: 'function',
        default: () => ''
      },
      getEmptyValue: {
        // a function to get an empty value
        required: false,
        type: 'function',
        default: () => ''
      },
      isEmptyValue: {
        // a function to test whether a table value is empty
        // the default function returns true if the value is an empty string
        required: false,
        type: 'function',
        default: (row, col, value) => value === ''
      },
      canDeleteColumn: {
        // a function to test whether a given column can be deleted
        // (col) => { return true/false }
        required: false,
        type: 'function',
        default : null
      },
      emptyCellHtml: {
        // html to use as the content of an empty cell
        required: false,
        type: 'string',
        default: '&mdash;'
      },
      icons: {
        // html for the different icons
        required: false,
        type: 'object',
        default: defaultIcons
      }
    }

    let rowObjectDefinition = {
      title : {
        type: 'string',
        required: false,
        default: ''
      },
      isEditable: {
        type: 'boolean',
        required: false,
        default: false
      },
      values : {
        type: 'Array',
        required: true
      }
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'TableEditor')
    this.options = optionsChecker.getCleanOptions(options)
    //console.log('Table options')
    //console.log(this.options)

    this.rowDefinition = []
    let valueArray = []
    for (let i=0; i < this.options.rowDefinition.length; i++) {
      let dataChecker = new OptionsChecker(rowObjectDefinition, 'dataElement ' + i)
      let cleanRowDefinition = dataChecker.getCleanOptions(this.options.rowDefinition[i])
      this.rowDefinition.push(cleanRowDefinition)
      valueArray.push(cleanRowDefinition.values)
    }

    this.matrix = new Matrix(0,0, this.options.getEmptyValue())
    this.matrix.setFromArray(valueArray)
    //this.matrix.logMatrix('TableEditor ' + this.options.id)
    this.columnSequence = new SequenceWithGroups(this.matrix.nCols, this.options.groupedColumns)

    this.editFlagMatrix = new Matrix(this.matrix.nRows, this.matrix.nCols, false)

    this.containerSelector = '#' + this.options.id
    this.container = $(this.containerSelector)
    this.icons = this.options.icons
    this.tableEditMode = editModeOff

    if (this.options.onCellDrawnEventHandler !== null) {
      this.on(cellDrawnEvent, this.options.onCellDrawnEventHandler )
    }

    if (this.options.onTableDrawnEventHandler !== null) {
      this.on(tableDrawnEvent, this.options.onTableDrawnEventHandler )
    }

    if (this.options.onColumnAddHandler !== null) {
      this.on(columnAddEvent, this.options.onColumnAddHandler)
    }

    if (this.options.onContentChangedEventHandler !== null) {
      this.on(contentChangedEvent, this.options.onContentChangedEventHandler )
    }

    if (this.options.onColumnGroupEventHandler !== null) {
      this.on(columnGroupEvent, this.options.onColumnGroupEventHandler )
    }
    if (this.options.onColumnUngroupEventHandler !== null) {
      this.on(columnGroupEvent, this.options.onColumnUngroupEventHandler )
    }
    if (this.options.drawTableInConstructor) {
      this.redrawTable()
    }

    $(window).on('scroll', function() {
      if (thisObject.waitingForScrollZero && window.scrollY === 0) {
        thisObject.waitingForScrollZero = false
        thisObject.restoreScrollNow()
      }
    })
  }

  getColumnGroups() {
    return this.columnSequence.getGroups()
  }

  getValue(row, col) {
    return this.matrix.getValue(row, col)
  }

  setValue(row, col, value) {
    this.matrix.setValue(row, col, value)
  }

  setOption(optionName, value) {
    // TODO: validate the value!
    this.options[optionName] = value
  }

  getRow(row) {
    return this.matrix.getRow(row)
  }

  getColumn(col) {
    return this.matrix.getColumn(col)
  }

  getMatrix() {
    return this.matrix
  }

  getRowTitle(row) {
    return this.rowDefinition[row].title
  }

  isTableInEditMode() {
    return this.tableEditMode !== editModeOff
  }

  getTableEditMode() {
    return this.tableEditMode
  }

  toggleTableEditMode() {
   if (this.tableEditMode === editModeOff) {
     this.setEditMode(editModeMove)
   } else {
     this.setEditMode(editModeOff)
   }
  }


  setEditMode(newEditMode, redraw = false) {
    if (this._getValidEditModes().indexOf(newEditMode) === -1) {
      console.error('Invalid edit mode: ' + newEditMode)
      return
    }

    this.tableEditMode = newEditMode
    this.container.removeClass( this._getValidEditModes().map( (m) => { return tableEditModeClassPrefix + m}).join(' '))
    this.container.addClass(tableEditModeClassPrefix + newEditMode)
    if (redraw) {
      this.redrawTable()
    } else {
     this._setupTableForEditMode(this.tableEditMode)
    }
  }

  _setupTableForEditMode(mode) {

    let groupColumnButtons = $(`${this.containerSelector} a.${linkButtonClass}`)
    switch(mode) {
      case editModeOff:
        groupColumnButtons.addClass(hiddenClass)
        break

      case editModeMove:
        groupColumnButtons.addClass(hiddenClass)
        break

      case editModeGroup:
        groupColumnButtons.removeClass(hiddenClass)
        break
    }

  }

  _getValidEditModes() {
    return [ editModeOff, editModeMove, editModeGroup]
  }

  editModeOn(redraw = true) {
    this.setEditMode(editModeMove, redraw)
  }

  isTableShownInMultipleRows() {
    return this.options.showInMultipleRows;
  }

  showInMultipleRows(numCols = -1, redrawIfNeeded = true) {
    let redrawRequired = false

    if (!this.options.showInMultipleRows) {
      redrawRequired = true
    }
    let newNumCols = this.options.columnsPerRow
    if (numCols >= 5) {
      newNumCols = numCols
      if (newNumCols !== this.options.columnsPerRow) {
        redrawRequired = true
      }
    }
    this.options.showInMultipleRows = true
    this.options.columnsPerRow = newNumCols
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable()
    }
  }

  showInSingleRow(redrawIfNeeded = true) {
    let redrawRequired = false
    if (this.options.showInMultipleRows) {
      redrawRequired = true
    }
    this.options.showInMultipleRows = false
    if (redrawIfNeeded && redrawRequired) {
      this.redrawTable()
    }
  }

  static genTextIconSet() {
    return defaultIcons
  }

  redrawTable() {
    //console.log("Redrawing table")
    let profiler = new SimpleProfiler('TableRedraw')
    this.dispatchTableDrawnPreEvent()
    let tableHtml = this._genTableHtml()
    console.log(`Table html is ${tableHtml.length} bytes long`)
    profiler.lap('table generated')
    this.container.html(tableHtml)
    profiler.lap('container filled')
    this._setupTableForEditMode(this.tableEditMode)
    this.setupTableEventHandlers()
    profiler.lap('event handlers setup')
    // dispatch redraw callbacks
    if (this.options.onCellDrawnEventHandler !== null) {
      for(let row = 0; row < this.matrix.nRows; row++) {
        for (let col = 0; col < this.matrix.nCols; col++) {
          this.dispatchCellDrawnEvent(row, col)
        }
      }
    }
    if (this.options.onTableDrawnEventHandler !== null) {
      this.dispatchTableDrawnEvent()
    }
    profiler.stop()
  }

  _genTableHtml() {
    let html = ''

    html +=   `<div class="${tablesDivClass}">`
    let numTables = 1
    let columnsPerTable = this.matrix.nCols
    if (this.options.showInMultipleRows) {
      numTables = Math.ceil(this.matrix.nCols / this.options.columnsPerRow)
      columnsPerTable = this.options.columnsPerRow
    }

    for(let tableNumber = 0; tableNumber < numTables; tableNumber++) {
      let currentTableFirstColumn  = tableNumber * columnsPerTable
      let currentTableLastColumnPlusOne = Math.min(this.matrix.nCols, currentTableFirstColumn + columnsPerTable)
      let tableClasses = [ tableClass, this.getTableClass(tableNumber)].concat(this.options.generateTableClasses())

      html += `<table class="${tableClasses.join(' ')}">`
      html += `<tr class="${headerClass}">`
      html += '<th></th>'
      let tableColumnNumber = 0
      for (let col=currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
        let thClasses = [ this.getThClass(col), this.getColClass(col)]
        html += `<th class="${thClasses.join(' ')}">`
        let addColumnBeforeIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnLeft : this.icons.addColumnRight
        let addColumnAfterIcon = this.options.textDirection === 'ltr' ? this.icons.addColumnRight : this.icons.addColumnLeft
        html += this.genButtonHtml(addColumnBeforeIcon, [addColumnLeftButtonClass, headerButtonClass, moveModeButtonClass], 'Add column before')
        html += (col + 1)
        html += this.genButtonHtml(this.icons.deleteColumn, [deleteColumnButtonClass, headerButtonClass, moveModeButtonClass], 'Delete this column')
        html += this.genButtonHtml(addColumnAfterIcon, [addColumnRightButtonClass, headerButtonClass, moveModeButtonClass], 'Add column after')

        if (col !== this.matrix.nCols-1) {
          let linkIcon = this.icons.ungroupedColumn
          let groupClass = groupNoneClass
          let title = "Click to group with next column"
          let floatClass = this.options.textDirection === 'ltr' ? groupIconFloatRightClass : groupIconFloatLeftClass
          if (this.isColumnGroupedWithNext(col)) {
            groupClass = groupNextClass
            linkIcon = this.icons.groupedColumn
            title = "Click to ungroup with next column"
          }
          html += this.genButtonHtml(linkIcon, [ linkButtonClass, `${specificColumnLinkButtonClassPrefix}${col}`, groupClass, floatClass], title)
        }
        html += '</th>'
        tableColumnNumber++
      }

      html += '</tr>'
      for (let row = 0; row < this.matrix.nRows; row++) {
        html += `<tr class="${tableRowClass} ${tableSpecificRowClassPrefix}${row}'">`
        let rowTitleClasses = [tableRowTitleClass ]
        if (this.rowDefinition[row].title === 'Edition') {
          rowTitleClasses.push(tableRowTitleEdition)
        }
        html += `<td class="${rowTitleClasses.join(' ')}">${this.rowDefinition[row].title}</td>`
        tableColumnNumber = 0
        for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
          html += this.generateCellHtml(row, col, tableColumnNumber)
          tableColumnNumber++
        }
        html += '</tr>'
      }
      html += '</table>'
    }
    html += '</div>'
    return html
  }

  generateCellHtml(row, col, tableColumnNumber = -1) {
    let html = ''
    let value = this.matrix.getValue(row, col)
    let cellClasses = [ cellClass, this.getTdClass(row,col), this.getColClass(col)]
    if (tableColumnNumber === 0) {
      cellClasses.push(tableFirstColClass)
    }
    cellClasses = cellClasses.concat(this._getGroupClasses(col))
    cellClasses = cellClasses.concat(this.options.generateCellClasses(row, col, value ))
    let tdExtraArray = this.options.generateCellTdExtraAttributes(row, col, value )

    html += '<td class="' +  cellClasses.join(' ') + '" ' + this.getTdExtraStringFromArray(tdExtraArray) + '>'
    html += this.generateTdHtml(row, col)
    html += '</td>'
    return html
  }

  getTdExtraStringFromArray(tdExtraArray) {
    let tdExtraStringArray = []
    for(let i = 0; i < tdExtraArray.length; i++) {
      let attr = tdExtraArray[i]['attr']
      let val = tdExtraArray[i]['val']
      tdExtraStringArray.push(`${attr}="${escapeHtml(val)}"`)
    }
    return tdExtraStringArray.join(' ')
  }

  isRowEditable(row) {
    return this.rowDefinition[row].isEditable
  }

  generateTdHtml(row, col) {
    let html = ''

    let moveCellBackwardIcon = this.icons.moveCellLeft
    let pushCellsBackwardIcon = this.icons.pushCellsLeft
    let moveCellForwardIcon = this.icons.moveCellRight
    let pushCellsForwardIcon = this.icons.pushCellsRight

    if (this.options.textDirection === 'rtl') {
      moveCellBackwardIcon = this.icons.moveCellRight
      pushCellsBackwardIcon = this.icons.pushCellsRight
      moveCellForwardIcon = this.icons.moveCellLeft
      pushCellsForwardIcon = this.icons.pushCellsLeft
    }

    if (this.tableEditMode !== editModeOff) {
      html += this.genButtonHtml(moveCellBackwardIcon, [ moveCellLeftButtonClass, cellButtonClass, moveModeButtonClass], 'Move backward')
      html += this.genButtonHtml(pushCellsBackwardIcon, [pushCellsLeftButtonClass, cellButtonClass , moveModeButtonClass], 'Push backward')
    }
    html += `<span class="${cellContentClass}">`
    html += this.options.generateCellContent(row,col, this.matrix.getValue(row,col))
    html += '</span>'
    if (this.tableEditMode !== editModeOff && this.isRowEditable(row)) {
      html += this.genButtonHtml(this.icons.editCell, [ editCellButtonClass, cellButtonClass ] , 'Edit')
    }
    if (this.tableEditMode !== editModeOff) {
      html += this.genButtonHtml(pushCellsForwardIcon, [ pushCellsRightButtonClass, cellButtonClass, moveModeButtonClass], 'Push forward')
      html += this.genButtonHtml(moveCellForwardIcon, [ moveCellRightButtonClass , cellButtonClass, moveModeButtonClass] , 'Move forward')
    }
    return html
  }

  generateTdHtmlCellEditMode(row, col) {
    let html  = ''
    let value = this.getValue(row, col)
    let textToEdit = this.options.generateCellContentEditMode(row, col, value)
    let inputSize = Math.min(textToEdit.length, 8)
    if (textToEdit === '') {
      inputSize = 5
    }

    html += `<input type="text" class="${inputClass}" value="${textToEdit}" size="${inputSize}">`

    html += this.genButtonHtml(this.icons.confirmCellEdit, [confirmEditButtonClass], 'Confirm edit')
    html += this.genButtonHtml(this.icons.cancelCellEdit, [cancelEditButtonClass], 'Cancel edit')
    return html
  }

  setupTableEventHandlers() {
    //let profiler = new SimpleProfiler('SetupEventHandlers')
    let thSelector = this.getThSelectorAll()
    $(thSelector).on('mouseenter', this.genOnMouseEnterHeader())
    $(thSelector).on('mouseleave', this.genOnMouseLeaveHeader())
    $(`${thSelector} .${addColumnLeftButtonClass}`).on('click', this.genOnClickAddColumnLeftButton())
    $(`${thSelector} .${addColumnRightButtonClass}`).on('click', this.genOnClickAddColumnRightButton())
    $(`${thSelector} .${deleteColumnButtonClass}`).on('click', this.genOnClickDeleteColumnButton())
    $(`${thSelector} .${headerButtonClass}`).addClass(hiddenClass)
    $(`${thSelector} .${linkButtonClass}`).on('click', this.genOnClickGroupColumnButton())

    this.setupCellEventHandlersAll()
    for (let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
       this.setupCellEventHandlers(row, col, false)
      }
    }
    //profiler.stop()
  }

  setupCellEventHandlersAll() {
    let tdSelector = this.getTdSelectorAll()
    $(tdSelector).off()
    $(tdSelector).on('click', this.genOnClickCell())
    if (this.tableEditMode !== editModeOff) {
      $(tdSelector).on('mouseenter', this.genOnMouseEnterCell())
      $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell())
    }
    $(`${tdSelector} .${cellButtonClass}`).addClass(hiddenClass)
  }

  genOnClickCell() {
    let thisObject = this
    return function(ev) {
      if (thisObject.tableEditMode === editModeOff) {
        return true
      }
      let cellIndex = thisObject._getCellIndexFromElement($(ev.currentTarget))
      if (cellIndex === null) {
        return true
      }
      let row = cellIndex.row
      let col = cellIndex.col

      //console.log('Edit mode click on cell ' + row + ':' + col)

      let theElement = $(ev.target)
      let depth = 5
      while (depth > 0) {
        //console.log(`Testing element's node name, depth ${depth}, nodeName '${theElement.prop('nodeName')}'`)
        if (theElement.prop('nodeName') === 'TD' || theElement.prop('nodeName') ===  'A')
          break
        theElement = theElement.parent()
        depth--
      }
      if (depth === 0) {
        console.error(`Max depth reached trying to get A or TD in cell ${row}:${col}`)
        return true
      }

      if (theElement.prop('nodeName') === 'TD') {
        //console.log('Not a button')
        if (thisObject.isRowEditable(row)) {
          //console.log('Editable cell clicked, row ' + row + ' col ' + col)
          thisObject.enterCellEditMode(row, col)
          return false
        }
      }

      // click on an 'A'  node
      let elementClasses = thisObject.getClassList(theElement)
      //console.log(elementClasses)

      if (elementClasses.indexOf(moveCellLeftButtonClass) !== -1) {
        // move cell left
        console.log('move cell left button clicked')
        thisObject.shiftCells(row, col, col, 'left', 1)
        return false
      }
      if (elementClasses.indexOf(pushCellsLeftButtonClass) !== -1) {
        console.log('PUSH cells LEFT button clicked')
        let emptyCol = thisObject.getFirstEmptyCellToTheLeft(row, col)
        thisObject.shiftCells(row, emptyCol+1, col, 'left', 1)
        return false
      }

      if (elementClasses.indexOf(moveCellRightButtonClass) !== -1) {
        // move cell right
        console.log('move cell right button clicked')
        thisObject.shiftCells(row, col, col, 'right', 1)
        return false
      }

      if (elementClasses.indexOf(pushCellsRightButtonClass) !== -1) {
        console.log('PUSH cells RIGHT button clicked')
        let emptyCol = thisObject.getFirstEmptyCellToTheRight(row, col)
        thisObject.shiftCells(row, col, emptyCol-1, 'right', 1)
        return false
      }

      if (elementClasses.indexOf(editCellButtonClass) !== -1) {
        //edit cell
        //console.log(`Edit cell button clicked on ${row}:${col}`)
        thisObject.enterCellEditMode(row, col)
        return false
      }
      console.warn(`Click on an unknown cell button on ${row}:${col}`)
      return true
    }
  }

  shiftCells(row, firstCol, lastCol, direction, numCols = 1) {
    //let profiler = new SimpleProfiler('ShiftCells')
    //console.log(`Shifting cells ${firstCol} to ${lastCol} ${direction} ${numCols} column(s)`)

    // Check if the shift makes sense
    if (firstCol > lastCol || firstCol < 0 || lastCol >= this.matrix.nCols || numCols < 1) {
      console.log('Given columns do not make sense')
      return false
    }
    if (direction==='right' && lastCol+numCols >= this.matrix.nCols) {
      console.log(`This ${direction} shift overflows the matrix ;)` )
      return false
    }
    if (direction==='left' && firstCol-numCols < 0) {
      console.log(`This ${direction} shift under flows the matrix ;)` )
      return false
    }
    //profiler.lap('checks done')
    // dispatch pre cell shift events
    this.dispatchCellShiftEvents('pre', direction, row, firstCol, lastCol, numCols)

    //profiler.lap('pre shift events dispatched')
    // move values in matrix
    let emptyValue = this.options.getEmptyValue()
    let currentValues = []
    for (let col = firstCol; col <= lastCol; col++) {
      currentValues[col] = this.matrix.getValue(row, col)
    }
    if (direction === 'right') {
      for (let i = 0; i < numCols; i++) {
        this.matrix.setValue(row, firstCol+i, emptyValue)
      }
      for (let col=firstCol+numCols; col <= lastCol+numCols; col++) {
        this.matrix.setValue(row, col, currentValues[col-numCols])
      }
    } else {
      for (let i = 0; i < numCols; i++) {
        this.matrix.setValue(row, lastCol - i, emptyValue)
      }
      for (let col=lastCol-numCols; col >=firstCol-numCols; col--) {
        this.matrix.setValue(row, col, currentValues[col+numCols])
      }
    }
    //profiler.lap('matrix updated')
    // refresh html table cells
    if (this.options.redrawOnCellShift) {
      //console.log('Redrawing cells')
      let firstColToRedraw = direction === 'right' ? firstCol : firstCol-numCols
      let lastColToRedraw = direction === 'right' ? lastCol+numCols : lastCol
      for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
        this.redrawCell(row, col)
        this.setupCellEventHandlers(row,col, true)
        this.dispatchCellDrawnEvent(row, col)
      }
      //profiler.lap('cells redrawn')
    } else {
      //console.log('Not redrawing cells')
    }
    // dispatch post move events
    //console.log('Dispatching post move events')
    this.dispatchCellShiftEvents('post', direction, row, firstCol, lastCol, numCols)

    //profiler.stop()
  }

  setupCellEventHandlers(row, col, restoreClickEvent = true) {
    let tdSelector = this.getTdSelector(row, col)
    //console.log(`setting up event handlers for cell ${row}:${col}, restoreClick = ${restoreClickEvent}`)
    if (this.tableEditMode !== editModeOff && restoreClickEvent) {
      if (this.isRowEditable(row)) {
        $(tdSelector).off('click')
        $(tdSelector).on('click', this.genOnClickCell(row, col))
      }
    }
  }

  setupCellEventHandlersCellEditMode(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).off()
    $(`${tdSelector} .${cancelEditButtonClass}`).on('click', this.genOnClickCancelEditButton(row, col))
    $(`${tdSelector} .${confirmEditButtonClass}`).on('click', this.genOnClickConfirmEditButton(row, col))
    $(`${tdSelector} .${inputClass}`).on('keyup', this.genOnKeyPressCellInputField(row, col))
  }

  genButtonHtml(icon, classes, title='') {
    return `<a href="#" class="${classes.join(' ')}" title="${title}">${icon}</a>`
  }

  genOnKeyPressCellInputField(row, col) {
    let thisObject = this
    return function(ev) {
      let currentText = $(`${thisObject.getTdSelector(row, col)} .${inputClass}`).val()
      if (ev.which === 13) {
        // Enter key
        //console.log(`Enter key press on ${row}:${col}`)
        return thisObject.confirmEdit(row, col)
      }
      if (ev.which === 27) {
        // Escape key
        //console.log(`Escape key press on ${row}:${col}`)
        thisObject.leaveCellEditMode(row, col)
        if (thisObject.options.onCellCancelEdit !== null) {
          this.options.onCellCancelEdit(row, col, currentText )
        }
        return false
      }
      // validate!
      let validationResult = thisObject.options.cellValidationFunction(row, col, currentText)
      let confirmEditButton =  $(`${thisObject.getTdSelector(row, col)} .${confirmEditButtonClass}`)
      if (validationResult.isValid) {
        confirmEditButton.removeClass('invalid')
        confirmEditButton.attr('title', 'Click to confirm')
      } else {
        confirmEditButton.addClass('invalid')
        let warningText = 'ERROR: ' + validationResult.errors.join('. ') + validationResult.warnings.join('. ')
        if (warningText !== '') {
          confirmEditButton.attr('title', warningText)
        }
        //console.log(validationResult)
      }
      return true
    }
  }

  getClassList(element) {
    if (element.attr('class') === undefined) {
      return []
    }
    return element.attr("class").split(/\s+/)
  }

  _getThIndexFromElement(element) {
    let thIndex = -1
    let classes = this.getClassList(element)
    for(const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^te-th-/) !== -1) {
        thIndex = parseInt(theClass.replace('te-th-', ''))
        break
      }
    }
    return thIndex
  }

  _getCellIndexFromElement(element) {
    let cellIndex = null
    let classes = this.getClassList(element)
    for(const theClass of classes) {
      if (theClass.search(/^te-cell-/) !== -1) {
        // TODO: use class constant in regex
        let cellIndexArray = theClass.replace('te-cell-', '').split('-')
        if (cellIndexArray.length !== 2) {
          console.error('Found cell class with invalid cell index, class: ' +  theClass)
          break
        }
        cellIndex = {
          row: parseInt(cellIndexArray[0]),
          col: parseInt(cellIndexArray[1])
        }
        break
      }
    }
    return cellIndex
  }

  genOnMouseEnterHeader() {
    let thisObject = this
    return function(ev) {
      switch(thisObject.tableEditMode) {
        case editModeOff:
        case editModeGroup:
          return true

        case editModeMove:
          let col = thisObject._getThIndexFromElement($(ev.currentTarget))
          if (col === -1) {
            return true
          }
          let thSelector = thisObject.getThSelector(col)
          $(thSelector + ' .add-column-left-button').removeClass(hiddenClass)
          $(thSelector + ' .add-column-right-button').removeClass(hiddenClass)
          if (thisObject.canDeleteColumn(col)) {
            $(thSelector + ' .delete-column-button').removeClass(hiddenClass)
          }
          return true

        default:
          console.error(`Unknown tableEditMode in MouseEnterHeader:  ${thisObject.tableEditMode}`)
          return false
      }
    }
  }

  genOnMouseLeaveHeader() {
    let thisObject = this
    return function(ev) {
      //console.log('Mouse leave')
      switch(thisObject.tableEditMode) {
        case editModeOff:
        case editModeGroup:
          return true

        case editModeMove:
          let col = thisObject._getThIndexFromElement($(ev.currentTarget))
          if (col !== -1) {
            $(thisObject.getThSelector(col) + ' .header-button').addClass(hiddenClass)
          }
          return true

        default:
          console.error(`Unknown tableEditMode in MouseLeaveHeader:  ${thisObject.tableEditMode}`)
          return false
      }
    }
  }

  genOnMouseEnterCell() {
    let thisObject = this
    return function(ev) {
      switch (thisObject.tableEditMode) {
        case editModeOff:
        case editModeGroup:
          return true

        case editModeMove:
          let cellIndex = thisObject._getCellIndexFromElement($(ev.currentTarget))
          if (cellIndex === null) {
            return true
          }
          let row = cellIndex.row
          let col = cellIndex.col
          //console.log('Mouse enter cell ' + row + ':' + col)
          let tdSelector = thisObject.getTdSelector(row, col)
          if (thisObject.canMoveCellLeft(row, col)) {
            $(tdSelector + ' .move-cell-left-button').removeClass(hiddenClass)
          }
          if (thisObject.canPushCellsLeft(row, col)) {
            let firstCol = thisObject.getFirstEmptyCellToTheLeft(row, col) + 1
            $(tdSelector + ' .push-cells-left-button')
              .removeClass(hiddenClass)
              .attr('title', `Push ${firstCol + 1}-${col + 1} back 1 column`)
          }
          if (thisObject.canMoveCellRight(row, col)) {
            $(tdSelector + ' .move-cell-right-button').removeClass(hiddenClass)
          }
          if (thisObject.canPushCellsRight(row, col)) {
            let lastCol = thisObject.getFirstEmptyCellToTheRight(row, col) - 1
            $(tdSelector + ' .push-cells-right-button')
              .removeClass(hiddenClass)
              .attr('title', `Push ${col + 1}-${lastCol + 1} forward 1 column`)
          }
          if (thisObject.isRowEditable(row)) {
            $(tdSelector + ' .edit-cell-button').removeClass(hiddenClass)
          }
          return true

        default:
          console.error(`Unknown tableEditMode in MouseEnterCell:  ${thisObject.tableEditMode}`)
          return false

      }
    }
  }

  genOnMouseLeaveCell() {
    let thisObject = this
    return function(ev) {
      switch(thisObject.tableEditMode) {
        case editModeOff:
        case editModeGroup:
          return true

        case editModeMove:
          let cellIndex = thisObject._getCellIndexFromElement($(ev.currentTarget))
          if (cellIndex === null) {
            return true
          }
          let row = cellIndex.row
          let col = cellIndex.col
          $(thisObject.getTdSelector(row, col) + ' .cell-button').addClass(hiddenClass)
          return true

        default:
          console.error(`Unknown tableEditMode in MouseLeaveCell:  ${thisObject.tableEditMode}`)
          return false
      }
    }
  }

  redrawCell(row, col) {
    //$(this.getTdSelector(row, col)).html(this.generateTdHtml(row, col))
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).replaceWith(this.generateCellHtml(row,col))
    // re-establish the cell's event handlers
    $(tdSelector).on('click', this.genOnClickCell())
    if (this.tableEditMode !== editModeOff) {
      $(tdSelector).on('mouseenter', this.genOnMouseEnterCell())
      $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell())
    }
    $(tdSelector + ' .cell-button').addClass(hiddenClass)

  }

  refreshCell(row, col) {
    // let profiler = new SimpleProfiler(`refresh-r${row}-c${col}`)
    // profiler.start()
    let tdSelector = this.getTdSelector(row, col)
    let td = $(tdSelector)
    this.refreshCellContent(row, col)
    this.refreshCellClassesTd(td, row, col)
    this.refreshCellAttributes(row, col)
    $(tdSelector + ' .cell-button').addClass(hiddenClass)
    // profiler.stop()
  }

  isColumnGroupedWithNext(col) {
    return this.columnSequence.isGroupedWithNext(col)
  }

  isColumnGroupedWithPrevious(col) {
    return this.columnSequence.isGroupedWithPrevious(col)
  }

  _getGroupClasses(col) {
    let isGroupNext = this.isColumnGroupedWithNext(col)
    let isGroupPrev = this.isColumnGroupedWithPrevious(col)

    if (!isGroupNext && !isGroupPrev) {
      return [groupNoneClass]
    }
    if (isGroupNext && isGroupPrev) {
      return [groupBothClass]
    }
    if (isGroupNext) {
      return [groupNextClass]
    }
    return [groupPreviousClass]
  }

  refreshCellContent(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector + ' .te-cell-content').html(this.options.generateCellContent(row,col, this.matrix.getValue(row,col)))
  }

  refreshCellClassesTd(td, row, col) {
    let newClasses = this.options.generateCellClasses(row, col, this.matrix.getValue(row, col) )
    if ( td.hasClass(tableFirstColClass)) {
      // preserve first col class
      newClasses.push(tableFirstColClass)
    }
    let standardCellClasses = [ 'te-cell', this.getTdClass(row,col), this.getColClass(col)]
    standardCellClasses = standardCellClasses.concat(this._getGroupClasses(col))
    td.attr('class', (standardCellClasses.concat(newClasses)).join(' '))
  }

  refreshCellClasses(row, col) {
    this.refreshCellClassesTd($(this.getTdSelector(row, col)), row, col)
  }

  refreshColumnClasses(col) {
    for(let r = 0; r < this.matrix.nRows; r++) {
      this.refreshCellClasses(r, col)
    }
  }

  refreshCellAttributes(row, col) {
    let tdExtraArray = this.options.generateCellTdExtraAttributes(row, col, this.matrix.getValue(row, col))
    let td = $(this.getTdSelector(row, col))
    for (let i = 0; i < tdExtraArray.length; i++) {
      let attr = tdExtraArray[i]['attr']
      let val = tdExtraArray[i]['val']
      td.attr(attr, val)
    }
  }

  redrawColumn(col) {
    for(let row = 0; row < this.matrix.nRows; row++) {
      this.redrawCell(row, col)
    }
  }

  refreshColumn(col) {
    for(let row = 0; row < this.matrix.nRows; row++) {
      this.refreshCell(row, col)
    }
  }

  enterCellEditMode(row, col) {
    //console.log('Entering edit mode, ' + row + ':' + col)
    let tdSelector = this.getTdSelector(row, col)
    let inputSelector = tdSelector + ' .te-input'
    this.editFlagMatrix.setValue(row, col, true)
    $(tdSelector).html(this.generateTdHtmlCellEditMode(row, col))
    $(tdSelector).addClass('edit-mode')
    this.setupCellEventHandlersCellEditMode(row, col)
    $(inputSelector).on('focus', function() {
      $(inputSelector).get(0).setSelectionRange(10000, 10000)
    })
    $(inputSelector).get(0).focus()
  }

  leaveCellEditMode(row, col) {
    //console.log('Leaving edit mode, ' + row + ':' + col)
    let tdSelector = this.getTdSelector(row, col)
    this.editFlagMatrix.setValue(row, col, false)
    $(tdSelector).html(this.generateTdHtml(row, col))
    $(tdSelector).removeClass('edit-mode')
    $(tdSelector + ' .cell-button').addClass(hiddenClass)
    this.setupCellEventHandlers(row,col, true)
    // reinstate mouseenter and mouseleave events
    $(tdSelector).on('mouseenter', this.genOnMouseEnterCell())
    $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell())
    this.dispatchCellDrawnEvent(row, col)
  }

  genOnClickEditableCell(row, col) {
    let thisObject = this
    return function() {
      console.log('Editable cell clicked, row ' + row + ' col ' + col)
      thisObject.enterCellEditMode(row, col)
      return false
    }
  }

  genOnClickCancelEditButton(row, col) {
    let thisObject = this
    return function() {
      let newText = $(thisObject.getTdSelector(row, col) + ' .te-input').val()
      //console.log(`Cancel button clicked on ${row}:${col}`)
      thisObject.leaveCellEditMode(row, col)
      if (thisObject.options.onCellCancelEdit !== null) {
        this.options.onCellCancelEdit(row, col, newText )
      }
      return false
    }
  }

  confirmEdit(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    if ($(tdSelector + ' .confirm-edit-button').hasClass('invalid')) {
      return false
    }
    let newText = $(tdSelector + ' .te-input').val()
    let confirmResult = this.options.onCellConfirmEdit(row, col, newText)
    this.leaveCellEditMode(row, col)
    if (confirmResult.valueChange) {
      //console.log('Change in value')
      this.setValue(row, col, confirmResult.value)
      this.dispatchContentChangedEvent(row, col)
    }
    return false

  }

  genOnClickConfirmEditButton(row, col) {
    let thisObject = this
    return function() {
      //console.log(`Confirm button clicked on ${row}:${col}`)
      return thisObject.confirmEdit(row, col)
    }
  }

  genOnClickGroupColumnButton() {
    let thisObject = this
    return (ev) => {
      if (thisObject.tableEditMode !== editModeGroup) {
        return false
      }
      let col = thisObject._getColFromGroupColumnButton(ev.currentTarget)
      //console.log(`Click on groupColumn Button, col = ${col}`)
      let grouped = true
      if (thisObject.isColumnGroupedWithNext(col)) {
        // ungroup
        //console.log(`Ungrouping`)
        grouped = false
        thisObject.columnSequence.ungroupWithNext(col)
        $(ev.currentTarget).html(thisObject.icons.ungroupedColumn)
      } else {
        // group with next
        //console.log(`Grouping with next`)
        thisObject.columnSequence.groupWithNext(col)
        $(ev.currentTarget).html(thisObject.icons.groupedColumn)
      }
      let columnGroup = this.columnSequence.getGroupForNumber(col)
      thisObject.dispatchColumnGroupChangeEvent(col, grouped)
      //console.log(columnGroup)
      let minC = columnGroup.from > 0 ? columnGroup.from-1 : 0
      let maxC = columnGroup.to < thisObject.matrix.nCols - 1 ? columnGroup.to +1:  thisObject.matrix.nCols - 1
      for (let c = minC; c <= maxC; c++) {
        thisObject.refreshColumnClasses(c)
      }
      return false
    }
  }

  _getColFromGroupColumnButton(domElement) {
    let classes = this.getClassList($(domElement))
    let col = -1
    for(const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^link-button-/) !== -1) {
        col = parseInt(theClass.replace('link-button-', ''))
        break
      }
    }
    return col
  }

  genOnClickAddColumnRightButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject._getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return false
      }
      console.log('Add column right, col = ' + col)
      thisObject.currentYScroll = window.scrollY
      thisObject.currentXScroll = window.scrollX
      thisObject.waitingForScrollZero = true
      //thisObject.matrix.addColumnAfter(col,  thisObject.options.getEmptyValue())
      thisObject.insertColumnAfter(col)
      thisObject.dispatchColumnAddEvents(col+1)
      thisObject.redrawTable()
      thisObject.forceRestoreScroll(250)
    }
  }

  genOnClickAddColumnLeftButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject._getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return false
      }
      console.log('Add column left, col = ' + col)
      thisObject.currentYScroll = window.scrollY
      thisObject.currentXScroll = window.scrollX
      thisObject.waitingForScrollZero = true
      //thisObject.matrix.addColumnAfter(col-1, thisObject.options.getEmptyValue())
      thisObject.insertColumnAfter(col-1)
      thisObject.dispatchColumnAddEvents(col)
      thisObject.redrawTable()
      thisObject.forceRestoreScroll(250)
    }
  }

  insertColumnAfter(col) {
    this.matrix.addColumnAfter(col, this.options.getEmptyValue())
    this.columnSequence.addNumberAfter(col)
  }

  forceRestoreScroll(timeOut = 250)  {
    let thisObject = this
    setTimeout(function() {
      if (thisObject.waitingForScrollZero) {
        console.log('Tired of waiting for scroll zero, restoring scroll after ' + timeOut + ' ms')
        thisObject.restoreScrollNow()
        thisObject.waitingForScrollZero = false
      }
    }, timeOut)
  }

  restoreScrollNow() {
    window.scrollTo(this.currentXScroll, this.currentYScroll)
  }

  genOnClickDeleteColumnButton() {
    let thisObject = this
    return function(ev) {
      let col = thisObject._getThIndexFromElement($(ev.currentTarget).parent())
      if (col === -1) {
        return true
      }
      if (thisObject.canDeleteColumn(col)) {
        $(thisObject.getThSelector(col)).addClass('te-deleting')
        console.log('Deleting column ' + col)
        thisObject.currentYScroll = window.scrollY
        thisObject.currentXScroll = window.scrollX
        thisObject.waitingForScrollZero = true
        thisObject.matrix.deleteColumn(col)
        thisObject.columnSequence.removeNumber(col)
        thisObject.dispatchColumnDeleteEvents(col)
        thisObject.redrawTable()
        thisObject.forceRestoreScroll(250)
      } else {
        console.log('Column NOT empty, cannot delete')
      }
    }
  }

  getTableClass(tableNumber) {
    return 'te-table-' + tableNumber
  }

  getTableSelector(tableNumber) {
    return '#' + this.options.id + ' .' + this.getTableClass(tableNumber)
  }

  getTableNumberForColumn(col) {
    if (this.options.showInMultipleRows) {
      return Math.floor(col / this.options.columnsPerRow)
    } else {
      return 0
    }

  }

  getTdClass(row, col) {
    return specificCellClassPrefix + row + '-' + col
  }

  getThClass(col) {
    return specificHeaderClassPrefix + col
  }

  getColClass(col) {
    return  'te-col-' + col
  }

  getTdSelector(row, col) {
    return '#' + this.options.id + ' .' + this.getTdClass(row,col)
  }

  getTdSelectorAll() {
    return '#' + this.options.id + ' .' + cellClass
  }

  getThSelector(col) {
    return '#' + this.options.id + ' .' + this.getThClass(col)
  }

  getThSelectorAll() {
    return '#' + this.options.id + ' .'+ tableClass +  ' th'
  }

  getCellContentSelector(row, col) {
    return this.getTdSelector(row, col) + ' .' + cellContentClass
  }

  isColumnEmpty(col) {
    return this.matrix.isColumnEmpty(col, this.options.isEmptyValue)
  }

  canDeleteColumn(col) {
      return this.options.canDeleteColumn !== null ?  this.options.canDeleteColumn(col) : this.isColumnEmpty(col)
  }

  canMoveCellLeft(row, col) {
    return col!== 0 &&
      !this.options.isEmptyValue(row, col,this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(row, col,this.matrix.getValue(row, col-1));
  }


  canPushCellsLeft(row, col) {
    if (this.options.isEmptyValue(row, col,this.matrix.getValue(row, col)) || this.canMoveCellLeft(row, col)) {
      // no pushing a cell that is empty or that can be simply moved
      return false
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
  getFirstEmptyCellToTheLeft(row, col) {
    if (col === 0) {
      return -1
    }
    for (let i = col-1; i >= 0; i--) {
      if (this.options.isEmptyValue(row, col,this.matrix.getValue(row, i))) {
        return i
      }
    }
    return -1
  }

  canMoveCellRight(row, col) {
    return  col !== (this.matrix.nCols - 1) &&
      !this.options.isEmptyValue(row, col,this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(row, col,this.matrix.getValue(row, col+1));
  }

  canPushCellsRight(row, col) {
    if (this.options.isEmptyValue(row, col,this.matrix.getValue(row, col)) || this.canMoveCellRight(row, col)) {
      // no pushing a cell that is empty or that can be simply moved
      return false
    }
    return  this.getFirstEmptyCellToTheRight(row, col) !== -1;

  }

  /**
   * Get the index of the first empty cell to the left
   * of the given cell position. Returns -1 if no such cell
   * could be found
   * @param row
   * @param col
   */
  getFirstEmptyCellToTheRight(row, col) {
    if (col === (this.matrix.nCols - 1) ) {
      return -1
    }
    for (let i = col+1; i < this.matrix.nCols; i++) {
      if (this.options.isEmptyValue(row, col,this.matrix.getValue(row, i))) {
        return i
      }
    }
    return -1
  }



  dispatchCellDrawnEvent(row, col) {
    this.dispatchEvent(
      cellDrawnEvent,
      {
        row: row,
        col: col,
        selector: this.getCellContentSelector(row, col)
      }
    )
  }

  dispatchTableDrawnEvent() {
    this.dispatchEvent(tableDrawnEvent, {})
  }

  dispatchColumnGroupChangeEvent(col, grouped) {
    let event = grouped ? columnGroupEvent : columnUngroupEvent
    this.dispatchEvent(event, {
      col: col,
      groupedColumns: this.getGroupedColumns()
    })
  }

  getGroupedColumns() {
    return this.columnSequence.getGroupedNumbers()
  }

  dispatchTableDrawnPreEvent() {
    this.dispatchEvent('table-drawn-pre', {})
  }

  dispatchColumnDeleteEvents(deletedColumn) {
    this.dispatchEvent('column-delete', {
      col: deletedColumn,
    })
  }

  dispatchColumnAddEvents(newCol) {
    this.dispatchEvent(columnAddEvent, {
      col: newCol,
    })
  }

  dispatchCellShiftEvents(type, direction, row, firstCol, lastCol, numCols) {
    //let profiler = new SimpleProfiler('DispatchCellShiftEvents')
    let selectors = []
    for(let c = firstCol; c <= lastCol; c++) {
      selectors.push(this.getTdSelector(row, c))
    }
    // profiler.lap('selectors calculated')
    // 1st event: specific type/direction
    let eventName = 'cell-' + type + '-shift-' + direction
    this.dispatchEvent(eventName, {
      row: row,
      firstCol: firstCol,
      lastCol: lastCol,
      numCols: numCols,
      selectors: selectors
    })
    // profiler.lap(`Event '${eventName}' dispatched`)
    // 2nd event: generic type, cell-pre-move or cell-post-move
    eventName = 'cell-' + type + '-shift'
    this.dispatchEvent(eventName, {
      row: row,
      firstCol: firstCol,
      lastCol: lastCol,
      numCols: numCols,
      direction: direction,
      selectors: selectors
    })
    // profiler.lap(`Event '${eventName}' dispatched`)

    // 3rd event: generic move: cell-shift, only for type 'post'
    if (type==='post') {
      this.dispatchEvent('cell-shift', {
        row: row,
        firstCol: firstCol,
        lastCol: lastCol,
        numCols: numCols,
        direction: direction,
        selectors: selectors
      })
    }
    // profiler.stop()
  }

  dispatchContentChangedEvent(row, col) {
    this.dispatchEvent(
      contentChangedEvent,
      {
        row: row,
        col: col
      }
    )
  }

  dispatchEvent(eventName, data = {}){
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f)  {
    this.container.on(eventName, f)
  }

}