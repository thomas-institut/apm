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
import { ApparatusSubEntry } from '../Edition/ApparatusSubEntry'
import { SubEntryWitnessInfo } from '../Edition/SubEntryWitnessInfo'
import { EditableTextField } from '../widgets/EditableTextField'

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
// const saveButtonTextClassChanges = 'text-primary'
// const saveButtonTextClassSaving = 'text-warning'
// const saveButtonTextClassError = 'text-danger'



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


    if (this.options.editionId === -1) {
      // create empty MceEdition
      this.editionId = -1
      this.mceData = MceData.createEmpty()
      this.lastSave = ''  // i.e., never
    } else {
      // load Mce Edition
    }

    this.lastSavedMceData = deepCopy(this.mceData)
    this.changes = []

    this.unsavedChanges = false
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
        $('body').html('Error initializing, please report to administrators')
      }
    )
  }

  async _init() {
    await this._init_loadEdition()
    await this._init_setupUi()
    await this._init_saveArea()
    await this._init_titleEdit()
  }

 _init_loadEdition() {
    return new Promise( (resolve, reject) => {
      if (this.options.editionId === -1) {
        // create empty MceEdition
        this.editionId = -1
        this.mceData = MceData.createEmpty()
        resolve()
      } else {
        // load Mce Edition
        reject('Not implemented yet')
      }
    })
 }

 _init_setupUi() {
    // construct panels
   this.editionPanel = new EditionPanel({
     containerSelector:  `#${editionPanelId}`,
     mceData: this.mceData,
     debug: true
   })
   this.chunkSearchPanel = new ChunkSearchPanel({
     containerSelector: `#${chunkSearchPanelId}`,
     mceData: this.mceData,
     userId: this.options.userId,
     addEdition: (id, timestamp) => {
       return this.addSingleChunkEdition(id, timestamp)
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
       logo: `<a href="${this.options.urlGenerator.home()}" title="Home">
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
      })
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
     let lastSaveMsg = 'Never'
     if (this.lastSave !== '') {
       lastSaveMsg = Util.formatVersionTime(this.lastSave)
     }

     this.saveButtonPopoverContent = `Last save: ${lastSaveMsg}`
     this.saveButtonPopoverTitle = '<p>Nothing to save</p>'
     this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
     this.__setButtonEnableStatus(this.saveButton, false)
   } else {
     this.saveButtonPopoverTitle = '<p>Click to save changes</p>'
     this.saveButtonPopoverContent = '<ul>' + this.changes.map( (change) => { return `<li>${change}</li>`}).join('') + '</ul>'
     this.__setButtonEnableStatus(this.saveButton, true)
   }
 }

 detectChanges() {
    if (varsAreEqual(this.lastSavedMceData, this.mceData)) {
      console.log(`No changes`)
      return []
    }
    let changes = []
    if (this.lastSavedMceData.title !== this.mceData.title) {
      changes.push(`Changed title to '${this.mceData.title}'`)
    }
    if (this.lastSavedMceData.chunks.length !== this.mceData.chunks.length) {
      let lastSavedTableIds = this.lastSavedMceData.chunks.map ( (chunk) => { return chunk.chunkEditionTableId})
      this.mceData.chunks.filter( (chunk) => {
        return lastSavedTableIds.indexOf(chunk.chunkEditionTableId) === -1
      }).forEach( (chunk) =>{
        changes.push(`Added chunk ${chunk.chunkId}`)
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

  /**
   * Adds a single chunk edition to the multi chunk edition
   * @param {number}tableId
   * @param {string}timeStamp
   */
  addSingleChunkEdition(tableId, timeStamp) {
    return new Promise ( (resolve, reject) => {
      // first, get the table from the server
      let url = this.options.urlGenerator.apiGetCollationTable(tableId, timeStamp)
      $.get(url).then( (data) => {
        console.log(`Got data from server for table ${tableId}`)
        console.log(data)
        let ctData = data['ctData']
        if (ctData.type !== 'edition') {
          reject(`Table ${tableId} is not an edition`)
          return
        }
        if (ctData.archived)  {
          reject(`Table ${tableId} is archived`)
          return
        }
        // cache doc data
        data['docInfo'].forEach ( (docInfo) => {
          this.cache.store(`DOC-${docInfo['docId']}`, docInfo)
        })
        if (!this.addChunk(tableId, ctData, data['timeStamp'])){
          reject(this.errorDetail)
          return
        }
        this.regenerateEdition().then( () => {resolve()}, (error) => { reject(error)})

      }, (error) => {
        console.log(error)
        if (error.status === 404) {
          reject(`Table not found`)
        }
        reject(`Error getting table: ${error.status}`)
      })
    })
  }

  regenerateEdition() {
    return new Promise( (resolve) => {
      console.log(`Regenerating edition with ${this.editions.length} chunks`)
      if (this.editions.length === 0) {
        console.log(`Nothing to do`)
        resolve()
        return
      }

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
      for (let editionIndex = 0; editionIndex < this.editions.length; editionIndex++) {
        let singleChunkEdition = this.editions[editionIndex]
        currentMainTextIndexShift = nextChunkShift

        // Add main text
        pushArray(this.edition.mainText, singleChunkEdition.mainText.map( (mainTextToken) => {
          let newToken = MainTextTokenFactory.clone(mainTextToken)
          newToken.editionWitnessTokenIndex = mainTextToken.editionWitnessTokenIndex + currentMainTextIndexShift
          return newToken
        }))
        nextChunkShift += singleChunkEdition.mainText.length
        switch(this.mceData.chunks[editionIndex].break) {
          case 'paragraph':
            this.edition.mainText.push( MainTextTokenFactory.createParagraphEnd())
            nextChunkShift++
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
                let newWd = new SubEntryWitnessInfo()
                newWd.setHand(wd.hand)
                newWd.setWitnessIndex(this.mceData.chunks[editionIndex].witnessIndices[wd.witnessIndex])
                return newWd
              })
              return newSubEntry
            })
            return newEntry
          }))
        }
      }

      this.previewPanel.updateData(this.edition)
      resolve()
    })
  }

  addChunk(tableId, ctData, timeStamp) {
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
      this.errorDetail = `Table ${tableId} is of a different language (${ctData['lang']}`
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

    // add new witnesses and sigla
    for (let ctDataWitnessIndex = 0; ctDataWitnessIndex < ctData.witnesses.length; ctDataWitnessIndex++) {
      let ctDataWitnessInfo = ctData.witnesses[ctDataWitnessIndex]
      if (ctDataWitnessInfo.witnessType === 'edition') {
        newChunk.witnessIndices.push(-1)
        continue
      }
      let currentWitnessIndex = -1
      let witnessId = `${ctDataWitnessInfo.witnessType}-${ctDataWitnessInfo.docId}-${ctDataWitnessInfo.localWitnessId}`
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
    this.updateSaveUI()
    return true
  }

  genGetPdfDownloadUrlForPreviewPanel() {
    return PdfDownloadUrl.genGetPdfDownloadUrlForPreviewPanel(this.options.urlGenerator)
  }





}




// Load as global variable so that it can be referenced in the Twig template
window.MceComposer = MceComposer