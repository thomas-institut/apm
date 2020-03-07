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

   The editor is agnostic to actual matrix values as it can be provided with functions
   to generate the table's contents and to detect empty values

 */


class TableEditor {

  constructor(options) {

    console.log("Constructing TableEditor")
    let thisObject = this

    let optionsDefinition = {
      rowDefinition: {
        // data definition: rows and values, see definition below
        // TableEditor is agnostic to the value types
        required: true,
        type: 'Array'
      },
      id: {
        // the html id of the container where the table will appear
        required: true,
        type: 'string'
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
        type: 'int',
        default: 10
      },
      drawTableInConstructor: {
        // if false, the table will not be drawn in the constructor,
        // the user would have to redraw it manually later.
        // If the user attaches event handlers that reference the TableEditor
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
        default: function (row,col,value) {
          if (thisObject.options.isEmptyValue(value)) {
            return thisObject.options.emptyCellHtml
          }
          return value
        }
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
      onContentChangedEventHandler: {
        required: false,
        type: 'function',
        default: null
      },
      generateCellClasses: {
        // a function to generate an array of html classes for a table cell
        // the default function returns an empty array
        required: false,
        type: 'function',
        default : function(row, col, value) {
          return [];
        }
      },
      generateCellTdExtraAttributes : {
        // a function to generate html attributes to be included in a cell's
        // td element.
        // This can be used to generate Bootstrap popover data for a cell,
        // by returning 'data-content="popover text"'
        required: false,
        type: 'function',
        default: function(row, col, value) {
          return ''
        }
      },
      getEmptyValue: {
        // a function to get an empty value
        required: false,
        type: 'function',
        default: function() {
          return ''
        }
      },
      isEmptyValue: {
        // a function to test whether a table value is empty
        // the default function returns true if the value is an empty string
        required: false,
        type: 'function',
        default: function (value) {
          return value === ''
        }
      },
      emptyCellHtml: {
        // html to use as the content of an empty cell
        required: false,
        type: 'string',
        default: '&mdash;'
      },
      icons: {
        // html for the different icons, see genTextIconSet() below
        required: false,
        type: 'object',
        default: this.genTextIconSet()
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
    console.log('Table options')
    console.log(this.options)

    this.rowDefinition = []
    let valueArray = []
    for (let i=0; i < this.options.rowDefinition.length; i++) {
      let dataChecker = new OptionsChecker(rowObjectDefinition, 'dataElement ' + i)
      let cleanRowDefinition = dataChecker.getCleanOptions(this.options.rowDefinition[i])
      this.rowDefinition.push(cleanRowDefinition)
      valueArray.push(cleanRowDefinition.values)
    }

    this.matrix = new Matrix(0,0)
    this.matrix.setFromArray(valueArray)
    this.matrix.logMatrix('TableEditor ' + this.options.id)

    this.editFlagMatrix = new Matrix(this.matrix.nRows, this.matrix.nCols, false)

    this.container = $('#' + this.options.id)
    this.icons = this.options.icons
    this.tableEditMode = false

    if (this.options.onCellDrawnEventHandler !== null) {
      this.on('cell-drawn', this.options.onCellDrawnEventHandler )
    }

    if (this.options.onTableDrawnEventHandler !== null) {
      this.on('table-drawn', this.options.onTableDrawnEventHandler )
    }

    if (this.options.onContentChangedEventHandler !== null) {
      this.on('content-changed', this.options.onContentChangedEventHandler )
    }
    if (this.options.drawTableInConstructor) {
      this.redrawTable()
    }

    console.log("Finished constructing TableEditor")
  }

  getValue(row, col) {
    return this.matrix.getValue(row, col)
  }

  setValue(row, col, value) {
    this.matrix.setValue(row, col, value)
  }

  getRow(row) {
    return this.matrix.getRow(row)
  }

  getRowTitle(row) {
    return this.rowDefinition[row].title
  }

  isTableInEditMode() {
    return this.tableEditMode
  }

  toggleTableEditMode() {
    this.tableEditMode = !this.tableEditMode
    this.redrawTable()
    if (this.tableEditMode) {
      this.container.addClass('table-edit-mode')
    } else {
      this.container.removeClass('table-edit-mode')
    }

  }

  isTableShownInMultipleRows() {
    return this.options.showInMultipleRows;
  }

  showInMultipleRows(numCols = -1) {
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
    if (redrawRequired) {
      this.redrawTable()
    }
  }

  showInSingleRow() {
    let redrawRequired = false
    if (this.options.showInMultipleRows) {
      redrawRequired = true
    }
    this.options.showInMultipleRows = false
    if (redrawRequired) {
      this.redrawTable()
    }
  }

  genTextIconSet() {
    return {
      moveCellLeft: '&#x25c1;',
      moveCellRight: '&#x25b7;',
      editCell: '&#x270D;',
      addColumnLeft: '<sup>&#x25c3;</sup>+',
      addColumnRight: '+<sup>&#x25b9;',
      deleteColumn: '&#x2715;',
      confirmCellEdit: '<small>OK</small>',
      cancelCellEdit: '<small>Cancel</small>'
    }
  }

  redrawTable() {
    //console.log("Redrawing table")
    let inittime = window.performance.now()
    this.container.html(this.generateTable())
    this.setupTableEventHandlers()
    // dispatch redraw callbacks
    for(let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
        this.dispatchCellDrawnEvent(row, col)
      }
    }
    this.dispatchTableDrawnEvent()
    console.log('Done redrawing table in ' + (window.performance.now() - inittime) + ' ms')
  }

  generateTable() {
    let html = ''

    let numTables = 1
    let columnsPerTable = this.matrix.nCols
    if (this.options.showInMultipleRows) {
      numTables = Math.ceil(this.matrix.nCols / this.options.columnsPerRow)
      columnsPerTable = this.options.columnsPerRow
    }

    for(let tableNumber = 0; tableNumber < numTables; tableNumber++) {

      let currentTableFirstColumn  = tableNumber * columnsPerTable
      let currentTableLastColumnPlusOne = Math.min(this.matrix.nCols, currentTableFirstColumn + columnsPerTable)
      html += '<table class="te-table ' + this.getTableClass(tableNumber) + '">'
      html += '<tr class="te-tableheader">'
      html += '<th></th>'
      for (let col=currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
        html += '<th class="'+ this.getThClass(col)  +'">'
        if (this.tableEditMode) {
          html += this.genButtonHtml(this.icons.addColumnLeft, ['add-column-left-button', 'header-button'], 'Add column to the left')
        }

        html += (col + 1)
        if (this.tableEditMode) {
          html += this.genButtonHtml(this.icons.deleteColumn, ['delete-column-button', 'header-button'], 'Delete this column')
          html += this.genButtonHtml(this.icons.addColumnRight, ['add-column-right-button', 'header-button'], 'Add column to the right')
        }
        html += '</th>'
      }

      html += '</tr>'
      for (let row = 0; row < this.matrix.nRows; row++) {
        html += '<tr class="te-tablerow te-tr-' + row + '">'
        html += '<td class="te-rowtitle">' + this.rowDefinition[row].title + '</td>'
        for (let col = currentTableFirstColumn; col < currentTableLastColumnPlusOne; col++) {
          html += this.generateCellHtml(row, col)
        }
        html += '</tr>'
      }
      html += '</table>'
    }
    return html
  }

  generateCellHtml(row, col) {
    let html = ''
    let value = this.matrix.getValue(row, col)
    let cellClasses = [ this.getTdClass(row,col)]
    cellClasses.push(this.options.generateCellClasses(row, col, value ))
    let tdExtra = this.options.generateCellTdExtraAttributes(row, col, value )
    html += '<td class="' +  cellClasses.join(' ') + '" ' + tdExtra + '>'
    html += this.generateTdHtml(row, col)
    html += '</td>'
    return html
  }

  isRowEditable(row) {
    return this.rowDefinition[row].isEditable
  }

  generateTdHtml(row, col) {
    let html = ''
    if (this.tableEditMode) {
      html += this.genButtonHtml(this.icons.moveCellLeft, [ 'move-cell-left-button', 'cell-button' ], 'Move backward')
    }
    html += '<span class="te-cell-content">'
    html += this.options.generateCellContent(row,col, this.matrix.getValue(row,col))
    html += '</span>'
    if (this.tableEditMode && this.isRowEditable(row)) {
      html += this.genButtonHtml(this.icons.editCell, [ 'edit-cell-button', 'cell-button' ] , 'Edit')
    }
    if (this.tableEditMode) {
      html += this.genButtonHtml(this.icons.moveCellRight, [ 'move-cell-right-button' , 'cell-button' ] , 'Move forward')
    }
    return html
  }

  generateTdHtmlCellEditMode(row, col) {
    let html  = ''
    let value = this.getValue(row, col)
    html += '<input type="text" class="te-input" value="' + value + '" ' + 'size="' + value.length + '">'
    html += this.genButtonHtml(this.icons.confirmCellEdit, ['confirm-edit-button'], 'Confirm edit')
    html += this.genButtonHtml(this.icons.cancelCellEdit, ['cancel-edit-button'], 'Cancel edit')
    return html
  }

  setupTableEventHandlers() {
    for (let col=0; col < this.matrix.nCols; col++) {
      if (this.tableEditMode) {
        $(this.getThSelector(col) + ' .add-column-left-button').on('click', this.genOnClickAddColumnLeftButton(col))
        $(this.getThSelector(col) + ' .add-column-right-button').on('click', this.genOnClickAddColumnRightButton(col))
        $(this.getThSelector(col) + ' .delete-column-button').on('click', this.genOnClickDeleteColumnButton(col))
        $(this.getThSelector(col)).on('mouseenter', this.genOnMouseEnterHeader(col))
        $(this.getThSelector(col)).on('mouseleave', this.genOnMouseLeaveHeader(col))
      }
      $(this.getThSelector(col) + ' .header-button').addClass('hidden')
    }

    for (let row = 0; row < this.matrix.nRows; row++) {
      for (let col = 0; col < this.matrix.nCols; col++) {
       this.setupCellEventHandlers(row, col)
      }
    }
  }


  setupCellEventHandlers(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).off()
    if (this.tableEditMode) {
      $(tdSelector + ' .move-cell-left-button').on('click', this.genOnClickMoveCellLeftButton(row, col))
      $(tdSelector + ' .move-cell-right-button').on('click', this.genOnClickMoveCellRightButton(row, col))
      $(tdSelector + ' .edit-cell-button').on('click', this.genOnClickEditCellButton(row, col))
      $(tdSelector).on('mouseenter', this.genOnMouseEnterCell(row, col))
      $(tdSelector).on('mouseleave', this.genOnMouseLeaveCell(row, col))
      if (this.isRowEditable(row)) {
        $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
      }
    }
    $(tdSelector + ' .cell-button').addClass('hidden')
  }

  setupCellEventHandlersCellEditMode(row, col) {
    let tdSelector = this.getTdSelector(row, col)
    $(tdSelector).off()
    $(tdSelector + ' .cancel-edit-button').on('click', this.genOnClickCancelEditButton(row, col))
    $(tdSelector + ' .confirm-edit-button').on('click', this.genOnClickConfirmEditButton(row, col))
    $(tdSelector + ' .te-input').on('keydown', this.genOnKeyPressCellInputField(row, col))
  }


  genButtonHtml(icon, classes, title='') {
    return '<a href="#" class="' + classes.join(' ') + '" title="'+ title + '">' + icon + '</a>'
  }

  genOnKeyPressCellInputField(row, col) {
    let thisObject = this
    return function(ev) {
      if (ev.which === 13) {
        // Enter key
        let newValue = $(thisObject.getTdSelector(row, col) + ' .te-input').val()
        thisObject.setValue(row, col, newValue)
        thisObject.leaveCellEditMode(row, col)
        thisObject.dispatchContentChangedEvent(row, col)
        return false
      }
      if (ev.which === 27) {
        // Escape key
        thisObject.leaveCellEditMode(row, col)
        return false
      }
      return true
    }
  }
  genOnMouseEnterHeader(col) {
    let thisObject = this
    return function() {
      let thSelector = thisObject.getThSelector(col)

      $(thSelector + ' .add-column-left-button').removeClass('hidden')
      $(thSelector + ' .add-column-right-button').removeClass('hidden')
      if (thisObject.matrix.isColumnEmpty(col, thisObject.options.isEmptyValue)) {
        $(thSelector + ' .delete-column-button').removeClass('hidden')
      }
    }
  }

  genOnMouseLeaveHeader(col) {
    let thisObject = this
    return function() {
      $(thisObject.getThSelector(col) + ' .header-button').addClass('hidden')
    }
  }


  genOnMouseEnterCell(row, col) {
    let thisObject = this
    return function() {
      //console.log('Mouse enter cell ' + row + ':' + col)
      let tdSelector = thisObject.getTdSelector(row, col)
      if (thisObject.canMoveCellLeft(row, col)) {
        $(tdSelector +  ' .move-cell-left-button').removeClass('hidden')
      }
      if (thisObject.canMoveCellRight(row, col)) {
        $(tdSelector + ' .move-cell-right-button').removeClass('hidden')
      }
      if (thisObject.isRowEditable(row)) {
        $(tdSelector + ' .edit-cell-button').removeClass('hidden')
      }
    }
  }

  genOnMouseLeaveCell(row, col) {
    let thisObject = this
    return function() {
      //console.log('Mouse leave cell ' + row + ':' + col)
      $(thisObject.getTdSelector(row, col) + ' .cell-button').addClass('hidden')
    }
  }

  genOnClickMoveCellLeftButton(row, col) {
    let thisObject = this
    return function() {
      if(thisObject.canMoveCellLeft(row, col)) {
        //console.log('Moving cell ' + row + ':' + col + ' left')
        // move values in matrix
        thisObject.dispatchCellMoveEvents('pre', 'left', row, col)
        thisObject.matrix.setValue(row, col-1, thisObject.matrix.getValue(row, col))
        thisObject.matrix.setValue(row, col, thisObject.options.getEmptyValue())
        // refresh html table cells
        $(thisObject.getTdSelector(row, col-1)).replaceWith(thisObject.generateCellHtml(row, col-1))
        $(thisObject.getTdSelector(row, col)).replaceWith(thisObject.generateCellHtml(row, col))
        // $(thisObject.getTdSelector(row, col-1)).html(thisObject.generateTdHtml(row, col-1))
        // $(thisObject.getTdSelector(row, col)).html(thisObject.generateTdHtml(row, col))
        // setup cell button handlers
        thisObject.setupCellEventHandlers(row,col-1)
        thisObject.setupCellEventHandlers(row,col)
        // dispatch cell redrawn events
        thisObject.dispatchCellDrawnEvent(row, col-1)
        thisObject.dispatchCellDrawnEvent(row, col)
        // post move events
        thisObject.dispatchCellMoveEvents('post', 'left', row, col)
      }
    }
  }

  genOnClickMoveCellRightButton(row, col) {
    let thisObject = this
    return function() {
      if(thisObject.canMoveCellRight(row, col)) {
        //console.log('Moving cell ' + row + ':' + col + ' right')
        thisObject.dispatchCellMoveEvents('pre', 'right', row, col)
        // move values in matrix
        thisObject.matrix.setValue(row, col+1, thisObject.matrix.getValue(row, col))
        thisObject.matrix.setValue(row, col, thisObject.options.getEmptyValue())
        // refresh html table cells
        $(thisObject.getTdSelector(row, col+1)).replaceWith(thisObject.generateCellHtml(row, col+1))
        $(thisObject.getTdSelector(row, col)).replaceWith(thisObject.generateCellHtml(row, col))
        // $(thisObject.getTdSelector(row, col+1)).html(thisObject.generateTdHtml(row, col+1))
        // $(thisObject.getTdSelector(row, col)).html(thisObject.generateTdHtml(row, col))
        // setup cell button handlers
        thisObject.setupCellEventHandlers(row,col)
        thisObject.setupCellEventHandlers(row,col+1)
        // dispatch cell redrawn events
        thisObject.dispatchCellDrawnEvent(row, col)
        thisObject.dispatchCellDrawnEvent(row, col+1)
        // post move events
        thisObject.dispatchCellMoveEvents('post', 'right', row, col)
      }
    }
  }

  enterCellEditMode(row, col) {
    //console.log('Entering edit mode, ' + row + ':' + col)
    let tdSelector = this.getTdSelector(row, col)
    let inputSelector = tdSelector + ' .te-input'
    this.editFlagMatrix.setValue(row, col, true)
    $(tdSelector).html(this.generateTdHtmlCellEditMode(row, col))
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
    this.setupCellEventHandlers(row,col)
    $(tdSelector).on('click', this.genOnClickEditableCell(row, col))
    this.dispatchCellDrawnEvent(row, col)
  }

  genOnClickEditCellButton(row, col) {
    let thisObject = this
    return function() {
      //console.log('Edit cell button clicked on row ' + row + ' col ' + col)
      thisObject.enterCellEditMode(row, col)
      return false
    }
  }

  genOnClickEditableCell(row, col) {
    let thisObject = this
    return function() {
      //console.log('Editable cell clicked, row ' + row + ' col ' + col)
      thisObject.enterCellEditMode(row, col)
      return false
    }
  }

  genOnClickCancelEditButton(row, col) {
    let thisObject = this
    return function() {
      //console.log('Cancel edit button clicked')
      thisObject.leaveCellEditMode(row, col)
      return false
    }
  }

  genOnClickConfirmEditButton(row, col) {
    let thisObject = this
    return function() {
      //console.log('Confirm edit button clicked')
      let newValue = $(thisObject.getTdSelector(row, col) + ' .te-input').val()
      thisObject.setValue(row, col, newValue)
      thisObject.leaveCellEditMode(row, col)
      thisObject.dispatchContentChangedEvent(row, col)
      return false
    }
  }

  genOnClickAddColumnRightButton(col) {
    let thisObject = this
    return function() {
      thisObject.matrix.addColumnAfter(col)
      thisObject.dispatchColumnAddEvents(col+1)
      thisObject.redrawTable()
    }
  }

  genOnClickAddColumnLeftButton(col) {
    let thisObject = this
    return function() {
      //console.log('Adding column LEFT')
      thisObject.matrix.addColumnAfter(col-1)
      thisObject.dispatchColumnAddEvents(col)
      thisObject.redrawTable()
    }
  }

  genOnClickDeleteColumnButton(col) {
    let thisObject = this
    return function() {
      //console.log('Delete button clicked on col ' + col)
      if (thisObject.matrix.isColumnEmpty(col, thisObject.options.isEmptyValue)) {
        //console.log('Deleting column ' + col)
        thisObject.matrix.deleteColumn(col)
        thisObject.redrawTable()
        thisObject.dispatchColumnDeleteEvents(col)
      } else {
        console.log('Column NOT empty, cannot delete')
      }

    }
  }

  getTableClass(tableNumber) {
    return 'te-table-' + tableNumber
  }
  getTdClass(row, col) {
    return 'te-cell-' + row + '-' + col
  }

  getThClass(col) {
    return 'te-th-' + col
  }

  getTdSelector(row, col) {
    return '#' + this.options.id + ' .' + this.getTdClass(row,col)
  }

  getThSelector(col) {
    return '#' + this.options.id + ' .' + this.getThClass(col)
  }

  getCellContentSelector(row, col) {
    return this.getTdSelector(row, col) + ' .te-cell-content'
  }


  canMoveCellLeft(row, col) {
    return col!== 0 &&
      !this.options.isEmptyValue(this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(this.matrix.getValue(row, col-1));
  }

  canMoveCellRight(row, col) {
    return  col !== (this.matrix.nCols - 1) &&
      !this.options.isEmptyValue(this.matrix.getValue(row, col)) &&
      this.options.isEmptyValue(this.matrix.getValue(row, col+1));
  }

  dispatchCellDrawnEvent(row, col) {
    this.dispatchEvent(
      'cell-drawn',
      {
        row: row,
        col: col,
        selector: this.getCellContentSelector(row, col)
      }
    )
  }
  dispatchTableDrawnEvent() {
    this.dispatchEvent('table-drawn', {})
  }

  dispatchColumnDeleteEvents(deletedColumn) {
    this.dispatchEvent('column-delete', {
      col: deletedColumn,
    })
  }
  dispatchColumnAddEvents(newCol) {
    this.dispatchEvent('column-add', {
      col: newCol,
    })
  }

  dispatchCellMoveEvents(type, direction, row, col) {
    let selector = this.getTdSelector(row, col)
    // 1st event: specific type/direction
    this.dispatchEvent('cell-' + type + '-move-' + direction, {
      row: row,
      col: col,
      selector: selector
    })
    // 2nd event: generic type, cell-pre-move or cell-post-move
    this.dispatchEvent('cell-' + type + '-move', {
      row: row,
      col: col,
      selector: selector,
      direction: direction
    })

    // 3rd event: generic move: cell-move, only in post
    if (type==='post') {
      this.dispatchEvent('cell-move', {
        row: row,
        col: col,
        selector: selector,
        direction: direction,
        type: type
      })
    }

  }

  dispatchContentChangedEvent(row, col) {
    this.dispatchEvent(
      'content-changed',
      {
        row: row,
        col: col
      }
    )
  }

  dispatchEvent(eventName, data = {})
  {
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f)
  {
    this.container.on(eventName, f)
  }


}