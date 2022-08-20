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
import { PreviewPanel } from './PreviewPanel'
import * as Util from '../toolbox/Util.mjs'
import { deepCopy } from '../toolbox/Util.mjs'
import { ChunkSearchPanel } from './ChunkSearchPanel'

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

    this.unsavedChanges = false
    $(window).on('beforeunload', () => {
      if (this.unsavedChanges) {
        //console.log("There are changes in editor")
        return false // make the browser ask if the user wants to leave
      }
    })
    document.title = this.mceData.title
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
     debug: true
   })
   this.previewPanel = new PreviewPanel({
     containerSelector:  `#${previewPanelId}`,
     debug: true
   })
   // tab arrays
   let panelOneTabs = [
     TabConfig.createTabConfig(editionPanelId, 'Edition', this.editionPanel),
     TabConfig.createTabConfig(chunkSearchPanelId, 'Chunk Search', this.chunkSearchPanel),
   ]
   let panelTwoTabs = [
     TabConfig.createTabConfig(editionPanelId, 'Preview', this.previewPanel),
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


 _init_saveArea() {
    return new Promise( (resolve) => {
      // save area
      // popover content will be set up by updateSaveUi()
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
      this.updateSaveUi()
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
      this.updateBugUi()
      resolve()
   })

 }

 updateBugUi() {
   if (this.errorDetected) {
     this.bugButton.removeClass('hidden').addClass('blink')
     this.errorButtonPopoverContent = `<p>Software error detected, please make a note of what you were doing and report it to the developers. </p>
<p>${this.errorDetail}</p>`
   } else {
     this.bugButton.removeClass('blink').addClass('hidden')
   }
   this.updateSaveUi()
 }


 updateSaveUi() {
   if (this.errorDetected) {
     this.saveButtonPopoverTitle = 'Saving is disabled'
     this.saveButtonPopoverContent = `<p>Software error detected</p>`
     this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
     this.saveButton
       .prop('disabled', true)
     return
   }

   if (this.mceData['archived']) {
     this.saveButtonPopoverTitle = 'Saving is disabled'
     this.saveButtonPopoverContent = `<p>Edition is archived.</p>`
     this.saveButton
       .prop('disabled', true)
     return
   }

   if (MceData.isEmpty(this.mceData) === 0) {
     this.saveButtonPopoverTitle = 'Nothing to save'
     this.saveButtonPopoverContent = `<p>Edition is empty</p>`
     this.saveButton
       .prop('disabled', true)
     return
   }

   let lastSaveMsg = 'Never'
   if (this.lastSave !== '') {
     lastSaveMsg = Util.formatVersionTime(this.lastSave)
   }

   this.saveButtonPopoverContent = `Last save: ${lastSaveMsg}`
   this.saveButtonPopoverTitle = '<p>Nothing to save</p>'
   this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)

   // TODO: check for changes and enable/disable save button accordingly
   this.saveButton.prop('disabled', true)
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



}


// Load as global variable so that it can be referenced in the Twig template
window.MceComposer = MceComposer