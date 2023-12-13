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
import * as Util from '../toolbox/Util.mjs'
import { KeyCache } from '../toolbox/KeyCache/KeyCache'

const defaultIcons = {
  alert: '<i class="fas fa-exclamation-triangle"></i>',
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
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
        urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true },
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
    this.activeEditionsData = null
    this.lastFilter = ''
    this.cache = new KeyCache()
  }

  updateData(mceData) {
    this.mceData = mceData
    $(this.getContainerSelector()).html(this.generateHtml())
    this.__setupUI()
  }

  generateHtml() {
    let loadDataLabel = this.activeEditionsData === null ? 'Load Data' : 'Reload Data'
    return `<div class="chunk-search">
        <div class="active-editions">
        <h4>Single Chunk Editions <button class="btn btn-sm btn-outline-secondary load-active-editions-btn">${loadDataLabel}</button></h4>
        <div class="active-editions-table">${this.__genActiveEditionTable(this.activeEditionsData)} </div>
    </div>
    
      <div class="quick-add">
        <h4>Quick Add</h4>
        <p>Table ID: <input type="number" class="table-id-input">
            <button title="Add single chunk edition" class="btn btn-secondary quick-add-btn">Add</button>
            <br/>
            <span class="quick-add-info"></span>
         </p>
    </div>
        
</div>`
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this.__setupUI()

  }

  __setupUI() {
    this.loadActiveEditionDataButton = $(`${this.containerSelector} .load-active-editions-btn`)
    this.activeEditionTableContainer = $(`${this.containerSelector} div.active-editions-table`)

    this.loadActiveEditionDataButton.on('click', this._genOnClickLoadActiveEditionData())
    this._setupActiveEditionTableButtons(this.activeEditionsData)

    this.tableIdInput = $(`${this.containerSelector} .table-id-input`)
    this.tableIdInput.on('keyup change', this._genOnTableIdInputValChange())
    this.quickAddButton = $(`${this.containerSelector} .quick-add-btn`)
    this.quickAddButton.prop('disabled', true)
      .on('click', this._genOnClickQuickAddButton())

    this.quickAddInfoSpan = $(`${this.containerSelector} span.quick-add-info`)
    this.quickAddError = false
  }

  _genOnClickLoadActiveEditionData() {
    return () => {
      this.loadActiveEditionDataButton.html(`Loading ... ${this.icons.busy}`)
        $.get(this.options.urlGenerator.apiGetActiveEditionInfo()).then( (data) => {
          this.activeEditionsData = data
          this._getUserInfoForData(data).then( () => {
            this.activeEditionTableContainer.html(this.__genActiveEditionTable(data))
            this._setupActiveEditionTableButtons(data)
            this.loadActiveEditionDataButton.html('Reload Data')
          })
        })
    }
  }

 _getUserInfoFromCache(userId) {
    return this.cache.retrieve(`USER-${userId}`)
 }

  _getUserInfoForData(data) {
    return new Promise(async (resolve) => {
      for (let i = 0; i < data.length; i++) {
        let userId = data[i]['lastVersion'].authorId
        let cacheKey = `USER-${userId}`

        let userData = this.cache.retrieve(cacheKey)
        if (userData === null) {
          try {
            userData = await $.get(this.options.urlGenerator.apiUserGetInfo(userId))
          } catch(e) {
            console.warn(`Error retrieving user info for user ${userId}`)
            userData = { id: userId, fullname: `User ${userId}`}
          }
          if (userData === undefined || userData.fullname === undefined) {
            // bad data
            console.warn(`Bad data for ${userId}`)
            userData = { id: userId, fullname: `User ${userId}`}
          }
          this.cache.store(cacheKey, userData)
        }
      }
      resolve()
    })
  }

  _setupActiveEditionTableButtons(data) {
    if (data === null || data.length === 0) {
      return
    }

    data.forEach( (info) => {
      $(`${this.containerSelector} .add-edition-${info.id}`).on('click', this._genOnClickAddEdition(info.id))
    })

    $("table.active-editions").DataTable({
      paging: true,
      searching : true,
      lengthMenu: [ 25, 50, 100],
      language: {
        search: 'Filter:'
      },
      columns: [
        null,
        null,
        null,
        null,
        {searchable: false, orderable: false},
      ]
    });
  }



  _genOnClickAddEdition(editionId) {
    return () => {
      console.log(`Click on add edition ${editionId}`)
      // this.lastFilter = this.__getSearchElement().val()
      console.log(`Current filter: ${this.lastFilter}`)
      let infoSpan =  $(`${this.containerSelector} .info-span-edition-${editionId}`)
      let button =  $(`${this.containerSelector} button.add-edition-${editionId}`)
      let buttonHtml = button.html()
      button.html(`Adding... ${this.icons.busy}`)
      this.options.addEdition(editionId, '').then( () => {
        this.debug && console.log(`Edition ${editionId} added successfully`)
        infoSpan.html('')
      }, (error) => {
        infoSpan.html(`Error adding chunk: ${error}`).addClass('text-danger')
        button.html(buttonHtml)
        console.error(`Error trying to add edition ${editionId}: ${error}`)
      })
    }
  }




  __genActiveEditionTable(infoArray) {
    if (infoArray === null) {
      return `<em>No data: please click on 'Load Data' to start</em>`
    }
    if (infoArray.length === 0) {
      return `<em>No active single chunk editions found in APM</em>`
    }
    let tableIdsInMceData = this.mceData.chunks.map( (chunk) => { return chunk.chunkEditionTableId})
    console.log('Table Id in MCE Data')
    console.log(tableIdsInMceData)
    return [
      '<table class="active-editions">',
      '<thead><tr><th>Chunk</th><th>Title</th><th>Author</th><th>Last Save</th><th></th></tr></thead>',
      infoArray.map( (info) => {
        let versionInfo = info['lastVersion']
        let lastSaveLabel = `${Util.formatVersionTime(versionInfo['timeFrom'])}`
        let addButton
        if (tableIdsInMceData.indexOf(info.id) === -1) {
          addButton = `<button class="btn btn-sm btn-outline-secondary add-edition-${info.id}">Add</button>`
        } else {
          addButton = '<small>Already added</small>'
        }
        return `<tr>
            <td>${info['chunkId']}</td>
            <td>${info['title']}</td>
            <td>${this._getUserInfoFromCache(versionInfo.authorId).fullname}</td>
            <td><small>${lastSaveLabel}</small></td>
            <td>${addButton} <span class="info-span-edition-${info.id}"</td>
        </tr>`
      }).join(''),
      '</table>'
    ].join('')
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