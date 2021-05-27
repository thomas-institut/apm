/*
 *  Copyright (C) 2019-21 Universität zu Köln
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

import { defaultLanguageDefinition } from '../defaults/languages'

// widgets
import { EditableTextField } from '../widgets/EditableTextField'

// utilities
import * as Util from '../toolbox/Util.mjs'
import {OptionsChecker} from '@thomas-inst/optionschecker'

// Normalizations

import { NormalizerRegister } from '../NormalizerRegister'
import { ToLowerCaseNormalizer } from '../normalizers/ToLowerCaseNormalizer'
import { IgnoreArabicVocalizationNormalizer } from '../normalizers/IgnoreArabicVocalizationNormalizer'
import { IgnoreShaddaNormalizer } from '../normalizers/IgnoreShaddaNormalizer'
import { RemoveHamzahMaddahFromAlifWawYahNormalizer } from '../normalizers/RemoveHamzahMaddahFromAlifWawYahNormalizer'
import { IgnoreTatwilNormalizer } from '../normalizers/IgnoreTatwilNormalizer'
import { IgnoreIsolatedHamzaNormalizer } from '../normalizers/IgnoreIsolatedHamzaNormalizer'
import { MultiPanelUI } from '../multi-panel-ui/MultiPanelUI'
import { WitnessInfoPanel } from './WitnessInfoPanel'
import { CollationTablePanel } from './CollationTablePanel'
import { AdminPanel } from './AdminPanel'
import { EditionPreviewPanel } from './EditionPreviewPanel'
import { EditionPanel } from './EditionPanel'
import { CtDataCleaner } from './CtDataCleaner'
import { CriticalApparatusGenerator } from '../CriticalApparatusGenerator'


// CONSTANTS

// tab ids
const editionTitleId = 'edition-title'
const collationTableTabId = 'collation-table'
const editionTabId = 'edition'
const editionPreviewTabId = 'edition-preview'
const witnessInfoTabId = 'witness-info'
const adminPanelTabId = 'admin'


export class EditionComposer {

  constructor(options) {
    console.log(`Initializing Edition Composer`)

    let optionsDefinition = {
      userId: { type:'NonZeroNumber', required: true},
      collationTableData : { type: 'object', required: true},
      workId : { type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      tableId: { type: 'NonZeroNumber', required: true},
      langDef : { type: 'object', default: defaultLanguageDefinition },
      availableWitnesses: { type: 'Array', default: [] },
      urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      workInfo: { type: 'object', default: {} },
      peopleInfo: { type: 'object', default: {} },
      docInfo: { type: 'object', default: {} },
      versionInfo: { type: 'object', default: {}}
    }

    let oc = new OptionsChecker(optionsDefinition, "EditionComposer")
    this.options = oc.getCleanOptions(options)

    // icons
    this.icons = {
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
      loadPreset: '<i class="fas fa-upload"></i>'
    }

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    let ctDataCleaner = new CtDataCleaner()
    this.ctData = ctDataCleaner.getCleanCollationData(this.options['collationTableData'])

    // Normalizers
    this.normalizerRegister = new NormalizerRegister()
    this.registerStandardNormalizers()
    this.availableNormalizers = this.normalizerRegister.getRegisteredNormalizers()

    this.lastSavedCtData = Util.deepCopy(this.ctData)
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo

    // initialize the automatic apparatus
    let apparatusGenerator = new CriticalApparatusGenerator()
    this.criticalApparatus = apparatusGenerator.generateCriticalApparatus(this.ctData, this.ctData['witnessOrder'][0])

    document.title = `${this.ctData.title} (${this.ctData['chunkId']})`

    let thisObject = this

    this.convertingToEdition = false
    $(window).on('beforeunload', function() {
      if (thisObject.unsavedChanges || thisObject.convertingToEdition) {
        //console.log("There are changes in editor")
        return false // make the browser ask if the user wants to leave
      }
    })

    // Construct panels
    this.collationTablePanel = new CollationTablePanel({})
    this.witnessInfoPanel = new WitnessInfoPanel({})
    this.adminPanel = new AdminPanel({
      versionInfo: this.versionInfo,
      peopleInfo: this.options.peopleInfo,
      ctType: this.ctData['type'],
      archived: this.ctData['archived'],
      canArchive: true,
      onConfirmArchive: this.genOnConfirmArchive()
    })

    this.editionPreviewPanel = new EditionPreviewPanel({
      containerSelector: `#${editionPreviewTabId}`,
      ctData: this.ctData,
      apparatus: this.criticalApparatus,
      langDef: this.options.langDef
    })
    this.editionPanel = new EditionPanel({})

    this.multiPanelUI = new MultiPanelUI({
        logo: `<img src="${this.options.urlGenerator.images()}/apm-logo-plain.svg" height="40px" alt="logo"/>`,
        topBarContent: () => {
          return `<div class="top-bar-item top-bar-title" id="${editionTitleId}">Multi-panel User Interface</div>${thisObject.genCtInfoDiv()}`
        },
        topBarRightAreaContent: () => {
          return `<div class="toolbar-group"><button class="top-bar-button" id="save-button">${this.icons.saveEdition}</button></div>`
        },
        panels: [
          {
            id: 'panel-one',
            type: 'tabs',
            tabs: [
              {
                id: collationTableTabId,
                title: 'Collation Table',
                content: () => { return thisObject.collationTablePanel.generateHtml() },
                contentClasses: this.collationTablePanel.getContentClasses(),
                onResize: () => { thisObject.collationTablePanel.onResize()},
                postRender: () => { thisObject.collationTablePanel.postRender() }
              },
              {
                id: editionTabId,
                title: 'Edition',
                content: () => { return thisObject.editionPanel.generateHtml() },
                contentClasses: this.editionPanel.getContentClasses(),
                onResize: () => { thisObject.editionPanel.onResize()},
                postRender: () => { thisObject.editionPanel.postRender() }
              },
              {
                id: witnessInfoTabId,
                title: 'Witness Info',
                content: () => { return thisObject.witnessInfoPanel.generateHtml()},
                contentClasses: this.witnessInfoPanel.getContentClasses(),
                onResize: () => { thisObject.witnessInfoPanel.onResize()},
                postRender: () => { thisObject.witnessInfoPanel.postRender() }
              },
            ]
          },
          {
            id: 'panel-two',
            type: 'tabs',
            tabs: [
              {
                id: editionPreviewTabId,
                title: 'Edition Preview',
                content: () => { return thisObject.editionPreviewPanel.generateHtml() },
                contentClasses: this.editionPreviewPanel.getContentClasses(),
                onResize: () => { thisObject.editionPreviewPanel.onResize()},
                postRender: () => { thisObject.editionPreviewPanel.postRender() }
              },
              {
                id: adminPanelTabId,
                title: 'Admin',
                content: () => { return thisObject.adminPanel.generateHtml() },
                contentClasses: this.adminPanel.getContentClasses(),
                onResize: () => { thisObject.adminPanel.onResize()},
                postRender: () => { thisObject.adminPanel.postRender() }
              },
            ]
          }
        ]
      }
    )
    this.multiPanelUI.start().then( () => {
      //  Edition title
      thisObject.titleField = new EditableTextField({
        containerSelector: '#edition-title',
        initialText: this.ctData.title,
        editIcon: '<i class="bi bi-pencil"></i>',
        confirmIcon: '<i class="bi bi-check"></i>',
        cancelIcon: '<i class="bi bi-x"></i>',
        onConfirm: this.genOnConfirmTitleField()
      })

      // save area
      thisObject.saveButtonPopoverContent = 'TBD'
      thisObject.saveButtonPopoverTitle = 'TBD'
      thisObject.saveButton = $('#save-button')
      thisObject.saveButton.popover({
        trigger: 'hover',
        placement: 'left',
        html: true,
        title: () => { return thisObject.saveButtonPopoverTitle},
        content: () => { return thisObject.saveButtonPopoverContent}
      })
      thisObject.updateSaveArea()
    })
  }



  registerStandardNormalizers() {
    switch (this.ctData.lang) {
      case 'la':
        this.normalizerRegister.registerNormalizer(
          'toLowerCase',
          new ToLowerCaseNormalizer(),
          {
            lang: 'la',
            label: 'Ignore Letter Case',
            help: "E.g., 'Et' and 'et' will be taken to be the same word"
          }
        )
        break

      case 'ar':
        this.normalizerRegister.registerNormalizer(
          'removeHamzahMaddahFromAlifWawYah',
          new RemoveHamzahMaddahFromAlifWawYahNormalizer(),
          {
            lang: 'ar',
            label: 'Ignore hamzah and maddah in ʾalif, wāw and yāʾ',
            help: "آ , أ, إ &larr; ا      ؤ &larr; و      ئ &larr; ي"

          }
        )

        this.normalizerRegister.registerNormalizer(
          'ignoreVocalization',
          new IgnoreArabicVocalizationNormalizer(),
          {
            lang: 'ar',
            label: 'Ignore Vocalization',
            help: "Ignore vocal diacritics, e.g., الْحُرُوف &larr; الحروف"

          }
        )
        this.normalizerRegister.registerNormalizer(
          'ignoreShadda',
          new IgnoreShaddaNormalizer(),
          {
            lang: 'ar',
            label: 'Ignore shaddah',
            help: "Ignore shaddah, e.g., درّس &larr; درس"
          }
        )
        this.normalizerRegister.registerNormalizer(
          'ignoreTatwil',
          new IgnoreTatwilNormalizer(),
          {
            lang: 'ar',
            label: 'Ignore taṭwīl',
            help: 'Ignore taṭwīl'
          }
        )
        this.normalizerRegister.registerNormalizer(
          'ignoreIsolatedHamza',
          new IgnoreIsolatedHamzaNormalizer(),
          {
            lang: 'ar',
            label: 'Ignore isolated hamza',
            help: 'Ignore isolated hamza'
          }
        )
        break

      case 'he':
        break
    }
  }

  genOnConfirmArchive() {
    let thisObject = this
    return () => { return new Promise( (resolve, reject) => {
      // console.log(`About to archive table`)
      thisObject.ctData['archived'] = true
      let apiCallOptions = {
        collationTableId: thisObject.tableId,
        collationTable: thisObject.ctData,
        descr: 'Archived',
        source: 'edit',
        baseSiglum: thisObject.ctData['sigla'][0]
      }
      $.post(
        thisObject.apiSaveCollationUrl,
        {data: JSON.stringify(apiCallOptions)}
      ).done( function (apiResponse){
        // console.log("Success archiving table")
        // console.log(apiResponse)
        thisObject.lastSavedCtData = Util.deepCopy(thisObject.ctData)
        // thisObject.lastSavedEditorMatrix = thisObject.tableEditor.getMatrix().clone()
        thisObject.versionInfo = apiResponse.versionInfo
        // thisObject.witnessUpdates = []
        // for(let i=0; i < thisObject.lastWitnessUpdateCheckResponse['witnesses'].length; i++) {
        //   if (thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated']) {
        //     thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated'] = false
        //   }
        // }
        thisObject.unsavedChanges = false
        // thisObject.updateWitnessInfoDiv()
        thisObject.updateSaveArea()
        resolve(thisObject.versionInfo)
      }).fail(function(resp){
        console.log("ERROR: cannot archive table")
        thisObject.ctData['archived'] = false
        console.log(resp)
        reject()
      })
    })}
  }


  updateSaveArea() {
    console.log(`Updating save area`)
    if (this.ctData['archived']) {
      let lastVersion = this.versionInfo[this.versionInfo.length-1]
      this.saveButtonPopoverTitle = 'Saving is disabled'
      this.saveButtonPopoverContent = `<p>Edition is archived.</p><p>Last save: ${Util.formatVersionTime(lastVersion['timeFrom'])}</p>`
      this.saveButton
        .prop('disabled', true)
      return
    }

    let changes = this.getChangesInCtData()
    if (changes.length !== 0) {
      console.log(`There are changes`)
      console.log(changes)
      this.unsavedChanges = true
      this.adminPanel.disallowArchiving('Save or discard changes before attempting to archive this table/edition')

      this.saveButtonPopoverContent = '<p>'
      this.saveButtonPopoverContent += '<ul>'
      for (const change of changes){
        this.saveButtonPopoverContent += '<li>' + change + '</li>'
      }
      this.saveButtonPopoverContent += '</ul></p>'
      this.saveButtonPopoverTitle = 'Click to save changes'
      this.saveButton.removeClass('text-muted')
          .addClass('text-primary')
          .prop('disabled', false)
    } else {
      console.log(`No changes`)
      this.unsavedChanges = false
      this.adminPanel.allowArchiving()
      let lastVersion = this.versionInfo[this.versionInfo.length-1]
      this.saveButtonPopoverContent = `Last save: ${Util.formatVersionTime(lastVersion['timeFrom'])}`
      this.saveButtonPopoverTitle = 'Nothing to save'
      this.saveButton.removeClass('text-primary')
          .addClass('text-muted')
          .prop('disabled', true)

    }
  }

  getChangesInCtData() {
    let changes = []
    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push("New title: '" + this.ctData['title'] + "'" )
    }

    // let currentCollationMatrix = this.getCollationMatrixFromTableEditor()
    // if (!CollationTableUtil.collationMatricesAreEqual(currentCollationMatrix, this.lastSavedCtData['collationMatrix'])) {
    //   changes.push('Changes in collation alignment')
    // }

    // if (!ArrayUtil.arraysAreEqual(this.ctData['witnessOrder'], this.lastSavedCtData['witnessOrder'])) {
    //   changes.push('New witness order')
    // }

    // if (!ArrayUtil.arraysAreEqual(this.ctData['sigla'], this.lastSavedCtData['sigla'])) {
    //   if (this.siglaPresetLoaded !== '') {
    //     changes.push(`Changes in sigla. Preset '${this.siglaPresetLoaded}' loaded`)
    //   } else {
    //     changes.push('Changes in sigla')
    //   }
    // } else {
    //   // no changes, this cancels any loaded preset
    //   this.siglaPresetLoaded = ''
    // }

    // if(this.ctData['type'] === CollationTableType.EDITION) {
    //   let editionWitnessIndex = this.ctData['witnessOrder'][0]
    //   let oldText = this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
    //   let newText = this.ctData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
    //   if (oldText !== newText) {
    //     changes.push('Changes in edition text')
    //   }
    // }

    // if (this.witnessUpdates.length !== 0) {
    //   for(const witnessUpdate of this.witnessUpdates) {
    //     changes.push(`Witness ${this.ctData['witnessTitles'][witnessUpdate.witnessIndex]} updated`)
    //   }
    // }

    // if (!ArrayUtil.arraysAreEqual(this.ctData['groupedColumns'], this.lastSavedCtData['groupedColumns'])) {
    //   changes.push(`Changes in column grouping`)
    // }

    // if (!ArrayUtil.arraysAreEqual(this.ctData['automaticNormalizationsApplied'],
    //   this.lastSavedCtData['automaticNormalizationsApplied'])) {
    //   if (this.ctData['automaticNormalizationsApplied'].length===0) {
    //     changes.push(`Disabled automatic normalizations`)
    //   } else {
    //     changes.push(`Applied automatic normalizations: ${this.ctData['automaticNormalizationsApplied'].join('+')}`)
    //   }
    // }

    return changes
  }

  genOnConfirmTitleField() {
    let thisObject = this
    return function (data) {
      //console.log('confirm title field')
      //console.log(data.detail)
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = thisObject.normalizeTitleString(data.detail.newText)
        if (normalizedNewTitle === '') {
          console.debug('Empty new title')
          thisObject.titleField.setText(thisObject.ctData['title'])
          return false
        }
        //console.debug('New title: ' + normalizedNewTitle)
        thisObject.ctData['title'] = normalizedNewTitle
        thisObject.titleField.setText(normalizedNewTitle)
        thisObject.updateSaveArea()
        document.title = `${thisObject.ctData.title} (${thisObject.ctData['chunkId']})`
      }
      return false
    }
  }

  normalizeTitleString(title) {
    return title.replace(/^\s*/, '').replace(/\s*$/, '')
  }

  genCtInfoDiv() {
    let workTitle = this.options.workInfo['title']
    let workAuthorId = this.options.workInfo['authorId']
    let workAuthorName = this.options.peopleInfo[workAuthorId]['fullname']
    return `<div id="ct-info" title="${workAuthorName}, ${workTitle}; table ID: ${this.tableId}">${this.options.workId}-${this.options.chunkNumber}</div>`
  }

}


// Load as global variable so that it can be referenced in the Twig template
window.EditionComposer = EditionComposer