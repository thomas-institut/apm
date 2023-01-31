/*
 *  Copyright (C) 2021 Universität zu Köln
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

/**
 * The Witness Info panel in the Editor Composer.
 *
 *  - Table of witnesses
 *  - Witness order
 *  - Sigla (with preset)
 *  - Witness update: update status, check for updates and launch the witness update task
 */
import { Panel } from '../MultiPanelUI/Panel'
import { doNothing, failPromise } from '../toolbox/FunctionUtil.mjs'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import * as Util from '../toolbox/Util.mjs'
import { EditableTextField } from '../widgets/EditableTextField'
import * as CollationTableType from '../constants/CollationTableType'
import * as ArrayUtil from '../toolbox/ArrayUtil.mjs'
import { transientAlert } from '../widgets/TransientAlert'
import * as WitnessType from '../Witness/WitnessType'
import { WitnessUpdateDialog } from './WitnessUpdateDialog'
import { WitnessDiffCalculator } from '../Edition/WitnessDiffCalculator'
import { CtData } from '../CtData/CtData'
import { flatten } from '../toolbox/ArrayUtil.mjs'
import { trimWhiteSpace } from '../toolbox/Util.mjs'
import { SiglaGroupsUI } from './SiglaGroupsUI'
import { ConfirmDialog, LARGE_DIALOG, MEDIUM_DIALOG } from '../pages/common/ConfirmDialog'

const icons = {
  moveUp: '<i class="bi bi-arrow-up-short"></i>',
  moveDown: '<i class="bi bi-arrow-down-short"></i>',
  savePreset:'<i class="fas fa-save"></i>',
  loadPreset: '<i class="fas fa-upload"></i>',
  checkOK: '<i class="far fa-check-circle"></i>',
  checkFail: '<i class="fas fa-exclamation-triangle"></i>',
  checkCross: '<i class="fas fa-times"></i>',
  externalLink: '<i class="bi bi-box-arrow-up-right"></i>',
  editSiglaGroup: '<i class="bi bi-pencil"></i>',
  deleteSiglaGroup: '<i class="bi bi-trash"></i>'
}

export class WitnessInfoPanel extends Panel{
  constructor (options = {}) {
    super(options)

    let optionsSpec = {
      onSiglaChange: { type: 'function', default: doNothing},
      onWitnessOrderChange: { type: 'function', default: doNothing},
      checkForWitnessUpdates: {
        type: 'function',
        default: (lastCheckData) => {
          return new Promise( resolve => {
            console.log(`Should be checking for witness updates`)
            resolve(lastCheckData)
          })
        }
      },
      getPageInfo: {
        type: 'function',
        default: (pageIds) => { return new Promise( resolve => {
          console.log(`Should be getting page info for ${pageIds.length} page(s)`)
          resolve([])
        })}
      },
      getDocUrl : {
        type: 'function',
        default: () => { return ''}
      },
      getPageUrl : {
        type: 'function',
        default: () => {return ''}
      },
      getWitnessData: {
        type: 'function',
        default:
          (witnessId) => { return failPromise(`Not really getting ${witnessId} from server`, 'Not implemented')}
      },
      updateWitness: {
        type: 'function',
        required: true
      },
      fetchSiglaPresets: {
        // a function that fetches the sigla presets from the server.
        // TODO: document data from the Promise resolve and reject
        // () => {  return Promise() }
        type: 'function',
        required: true
      },
      fetchSources: {
        // a function that fetches available sources
        // () => { return Promise()}
        type: 'function',
        required: true,
      },
      addEditionSources: {
        // a function that adds source from a given array
        // (sourceDataArray) => { ...do something... }
        type: 'function',
        required: true
      },

      saveSiglaPreset: {
        // a function to save a sigla preset
        // TODO: document apiCallData
        // (apiCallData) => { return Promise() }
        type: 'function',
        required: true
      },
      onCtDataChange: { type: 'function', default: doNothing},
      userId: { type: 'NonZeroNumber', required: true},
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Witness Info Panel'})
    this.options = oc.getCleanOptions(options)
    this.ctData = CtData.copyFromObject(this.options.ctData)
    this.currentWitnessUpdateData = ''
    this.checkingForWitnessUpdates = false
    this.siglaPresets = []
  }



  updateCtData(newData, reRender = false) {
    this.ctData = CtData.copyFromObject(newData)
    if (reRender) {
      this.verbose && console.log(`New ctData, re-rendering panel`)
      this.reRender()
    }
  }

  reRender() {
    $(this.containerSelector).html(this.generateHtml())
    this.postRender()
  }

  // _getSiglaStringForWitnessIndexArray(witnesses) {
  //   return  witnesses.map( (w) => { return this.ctData['sigla'][w]}).join('')
  // }

  _genSiglaGroupsTable() {
    return SiglaGroupsUI.genSiglaGroupsTable(this.ctData['siglaGroups'], this.ctData['sigla'], icons)
  }

  generateHtml() {
    return `<div class="witnessinfotable">${this._genWitnessTableHtml()}</div>
        <div class="witness-update-div">
            <span class="witness-update-info"></span>
            <button class="btn  btn-outline-secondary btn-sm check-witness-update-btn"  title="Click to check for updates to witness transcriptions">Check Now</button>
       </div>
       <div class="witness-add-div">
            <button class="btn  btn-secondary btn-sm add-source-btn"  title="Click to add source ">Add Source</button>
        </div>
       <div class="sigla-groups-div">
           <h4>Sigla Groups</h4>
           <div class="sigla-groups-table">${this._genSiglaGroupsTable()}</div>
           <button class="btn  btn-outline-secondary btn-sm add-sigla-group-btn"  title="Click to add a new sigla group">Add Sigla Group</button>
</div>
       
       <div id="convert-to-edition-div">
            <button id="convert-to-edition-btn" class="btn btn-primary" title="Click to add a main text">Add Main Text</button>
       </div>`
  }

  _updatePageInfo() {
    let pageIds = CtData.getPageIds(this.ctData)
    let allPageIds = flatten(pageIds)
    this.options.getPageInfo(allPageIds).then( (pageInfoArray) => {
      this.ctData['witnesses'].forEach( (witness, witnessIndex) => {
        if (witness['witnessType'] === WitnessType.FULL_TX) {
          let pageInfoHtml = CtData.getColumnsForWitness(this.ctData, witnessIndex).map( (col) => {
            // 1. fill in page info into the column object
            let pageInfoIndex = pageInfoArray.map((pi) => { return pi.id}).indexOf(col['pageId'])
            if (pageInfoIndex === -1) {
              return col
            }
            let pageInfo = pageInfoArray[pageInfoIndex]
            col.docId = pageInfo.docId
            col.foliation = pageInfo.foliation
            col.seq = pageInfo.seq
            col.numCols = pageInfo.numCols
            return col
          }).sort ( (colA, colB) => {
            // 2. Sort by page sequence and column
            if (colA.seq !== colB.seq) {
              return colA.seq - colB.seq
            }
            return colA.column - colB.column
          }).map( (colWithInfo) => {
            // 3. Build page info html
            if (colWithInfo.docId === undefined) {
              // this means that there was no page info
              return ''
            }
            if (colWithInfo.numCols === 1)  {
              let pageUrl = this.options.getPageUrl(colWithInfo.docId, colWithInfo.seq, 0)
              if (pageUrl === '') {
                return colWithInfo.foliation
              }
              return `<a href="${pageUrl}" title="Click to open page transcription in a new tab" target="_blank">${colWithInfo.foliation}</a>`
            } else {
              let pageUrl = this.options.getPageUrl(colWithInfo.docId, colWithInfo.seq, colWithInfo.column)
              let pageString = `${colWithInfo.foliation} c${colWithInfo.column}`
              if (pageUrl === '') {
                return pageString
              }
              return `<a href="${pageUrl}" title="Click to open page transcription in a new tab" target="_blank">${pageString}</a>`
            }
          }).join(', ')
          $(`${this.containerSelector} td.info-td-${witnessIndex}`).html(pageInfoHtml)
        }
      })
    })

  }

  postRender () {
    this._updatePageInfo()

    this.updateWitnessInfoDiv(false)
    $(this.containerSelector + ' .check-witness-update-btn').on('click', () => {
      if (!this.checkingForWitnessUpdates) {
        this.checkForWitnessUpdates()
      }
    })
    this.convertToEditionDiv = $('#convert-to-edition-div')
    this.convertToEditionButton = $('#convert-to-edition-btn')
    $(`${this.containerSelector} .add-source-btn`).on('click', this._genOnClickAddSourceButton())
    if (this.ctData.type === CollationTableType.COLLATION_TABLE) {
      this.convertToEditionDiv.removeClass('hidden')
      this.convertToEditionButton.on('click', this.genOnClickConvertToEditionButton())
    } else {
      this.convertToEditionDiv.addClass('hidden')
    }

    // TODO: change this to sigla group manager UI
    $(`${this.containerSelector} .add-sigla-group-btn`).on('click', this._genOnClickAddSiglaGroupButton())
    this.ctData['siglaGroups'].forEach( (sg, i) => {
      $(`${this.containerSelector} .edit-sigla-group-btn-${i}`).on('click', this._genOnClickEditSiglaGroupButton(i))
      $(`${this.containerSelector} .delete-sigla-group-btn-${i}`).on('click', this._genOnClickDeleteSiglaGroup(i))
    })

  }

  _genOnClickAddSourceButton() {
    return () => {
      let dialogBody = `<p>The following sources are available:</p>
        <div class="source-list-div"><em>Loading data...</em></div>
`
      let dialog = new ConfirmDialog({
        title: 'Add Sources',
        size: LARGE_DIALOG,
        acceptButtonLabel:  'Add Checked Sources',
        body: dialogBody,
        hideOnAccept: false,
        cancelFunction: () => {
          console.log(`Canceled add/edit sigla group`)
        }
      })
      dialog.show()
      let dialogSelector = dialog.getSelector()
      this.options.fetchSources().then( (sourceArray) => {
        console.log(`Got sources`)
        console.log(sourceArray)
        let tableHtml = '<table class="source-table">'
        tableHtml += '<tr><th></th><th>Title</th><th>Description</th><th>Default Siglum</th>'
        tableHtml += sourceArray.map( (sourceData, index) => {
          return (`<tr>
                <td><input class="source-checkbox-${index}" type="checkbox" value="${index}"></td>
                <td>${sourceData.title}</td>
                <td>${sourceData.description}</td>
                <td>${sourceData.defaultSiglum}</td></tr>`)
        }).join('')
        tableHtml += '</table>'
        $(`${dialogSelector} div.source-list-div`).html(tableHtml)
        dialog.setAcceptFunction( () => {
          let sourcesToAdd = []
          sourceArray.forEach( (sourceData, index) => {
            if ($(`${dialogSelector} .source-checkbox-${index}`).prop('checked')) {
              sourcesToAdd.push(sourceData)
            }
          })
          if (sourcesToAdd.length !== 0) {
            this.options.addEditionSources(sourcesToAdd)
          }
          dialog.hide()
          dialog.destroy()
        })
      }).catch( (e) => {
        console.warn(`Error getting sources`)
        console.log(e)
      })

    }
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
      SiglaGroupsUI.confirmDeleteSiglaGroup(this.ctData['siglaGroups'], i, this.ctData['sigla']).then( () => {
        this.verbose && console.log(`Deleting sigla group ${i}`)
        this.ctData['siglaGroups'] = this.ctData['siglaGroups'].filter( (sg, index) => {
          return index !== i
        })
        this.options.onCtDataChange(this.ctData)
      }, (reason) => {
        if (reason !== 'Canceled') {
          console.error(`Error confirming deletion of sigla group ${i}`)
        }
      })
    }
  }

  genOnClickConvertToEditionButton() {
    return () => {
       console.log(`Click on convert to edition button`)
    }
  }

  /**
   * Updates the
   * @param {boolean} reRenderTable
   */
  updateWitnessInfoDiv(reRenderTable = false) {

    // Turn off current event handlers
    $(this.containerSelector + ' .move-up-btn').off()
    $(this.containerSelector + ' .move-down-btn').off()
    $(this.containerSelector + ' .save-sigla-btn').off()
    $(this.containerSelector + ' .load-sigla-btn').off()

    // set table html
    if (reRenderTable) {
      $(this.containerSelector + ' .witnessinfotable').html(this._genWitnessTableHtml())
    }


    // set up witness move buttons
    let firstPos = this.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
    let firstMoveUpButton = $(`${this.containerSelector} td.witness-pos-${firstPos} > .move-up-btn`)
    firstMoveUpButton.addClass('opacity-0').addClass('disabled')
    let lastPos = this.ctData['witnessOrder'].length -1
    $(this.containerSelector + ' td.witness-pos-' + lastPos +  ' > .move-down-btn').addClass('disabled')
    $(this.containerSelector + ' .move-up-btn').on('click', this.genOnClickUpDownWitnessInfoButton('up'))
    $(this.containerSelector + ' .move-down-btn').on('click',this.genOnClickUpDownWitnessInfoButton('down') )

    // set up siglum editors
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      new EditableTextField({
        verbose: false,
        containerSelector: this.containerSelector + ' .siglum-' + i,
        initialText: this.ctData['sigla'][i],
        onConfirm: this.genOnConfirmSiglumEdit(i)
      })
    }
    // update witness update check info
    this.checkForWitnessUpdates()

    // set up sigla presets buttons
    $(this.containerSelector + ' .save-sigla-btn').on('click', this.genOnClickSaveSiglaPreset())
    $(this.containerSelector + ' .load-sigla-btn').on('click', this.genOnClickLoadSiglaPreset())

    if (this.siglaPresets.length === 0)  {
      $(this.containerSelector + ' .load-sigla-btn').addClass('hidden')
    }

     this.fetchSiglaPresets()
  }

  fetchSiglaPresets() {
    this.options.fetchSiglaPresets().then( (presets) => {
      this.siglaPresets = presets
      this.verbose && console.log(`Fetched sigla presets`)
      this.verbose && console.log(presets)
      if (this.siglaPresets.length === 0)  {
        $(this.containerSelector + ' .load-sigla-btn').addClass('hidden')
      } else {
        $(this.containerSelector + ' .load-sigla-btn').removeClass('hidden')
      }
    }).catch( (resp) => {
      console.log(`Error getting sigla presets`)
      console.log(resp)
      this.siglaPresets = []
      $(this.containerSelector + ' .load-sigla-btn').addClass('hidden')
    })
  }

  genOnClickSaveSiglaPreset() {
    return () => {
      console.log('Click on save sigla')
      const overWritePresetButtonLabel = 'Overwrite Preset'
      const createPresetButtonLabel = 'Create New Preset'
      $('body').append(this._genHtmlSaveSiglaPreset())

      let modalSelector= '#save-sigla-preset-modal'
      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let saveButton = $(`${modalSelector} .save-btn`)
      let titleInput = $(`${modalSelector} .title-input`)
      let titleLabel = $(`${modalSelector} .create-new-label`)
      let footInfoLabel = $(`${modalSelector} .foot-info-label`)
      let presetSelect = $(`${modalSelector} .preset-select`)
      let presetSelectLabel = $(`${modalSelector} .preset-select-label`)

      let presetOverwriteMode = false   // true if there are presets that can be overwritten
      let apiCommand = 'new'

      // get user presets
      let userPresets = this.siglaPresets.filter( (p) => {
        return p.userId === this.options.userId
      })

      if (userPresets.length === 0) {
        // no user presets, just show the "Create New" area
        $(`${modalSelector} .select-p`).addClass('hidden')
        titleLabel.html("New preset title:")
        saveButton.html(createPresetButtonLabel)
        saveButton.prop('disabled', true)
        presetOverwriteMode = false
        apiCommand = 'new'
      } else {
        presetSelect.html(
          userPresets.map((p) => {
            return `<option value="${p.presetId}">${p.title}</option>`
          }).join(''))
        saveButton.html(overWritePresetButtonLabel)
        presetSelectLabel.addClass('active-label')
        presetOverwriteMode = true
        apiCommand = 'update'
      }

      // build witness sigla table
      let siglaTableBody = this.ctData.witnesses.filter( (w) => {
        return w['witnessType'] === 'fullTx'
      }).map( (w, i) => {
        return `<tr></tr><td>${this.ctData['witnessTitles'][i]}</td><td>${this.ctData.sigla[i]}</td></tr>`
      }).join('')
      $(`${modalSelector} .sigla-table-body`).html(siglaTableBody)

      cancelButton.on('click', () => {
        $(modalSelector).modal('hide')
        $(modalSelector).remove()
      })


      titleInput.on('keyup', () => {
        if (titleInput.val() === '') {
          // title is empty
          if (presetOverwriteMode) {
            apiCommand = 'update'
            saveButton.html(overWritePresetButtonLabel)
            presetSelectLabel.addClass('active-label')
            titleLabel.removeClass('active-label')
          } else {
            saveButton.prop('disabled', true)
          }
        } else {
          // there is something in the title input
          if (presetOverwriteMode) {
            apiCommand = 'new'
            saveButton.html(createPresetButtonLabel)
            presetSelectLabel.removeClass('active-label')
            titleLabel.addClass('active-label')
          } else {
            saveButton.prop('disabled', false)
          }
        }
      })

      saveButton.on('click', () => {
        // build preset
        let lang = this.ctData.lang
        let witnessSiglaArray = {}
        this.ctData.witnesses.forEach( (w, i) => {
          if (w['witnessType'] === 'fullTx') {
            witnessSiglaArray[w['ApmWitnessId']] = this.ctData.sigla[i]
          }
        })

        // TODO: move this to EditionComposer.js
        let apiCallData = {
          lang: lang,
          witnesses: witnessSiglaArray,
          command: apiCommand,
        }
        if (apiCommand === 'new') {
          apiCallData.title = titleInput.val()
        } else {
          apiCallData.presetId = Util.safeGetIntVal(presetSelect, 'presetSelect')
        }

        this.options.saveSiglaPreset(apiCallData).then( () => {
          this.verbose && console.log('Save preset success')
          if (apiCommand === 'new') {
            footInfoLabel.html('New preset created ')
          } else {
            footInfoLabel.html('Preset overwritten')
          }
          cancelButton.html('Close')
          // reload presets
          this.fetchSiglaPresets()
        }).catch( (resp) => {
          if (apiCommand === 'new') {}
          footInfoLabel.html('Error: could not save new preset')
          saveButton.removeClass('hidden')
          console.warn(`Could not save sigla presets`)
          console.log(resp)
        })
      })

      // go!
      $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: true
      })
    }
  }

  _genOnClickAddSiglaGroupButton() {
    return () => {
      console.log(`Click on add sigla group button`)
      this._addEditSiglaGroup(-1)
    }
  }

  _readSiglaGroupFromDialog(dialogSelector) {
    let witnesses = []
    this.ctData['sigla'].forEach( (s, i) => {
      if ($(`${dialogSelector} .siglum-checkbox-${i}`).prop('checked')) {
        witnesses.push(i)
      }
    })
    return {
      siglum: trimWhiteSpace($(`${dialogSelector} .group-siglum-input`).val()),
      witnesses: witnesses
    }
  }

  _addEditSiglaGroup(index) {
    let sigla = this.ctData['sigla'].filter( (s, i) => {
        return (i !== this.ctData['editionWitnessIndex'])
      })
    SiglaGroupsUI.addEditSiglaGroup(this.ctData['siglaGroups'], index, sigla).then( (editedSiglaGroup) => {
      if (index === -1) {
        console.log(`Adding new sigla group`)
        this.ctData['siglaGroups'].push(editedSiglaGroup)
      } else {
        console.log(`Replacing sigla group at index ${index}`)
        this.ctData['siglaGroups'][index] = editedSiglaGroup
      }
      this.options.onCtDataChange(this.ctData)
    },
      (reason) => {
        if (reason !== 'Canceled') {
          console.error(`Error editing sigla group: ${reason}`)
        }
      })
  }

  genOnClickLoadSiglaPreset() {
    return () => {
      console.log('Click on load sigla preset')
      if (this.siglaPresets.length === 0) {
        this.verbose && console.log('No sigla presets to apply')
        return
      }
      $('body').append(this._genHtmlLoadSiglaPresetDialog())
      let modalSelector= '#load-sigla-preset-modal'
      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let loadButton = $(`${modalSelector} .load-btn`)
      let presetSelect =  $(`${modalSelector} .preset-select`)
      let siglaTableBody =  $(`${modalSelector} .sigla-table-body`)

      presetSelect.html(
        this.siglaPresets.map((p) => {
          return `<option value="${p.presetId}">${p.title}, <em>${p.userName}</em></option>`
        }).join('')
      )
      let p = this.siglaPresets[0]
      siglaTableBody.html(this.getWitnessSiglaArrayFromPreset(p).map( w => {
        return `<tr></tr><td>${w.title}</td><td>${w.currentSiglum}</td><td>${w.presetSiglum}</td></tr>`
      }).join(''))

      presetSelect.on('change', () => {
        let id =  Util.safeGetIntVal(presetSelect, 'presetSelect')
        let p =  this.siglaPresets.filter( (p) => { return p.presetId === id})[0]
        siglaTableBody.html(this.getWitnessSiglaArrayFromPreset(p).map( w => {
          return `<tr></tr><td>${w.title}</td><td>${w.currentSiglum}</td><td>${w.presetSiglum}</td></tr>`
        }).join(''))
      })

      loadButton.on('click', () => {
        let id =  Util.safeGetIntVal(presetSelect, 'presetSelect')
        let p =  this.siglaPresets.filter( (p) => { return p.presetId === id})[0]
        this.getWitnessSiglaArrayFromPreset(p).forEach( (w) => {
          this.ctData['sigla'][w.index] = w.presetSiglum
        })
        this.siglaPresetLoaded = p.title
        $(modalSelector).modal('hide')
        $(modalSelector).remove()
        this.updateWitnessInfoDiv()
        this.options.onSiglaChange(this.ctData['sigla'])
      })

      cancelButton.on('click', () => {
        $(modalSelector).modal('hide')
        $(modalSelector).remove()
      })

      // go!
      $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: true
      })
    }
  }

  getWitnessSiglaArrayFromPreset(preset) {
    return this.ctData.witnesses
      .filter( w => {  return w['witnessType'] === 'fullTx'})
      .map( (w, i) => {
        let shortId = w['ApmWitnessId'].split('-').slice(2,5).join('-')

        return {
          title : this.ctData['witnessTitles'][i],
          id: shortId,
          index: i,
          currentSiglum: this.ctData.sigla[i],
          presetSiglum: preset.data.witnesses[shortId]
        }
      })
  }

  _genHtmlLoadSiglaPresetDialog() {
    return `<div id="load-sigla-preset-modal" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Load Sigla Preset</h5>
            </div>
            <div class="modal-body">
                <p>
                    <label>Preset: </label>
                    <select class="preset-select"></select> 
                </p>
                <div class="info-div">
                 <table class="sigla-table witnesstable">
                        <tr><th>Witness</th><th>Current Siglum</th><th>Preset Siglum</th></tr>
                        <tbody class="sigla-table-body">
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger load-btn">Load Sigla</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
            </div>
        </div>
    </div>
</div>`
  }

  _genHtmlSaveSiglaPreset() {
    return `<div id="save-sigla-preset-modal" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Save Sigla Preset</h5>
            </div>
            <div class="modal-body">
                <div class="info-div">
                    <table class="sigla-table witnesstable">
                        <tr><th>Witness</th><th>Siglum</th></tr>
                        <tbody class="sigla-table-body">
                        </tbody>
                    </table>
                </div>
                <p class="select-p">
                    <label class="preset-select-label">Overwrite Preset: </label>
                    <select class="preset-select">
                    </select> 
                </p>
                <p>
                    <label class="create-new-label">... or enter a title to create new preset: </label>
                    <input type="text" class="title-input"> 
                </p>
            </div>
            <div class="modal-footer">
            <label class="foot-info-label"></label>
                <button type="button" class="btn btn-danger save-btn">Save Sigla</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
            </div>
        </div>
    </div>
</div>`
  }

  /**
   * Function to be called by EditionComposer after saving to the server
   */
  onDataSave() {
    this.currentWitnessUpdateData['witnesses'] = this.currentWitnessUpdateData['witnesses'].map ( (wud) => {
      wud['justUpdated']= false
      return wud
    })
    this.showWitnessUpdateData()
  }

  markWitnessAsJustUpdated(witnessIndex) {
    this.currentWitnessUpdateData['witnesses'][witnessIndex]['upToDate'] = true
    this.currentWitnessUpdateData['witnesses'][witnessIndex]['justUpdated'] = true
    this.currentWitnessUpdateData['witnesses'][witnessIndex]['id'] = this.ctData['witnesses'][witnessIndex]['ApmWitnessId']
    this.showWitnessUpdateData()
  }

  checkForWitnessUpdates() {
    this.checkingForWitnessUpdates = true
    if (this.currentWitnessUpdateData === '') {
      this.currentWitnessUpdateData = this.getInitialWitnessUpdateData()
    }
    $(this.containerSelector + ' .witness-update-info').html(`Checking for witness updates..`)
    $(this.containerSelector + ' .check-witness-update-btn').prop('disabled', true)
    this.options.checkForWitnessUpdates(this.currentWitnessUpdateData).then( (newWitnessUpdateCheckData) => {
      this.currentWitnessUpdateData = newWitnessUpdateCheckData
      // console.log(newWitnessUpdateCheckData)
      this.showWitnessUpdateData()
      this.checkingForWitnessUpdates = false
    })
      .catch( () => {
      console.log(`Error checking witness updates`)
      $(`span.witness-update-info`).html(`Error checking witness updates, try again later`)
      $(`button.check-witness-update-btn`).prop('disabled', false)
      this.checkingForWitnessUpdates = false
    })
  }

  showWitnessUpdateData() {
    let infoSpan = $(this.containerSelector + ' .witness-update-info')
    let button = $(this.containerSelector + ' .check-witness-update-btn')
    let witnessesUpToDate = true
    for(let i=0; i < this.currentWitnessUpdateData['witnesses'].length; i++) {
      let witnessUpdateInfo = this.currentWitnessUpdateData['witnesses'][i]
      let warningTd = $(`${this.containerSelector} td.outofdate-td-${i}`)
      if (!witnessUpdateInfo['upToDate']) {
        if (witnessUpdateInfo['lastUpdate'] === -1) {
          // witness no longer defined
          warningTd.html(`<span>${icons.checkFail} Chunk no longer present in this witness`)
        } else {
          witnessesUpToDate = false
          let warningHtml =  `<span>${icons.checkFail} Last version:  `
          warningHtml += `${Util.formatVersionTime(witnessUpdateInfo['lastUpdate'])} `
          warningHtml += `<a title="Click to update witness" class="btn btn-outline-secondary btn-sm witness-update-btn witness-update-btn-${i}">Update</a>`
          warningTd.html(warningHtml)
          $(`${this.containerSelector} .witness-update-btn-${i}`).on('click', this.genOnClickWitnessUpdate(i))
        }
      } else {
        // witness is up-to-date
        if (witnessUpdateInfo['justUpdated']) {
          let warningHtml =  `<span>${icons.checkOK} Just updated. Don't forget to save!`
          warningTd.html(warningHtml)
          $(`${this.containerSelector} td.timestamp-td-${i}`).html(Util.formatVersionTime(this.ctData['witnesses'][i]['timeStamp']))
        } else {
          // witness up to date, not just updated
          warningTd.html('')
        }

      }
    }
    if (witnessesUpToDate) {
      infoSpan.removeClass('text-warning')
      infoSpan.addClass('text-success')
      infoSpan.html(`${icons.checkOK} All witnesses are up to date (last checked ${Util.formatVersionTime(this.currentWitnessUpdateData.timeStamp)})`)
    } else {
      infoSpan.removeClass('text-success')
      infoSpan.addClass('text-warning')
      infoSpan.html(`${icons.checkFail} One or more witnesses out of date (last checked ${Util.formatVersionTime(this.currentWitnessUpdateData.timeStamp)})`)
    }

    button.html('Check now')
      .attr('title', 'Click to check for updates to witness transcriptions')
      .prop('disabled', false)

  }


  getInitialWitnessUpdateData() {
    return {
      status: 'Initial',
      witnesses: this.ctData['witnesses'].map ( witness => {return { id: witness['ApmWitnessId'], upToDate: true}})
    }
  }

  genOnClickWitnessUpdate(witnessIndex) {
    return () => {
      let dialog = new WitnessUpdateDialog({
        ctData: this.ctData,
        witnessIndex: witnessIndex,
        newWitnessInfo: this.currentWitnessUpdateData['witnesses'][witnessIndex],
        witnessDiffCalculator: new WitnessDiffCalculator({debug: true}),
        getWitnessData: this.options.getWitnessData,
        updateWitness: this.options.updateWitness,
        icons: icons,
        debug: true
      })
      console.log(`Click on witness update ${witnessIndex}`)
      dialog.go()
    }
  }

  /**
   * generates the on click function for the witness info move buttons
   * Notice that the direction is from the point of view of the table: moving
   * up in the table means actually moving to a lesser position in the witness
   * order array. The top witness in the table is actually position 0.
   * @param direction
   * @returns {function(...[*]=)}
   */
  genOnClickUpDownWitnessInfoButton(direction) {
    return (ev) => {
      if ($(ev.currentTarget).hasClass('disabled')) {
        return false
      }
      let classes = Util.getClassArrayFromJQueryObject($(ev.currentTarget.parentNode))

      // let index = thisObject.getWitnessIndexFromClasses(classes)
      let position = this.getWitnessPositionFromClasses(classes)
      let numWitnesses = this.ctData['witnesses'].length
      // console.log('Click move ' + direction + ' button on witness ' + index + ', position ' + position)

      // TODO: change this to proper handling of source witnesses
      // the problem is that the collation table panel assumes that the collated witnesses are
      // in the first positions, so for the time being don't allow them to move further down the table


      let firstPos = this.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
      let lastPos = firstPos
      for(let i = lastPos; i < numWitnesses -1; i++) {
        lastPos = i
        if (this.ctData['witnesses'][i]['witnessType'] === WitnessType.EDITION ||
          this.ctData['witnesses'][i]['witnessType'] === WitnessType.SOURCE) {
          break
        }
      }

      if (position > lastPos) {
        console.log(`Attempting to move a witness in position ${position}, past lastPost = ${lastPos}`)
        return false
      }
      //let lastPos = numWitnesses - 1

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

      ArrayUtil.swapElements(this.ctData['witnessOrder'],position, position+indexOffset)

      $(this.options.containerSelector + ' .witnessinfotable').html('Updating...')
      this.updateWitnessInfoDiv(true)
      this._updatePageInfo()
      this._redrawSiglaGroupSigla()
      this.options.onWitnessOrderChange(this.ctData['witnessOrder'])
    }
  }

  _redrawSiglaGroupSigla() {
    this.ctData['siglaGroups'].forEach( (sg, i) => {
      $(`${this.containerSelector} .sigla-group-siglum-${i}`).html(sg.siglum)
      $(`${this.containerSelector} .sigla-group-sigla-${i}`).html(SiglaGroupsUI.getSiglaStringForWitnessIndexArray(this.ctData['sigla'], sg.witnesses))
    })
  }

  getWitnessPositionFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witness-pos-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[2])
      }
    }
    return index
  }


  _genWitnessTableHtml() {
    let witnessRows = this.ctData['witnessOrder']
      .map ( (witnessIndex, position) => {
        let witness = this.ctData['witnesses'][witnessIndex]
        let siglum = this.ctData['sigla'][witnessIndex]
        let witnessTitle = this.ctData['witnessTitles'][witnessIndex]
        let witnessClasses = [
          'witness-' + witnessIndex,
          'witness-type-' + witness['witnessType'],
          'witness-pos-' + position
        ]

        switch(this.ctData['witnesses'][witnessIndex]['witnessType'] ) {
          case WitnessType.EDITION:
            return ''

          case WitnessType.SOURCE:
            return  `<tr>
                <td class="${witnessClasses.join(' ')} cte-witness-move-td">
                </td>
                <td>${witnessTitle}</td>
                <td class="info-td-${witnessIndex}"></td>
                <td class="timestamp-td-${witnessIndex}"></td>
                <td class="siglum-${witnessIndex}">${siglum}</td>
                <td class="warning-td-${witnessIndex}"></td>
                <td class="outofdate-td-${witnessIndex}"></td>
            </tr>`

          case WitnessType.FULL_TX:
              let docLink = this.options.getDocUrl(witness['docId'])
              if (docLink !== '') {
                witnessTitle = `<a href="${docLink}" target="_blank" title="Click to open document page in a new tab">
               ${this.ctData['witnessTitles'][witnessIndex]}</a>`
              }
            return  `<tr>
                <td class="${witnessClasses.join(' ')} cte-witness-move-td">
                    <span class="btn move-up-btn" title="Move up">${icons.moveUp}</span>
                    <span class="btn move-down-btn" title="Move down">${icons.moveDown}</span>
                </td>
                <td>${witnessTitle}</td>
                <td class="info-td-${witnessIndex}"></td>
                <td class="timestamp-td-${witnessIndex}">${Util.formatVersionTime(witness['timeStamp'])}</td>
                <td class="siglum-${witnessIndex}">${siglum}</td>
                <td class="warning-td-${witnessIndex}"></td>
                <td class="outofdate-td-${witnessIndex}"></td>
            </tr>`
        }
      }).join('')

   return `<table class="witnesstable">
      <tr>
        <th></th> <!-- Move up/down icons -->
        <th>Witness</th>
        <th></th>  <!-- Info td-->
        <th>Version Used</th>
        <th>Siglum &nbsp;   <a class="tb-button load-sigla-btn" title="Load sigla from preset">${icons.loadPreset}</a>&nbsp;
                        <a class="tb-button save-sigla-btn" title="Save current sigla as preset">${icons.savePreset}</a>
        </th>
        <th></th>  <!-- Warning td-->
        <th></th>  <!-- Out of date td-->
      </tr>
      ${witnessRows}
   </table>`
  }

  genOnConfirmSiglumEdit(witnessIndex) {
    return (ev) => {
      console.log(`Confirming siglum edit`)
      console.log(ev.detail)
      let newText = Util.removeWhiteSpace(ev.detail['newText'])
      let oldText = ev.detail['oldText']
      let editor = ev.detail['editor']
      if (oldText === newText || newText === '') {
        // just reset the editor's text in case the edited text contained whitespace
        editor.setText(this.ctData['sigla'][witnessIndex])
        return false
      }
      console.log('Change in siglum for witness index ' + witnessIndex +  ' to ' + newText)
      if (this.ctData['sigla'].indexOf(newText) !== -1) {
        transientAlert($(this.options.containerSelector + ' .warning-td-' + witnessIndex), '',
          "Given siglum '" + newText + "' already exists, no changes made", 2000, 'slow')
        editor.setText(this.ctData['sigla'][witnessIndex])
      }
      // Change the siglum
      this.ctData['sigla'][witnessIndex] = newText
      this._redrawSiglaGroupSigla()

      this.options.onSiglaChange(this.ctData['sigla'])

    }
  }


}