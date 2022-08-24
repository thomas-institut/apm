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
import * as Util from '../toolbox/Util.mjs'
import { resolvedPromise, wait } from '../toolbox/FunctionUtil.mjs'
import * as ArrayUtil from '../toolbox/ArrayUtil.mjs'
import { EditableTextField } from '../widgets/EditableTextField'
import { transientAlert } from '../widgets/TransientAlert'
import { ConfirmDialog } from '../pages/common/ConfirmDialog'

const defaultIcons = {
  alert: '<i class="fas fa-exclamation-triangle"></i>',
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
  deleteChunk: '<i class="bi bi-trash"></i>',
  updateChunk: '<i class="bi bi-arrow-counterclockwise"></i>',
  moveUp: '<i class="bi bi-arrow-up-short"></i>',
  moveDown: '<i class="bi bi-arrow-down-short"></i>',
}

export class EditionPanel extends Panel {

  constructor (options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'EditionPanel',
      optionsDefinition: {
        mceData: { type: 'object', required: true},
        showLoadingDataMessage: { type: 'boolean', default: true},
        icons: { type: 'object', default: defaultIcons},
        getUpdateStatuses: { type: 'function', default: (force) => {
          if (force) {
            console.log(`Faking force get update statuses`)
          }
          return resolvedPromise( this.mceData.chunks.map( () => { return 'false'}))
          }
        },
        updateChunk: { type: 'function', default: (chunkIndex) => {
            return new Promise( (resolve) => {
              console.log(`Faking update chunk ${chunkIndex}`)
              wait(500).then( () => {
                resolve()
              })
            })
          }},
        deleteChunk: { type: 'function', default: (chunkIndex) => {
            return new Promise( (resolve) => {
              console.log(`Faking delete chunk ${chunkIndex}`)
              wait(500).then( () => {
                resolve()
              })
            })
          }},
        updateChunkOrder: {
          type: 'function',
          default: (newOrder) => {
            console.log(`New chunk order`)
            console.log(newOrder)
            return resolvedPromise()
          }
        },
        updateSigla: {
          type: 'function',
          default: (newSigla) => {
            return resolvedPromise()
          }
        },
        urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true },
      }
    })

    this.options = oc.getCleanOptions(options)

    this.mceData = this.options.mceData
    this.options.getUpdateStatuses().then( (statuses) => {
      this.updateStatuses = statuses
    })
    this.icons = this.options.icons
  }

  showLoadingDataMessage(yes) {
    this.options.showLoadingDataMessage = yes
  }


  generateHtml() {
    if (MceData.isEmpty(this.mceData)) {
      if (this.options.showLoadingDataMessage) {
        return `<div class='empty-chunks-info'>
        <p class="text-warning">Loading data...</p>
</div>`
      }else {
        return `<div class='empty-chunks-info'>
        <p class="text-warning">${this.icons.alert} Edition is still empty.</p>
        <p>Search for chunks in the 'Chunk Search' tab and add one or more to start.</p>
</div>`
      }
    }
    return `<div class="chunk-table">
                ${this.__genChunksTable()}
            </div>
            <div class="sigla-table">
                <h4>Sigla</h4>
                ${this.__genSiglaTable()}
            </div>
            <div class="sigla-groups-table">
                <h4>Sigla Groups</h4>
                ${this.__genSiglaGroupsTable()}
            </div>`
  }

  __genSiglaGroupsTable() {
    if (this.mceData.siglaGroups.length === 0) {
      return `<p><em>No sigla groups defined</em></p>`
    }
    return `${this.mceData.siglaGroups.length} sigla groups, table coming soon... `
  }

  __genSiglaTable() {
    return [
      '<table class="edition-panel-table sigla-table">',
      '<tr><th>Witness</th><th>Siglum</th></tr>',
      this.mceData.witnesses.map( (witness, witnessIndex) => {
          return `<tr>
                <td>${witness.title}</td>
                <td class="siglum-${witnessIndex}">${this.mceData.sigla[witnessIndex]}</td>
                <td class="siglum-${witnessIndex}-info"></td>
                </tr>`
      }).join(''),
      '</table>'
    ].join('')
  }

  __genChunksTable() {
    let html = '<table class="edition-panel-table chunk-table">'
    html += '<tr><th></th><th>Chunk</thth><th>Title</th><th>Version</th><th>Break</th></tr>'

    this.mceData.chunkOrder.forEach( (chunkIndex, chunkPos) => {
      let chunk = this.mceData.chunks[chunkIndex]
      let updateButton = ''
      if (this.updateStatuses[chunkIndex]) {
        updateButton = ` <button class="chunk-table-btn update-chunk update-chunk-${chunkIndex}" title="Not the latest version, click to update">
                ${this.icons.updateChunk}
            </button>`
      }
      let deleteButton = ''
      if (this.mceData.chunks.length > 1) {
        deleteButton = `<button class="chunk-table-btn delete-chunk delete-chunk-${chunkIndex}" title="Click to delete chunk">
                ${this.icons.deleteChunk}
            </button>`
      }
      let upButton = `<button class="chunk-table-btn move-chunk chunk-pos-${chunkPos} move-up-${chunkIndex}" title="Move chunk up">
                ${this.icons.moveUp}
            </button>`

      let downButton = `<button class="chunk-table-btn move-chunk chunk-pos-${chunkPos} move-down-${chunkIndex}" title="Move chunk down">
                ${this.icons.moveDown}
            </button>`
      html += `<tr>
        <td>${upButton}&nbsp;${downButton}</td>
        <td>${chunk.chunkId}</td>
        <td><a href="${this.options.urlGenerator.siteChunkEdition(chunk.chunkEditionTableId)}" title="Open in new tab" target="_blank">${chunk.title}</a></td>
        <td>${Util.formatVersionTime(chunk.version)}</td>
        <td>${this._getBreakLabel(chunk.break)}</td>
        <td class="chunk-actions-td chunk-actions-td-${chunkIndex}">
            ${deleteButton}
            ${updateButton}
            <span class="chunk-info-span chunk-info-span-${chunkIndex}"></span>
        </td>
</tr>`
    })
    html += '</table>'
    return html
  }

  _getBreakLabel(breakType) {
    switch(breakType) {
      case 'paragraph':
        return 'Paragraph'

      case '':
        return 'None'

      default:
        return 'Unknown'
    }
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this._setupEventHandlers()
  }

  updateData(mceData) {
    this.mceData = mceData
    this.options.getUpdateStatuses().then( (statuses) => {
      this.updateStatuses = statuses
      $(this.containerSelector).html(this.generateHtml())
      this._setupEventHandlers()
   })
  }



  _setupEventHandlers() {
    // Chunk table
    this.mceData.chunks.forEach( (chunk, chunkIndex) => {
      $(`${this.containerSelector} button.update-chunk-${chunkIndex}`).on('click', this._genOnClickUpdateChunk(chunkIndex))
      $(`${this.containerSelector} button.delete-chunk-${chunkIndex}`).on('click', this._genOnClickDeleteChunk(chunkIndex))
      let chunkPosition = this.mceData.chunkOrder.indexOf(chunkIndex)
      $(`${this.containerSelector} button.move-up-${chunkIndex}`).on('click', this._genOnClickUpDownButton(chunkIndex, chunkPosition, 'up'))
      $(`${this.containerSelector} button.move-down-${chunkIndex}`).on('click', this._genOnClickUpDownButton(chunkIndex, chunkPosition, 'down'))
    })

    if (this.mceData.chunkOrder.length > 0) {
      $(`${this.containerSelector} button.move-up-${this.mceData.chunkOrder[0]}`).prop('disabled', true)
      $(`${this.containerSelector} button.move-down-${this.mceData.chunkOrder[this.mceData.chunkOrder.length-1]}`).prop('disabled', true)
    }

    // set up siglum editors
    for (let siglumIndex = 0; siglumIndex < this.mceData.sigla.length; siglumIndex++) {
      new EditableTextField({
        verbose: false,
        containerSelector: `${this.containerSelector} .siglum-${siglumIndex}`,
        initialText: this.mceData.sigla[siglumIndex],
        onConfirm: this._genOnConfirmSiglumEdit(siglumIndex)
      })
    }
  }

  _genOnConfirmSiglumEdit(siglumIndex) {
    return (ev) => {
      // console.log(`Confirming siglum edit`)
      // console.log(ev.detail)
      let newText = Util.removeWhiteSpace(ev.detail['newText'])
      let oldText = ev.detail['oldText']
      let editor = ev.detail['editor']
      if (oldText === newText || newText === '') {
        // just reset the editor's text in case the edited text contained whitespace
        editor.setText(this.mceData.sigla[siglumIndex])
        return false
      }
      if (this.mceData.sigla.indexOf(newText) !== -1) {
        // siglum already exists
        let infoElement = $(`${this.containerSelector} .siglum-${siglumIndex}-info`)
        transientAlert(infoElement, '',
          "Given siglum '" + newText + "' already exists, no changes made", 2000, 'slow')
        editor.setText(this.mceData.sigla[siglumIndex])
        return false
      }
      // Change the siglum
      this.mceData.sigla[siglumIndex] = newText
      this.options.updateSigla(this.mceData.sigla).then( () => {
        console.log(`Sigla updated`)
      }, (error) => {
        console.error(`Error updating sigla: ${error}`)
      })
    }
  }

  _genOnClickDeleteChunk(chunkIndex) {
    return () => {
      let confirmDialog = new ConfirmDialog({
        body: `<p>Are you sure you want to delete this chunk?</p>`,
        acceptButtonLabel: 'Delete',
        cancelButtonLabel: 'Cancel',
        acceptFunction: () => {
          let button =  $(`${this.containerSelector} button.delete-chunk-${chunkIndex}`)
          let chunkInfoSpan = $(`${this.containerSelector} .chunk-info-span-${chunkIndex}`)
          let currentButtonHtml = button.html()
          button.html(`Deleting... ${this.options.icons.busy}`)
          chunkInfoSpan.html('')
          this.options.deleteChunk(chunkIndex).then( () => {
              button.html(currentButtonHtml)
              button.addClass('hidden')
            },
            (error) => {
              console.error(`Error deleting chunk ${chunkIndex}: ${error}`)
              button.html(currentButtonHtml)
              chunkInfoSpan.html(`Error deleting, please try again`).addClass('text-danger')
            })
          }
        }
      )
      confirmDialog.show()
    }
  }


  _genOnClickUpdateChunk(chunkIndex) {
    return () => {
      let button =  $(`${this.containerSelector} button.update-chunk-${chunkIndex}`)
      let chunkInfoSpan = $(`${this.containerSelector} .chunk-info-span-${chunkIndex}`)
      let currentButtonHtml = button.html()
      button.html(`Updating... ${this.options.icons.busy}`)
      chunkInfoSpan.html('')
      this.options.updateChunk(chunkIndex).then( () => {
        button.html(currentButtonHtml)
        button.addClass('hidden')
      },
        (error) => {
          console.error(`Error updating chunk ${chunkIndex}: ${error}`)
          button.html(currentButtonHtml)
          chunkInfoSpan.html(`Error updating, please try again`).addClass('text-danger')
      })
    }

  }

  _genOnClickUpDownButton(chunkIndex, position, direction) {
    return (ev) => {
      if ($(ev.currentTarget).hasClass('disabled')) {
        return false
      }

      let numChunks = this.mceData.chunks.length
      console.log('Click move ' + direction + ' button on chunk ' + chunkIndex + ', position ' + position)
      let firstPos = 0
      let lastPos = numChunks - 1
      if (direction === 'down' && position === lastPos) {
        // at the last position, cannot move up
        // console.log('Nowhere to move down the table')
        return false
      }

      if (direction === 'up' && position === firstPos) {
        // at the first position, cannot move down
        // console.log('Nowhere to move up')
        return false
      }

      let indexOffset = direction === 'up' ? -1 : 1

      ArrayUtil.swapElements(this.mceData.chunkOrder, position, position+indexOffset)
      this.options.updateChunkOrder(this.mceData.chunkOrder).then( () => {
        console.log(`Chunk order updated`)
      })
    }
  }
}