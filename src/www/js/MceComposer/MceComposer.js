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


import { OptionsChecker } from '@thomas-inst/optionschecker'
import { MceData } from '../MceData/MceData.mjs'
import { EditionPanel } from './EditionPanel'
import { TabConfig } from '../MultiPanelUI/TabConfig'
import { MultiPanelUI } from '../MultiPanelUI/MultiPanelUI'
import * as Util from '../toolbox/Util.mjs'
import { deepCopy } from '../toolbox/Util.mjs'
import { ChunkSearchPanel } from './ChunkSearchPanel'
import { KeyCache } from '../toolbox/KeyCache'
import { CtDataEditionGenerator } from '../Edition/EditionGenerator/CtDataEditionGenerator'
import { EditionPreviewPanelNew } from '../EditionComposer/EditionPreviewPanelNew'
import { PdfDownloadUrl } from '../EditionComposer/PdfDownloadUrl'
import { Edition } from '../Edition/Edition.mjs'


import { defaultLanguageDefinition } from '../defaults/languages'
import { EditionWitnessInfo } from '../Edition/EditionWitnessInfo'
import { MainTextTokenFactory } from '../Edition/MainTextTokenFactory.mjs'
import { pushArray, varsAreEqual } from '../toolbox/ArrayUtil.mjs'
import { Apparatus } from '../Edition/Apparatus'
import { ApparatusEntry } from '../Edition/ApparatusEntry.mjs'
import { ApparatusSubEntry } from '../Edition/ApparatusSubEntry.mjs'
import { EditableTextField } from '../widgets/EditableTextField'
import { TimeString } from '../toolbox/TimeString.mjs'
import { BasicProfiler } from '../toolbox/BasicProfiler.mjs'
import { CtData } from '../CtData/CtData'
import { WitnessDataItem } from '../Edition/WitnessDataItem.mjs'
import { SystemStyleSheet } from '../Typesetter2/Style/SystemStyleSheet.mjs'

const defaultIcons = {
  moveUp: '&uarr;',
  moveDown: '&darr;',
  busy: '<i class="fas fa-circle-notch fa-spin"></i>',
  checkOK: '<i class="far fa-check-circle"></i>',
  checkFail: '<i class="fas fa-exclamation-triangle"></i>',
  checkCross: '<i class="fas fa-times"></i>',
  editText: '<small><i class="fas fa-pen"></i></small>',
  editSettings: '<i class="fas fa-cog"></i>',
  confirmEdit: '<i class="fas fa-check"></i>',
  cancelEdit: '<i class="fas fa-times"></i>',
  alert: '<i class="fas fa-exclamation-triangle"></i>',
  savePreset:'<i class="fas fa-save"></i>',
  saveEdition: '<i class="bi bi-cloud-arrow-up"></i>',
  loadPreset: '<i class="fas fa-upload"></i>',
  error: '<i class="bi bi-bug-fill"></i>',
  addEntry: '<i class="bi bi-plus-lg"></i>'
}

const editionPanelId = 'edition-panel'
const chunkSearchPanelId = 'chunk-search-panel'
const previewPanelId = 'preview-panel'
const editionTitleId = 'edition-title-label'
const bugButtonId = 'bug-btn'
const saveButtonId = 'save-btn'

const defaultChunkBreak = 'paragraph'

// save button
const saveButtonTextClassNoChanges = 'text-muted'
const saveButtonTextClassChanges = 'text-primary'
const saveButtonTextClassSaving = 'text-warning'
const saveButtonTextClassError = 'text-danger'


export class MceComposer {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'Mce Composer',
      optionsDefinition: {
        userId: { type: 'number', required: true },
        editionId: { type: 'number', required: true },
        langDef : { type: 'object', default: defaultLanguageDefinition },
        urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true },
      }
    })

    this.options = oc.getCleanOptions(options)
    this.icons = defaultIcons

    this.errorDetected = false
    this.errorDetail = ''

    this.editionId = this.options.editionId

    // create empty MceEdition
    this.mceData = MceData.createEmpty()
    this.lastSave = ''  // i.e., never
    this.lastSavedMceData = deepCopy(this.mceData)
    this.changes = []
    this.chunksToUpdateStatuses = []
    this.unsavedChanges = false
    this.saving = false
    this.saveErrors = false

    $(window).on('beforeunload', () => {
      if (this.unsavedChanges) {
        //console.log("There are changes in editor")
        return false // make the browser ask if the user wants to leave
      }
    })
    document.title = this.mceData.title
    this.edition = new Edition()
    this.edition.setLang('la')  // so that there's a lang definition for it
    this.editions = []

    this.cache = new KeyCache()
    this._init().then(
      () => {
        console.log(`Mce Composer initialized`)
      },
      (error) => {
        console.error(error)
        $('body').append(`<p class="text-danger">Error initializing: ${error}`)
      }
    )
  }

  async _init() {
    await this._init_setupUi()
    await this._init_saveArea()
    await this._init_loadEdition()
    await this._init_titleEdit()
  }

 _init_loadEdition() {
    return new Promise( (resolve, reject) => {
      if (this.editionId === -1) {
        // create empty MceEdition
        this.editionId = -1
        this.editionPanel.showLoadingDataMessage(false)
        this.editionPanel.updateData(this.mceData)
        resolve()
      } else {
        // load Mce Edition
        console.log(`Loading edition ${this.editionId}`)
        this.editionPanel.updateLoadingMessage(`Loading multi-chunk edition`)
        let apiUrl = this.options.urlGenerator.apiGetMultiChunkEdition(this.editionId)
        $.get(apiUrl).then( (data) => {
          console.log(`Got data from server`)
          console.log(data)
          this.mceData = MceData.fix(data.mceData)
          this.lastSavedMceData = deepCopy(this.mceData)
          this.lastSave = data.validFrom
          document.title = this.mceData.title
          this.loadAllSingleChunkEditions().then( () => {
            this.regenerateEdition().then( () => {
              this.previewPanel.updateData(this.edition)
              this.editionPanel.updateData(this.mceData)
              this.chunkSearchPanel.updateData(this.mceData)
              this.updateSaveUI()
              resolve()
            }, (error) => {
              console.error(error)
              reject(`Cannot regenerate edition from data`)
            })
          })
        }, (error) => {
          console.error(error)
          reject(`Cannot load edition`)
        })
      }
    })
 }

 _init_setupUi() {
    // construct panels
   this.editionPanel = new EditionPanel({
     containerSelector:  `#${editionPanelId}`,
     mceData: this.mceData,
     urlGenerator: this.options.urlGenerator,
     getUpdateStatuses: this._genGetUpdateStatuses(),
     updateChunk: (chunkIndex) => { return this.chunkUpdate(chunkIndex)},
     deleteChunk: (chunkIndex)=> { return this.chunkDelete(chunkIndex)},
     updateChunkOrder: (newOrder) => { return this.updateChunkOrder(newOrder)},
     updateSigla: (newSigla) => { return this.updateSigla(newSigla)},
     updateSiglaGroups:  (newSiglaGroups) => { return this.updateSiglaGroups(newSiglaGroups, 'editionPanel')},
     updateChunkBreak:  (chunkIndex, newBreak) => { return this.updateChunkBreak(chunkIndex, newBreak, 'editionPanel')},
     debug: true
   })
   this.chunkSearchPanel = new ChunkSearchPanel({
     containerSelector: `#${chunkSearchPanelId}`,
     mceData: this.mceData,
     userId: this.options.userId,
     urlGenerator: this.options.urlGenerator,
     addEdition: (id, timestamp) => {
       return this.chunkAdd(id, timestamp)
     },
     debug: true
   })
   this.previewPanel = new EditionPreviewPanelNew({
     containerSelector: `#${previewPanelId}`,
     // ctData: this.ctData,
     edition: this.edition,
     langDef: this.options.langDef,
     getPdfDownloadUrl: this.genGetPdfDownloadUrlForPreviewPanel(),
     debug: true
   })
   // this.previewPanel = new PreviewPanel({
   //   containerSelector:  `#${previewPanelId}`,
   //   debug: true
   // })
   // tab arrays
   let panelOneTabs = [
     TabConfig.createTabConfig(editionPanelId, 'Edition', this.editionPanel),
     TabConfig.createTabConfig(chunkSearchPanelId, 'Chunk Search', this.chunkSearchPanel),
   ]
   let panelTwoTabs = [
     TabConfig.createTabConfig(previewPanelId, 'Preview', this.previewPanel),
   ]

   this.multiPanelUI = new MultiPanelUI({
       logo: `<a href="${this.options.urlGenerator.siteHome()}" title="Home">
<img src="${this.options.urlGenerator.images()}/apm-logo-plain.svg" height="40px" alt="logo"/></a>`,
       topBarContent: () => {
         return `<div class="top-bar-item top-bar-title" id="${editionTitleId}">${this.mceData.title}</div>`
       },
       topBarRightAreaContent: () => {
         return `<div class="toolbar-group"><button class="top-bar-button text-danger" id="${bugButtonId}">${this.icons.error}</button>
<button class="top-bar-button" id="${saveButtonId}">${this.icons.saveEdition}</button></div>`
       },
       icons: {
         closePanel: '&times;',
         horizontalMode: `<img src="${this.options.urlGenerator.images()}/horizontal-mode.svg" alt="Horizontal Mode"/>`,
         verticalMode: `<img src="${this.options.urlGenerator.images()}/vertical-mode.svg" alt="Vertical Mode"/>`
       },
       panels: [
         {
           id: 'panel-one',
           type: 'tabs',
           tabs: panelOneTabs
         },
         {
           id: 'panel-two',
           type: 'tabs',
           tabs: panelTwoTabs
         }
       ]
     }
   )
   return this.multiPanelUI.start()
 }

 _init_titleEdit() {
   //  Edition title
   this.titleField = new EditableTextField({
     containerSelector: `#${editionTitleId}`,
     initialText: this.mceData.title,
     editIcon: '<i class="bi bi-pencil"></i>',
     confirmIcon: '<i class="bi bi-check"></i>',
     cancelIcon: '<i class="bi bi-x"></i>',
     onConfirm: this.__genOnConfirmTitleField()
   })

 }

  _genGetUpdateStatuses() {
    return (force) => {
      return new Promise( (resolve) => {
        if (force) {
          // here we should actually load data from the server
          console.log(`Can't force right now`)
        }
        console.log(`Update statuses`)
        console.log(this.chunksToUpdateStatuses)
        resolve(this.chunksToUpdateStatuses)
      })
    }
  }

  __genOnConfirmTitleField() {

    return  (data) => {
      //console.log('confirm title field')
      //console.log(data.detail)
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = this.normalizeTitleString(data.detail.newText)
        if (normalizedNewTitle === '') {
          console.debug('Empty new title')
          this.titleField.setText(this.mceData.title)
          return false
        }
        console.debug('New title: ' + normalizedNewTitle)
        this.mceData.title = normalizedNewTitle
        this.titleField.setText(normalizedNewTitle)
        document.title = this.mceData.title
        this.updateSaveUI()
        return true
      }
      return false
    }
  }

  normalizeTitleString(title) {
    return title.replace(/^\s*/, '').replace(/\s*$/, '')
  }



 _init_saveArea() {
    return new Promise( (resolve) => {
      // save area
      // popover content will be set up by updateSaveUI()
      this.saveButtonPopoverContent = 'TBD'
      this.saveButtonPopoverTitle = 'TBD'

      this.saveButton = $(`#${saveButtonId}`)
      this.saveButton.popover({
        trigger: 'hover',
        placement: 'left',
        html: true,
        title: () => { return this.saveButtonPopoverTitle},
        content: () => { return this.saveButtonPopoverContent}
      }).on('click', this._genOnClickSaveButton())

      this.updateSaveUI()
      //this.saveButton.on('click', thisObject.genOnClickSaveButton())

      // error
      this.bugButton = $(`#${bugButtonId}`)
      this.errorButtonPopoverContent = 'TBD'
      this.errorButtonPopoverTitle = 'Error'
      this.bugButton.popover({
        trigger: 'hover',
        placement: 'left',
        html: true,
        title: () => { return this.errorButtonPopoverTitle},
        content: () => { return this.errorButtonPopoverContent}
      })
      this.updateBugUI()
      resolve()
   })
 }

 _genOnClickSaveButton() {
    return () => {
      if (this.saving) {
        console.log(`Click on save button while saving!`)
        return
      }
      let changes = this.detectChanges()
      if (changes.length === 0) {
        console.log(`Click on save button without changes to save`)
        return
      }

      this.saving = true
      let url = this.options.urlGenerator.apiSaveMultiChunkEdition()
      let description = changes.join('. ')
      this.saveButton.popover('hide')
      this.saveButton.html(this.icons.busy)
      this.saveButtonPopoverContent = 'Saving...'
      this.saveButtonPopoverTitle = ''
      this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassSaving)
      console.log(`Saving edition with id ${this.editionId} with API call to ${url}`)
      let apiCallOptions = {
        editionId: this.editionId,
        mceData: this.mceData,
        description: description,
      }
      $.post(
        url,
        {data: JSON.stringify(apiCallOptions)}
      ).done(  (apiResponse) => {
        console.log(`Success saving edition, id is ${apiResponse.id}`)
        console.log(apiResponse)
        if (this.editionId === -1) {
          // redirect to new edition's page
          this.unsavedChanges = false
          window.location.href = this.options.urlGenerator.siteEditMultiChunkEdition(apiResponse.id)
        } else {
          this.saveButton.html(this.icons.saveEdition)
          this.lastSavedMceData = Util.deepCopy(this.mceData)
          this.lastSave = apiResponse['saveTimeStamp']
          this.unsavedChanges = false
          this.updateSaveUI()
          this.saving = false
          this.saveErrors = false
        }
      }).fail((resp) => {
        this.saveErrors = true
        this.saving = false
        this.saveButton.html(this.icons.saveEdition)
        console.error("Could not save table")
        console.log(resp)
        this.updateSaveUI()
      })
    }
 }

 updateBugUI() {
   if (this.errorDetected) {
     this.bugButton.removeClass('hidden').addClass('blink')
     this.errorButtonPopoverContent = `<p>Software error detected, please make a note of what you were doing and report it to the developers. </p>
<p>${this.errorDetail}</p>`
   } else {
     this.bugButton.removeClass('blink').addClass('hidden')
   }
   this.updateSaveUI()
 }


 __setButtonEnableStatus(btn, enable) {
    if (enable) {
      btn.prop('disabled', false).addClass('text-primary')
    } else {
      btn.prop('disabled', true).removeClass('text-primary')
    }
 }

 updateSaveUI() {
   if (this.errorDetected) {
     this.saveButtonPopoverTitle = 'Saving is disabled'
     this.saveButtonPopoverContent = `<p>Software error detected</p>`
     this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
     this.__setButtonEnableStatus(this.saveButton, false)
     return
   }

   if (this.mceData['archived']) {
     this.saveButtonPopoverTitle = 'Saving is disabled'
     this.saveButtonPopoverContent = `<p>Edition is archived.</p>`
     this.__setButtonEnableStatus(this.saveButton, false)
     return
   }

   if (MceData.isEmpty(this.mceData)) {
     this.saveButtonPopoverTitle = 'Nothing to save'
     this.saveButtonPopoverContent = `<p>Edition is empty</p>`
     this.__setButtonEnableStatus(this.saveButton, false)
     return
   }
   this.changes = this.detectChanges()
   if (this.changes.length === 0) {
     this.unsavedChanges = false
     let lastSaveMsg = 'Never'
     if (this.lastSave !== '') {
       lastSaveMsg = Util.formatVersionTime(this.lastSave)
     }

     this.saveButtonPopoverContent = `Last save: ${lastSaveMsg}`
     this.saveButtonPopoverTitle = '<p>Nothing to save</p>'
     this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
     this.__setButtonEnableStatus(this.saveButton, false)
   } else {
     this.unsavedChanges = true
     this.saveButtonPopoverTitle = '<p>Click to save changes</p>'
     if (this.saveErrors) {
       this.saveButtonPopoverContent += `<p class="text-danger">Edition could not be saved, please try again</p>`
       this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassError)
       this.__setButtonEnableStatus(this.saveButton, true)
     } else {
       this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassChanges)
       this.saveButtonPopoverContent = '<ul>' + this.changes.map( (change) => { return `<li>${change}</li>`}).join('') + '</ul>'
       this.__setButtonEnableStatus(this.saveButton, true)
     }
   }
 }

 detectChanges() {
   if (varsAreEqual(this.lastSavedMceData, this.mceData)) {
     console.log(`No changes`)
     return []
   }
   let changes = []

   // change in title
   if (this.lastSavedMceData.title !== this.mceData.title) {
     changes.push(`Changed title to '${this.mceData.title}'`)
   }

   // sigla changes
   if (!varsAreEqual(this.lastSavedMceData.sigla, this.mceData.sigla)) {
     changes.push(`Changes in sigla`)
   }

   // sigla groups changes
   if (!varsAreEqual(this.lastSavedMceData.siglaGroups, this.mceData.siglaGroups)) {
     changes.push(`Changes in sigla groups`)
   }

   // change in chunk order
   if (!varsAreEqual(this.lastSavedMceData.chunkOrder, this.mceData.chunkOrder)) {
     changes.push(`Chunk order changed`)
   }

   // changes in chunks
   if (this.lastSavedMceData.chunks.length !== this.mceData.chunks.length) {
     let lastSavedTableIds = this.lastSavedMceData.chunks.map ( (chunk) => { return chunk.chunkEditionTableId})
     let currentTableIds = this.mceData.chunks.map ( (chunk) => { return chunk.chunkEditionTableId})
     this.mceData.chunks.filter( (chunk) => {
       return lastSavedTableIds.indexOf(chunk.chunkEditionTableId) === -1
     }).forEach( (chunk) =>{
       changes.push(`Added chunk ${chunk.chunkId}`)
     })
     this.lastSavedMceData.chunks.filter( (chunk) => {
       return currentTableIds.indexOf(chunk.chunkEditionTableId) === -1
     }).forEach( (chunk) =>{
       changes.push(`Deleted chunk ${chunk.chunkId}`)
     })
   } else {
     // same number of chunks
     this.mceData.chunks.forEach( (chunk, chunkIndex) => {
       let lastSavedChunk = this.lastSavedMceData.chunks[chunkIndex]
       if (!varsAreEqual(chunk, lastSavedChunk)) {
         changes.push(`Changes to ${chunk.chunkId}`)
       }
     })
   }

   return changes
 }

  /**
   * Changes the 'text-xxx' class to the new class, removing all others
   * @param element
   * @param newClass
   * @private
   */
  _changeBootstrapTextClass(element, newClass) {
    let allClasses = 'text-primary text-secondary text-success text-danger text-warning text-info text-light text-dark text-body text-muted text-white text-black-50 text-white-50'
    element.removeClass(allClasses).addClass(newClass)
  }

  chunkDelete(chunkIndex) {
    return new Promise( (resolve, reject) => {
      if (this.mceData.chunks.length === 0) {
        console.warn(`Attempt to delete chunks from empty edition`)
        resolve()
        return
      }
      if (this.mceData.chunks.length === 1) {
        reject(`Deleting the only chunk in the edition is not permitted`)
        return
      }
      if (chunkIndex >= this.mceData.chunks.length || chunkIndex < 0) {
        console.warn(`Chunk delete on out of range index ${chunkIndex}`)
        resolve()
        return
      }
      console.log(`Deleting chunk ${chunkIndex}`)
      let removedChunk = this.mceData.chunks.splice(chunkIndex, 1)
      this.editions.splice(chunkIndex, 1)
      this.chunksToUpdateStatuses.splice(chunkIndex, 1)

      this.mceData.chunkOrder = this.mceData.chunkOrder.map ( (index)=> {
        if (index === chunkIndex) {
          return -1
        }
        if (index > chunkIndex) {
          return index-1
        }
        return index
      }).filter( (index) => { return index !== -1})

      // TODO: handle witnesses and sigla

      console.log(`New MceData`)
      console.log(this.mceData)
      this.editionPanel.updateData(this.mceData)
      this.chunkSearchPanel.updateData(this.mceData)
      this.updateSaveUI()
      this.regenerateEdition().then( () => {
        this.previewPanel.updateData(this.edition)
        resolve()
      }, (error) => { reject(error)})
    })
  }

  chunkUpdate(chunkIndex) {
    return new Promise((resolve, reject) => {
      let tableId = this.mceData.chunks[chunkIndex].chunkEditionTableId
      this.getSingleChunkDataFromServer(tableId, '').then( (data) => {
        let ctData = data['ctData']
        if (ctData.archived)  {
          reject(`Table ${tableId} is now archived`)
          return
        }

        this.mceData.chunks[chunkIndex].version = data['timeStamp']
        this.mceData.chunks[chunkIndex].title = ctData['title']
        this.chunksToUpdateStatuses[chunkIndex] = false

        // TODO: deal with changes in witnesses

        let eg = new CtDataEditionGenerator({ ctData: ctData})
        let edition
        try {
          edition = eg.generateEdition()
        } catch (e) {
          console.error(`Error generating edition`)
          console.error(e)
          this.errorDetail = `Error generating edition for table id ${tableId}, chunk ${ctData.chunkId}`
          return
        }
        console.log(`Generated edition for table ${tableId}, chunk ${ctData.chunkId}`)
        console.log(edition)
        this.editions[chunkIndex] = edition
        this.editionPanel.updateData(this.mceData)
        this.chunkSearchPanel.updateData(this.mceData)
        this.updateSaveUI()
        this.regenerateEdition().then( () => {
          this.previewPanel.updateData(this.edition)
          resolve()
        }, (error) => { reject(error)})

      }, (error) => { reject(error)})
    })
  }

  /**
   * Adds a single chunk edition to the multi chunk edition
   * @param {number}tableId
   * @param {string}timeStamp
   */
  chunkAdd(tableId, timeStamp) {
    return new Promise ( (resolve, reject) => {
      // first, get the table from the server
      this.getSingleChunkDataFromServer(tableId, timeStamp).then( (data) => {
        let ctData = data['ctData']
        if (ctData.type !== 'edition') {
          reject(`Table ${tableId} is not an edition`)
          return
        }
        if (ctData.archived)  {
          reject(`Table ${tableId} is archived`)
          return
        }
        if (!this.addChunkToMceData(tableId, ctData, data['timeStamp'])){
          reject(this.errorDetail)
          return
        }

        this.regenerateEdition().then( () => {
          this.previewPanel.updateData(this.edition)
          resolve()
        }, (error) => { reject(error)})

      }, (error) => {
        console.log(error)
        if (error.status === 404) {
          reject(`Table not found`)
        }
        reject(`Error getting table: ${error.status}`)
      })
    })
  }

  updateChunkOrder(newOrder) {
    return new Promise( (resolve, reject) => {
      this.mceData.chunkOrder = newOrder
      this.editionPanel.updateData(this.mceData)
      this.updateSaveUI()
      this.regenerateEdition().then( () => {
        this.previewPanel.updateData(this.edition)
        resolve()
      }, (error) => { reject(error)})
    })
  }

  updateSigla(newSigla) {
    return new Promise( (resolve, reject) => {
      this.mceData.sigla = newSigla
      this.editionPanel.updateData(this.mceData)
      this.updateSaveUI()
      this.regenerateEdition().then( () => {
        this.previewPanel.updateData(this.edition)
        resolve()
      }, (error) => { reject(error)})
    })
  }

  updateChunkBreak(chunkIndex, newBreak, source) {
    return new Promise ( (resolve, reject) => {
      this.mceData.chunks[chunkIndex].break = newBreak
      if (source !== 'editionPanel') {
        this.editionPanel.updateData(this.mceData)
      }
      this.updateSaveUI()
      this.regenerateEdition().then( () => {
        this.previewPanel.updateData(this.edition)
        resolve()
      }, (error) => { reject(error)})
    })
  }

  updateSiglaGroups(newSiglaGroups, source ) {
    return new Promise( (resolve, reject) => {
      this.mceData.siglaGroups = newSiglaGroups
      if (source !== 'editionPanel') {
        this.editionPanel.updateData(this.mceData)
      }
      this.updateSaveUI()
      this.regenerateEdition().then( () => {
        this.previewPanel.updateData(this.edition)
        resolve()
      }, (error) => { reject(error)})
    })
  }

  getSingleChunkDataFromServer(tableId, timeStamp = '', useCache = true) {
    return new Promise( (resolve, reject) => {
      let cacheKey = `SERVER-CHUNK-DATA-${tableId}-${timeStamp}`
      if (useCache) {
        let cachedData = this.cache.retrieve(cacheKey)
        if (cachedData !== null) {
          resolve(cachedData)
        }
      }
      // really get from server
      let url = this.options.urlGenerator.apiGetCollationTable(tableId, TimeString.compactEncode(timeStamp))
      $.get(url).then( (data) => {
        console.log(`Got data from server for table ${tableId}, timeStamp '${timeStamp}'`)
        console.log(data)
        data.ctData = CtData.getCleanAndUpdatedCtData(data.ctData)
        // cache doc info
        data['docInfo'].forEach ( (docInfo) => {
          this.cache.store(`DOC-${docInfo['docId']}`, docInfo)
        })
        // cache data
        cacheKey = `SERVER-CHUNK-DATA-${tableId}-${data['timeStamp']}`
        this.cache.store(cacheKey, data)
        resolve(data)
      },
        (error) => { reject(error)})
    })
  }

  async loadAllSingleChunkEditions() {
    let numEditions = this.mceData.chunks.length
    for (let i = 0; i < numEditions; i++) {
      this.editionPanel.updateLoadingMessage(`Loading chunk edition ${i+1} of ${numEditions}`)
      let chunk = this.mceData.chunks[i]
      let data = await this.getSingleChunkDataFromServer(chunk.chunkEditionTableId, chunk.version )
      this.chunksToUpdateStatuses[i] = !data['isLatestVersion']
      let eg = new CtDataEditionGenerator({ ctData: data['ctData']})
      let edition
      try {
        edition = eg.generateEdition()
      } catch (e) {
        console.error(`Error generating edition`)
        console.error(e)
        this.errorDetail = `Error generating edition for table id ${chunk.chunkEditionTableId}, chunk ${chunk.chunkId}`
        return
      }
      this.editions.push(edition)
    }
  }

  regenerateEdition() {
    return new Promise( (resolve) => {
      console.log(`Regenerating edition with ${this.editions.length} chunks`)
      if (this.editions.length === 0) {
        console.log(`Nothing to do`)
        resolve()
        return
      }

      let profiler = new BasicProfiler('RegenerateEdition', true)

      this.edition = new Edition()
      this.edition.info = {
        singleChunk: false,
        source: 'multiChunk',
        chunkId: '',
        baseWitnessIndex: 0
      }
      this.edition.infoText = `Multi chunk edition`
      this.edition.lang = this.editions[0].lang
      this.edition.siglaGroups = this.mceData.siglaGroups
      this.edition.witnesses = this.mceData.witnesses.map( (w, i) => {
        return (new EditionWitnessInfo()).setSiglum( this.mceData.sigla[i]).setTitle(w.title)
      })
      // merge main text
      let currentMainTextIndexShift = 0
      let nextChunkShift = 0
      for (let chunkOrderIndex = 0; chunkOrderIndex < this.mceData.chunkOrder.length; chunkOrderIndex++) {
        let chunkIndex = this.mceData.chunkOrder[chunkOrderIndex]
        let singleChunkEdition = this.editions[chunkIndex]
        currentMainTextIndexShift = nextChunkShift

        // Add main text
        pushArray(this.edition.mainText, singleChunkEdition.mainText.map( (mainTextToken) => {
          let newToken = MainTextTokenFactory.clone(mainTextToken)
          newToken.editionWitnessTokenIndex = mainTextToken.editionWitnessTokenIndex + currentMainTextIndexShift
          return newToken
        }))
        nextChunkShift += singleChunkEdition.mainText.length
        switch(this.mceData.chunks[chunkIndex].break) {
          case 'paragraph':
            if (chunkOrderIndex !== this.mceData.chunkOrder.length -1) {
              // add a paragraph mark if not the last chunk
              this.edition.mainText.push( MainTextTokenFactory.createParagraphEnd())
              nextChunkShift++
            }
            break


          case '':
            if (chunkOrderIndex !== this.mceData.chunkOrder.length -1) {
              // add a paragraph mark if not the last chunk
              this.edition.mainText.push( MainTextTokenFactory.createNormalGlue())
              nextChunkShift++
            }
            break

          case 'page':
            // TODO: implement page break
            break

          case 'section':
            // TODO: implement section break
            break


          default:
            // nothing to do!
        }
        // process apparatuses
        for (let appIndex = 0; appIndex < singleChunkEdition.apparatuses.length; appIndex++) {
          let app = singleChunkEdition.apparatuses[appIndex]
          let currentApp
          if (this.edition.apparatuses[appIndex] === undefined) {
            currentApp = new Apparatus()
            currentApp.type = app.type
            this.edition.apparatuses.push(currentApp)
          } else {
            currentApp = this.edition.apparatuses[appIndex]
          }
          // process entries
          pushArray(currentApp.entries, app.entries.map( (entry) => {
            let newEntry = new ApparatusEntry()
            newEntry.from = entry.from + currentMainTextIndexShift
            newEntry.to = entry.to + currentMainTextIndexShift
            newEntry.lemma = entry.lemma
            newEntry.lemmaText = entry.lemmaText
            newEntry.postLemma = entry.postLemma
            newEntry.preLemma = entry.preLemma
            newEntry.separator = entry.separator
            newEntry.subEntries = entry.subEntries.map( (subEntry) => {
              let newSubEntry = new ApparatusSubEntry()
              newSubEntry.enabled = subEntry.enabled
              newSubEntry.fmtText = subEntry.fmtText
              newSubEntry.source = subEntry.source
              newSubEntry.type = subEntry.type
              newSubEntry.witnessData = subEntry.witnessData.map ( (wd) => {
                let newWd = new WitnessDataItem()
                newWd.setHand(wd.hand)
                newWd.setWitnessIndex(this.mceData.chunks[chunkIndex].witnessIndices[wd.witnessIndex])
                return newWd
              })
              return newSubEntry
            })
            return newEntry
          }))
        }
      }

      profiler.stop()
      resolve()
    })
  }

  addChunkToMceData(tableId, ctData, timeStamp) {
    // first, see if the exact chunk edition is already in
    for (let chunkIndex = 0; chunkIndex < this.mceData.chunks.length; chunkIndex++) {
      let chunk = this.mceData.chunks[chunkIndex]
      if (chunk.chunkEditionTableId === tableId && chunk.version === timeStamp) {
        this.errorDetail = `Table ${tableId} already included`
        return false
      }
    }

    // new chunk, check if it's the same language
    if (this.mceData.chunks.length !== 0 && this.mceData.lang !== ctData['lang']) {
      this.errorDetail = `Wrong language (${ctData['lang']})`
      return false
    }

    // create new chunk
    if (this.mceData.chunks.length === 0) {
      // the first chunk in the edition
      this.mceData.lang = ctData.lang
    }

    let newChunk =  {
      chunkId: ctData.chunkId,
      chunkEditionTableId: tableId,
      version: timeStamp,
      break: defaultChunkBreak,
      lineNumbersRestart: false,
      witnessIndices: [],
      title: ctData.title
    }
    this.mceData.chunks.push(newChunk)

    // add it to the end of the list
    this.mceData.chunkOrder.push(this.mceData.chunks.length -1)

    // add new witnesses and sigla
    for (let ctDataWitnessIndex = 0; ctDataWitnessIndex < ctData.witnesses.length; ctDataWitnessIndex++) {
      let ctDataWitnessInfo = ctData.witnesses[ctDataWitnessIndex]
      if (ctDataWitnessInfo['witnessType'] === 'edition') {
        newChunk.witnessIndices.push(-1)
        continue
      }
      let currentWitnessIndex = -1
      let witnessId = `${ctDataWitnessInfo['witnessType']}-${ctDataWitnessInfo.docId}-${ctDataWitnessInfo.localWitnessId}`
      for (let cwIndex = 0; cwIndex < this.mceData.witnesses.length; cwIndex++) {
        let mceWitness = this.mceData.witnesses[cwIndex]
        if (witnessId === mceWitness.witnessId) {
          currentWitnessIndex = cwIndex
          break
        }
      }
      if (currentWitnessIndex === -1) {
        // new witness
        let docInfo = this.cache.retrieve(`DOC-${ctDataWitnessInfo.docId}`)
        let title = `Doc ${ctDataWitnessInfo.docId}`
        if (docInfo !== null) {
          title = docInfo.title
        }
        this.mceData.witnesses.push( {
          witnessId: witnessId,
          docId: ctDataWitnessInfo.docId,
          localWitnessId: ctDataWitnessInfo.localWitnessId,
          title: title
        })
        currentWitnessIndex = this.mceData.witnesses.length-1
        newChunk.witnessIndices.push(currentWitnessIndex)
        // add new siglum
        let newWitnessSiglum = ctData.sigla[ctDataWitnessIndex]
        if (this.mceData.sigla.indexOf(newWitnessSiglum) !== -1) {
          // siglum already exists, just create a new one
          this.mceData.sigla.push(`W${currentWitnessIndex}`)
        } else {
          this.mceData.sigla.push(newWitnessSiglum)
        }
      } else {
        // witness already exists
        newChunk.witnessIndices.push(currentWitnessIndex)
      }
    }
    console.log(`MceData updated`)
    console.log(this.mceData)

    // assume this is the last version
    this.chunksToUpdateStatuses.push(false)

    let eg = new CtDataEditionGenerator({ ctData: ctData})
    let edition
    try {
      edition = eg.generateEdition()
    } catch (e) {
      console.error(`Error generating edition`)
      console.error(e)
      this.errorDetail = `Error generating edition for table id ${tableId}, chunk ${ctData.chunkId}`
      return
    }
    console.log(`Generated edition for table ${tableId}, chunk ${ctData.chunkId}`)
    console.log(edition)
    this.editions.push(edition)
    this.editionPanel.updateData(this.mceData)
    this.chunkSearchPanel.updateData(this.mceData)
    this.updateSaveUI()
    return true
  }

  genGetPdfDownloadUrlForPreviewPanel() {
    return PdfDownloadUrl.genGetPdfDownloadUrlForPreviewPanel(this.options.urlGenerator)
  }








}




// Load as global variable so that it can be referenced in the Twig template
window.MceComposer = MceComposer