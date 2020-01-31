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
 */


class TableEditor {

  constructor(options) {
    let optionsDefinition = {
      values: {
        required: true,
        type: 'Array'
      },
      id: {
        required: true,
        type: 'string'
      },
      generateTd: {
        required: false,
        type: 'function',
        default: this.genDefaultGenerateTdFunction()
      },
      isCellEmpty: {
        required: false,
        type: 'function',
        default: this.genDefaultIsCellEmptyFunction()
      },
      emptyCellHtml: {
        required: false,
        type: 'string',
        default: '&mdash;'
      }
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'TableEditor')
    this.options = optionsChecker.getCleanOptions(options)
    console.log('Table options')
    console.log(this.options)

    this.matrix = new Matrix(0,0)
    this.matrix.setFromArray(this.options.values)
    this.matrix.logMatrix('TableEditor ' + this.options.id)
    this.container = $('#' + this.options.id)

    this.container.html(this.generateTable())
  }


  generateTable() {
    let html = '<table class="te-table">'
    for (let row = 0; row < this.matrix.nRows; row++) {
      html += '<tr class="te-tablerow">'
      for (let col = 0; col < this.matrix.nCols; col++) {
        html += '<td class="' + this.getTdClass(row,col) + '">'
        html += '<span class="te-cell-content">'
        html += this.options.generateTd(row,col, this.matrix.getValue(row,col))
        html += '</span>'
        html += '</td>'
      }
      html += '</tr>'
    }
    html += '</table>'
    return html
  }

  // Default call backs

  /**
   * Default generateTd function
   *
   * @returns {function(*, *, *): *}
   */
  genDefaultGenerateTdFunction() {
    let thisObject = this
    return function (row,col,value) {
      if (thisObject.options.isCellEmpty(row, col, value)) {
        return thisObject.options.emptyCellHtml
      }
      return value
    }
  }

  /**
   * Default isCellEmpty function
   * @returns {function(*, *, *): boolean}
   */
  genDefaultIsCellEmptyFunction() {
    return function (row, col, value) {
      return value === ''
    }
  }

  getTdClass(row, col) {
    return 'te-cell-' + row + '-' + col
  }

  getTdSelector(row, col) {
    return '#' + this.options.id + ' .' + this.getTdClass(row,col)
  }

  getCellContentSelector(row, col) {
    return this.getTdSelector(row, col) + ' .te-cell-content'
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