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

class CollationTableEditor {
  collationTable;

  constructor(options) {

    let optionsDefinition = {
      collationTableData : { type: 'object', required: true},
      workId : { type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      tableId: { type: 'NonZeroNumber', required: true},
      langDef : { type: 'object', default: {
          la: { code: 'la', name: 'Latin', rtl: false, fontsize: 3},
          ar: { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
          he: { code: 'he', name: 'Hebrew', rtl: true, fontsize: 3}
        }
      },
      availableWitnesses: { type: 'Array', default: [] },
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
    }

    let oc = new OptionsChecker(optionsDefinition, "EditCollationTable")
    this.options = oc.getCleanOptions(options)

    this.ctData = this.options['collationTableData']
    this.ctTitle = this.ctData['title']
    this.tableId = this.options['tableId']


    // DOM elements
    this.ctTitleDiv = $('#collationtabletitle')
    this.ctInfoDiv = $('#collationtableinfo')
    this.ctActionsDiv = $('#collationtableactions')
    this.breadcrumbCtTitleSpan = $('#breadcrumb-cttitle')



    this.ctTitleDiv.html('<h1>' + this.ctTitle + '</h1>')
    this.breadcrumbCtTitleSpan.html("Saved Collation Table")

    this.ctInfoDiv.html(this.genCtInfoDiv())

  }

  genCtInfoDiv() {
    let html = ''

    html += '<p>Chunk ID: ' + this.options.workId + '-' + this.options.chunkNumber + '</p>'
    html += '<p>Table ID: ' + this.tableId + '</p>'
    return html
  }



}