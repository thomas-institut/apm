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
    - new columns can be created providing emtpy cells where current cells can
      move to.

 */

class TableEditor {

  constructor(options) {

    this.options = this.getSanitizedOptions(options)
    this.leftArrowButtonHtml = '<i class="fa fa-arrow-circle-left" aria-hidden="true"></i>'
    this.rightArrowButtonHtml = '<i class="fa fa-arrow-circle-right" aria-hidden="true"></i>'
    this.plusSignButtonHtml = '<i class="fa fa-plus-circle" aria-hidden="true"></i>'
    this.values = this.options.values
    this.container = $(this.options.containerSelector)
    this.container.html(this.getTableHtml())


  }

  getSanitizedOptions(options) {
    return options
  }

  getdefaultOptions() {
    return {
      values: [],
      containerSelector: '#mytable'
    }
  }

  getValues() {
    return this.values
  }

  getTableHtml() {
    let html = ''
    html += '<table class="table table-bordered table-condensed">'
    for (let row = 0; row < this.values.length; row++) {
      html += '<tr>'
      for (let column = 0; column < this.values[row].length; column++) {
        html += '<td>' + this.getTdForRowColumn(row, column, this.values[row][column]) + '</td>'
      }
    }
    html += '</table>'
    return html
  }

  getTdForRowColumn(row, column, value) {
    let text = value
    if (text === '') {
      text = '&mdash;'
    }
    let html = ''
    html += '<table width="100%"><tr>'
    html += '<td><button class="btn btn-link btn-xs">' + this.leftArrowButtonHtml + '</button></td>'
    html += '<td rowspan="2">' + text + '</td>'
    html += '<td><button class="btn btn-link btn-xs">' + this.rightArrowButtonHtml + '</button></td>'
    html += '</tr><tr>'
    html += '<td><button class="btn btn-link btn-xs">' + this.plusSignButtonHtml + '</button></td>'
    html += '<td><button class="btn btn-link btn-xs">' + this.plusSignButtonHtml + '</button></td>'
    html += '</tr></table>'
    return html
  }

}