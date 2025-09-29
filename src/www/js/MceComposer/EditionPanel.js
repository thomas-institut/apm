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


import { Panel } from '@/MultiPanelUI/Panel'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { MceData } from '@/MceData/MceData'
import * as Util from '../toolbox/Util.ts'
import { wait } from '@/toolbox/wait'
import * as ArrayUtil from '../lib/ToolBox/ArrayUtil.ts'
import { EditableTextField } from '@/widgets/EditableTextField'
import { transientAlert } from '@/widgets/TransientAlert'
import { ConfirmDialog, SMALL_DIALOG } from '@/pages/common/ConfirmDialog'
import { SiglaGroupsUI } from '@/EditionComposer/SiglaGroupsUI'
import { MultiToggle } from '@/widgets/MultiToggle'
import { urlGen } from '@/pages/common/SiteUrlGen'
import { ApmFormats } from '@/pages/common/ApmFormats'
import { NiceToggle } from '@/widgets/NiceToggle'
import { deepCopy } from '@/toolbox/Util'

const defaultIcons = {
  alert: '<i class="fas fa-exclamation-triangle"></i>',
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
  deleteChunk: '<i class="bi bi-trash"></i>',
  updateChunk: '<i class="bi bi-arrow-counterclockwise"></i>',
  moveUp: '<i class="bi bi-arrow-up-short"></i>',
  moveDown: '<i class="bi bi-arrow-down-short"></i>',
  editSiglaGroup: '<i class="bi bi-pencil"></i>',
  deleteSiglaGroup: '<i class="bi bi-trash"></i>'
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
          return Promise.resolve( this.mceData.chunks.map( () => { return 'false'}))
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
            return Promise.resolve()
          }
        },
        updateAutoMarginalFoliation: {
          type: 'function',
          default: async (newAutoMarginalFoliation) => {
            console.log(`New auto marginal foliation`)
            console.log(newAutoMarginalFoliation)
          }
        },
        updateSigla: {
          type: 'function',
          default: (newSigla) => {
            console.log(`Faking updating sigla`)
            console.log(newSigla)
            return Promise.resolve()
          }
        },
        updateSiglaGroups: {
          type: 'function',
          default: (newSiglaGroups) => {
            console.log(`Faking updating sigla groups`)
            console.log(newSiglaGroups)
            return Promise.resolve()
          }
        },
        updateChunkBreak: {
          type: 'function',
          default: (chunkIndex, newBreak) => {
            console.log(`Faking update chunk break fro chunk ${chunkIndex}, new break is '${newBreak}'`)
            return Promise.resolve()
          }
        },
      }
    })

    this.options = oc.getCleanOptions(options)
    this.loading = this.options.showLoadingDataMessage;

    /** @type {MceDataInterface} mceData */
    this.mceData = this.options.mceData
    this.options.getUpdateStatuses().then( (statuses) => {
      this.updateStatuses = statuses
    })
    this.icons = this.options.icons
  }

  /**
   *
   * @param {boolean}loadingStatus
   */
  setLoadingStatus(loadingStatus) {
    this.loading = loadingStatus
  }

  updateLoadingMessage(newMessage) {
    if (MceData.isEmpty(this.mceData) && this.loading)
    {
      $(this.getContainerSelector()).html(this.__genLoadingStateHtml(newMessage))
    }
  }


  async generateHtml() {

    if (MceData.isEmpty(this.mceData)) {
      if (this.loading) {
        return this.__genLoadingStateHtml('Loading')
      }else {
        return `<div class='empty-chunks-info'>
        <p class="text-warning">${this.icons.alert} Edition is still empty.</p>
        <p>Search for chunks in the 'Chunk Search' tab and add one or more to start.</p>
</div>`
      }
    }
    // console.log(`Generating EditionPanel html with actual chunk table`)
    return `<div class="chunk-table">
                ${this.__genChunksTable()}
            </div>
            <div class="sigla-table">
                <h4>Sigla</h4>
                ${this.__genSiglaTable()}
            </div>
            <div class="sigla-groups">
                <h4>Sigla Groups</h4>
                <div class="sigla-groups-table">${this.__genSiglaGroupsTable()}</div>
                <button class="btn  btn-outline-secondary btn-sm add-sigla-group-btn"  title="Click to add a new sigla group">Add Sigla Group</button>
            </div>`
  }

  /**
   *
   * @param {string}loadingMessage
   * @return {string}
   * @private
   */
  __genLoadingStateHtml(loadingMessage) {
    return `<div class='empty-chunks-info'>
        <p class="text-warning">${loadingMessage}...</p>
</div>`
  }

  __genSiglaGroupsTable() {
    return SiglaGroupsUI.genSiglaGroupsTable(this.mceData.siglaGroups, this.mceData.sigla, this.icons)
  }

  _genOnClickEditSiglaGroupButton(i) {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      this.verbose && console.log(`Edit sigla group ${i}`)
      this._addEditSiglaGroup(i)
    }
  }

  _genOnClickDeleteSiglaGroup(i) {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      SiglaGroupsUI.confirmDeleteSiglaGroup(this.mceData.siglaGroups, i, this.mceData.sigla).then( () => {
        this.verbose && console.log(`Deleting sigla group ${i}`)
        this.mceData.siglaGroups = this.mceData.siglaGroups.filter( (sg, index) => {
          return index !== i
        })
        this.options.updateSiglaGroups(this.mceData.siglaGroups)
        this._reDrawSiglaGroupsTable()
      }, (reason) => {
        if (reason !== 'Canceled') {
          console.error(`Error confirming deletion of sigla group ${i}`)
        }
      })
    }
  }

  __genSiglaTable() {
    return [
      '<table class="edition-panel-table sigla-table">',
      '<tr><th>Witness</th><th>Siglum</th><th>Marg. Fol.</th><th></th></tr>',
      this.mceData.witnesses.map( (witness, witnessIndex) => {
          return `<tr>
                <td>${witness.title}</td>
                <td class="siglum-${witnessIndex}">${this.mceData.sigla[witnessIndex]}</td>
                <td class="siglum-${witnessIndex}-marg-fol"></td>
                <td class="siglum-${witnessIndex}-info"></td>
                </tr>`
      }).join(''),
      '</table>'
    ].join('')
  }

  __genChunksTable() {
    let html = '<table class="edition-panel-table chunk-table">'
    html += '<tr><th></th><th>Chunk</thth><th>Title</th><th>Version</th><th>Break After</th></tr>'

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
        deleteButton = `<button class="chunk-table-btn delete-chunk delete-chunk-${chunkIndex}" title="Click to remove chunk from this edition">
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
        <td><a href="${urlGen.siteChunkEdition(chunk.chunkEditionTableId)}" title="Open in new tab" target="_blank">${chunk.title}</a></td>
        <td>${ApmFormats.timeString(chunk.version)}</td>
        <td class="chunk-break-td chunk-break-td-${chunkIndex}">${this._getBreakLabel(chunk.break)}</td>
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

  /**
   *
   * @param {MceDataInterface} mceData
   */
  updateData(mceData) {
    this.mceData = mceData
    // console.log(`Updating mceData, ${this.mceData.chunks.length} chunks`)

    this.options.getUpdateStatuses().then( async (statuses) => {
      this.updateStatuses = statuses
      $(this.containerSelector).html(await this.generateHtml())
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

      // break toggle
      let toggle = new MultiToggle({
        containerSelector: `${this.containerSelector} td.chunk-break-td-${chunkIndex}`,
        wrapButtonsInDiv: false,
        initialOption: chunk['break'],
        buttonDef: [
          { label: 'None', name: 'none', helpText: 'No break with next chunk'},
          { label: 'Paragraph', name: 'paragraph', helpText: "Next chunk starts in new paragraph"},
        ],
      })
      toggle.on('toggle', (ev) => {
        console.log(`Chunk ${chunkIndex} break toggle`)
        let newBreak = ev.detail.currentOption
        if (newBreak === 'none') {
          newBreak = ''
        }
        this.mceData.chunks[chunkIndex].break = newBreak
        this.options.updateChunkBreak(chunkIndex, newBreak).then( () => {
          console.log(`Chunk break updated`)
        }, (reason) => {
          console.error(`Error updating chunk break: ${reason}`)
          toggle.setOptionByName(ev.detail.previousOption)
        })
      })
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

    // setup sigla group table
    this._setupSiglaGroupsTable();

    // set up automatic marginal foliation toggles
    let includedWitnesses = this.mceData.includeInAutoMarginalFoliation;
    for (let witnessIndex = 0; witnessIndex < this.mceData.witnesses.length; witnessIndex++) {
      let toggle = new NiceToggle({
        containerSelector: `${this.containerSelector} td.siglum-${witnessIndex}-marg-fol`,
        onPopoverText: `Click to remove automatic marginal foliation entries`,
        offPopoverText: `Click to generate automatic marginal foliation entries`,
        onIcon: `<span class="nice-toggle-button-on">ON</span>`,
        offIcon: `<span class="nice-toggle-button-off">OFF</span>`,
        initialValue: includedWitnesses.indexOf(witnessIndex) !== -1
      });
      toggle.on('toggle', () => {
        console.log(`Clicked auto fol ${witnessIndex}`);
        let includeArray = deepCopy(this.mceData.includeInAutoMarginalFoliation);
        if (toggle.getToggleStatus()) {
          includeArray.push(witnessIndex);
        } else {
          includeArray = includeArray.filter((v) => {
              return v !== witnessIndex;
            })
        }
        this.options.updateAutoMarginalFoliation(includeArray).then( () => {
          console.log(`Auto marginal foliation updated`);
        })
      })
    }


  }

  _genOnClickAddSiglaGroupButton() {
    return () => {
      console.log(`Click on add sigla group button`)
      this._addEditSiglaGroup(-1)
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
        this._redrawSiglaGroupSigla()
      }, (error) => {
        console.error(`Error updating sigla: ${error}`)
      })
    }
  }

  _redrawSiglaGroupSigla() {
    this.mceData.siglaGroups.forEach( (sg, i) => {
      $(`${this.containerSelector} .sigla-group-siglum-${i}`).html(sg.siglum)
      $(`${this.containerSelector} .sigla-group-sigla-${i}`).html(SiglaGroupsUI.getSiglaStringForWitnessIndexArray(this.mceData.sigla, sg.witnesses))
    })
  }

  _genOnClickDeleteChunk(chunkIndex) {
    return () => {
      let confirmDialog = new ConfirmDialog({
        body: `<p>Are you sure you want to remove <b>${this.mceData.chunks[chunkIndex].title}</b> (Chunk ${this.mceData.chunks[chunkIndex].chunkId}) from this edition?</p>`,
        acceptButtonLabel: 'Remove',
        cancelButtonLabel: 'Cancel',
        title: 'Please confirm:',
        size: SMALL_DIALOG,
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

  _addEditSiglaGroup(index) {
    SiglaGroupsUI.addEditSiglaGroup(this.mceData.siglaGroups, index, this.mceData.sigla).then( (editedSiglaGroup) => {
        if (index === -1) {
          console.log(`Adding new sigla group`)
          this.mceData.siglaGroups.push(editedSiglaGroup)
        } else {
          console.log(`Replacing sigla group at index ${index}`)
          this.mceData.siglaGroups[index] = editedSiglaGroup
        }
        this.options.updateSiglaGroups(this.mceData.siglaGroups)
        this._reDrawSiglaGroupsTable()
      },
      (reason) => {
        if (reason !== 'Canceled') {
          console.error(`Error editing sigla group: ${reason}`)
        }
      })
  }

  _reDrawSiglaGroupsTable() {
    $(`${this.containerSelector} div.sigla-groups-table`).html(this.__genSiglaGroupsTable())
    this._setupSiglaGroupsTable()
  }

  _setupSiglaGroupsTable() {
    $(`${this.containerSelector} .add-sigla-group-btn`).off('click').on('click', this._genOnClickAddSiglaGroupButton())
    this.mceData.siglaGroups.forEach( (sg, i) => {
      $(`${this.containerSelector} .edit-sigla-group-btn-${i}`).off('click').on('click', this._genOnClickEditSiglaGroupButton(i))
      $(`${this.containerSelector} .delete-sigla-group-btn-${i}`).off('click').on('click', this._genOnClickDeleteSiglaGroup(i))
    })
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