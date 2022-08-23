/*
 *  Copyright (C) 2022 Universität zu Köln
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


import { Panel } from '../MultiPanelUI/Panel'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { MceData } from '../MceData/MceData.mjs'

const defaultIcons = {
  alert: '<i class="fas fa-exclamation-triangle"></i>',
}

export class EditionPanel extends Panel {


  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'EditionPanel',
      optionsDefinition: {
        mceData: { type: 'object', required: true},
        icons: { type: 'object', default: defaultIcons}
      }
    })

    this.options = oc.getCleanOptions(options)

    this.mceData = this.options.mceData
    this.icons = this.options.icons
  }


  generateHtml() {
    if (MceData.isEmpty(this.mceData)) {
      return `<div class='empty-chunks-info'>
        <p class="text-warning">${this.icons.alert} Edition is still empty.</p>
        <p>Search for chunks in the 'Chunk Search' tab and add one or more to start.</p>
</div>`
    }
    return this.__genChunksTable()
  }


  __genChunksTable() {
    let html = '<table class="chunk-table">'
    html += '<tr><th>Chunk</th><th>Table Id</th><th>Title</th><th>Version</th><th>Break</th></tr>'

    this.mceData.chunks.forEach( (chunk) => {
      html += `<tr><td>${chunk.chunkId}</td><td>${chunk.chunkEditionTableId}</td><td>${chunk.title}</td>
                <td>${chunk.version}</td><td>${chunk.break}</td><td>[Delete] [Update]</td>
</tr>`
    })
    return html
  }

  updateData(mceData) {
    this.mceData = mceData
    $(this.containerSelector).html(this.generateHtml())
  }


}