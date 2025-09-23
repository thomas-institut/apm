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

import {OptionsChecker} from '@thomas-inst/optionschecker'

export class ArrayToTable {

  constructor (options) {
    let optionsDefinition = {
      itemsPerRow: { type: 'NonZeroNumber', default: 20},
      tableClasses: { type: 'array', default: []},
      tdClasses: { type: 'array', default: []},
      trClasses: { type: 'array', default: []},
      getTrClasses: { type: 'function', default: (rowNumber, firstItemIndex) => {return []}},
      getTdClasses: { type: 'function', default: (item, index) => {return []}},
      getTdContent: { type: 'function', default: (item, index) => { return item.toString()}},
      data: { type: 'array', default: []},
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "ArrayToTable"})
    this.options = oc.getCleanOptions(options)


    this.data = this.options.docsTableData

  }

  /**
   *
   * @param newData array
   */
  setData(newData) {
    this.data = newData
  }

  render() {
    let html = ''
    let numRows = Math.ceil(this.data.length / this.options.itemsPerRow)
    html += `<table ${this.genClassStatement(this.options.tableClasses)}>`
    for (let row = 0; row < numRows; row++) {
      let firstItemIndexInRow = row*this.options.itemsPerRow
      let lastItemIndexInRow = (row + 1)*this.options.itemsPerRow - 1
      if (lastItemIndexInRow >= this.data.length) {
        lastItemIndexInRow = this.data.length - 1
      }
      html += `<tr ${this.genClassStatement(this.options.getTrClasses(row, firstItemIndexInRow))}>`
      for (let index = firstItemIndexInRow; index <= lastItemIndexInRow; index++) {
        html +=`<td ${this.genClassStatement(this.options.getTdClasses(this.data[index], index))}>${this.options.getTdContent(this.data[index], index)}</td>`
      }
      html += '</td>'
    }
    html+= '</table>'
    return html
  }

  genClassStatement(classes) {
    if (classes.length === 0) {
      return ''
    }
    return `class="${classes.join(' ')}"`
  }
}
