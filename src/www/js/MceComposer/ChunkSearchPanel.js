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

const defaultIcons = {
  alert: '<i class="fas fa-exclamation-triangle"></i>',
}

export class ChunkSearchPanel extends Panel {


  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'ChunkSearchPanel',
      optionsDefinition: {
        mceData: { type: 'object', required: true},
        icons: { type: 'object', default: defaultIcons},
        userId: { type: 'number', required: true},
        // Function to be called to add a single chunk
        // edition to the multi chunk edition.
        // It should return a promise.
        addEdition: { type: 'function', default: (id, timestamp) => {
            return new Promise( (resolve, reject) => {
              reject(`Not implemented yet (table ID: ${id}, timestamp '${timestamp}'`)
            })
          }}
      }
    })

    this.options = oc.getCleanOptions(options)

    this.mceData = this.options.mceData
    this.icons = this.options.icons
    this.userId = this.options.userId
  }


  generateHtml() {
    return `<div class="chunk-search">

        <h3>Chunks</h3>
        <p>... chunk table will be here!</p>
        <h4>Quick Add</h4>
        <p>Table ID: <input type="number" class="table-id-input">
            <button title="Add single chunk edition" class="btn btn-secondary quick-add-btn">Add</button>
            <br/>
            <span class="quick-add-info"></span>
         </p>
</div>`
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this.tableIdInput = $(`${this.containerSelector} .table-id-input`)
    this.tableIdInput.on('keyup change', this._genOnTableIdInputValChange())
    this.quickAddButton = $(`${this.containerSelector} .quick-add-btn`)
    this.quickAddButton.prop('disabled', true)
      .on('click', this._genOnClickQuickAddButton())

    this.quickAddInfoSpan = $(`${this.containerSelector} span.quick-add-info`)
    this.quickAddError = false

  }

  _genOnClickQuickAddButton() {
    return () => {
      console.log(`Quick add button clicked`)
      let editionId = parseInt(this.tableIdInput.val().toString())
      this.options.addEdition(editionId, '').then( () => {
        this.debug && console.log(`Edition ${editionId} added successfully`)
        this.quickAddInfoSpan
          .html(`Table Id ${editionId} added successfully`)
          .removeClass('text-danger')
          .addClass('text-info')
        this.tableIdInput.val('')
      }, (error) => {
        this.quickAddInfoSpan
          .html(`Cannot add table Id ${editionId}: ${error}`)
          .removeClass('text-info')
          .addClass('text-danger')
        console.error(`Error trying to add edition ${editionId}: ${error}`)
        this.quickAddError = true
      })
    }
  }

  _genOnTableIdInputValChange() {
    return () => {
      if (this.quickAddError) {
        this.quickAddInfoSpan.html('').removeClass('text-danger')
        this.quickAddError = false
      }
      if (parseInt(this.tableIdInput.val().toString()) > 0) {
        this.quickAddButton.prop('disabled', false)
      } else {
        this.quickAddButton.prop('disabled', true)
      }
    }
  }

}