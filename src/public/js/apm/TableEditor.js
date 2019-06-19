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
   First version of simple table editor. The class takes a matrix
   with values and creates a table that can be edited sort of in the way
   that a collation table might be edited:
    - a cell can be moved to the left or to the right provided there's an
      empty cell where it will go
    - new columns can be created adding emtpy cells
 */

class TableEditor {

  constructor(options) {

    this.options = this.getSanitizedOptions(options)

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

    this.moveBackwardButtonIcon = '<i class="fa fa-hand-o-left" aria-hidden="true"></i>'
    this.moveForwardButtonIcon = '<i class="fa fa-hand-o-right" aria-hidden="true"></i>'
    this.addBeforeButtonIcon = '<sup>+</sup><i class="fa fa-arrow-left" aria-hidden="true"></i>'
    this.addAfterButtonIcon = '<i class="fa fa-arrow-right" aria-hidden="true"><sup>+</sup></i>'
    this.rtlDirectionClass = 'rtltext'

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
    this.container.html(this.getTableHtml())

    for(let row = 0; row < this.values.length; row++) {
      for (let col = 0; col < this.values[row].length; col++) {
        this.setupEventHandlers(row, col)
      }
    }
  }

  setupEventHandlers(row, column) {
    let cellSelector = this.options.containerSelector +  ' .' + this.getTdClass(row, column)
    let cellButtonSelector = cellSelector +  ' .' + 'cellbutton'
    let moveBackwardButtonSelector = cellSelector +  ' .' + 'movebackward'
    let moveForwardButtonSelector = cellSelector +  ' .' + 'moveforward'
    let addBeforeButtonSelector = cellSelector +  ' .' + 'addbefore'
    let addAfterButtonSelector = cellSelector +  ' .' + 'addafter'
    $(cellButtonSelector).addClass('hidden')
    $(cellSelector).on('mouseenter', function(){
      $(cellButtonSelector).removeClass('hidden')
    })
    $(cellSelector).on('mouseleave', function(){
      $(cellButtonSelector).addClass('hidden')
    })
    $(cellSelector).on('click', function () {
      console.log('Click on ' + row + ', ' + column)
    })
    $(moveBackwardButtonSelector).on('click', this.genOnMove('backward', row, column))
    $(moveForwardButtonSelector).on('click', this.genOnMove('forward', row, column))
    $(addBeforeButtonSelector).on('click', this.genOnAdd('before', row, column))
    $(addAfterButtonSelector).on('click', this.genOnAdd('after', row, column))
  }

  genOnAdd(type, row, column) {
    let addAfter = true
    if (type === 'before') {
      addAfter = false
    }
    let thisObject = this
    return function () {
      console.log('Add ' + type + ' on ' + row + ',' + column )
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

      // update the old and the new cells to reflect the new values
      $(thisObject.getCellSelector(row, column)).html(thisObject.getTdForRowColumn(row, column))
      thisObject.setupEventHandlers(row, column)
      $(thisObject.getCellSelector(row, newColumn)).html(thisObject.getTdForRowColumn(row, newColumn))
      thisObject.setupEventHandlers(row, newColumn)

      // update also the cells adjacent to the old and new cells so that the proper control buttons are shown
      if (minColumn > 0) {
        $(thisObject.getCellSelector(row, minColumn - 1)).html(thisObject.getTdForRowColumn(row, minColumn - 1))
        thisObject.setupEventHandlers(row, minColumn - 1)
      }
      if (maxColumn < lastColumn) {
        $(thisObject.getCellSelector(row, maxColumn + 1)).html(thisObject.getTdForRowColumn(row, maxColumn + 1))
        thisObject.setupEventHandlers(row, maxColumn + 1)
      }

      return false
    }
  }

  getCellSelector(row, column) {
    return this.options.containerSelector + ' .' + this.getTdClass(row, column)
  }

  getTdClass(row, column) {
    return 'td-' + row + '-' + column
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
    return sanitizedOptions
  }

  getDefaultOptions() {
    return {
      containerSelector: '#mytable',
      tableClass: 'ted',
      rowTitleClass: 'rowtitle',
      textDirection: 'ltr'
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
    if (this.options)
    html += '<table class="' + this.options.tableClass + ' ' + textDirectionClass + '">'
    for (let row = 0; row < this.values.length; row++) {
      html += '<tr>'
      if (this.useRowTitles) {
        html += '<td class="' + this.options.rowTitleClass + '">' + this.options.rowTitles[row] + '</td>'
      }
      for (let column = 0; column < this.values[row].length; column++) {
        html += '<td class="'+ this.getTdClass(row, column) + '">' + this.getTdForRowColumn(row, column) + '</td>'
      }
    }
    html += '</table>'
    return html
  }

  canMoveBackward(row, column) {
    if (column !== 0 && this.isEmpty(row, column-1)) {
      return true
    }
    return false
  }

  canAddBefore(row, column) {
    if (column === 0) {
      return true
    }
    return false
  }

  canAddAfter(row, column) {
    if (column !== this.numColumns-1 ) {
      return true
    }
    return false
  }


  canMoveForward(row, column) {
    let lastColumn = this.values[row].length - 1
    if (column !== lastColumn && this.isEmpty(row, column+1)) {
      return true
    }
    return false
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
    } else {
      if (this.canAddBefore(row, column)) {
        html += '<button class="cellbutton addbefore" title="Add column before">' + this.addBeforeButtonIcon + '</button>'
      }
    }
    html += this.getValueHtml(row, column)
    if (this.canMoveForward(row,column)) {
      html += '<button class="cellbutton moveforward" title="Move forward">' + this.moveForwardButtonIcon + '</button>'
    } else {
      if (this.canAddAfter(row, column)) {
        html += '<button class="cellbutton addafter" title="Add column after">' + this.addAfterButtonIcon + '</button>'
      }
    }
    return html
  }

}