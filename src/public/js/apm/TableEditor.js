/*
 *  Copyright (C) 2019 Universität zu Köln
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
    - new columns can be created adding emtpy cells
    - columns with empty values can be deleted
 */

class TableEditor {

  constructor(options) {

    this.options = this.getSanitizedOptions(options)
    console.log('Table Editor Options')
    console.log(this.options)

    // check that options.values is a proper matrix
    this.values = this.options.values
    if (!Array.isArray(this.values)) {
      console.error('Table Editor Error: given values not an array')
      return false
    }
    this.numRows = this.values.length
    let firstRow = true
    this.numColumns = 0
    for (let row = 0; row < this.numRows; row++) {
      let theRow = this.values[row]
      if (!Array.isArray(theRow)) {
        console.error('Table Editor Error: row ' + row + ' in values array not an array')
        return false
      }
      if (firstRow) {
        this.numColumns = theRow.length
        firstRow = false
      }
      if (theRow.length !== this.numColumns) {
        console.error('Table Editor Error: row ' + row + ' should be of length ' + this.numColumns)
        return false
      }
    }
    if (this.numColumns === 0) {
      console.error('Table Editor Error: found 0 columns, need at least one to work with')
      return false
    }

    // check that rowTitles, if present, makes sense
    this.useRowTitles = false
    if (Array.isArray(this.options.rowTitles)) {
      if (this.options.rowTitles.length !== this.numRows) {
        console.error('Table Editor Error: must have ' + this.numRows + ' row titles, got ' + this.options.rowTitles.length)
        return false
      }
      this.useRowTitles = true
    }

    // Icon definitions
    this.moveBackwardButtonIcon = '<i class="fa fa-hand-o-left" aria-hidden="true"></i>'
    this.moveForwardButtonIcon = '<i class="fa fa-hand-o-right" aria-hidden="true"></i>'
    this.addBeforeButtonIcon = '<sup>+</sup><i class="fa fa-arrow-left" aria-hidden="true"></i>'
    this.addAfterButtonIcon = '<i class="fa fa-arrow-right" aria-hidden="true"><sup>+</sup></i>'
    this.columnDeleteIcon = '<i class="fa fa-trash-o" aria-hidden="true"></i>'
    this.cellEditSaveButtonIcon = '<i class="fa fa-check" aria-hidden="true"></i>'
    this.cellEditCancelButtonIcon = '<i class="fa fa-close" aria-hidden="true"></i>'

    // classes
    this.rtlDirectionClass = 'rtltext'
    this.activeHeaderClass = 'thactive'
    this.cellButtonClass = 'cellbutton'
    this.confirmEditClass = 'confirmedit'
    this.cancelEditClass = 'canceledit'
    this.cellEditTextInputClass = 'ce-textinput'


    if (this.options.textDirection === 'rtl') {
      //flip icons for rtl text
      let tmpIcon = this.moveBackwardButtonIcon
      this.moveBackwardButtonIcon = this.moveForwardButtonIcon
      this.moveForwardButtonIcon = tmpIcon
      tmpIcon = this.addAfterButtonIcon
      this.addAfterButtonIcon = this.addBeforeButtonIcon
      this.addBeforeButtonIcon = tmpIcon
    }

    this.emptyCellHtml = '&mdash;'

    this.container = $(this.options.containerSelector)

    this.initEditModeFlagMatrix()
    this.setupTable()

  }

  initEditModeFlagMatrix() {
    this.editModeFlag = []
    for (let row = 0; row < this.numRows; row++) {
      this.editModeFlag.push([])
      for (let column = 0; column < this.numColumns; column++) {
        this.editModeFlag[row].push(false)
      }
    }
  }

  setupTable() {
    this.container.html(this.getTableHtml())

    for(let row = 0; row < this.numRows; row++) {
      for (let col = 0; col < this.numColumns; col++) {
        this.setupCellEventHandlers(row, col)
      }
    }
    for (let col=0; col < this.numColumns; col++) {
      this.setupHeaderEventHandlers(col)
    }
  }

  setupCellEventHandlers(row, column) {
    let cellSelector = this.options.containerSelector +  ' .' + this.getTdClass(row, column)
    let cellButtonSelector = cellSelector +  ' .' + this.cellButtonClass
    let moveBackwardButtonSelector = cellSelector +  ' .' + 'movebackward'
    let moveForwardButtonSelector = cellSelector +  ' .' + 'moveforward'
    $(cellButtonSelector).addClass('hidden')
    $(cellSelector).on('mouseenter', function(){
      $(cellButtonSelector).removeClass('hidden')
    })
    $(cellSelector).on('mouseleave', function(){
      $(cellButtonSelector).addClass('hidden')
    })
    if (this.canEdit(row, column)) {
      $(cellSelector).on('click', this.genOnCellClick(row, column))
    }
    $(moveBackwardButtonSelector).on('click', this.genOnMove('backward', row, column))
    $(moveForwardButtonSelector).on('click', this.genOnMove('forward', row, column))

  }

  setupHeaderEventHandlers(column) {
    let headerSelector = this.getHeaderSelector(column)
    let headerButtonSelector = headerSelector +  ' .' + this.cellButtonClass
    $(headerButtonSelector).addClass('hidden')
    $(headerSelector).removeClass(this.activeHeaderClass)
    let addBeforeButtonSelector = headerSelector +  ' .' + 'addbefore'
    let addAfterButtonSelector = headerSelector +  ' .' + 'addafter'
    let deleteColumnButtonSelector = headerSelector + ' .' + 'deletecolumn'
    let activeHeaderClass = this.activeHeaderClass
    $(headerSelector).on('mouseenter', function(){
      $(headerButtonSelector).removeClass('hidden')
      $(headerSelector).addClass(activeHeaderClass)
    })
    $(headerSelector).on('mouseleave', function(){
      $(headerButtonSelector).addClass('hidden')
      $(headerSelector).removeClass(activeHeaderClass)
    })
    $(addBeforeButtonSelector).on('click', this.genOnAdd('before', column))
    $(addAfterButtonSelector).on('click', this.genOnAdd('after', column))
    $(deleteColumnButtonSelector).on('click', this.genOnDelete(column))
  }

  genOnCellClick(row, column) {
    let thisObject = this
    return function() {
      console.log('Click on ' + row + ', ' + column )
      let cellSelector =  thisObject.getCellSelector(row, column)
      $(cellSelector).off('click')
      $(cellSelector).off('mouseenter')
      $(cellSelector).off('mouseleave')
      $(cellSelector).html(thisObject.getTdForRowColumnEditMode(row, column))
      thisObject.setupCellEventHandlersEditMode(row, column)
      thisObject.editModeFlag[row][column] = true
      return false
    }
  }

  setupCellEventHandlersEditMode(row, column) {
    let cellSelector = this.getCellSelector(row, column)
    let thisObject = this
    $(cellSelector + ' .' + this.cancelEditClass).on('click', function () {
      thisObject.cancelCellEdit(row, column)
      return false
    })
    $(cellSelector + ' .' + this.confirmEditClass).on('click', function () {
      thisObject.confirmCellEdit(row, column)
      return false
    })
    let textInputSelector = cellSelector + ' .' + this.cellEditTextInputClass
    $(textInputSelector).on('keydown', function(ev) {
      if (ev.which === 13) {
        // Enter key
        console.log('Enter key pressed')
        thisObject.confirmCellEdit(row, column)
        return false
      }
      if (ev.which === 27) {
        console.log('Escape key pressed')
        thisObject.cancelCellEdit(row, column)
        return false
      }
      return true
    })
    // put the cursor at the end of the text
    $(textInputSelector).on('focus', function() {
      this.selectionEnd = 10000
      this.selectionStart = this.selectionEnd
    })
    $(textInputSelector).focus()
  }

  confirmCellEdit(row, column) {
    console.log('Confirm edit on cell ' + row + ', ' + column)
    let cellSelector = this.getCellSelector(row, column)
    this.setValue(row, column, $(cellSelector + ' .' + this.cellEditTextInputClass).val())
    // dispatch change event
    this.dispatchEvent(TableEditor.tableChangeEvent, this.values)
    // refresh the cell in the browser
    $(cellSelector).html(this.getTdForRowColumn(row, column))
    this.setupCellEventHandlers(row, column)
    // just in case the cell's value changed to or from an empty value
    // refresh the column's header as well as the adjacent cells
    $(this.getHeaderSelector(column)).html(this.getThForColumn(column))
    this.setupHeaderEventHandlers(column)
    if (column !== 0) {
      $(this.getCellSelector(row, column-1 )).html(this.getTdForRowColumn(row, column-1))
      this.setupCellEventHandlers(row, column-1)
    }
    if (column !== this.numColumns-1) {
      $(this.getCellSelector(row, column+1 )).html(this.getTdForRowColumn(row, column+1))
      this.setupCellEventHandlers(row, column+1)
    }
    this.editModeFlag[row][column] = false
  }

  cancelCellEdit(row, column) {
    console.log('Cancel edit on cell ' + row + ', ' + column)
    $(this.getCellSelector(row, column)).html(this.getTdForRowColumn(row, column))
    this.setupCellEventHandlers(row, column)
    this.editModeFlag[row][column] = false
  }

  getTdForRowColumnEditMode(row, column) {
    let html = ''
    let value = this.getValue(row, column)
    html += '<input type="text" class="' +  this.cellEditTextInputClass + '" value="' + value + '" ' + 'size="' + value.length + '">'
    html += '<button class="' + this.confirmEditClass + ' ' + this.cellButtonClass +'" title="Save changes">'+ this.cellEditSaveButtonIcon + '</button>'
    html += '<button class="' + this.cancelEditClass + ' ' + this.cellButtonClass +'" title="Cancel">'+ this.cellEditCancelButtonIcon + '</button>'
    return html
  }

  genOnDelete(column) {
    let thisObject = this
    return function() {
      if (!thisObject.canDelete(column)) {
        console.error('Cannot delete column ' + column)
        return false
      }
      console.log('Delete column ' + column)
      // first, shift values
      for (let row = 0; row < thisObject.numRows; row++) {
        for (let col = column; col < thisObject.numColumns -1; col++) {
          thisObject.setValue(row, col, thisObject.getValue(row, col+1))
        }
        thisObject.values[row].pop()
      }
      thisObject.numColumns--
      // dispatch change event
      thisObject.dispatchEvent(TableEditor.tableChangeEvent, thisObject.values)
      // now take care of the table
      // for now some brute force: redraw the whole table
      thisObject.setupTable()
      return false
    }
  }

  genOnAdd(type, column) {
    let firstColumnToShift = column
    if (type === 'after') {
      firstColumnToShift = column + 1
    }
    let thisObject = this
    return function () {
      console.log('Add ' + type + ' on column ' + column )
      // First take care of the values
      for (let row = 0; row < thisObject.numRows; row++) {
        // create a new empty element at the end of the row
        thisObject.values[row].push('')
        // shift values
        // note that for this particular row, since we just added a new
        // element, the last column is thisObject.numColumns, not thisObject.numColumns-1
        for (let col=thisObject.numColumns; col > firstColumnToShift; col--) {
          thisObject.setValue(row, col, thisObject.getValue(row, col-1))
        }
        // empty the first shifted column
        thisObject.setEmpty(row, firstColumnToShift)
      }
      console.log('Increasing thisObject.numColumns from ' + thisObject.numColumns)
      thisObject.numColumns++
      // dispatch change event
      thisObject.dispatchEvent(TableEditor.tableChangeEvent, thisObject.values)
      // now take care of the table
      // for now some brute force: redraw the whole table
      thisObject.setupTable()

      return false
    }
  }

  genOnMove(type, row, column) {
    let moveBackward = true
    if (type === 'forward') {
      moveBackward = false
    }
    let thisObject = this
    return function() {
      console.log(row + ', ' + column + ': move ' + type)
      if (moveBackward && column === 0) {
        console.error('Cannot move first column backward, on row ' + row)
        return false
      }
      let lastColumn = thisObject.numColumns - 1
      if (!moveBackward && column === lastColumn) {
        console.error('Cannot move last column forward, on row ' + row)
        return false
      }
      let newColumn = column + 1
      let maxColumn = newColumn
      let minColumn = column
      if (moveBackward) {
        newColumn = column - 1
        minColumn = newColumn
        maxColumn = column
      }
      // copy the current value to the new cell and empty the old cell
      thisObject.setValue(row, newColumn, thisObject.getValue(row, column))
      thisObject.setEmpty(row, column)

      // dispatch change event
      thisObject.dispatchEvent(TableEditor.tableChangeEvent, thisObject.values)

      // update the old and the new cells to reflect the new values
      $(thisObject.getCellSelector(row, column)).html(thisObject.getTdForRowColumn(row, column))
      $(thisObject.getHeaderSelector(column)).html(thisObject.getThForColumn(column))
      thisObject.setupCellEventHandlers(row, column)
      thisObject.setupHeaderEventHandlers(column)
      $(thisObject.getCellSelector(row, newColumn)).html(thisObject.getTdForRowColumn(row, newColumn))
      $(thisObject.getHeaderSelector(newColumn)).html(thisObject.getThForColumn(newColumn))
      thisObject.setupCellEventHandlers(row, newColumn)
      thisObject.setupHeaderEventHandlers(newColumn)

      // update also the cells adjacent to the old and new cells so that the proper control buttons are shown
      if (minColumn > 0) {
        $(thisObject.getCellSelector(row, minColumn - 1)).html(thisObject.getTdForRowColumn(row, minColumn - 1))
        thisObject.setupCellEventHandlers(row, minColumn - 1)
      }
      if (maxColumn < lastColumn) {
        $(thisObject.getCellSelector(row, maxColumn + 1)).html(thisObject.getTdForRowColumn(row, maxColumn + 1))
        thisObject.setupCellEventHandlers(row, maxColumn + 1)
      }

      return false
    }
  }

  getCellSelector(row, column) {
    return this.options.containerSelector + ' .' + this.getTdClass(row, column)
  }

  getHeaderSelector(column) {
    return this.options.containerSelector + ' .' + this.getThClass(column)
  }

  getTdClass(row, column) {
    return 'td-' + row + '-' + column
  }

  getThClass(column) {
    return 'tr-' + column
  }

  getTableClass(table) {
    return 'tbl-' + table
  }

  getSanitizedOptions(options) {
    let sanitizedOptions = this.getDefaultOptions()
    // pass values and row titles unchanged
    sanitizedOptions.values = options.values
    sanitizedOptions.rowTitles = options.rowTitles
    if (typeof(options.containerSelector) === 'string') {
      sanitizedOptions.containerSelector = options.containerSelector
    }
    if (typeof(options.tableClass) === 'string') {
      sanitizedOptions.tableClass = options.tableClass
    }
    if (typeof(options.rowTitleClass) === 'string') {
      sanitizedOptions.rowTitleClass = options.rowTitleClass
    }
    if (typeof(options.textDirection) === 'string') {
      sanitizedOptions.textDirection = options.textDirection
    }
    if (typeof(options.columnsPerTable) === 'number' && options.columnsPerTable > 5 ) {
      sanitizedOptions.columnsPerTable = options.columnsPerTable
    }

    if (typeof(options.cellEditMode) === 'string') {
      if (TableEditor.cellEditAllowedModes.indexOf(options.cellEditMode) !== -1) {
        sanitizedOptions.cellEditMode = options.cellEditMode
      }
    }
    return sanitizedOptions
  }

  getDefaultOptions() {
    return {
      containerSelector: '#mytable',
      tableClass: 'ted',
      rowTitleClass: 'rowtitle',
      textDirection: 'ltr',
      columnsPerTable: 10,
      cellEditMode: TableEditor.cellEditModeNone // three options: editTopRow, editAllButTopRow, none
    }
  }

  getValues() {
    return this.values
  }

  getTableHtml() {
    let html = ''
    let textDirectionClass = ''
    if (this.options.textDirection === 'rtl') {
      textDirectionClass = this.rtlDirectionClass
    }
    let numTables = Math.ceil(this.numColumns / this.options.columnsPerTable)
    //console.log('Numtables: '  + numTables)
    for (let table = 0; table < numTables; table++) {
      let fistColumnInTable = table * this.options.columnsPerTable
      let lastColumnInTable = fistColumnInTable + this.options.columnsPerTable - 1
      if (lastColumnInTable > this.numColumns -1) {
        lastColumnInTable = this.numColumns - 1
      }

      //console.log('Table ' + table + ': ' + fistColumnInTable + ' to ' + lastColumnInTable)
      html += '<table class="' + this.options.tableClass + ' ' + textDirectionClass + ' ' + this.getTableClass(table) + '">'
      html += '<tr>'
      if (this.useRowTitles) {
        html += '<th></th>'
      }
      for (let column = fistColumnInTable; column <= lastColumnInTable; column++) {
        html += '<th class="' + this.getThClass(column) + '">' + this.getThForColumn(column) + '</th>'
      }
      html += '</tr>'

      for (let row = 0; row < this.numRows; row++) {
        html += '<tr>'
        if (this.useRowTitles) {
          html += '<td class="' + this.options.rowTitleClass + '">' + this.options.rowTitles[row] + '</td>'
        }
        for (let column = fistColumnInTable; column <= lastColumnInTable; column++) {
          html += '<td class="' + this.getTdClass(row, column) + '">' + this.getTdForRowColumn(row, column) + '</td>'
        }
      }
      html += '</table>'
    }
    return html
  }



  canDelete(column) {
    for (let row = 0; row < this.numRows; row++) {
      if (!this.isEmpty(row, column)) {
        return false
      }
    }
    return true
  }

  canAddBefore(column) {
    return true
  }

  canAddAfter(column) {
    return true
  }

  canMoveBackward(row, column) {
    if (column !== 0 && !this.isEmpty(row, column) && this.isEmpty(row, column-1)) {
      return true
    }
    return false
  }

  canMoveForward(row, column) {
    let lastColumn = this.values[row].length - 1
    if (column !== lastColumn && !this.isEmpty(row, column) && this.isEmpty(row, column+1)) {
      return true
    }
    return false
  }

  canEdit(row, column) {
    switch(this.options.cellEditMode) {
      case TableEditor.cellEditModeNone:
        return false

      case TableEditor.cellEditModeEditTopRow:
        return (row === 0)

      case TableEditor.cellEditModeEditAllButTopRow:
        return (row !== 0)
    }
  }

  isEmpty(row, column) {
    return this.values[row][column] === ''
  }

  setEmpty(row, column) {
    this.setValue(row, column, '')
  }

  setValue(row, column, value) {
    this.values[row][column] = value
  }

  getValue(row, column) {
    return this.values[row][column]
  }

  getValueHtml(row, column) {
    if (this.isEmpty(row, column)) {
      return this.emptyCellHtml
    }
    return this.getValue(row, column)
  }

  getTdForRowColumn(row, column) {
    let html = ''
    if (this.canMoveBackward(row, column)) {
      html += '<button class="cellbutton movebackward" title="Move backward">' + this.moveBackwardButtonIcon + '</button>'
    }
    html += this.getValueHtml(row, column)
    if (this.canMoveForward(row,column)) {
      html += '<button class="cellbutton moveforward" title="Move forward">' + this.moveForwardButtonIcon + '</button>'
    }
    return html
  }

  getThForColumn(column) {
    let spacer = '&nbsp;&nbsp;'
    let html=''

    if (this.canAddBefore(column)) {
      html += '<button class="cellbutton addbefore" title="Add column before">' + this.addBeforeButtonIcon + '</button>'
    }
    html += spacer
    html += (column+1)
    if (this.canDelete(column)) {
      html += '<button class="cellbutton deletecolumn" title="Delete this column">' + this.columnDeleteIcon + '</button>'
    }
    html += spacer
    if (this.canAddAfter(column)) {
      html += '<button class="cellbutton addafter" title="Add column after">' + this.addAfterButtonIcon + '</button>'
    }
    return html
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

// Some constants

TableEditor.cellEditModeNone = 'none'
TableEditor.cellEditModeEditTopRow = 'topRow'
TableEditor.cellEditModeEditAllButTopRow= 'allButTopRow'

TableEditor.cellEditAllowedModes = [ TableEditor.cellEditModeNone, TableEditor.cellEditModeEditTopRow, TableEditor.cellEditModeEditAllButTopRow]

TableEditor.tableChangeEvent = 'tablechange'