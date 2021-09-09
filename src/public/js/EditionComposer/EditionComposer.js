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

import { defaultLanguageDefinition } from '../defaults/languages'

import * as TranscriptionTokenType from '../constants/WitnessTokenType'
import * as WitnessTokenClass from '../constants/TranscriptionTokenClass'

// widgets
import { EditableTextField } from '../widgets/EditableTextField'

// utilities
import * as Util from '../toolbox/Util.mjs'
import { capitalizeFirstLetter, parseWordsAndPunctuation } from '../toolbox/Util.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'

// Normalizations
import { NormalizerRegister } from '../pages/common/NormalizerRegister'
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
import { MainTextPanel } from './MainTextPanel'
import { CtDataCleaner } from '../CtData/CtDataCleaner'
import { ApparatusPanel } from './ApparatusPanel'
import { Edition } from '../Edition/Edition'
import { CtDataEditionGenerator } from '../Edition/EditionGenerator/CtDataEditionGenerator'
import { LocationInSection } from '../Edition/LocationInSection'
import * as ArrayUtil from '../toolbox/ArrayUtil'
import * as CollationTableType from '../constants/CollationTableType'
import * as NormalizationSource from '../constants/NormalizationSource'
import { CtData } from '../CtData/CtData'

// CONSTANTS

// tab ids
const editionTitleId = 'edition-title'
const collationTableTabId = 'collation-table'
const mainTextTabId = 'main-text-panel'
const editionPreviewTabId = 'edition-preview'
const witnessInfoTabId = 'witness-info'
const adminPanelTabId = 'admin'

// save button
const saveButtonTextClassNoChanges = 'text-muted'
const saveButtonTextClassChanges = 'text-primary'
const saveButtonTextClassSaving = 'text-warning'
const saveButtonTextClassError = 'text-danger'


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

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "EditionComposer"})
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
      loadPreset: '<i class="fas fa-upload"></i>',
      error: '<i class="bi bi-bug-fill"></i>'
    }

    this.errorDetected = false
    this.errorDetail = ''

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    let ctDataCleaner = new CtDataCleaner()
    this.ctData = ctDataCleaner.getCleanCollationData(this.options['collationTableData'])

    console.log('CT Data')
    console.log(this.ctData)

    // Normalizers
    this.normalizerRegister = new NormalizerRegister()
    this.registerStandardNormalizers()
    // this.availableNormalizers = this.normalizerRegister.getRegisteredNormalizers()

    this.lastSavedCtData = Util.deepCopy(this.ctData)
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo

    this.edition = new Edition()
    this._reGenerateEdition()

    document.title = `${this.ctData.title} (${this.ctData['chunkId']})`

    let thisObject = this

    this.convertingToEdition = false
    this.witnessUpdates = []

    $(window).on('beforeunload', function() {
      if (thisObject.unsavedChanges || thisObject.convertingToEdition) {
        //console.log("There are changes in editor")
        return false // make the browser ask if the user wants to leave
      }
    })

    // Construct panels
    this.collationTablePanel = new CollationTablePanel({
      containerSelector:  `#${collationTableTabId}`,
      normalizerRegister: this.normalizerRegister,
      icons: this.icons,
      ctData: this.ctData,
      onCtDataChange: this.genOnCtDataChange('collationTablePanel'),
      contentAreaId: 'ct-panel-content',
      peopleInfo: this.options.peopleInfo,
      verbose: true
    })
    this.witnessInfoPanel = new WitnessInfoPanel({
      verbose: true,
      userId: this.options.userId,
      containerSelector: `#${witnessInfoTabId}`,
      ctData: this.ctData,
      onWitnessOrderChange: this.genOnWitnessOrderChange(),
      onSiglaChange: this.genOnSiglaChange(),
      checkForWitnessUpdates: this.genCheckWitnessUpdates(),
      updateWitness: this.genUpdateWitness(),
      getWitnessData: this.genGetWitnessData(),
      fetchSiglaPresets: this.genFetchSiglaPresets(),
      saveSiglaPreset: this.genSaveSiglaPreset()
    })

    this.adminPanel = new AdminPanel({
      verbose: false,
      containerSelector: `#${adminPanelTabId}`,
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
      edition: this.edition,
      langDef: this.options.langDef,
      onPdfExport: this.genOnExportPdf(),
      verbose: false
    })

    let apparatusPanels = this.edition.apparatuses
      .map( (apparatus, index) => {
        return new ApparatusPanel({
          ctData: this.ctData,
          containerSelector: `#apparatus-${index}`,
          edition: this.edition,
          apparatusIndex: index,
          onHighlightMainText: this._genOnHighlightMainText(apparatus.type),
          onCtDataChange: this.genOnCtDataChange(`ApparatusPanel ${index}`),
          onError: (msg) => { this._setError(`${msg} (Apparatus ${index}`)},
          verbose: true
        }
      )})

    this.mainTextPanel = new MainTextPanel({
      containerSelector: `#${mainTextTabId}`,
      ctData: this.ctData,
      edition: this.edition,
      apparatusPanels: apparatusPanels,
      verbose: true,
      onConfirmMainTextEdit: this.genOnConfirmMainTextEdit(),
      onCtDataChange: this.genOnCtDataChange('mainTextPanel')
    })

    // tab arrays
    let panelOneTabs = [
      createTabConfig(mainTextTabId, 'Main Text', this.mainTextPanel),
      createTabConfig(collationTableTabId, 'Collation Table', this.collationTablePanel),
      createTabConfig(witnessInfoTabId, 'Witness Info', this.witnessInfoPanel)
    ]

    let panelTwoTabs = this.edition.apparatuses
      .map( (apparatus, index) => {
        return createTabConfig(
          `apparatus-${index}`,
          this._getTitleForApparatusType(apparatus.type),
          apparatusPanels[index]
         )
      })
      .concat([
        createTabConfig(editionPreviewTabId, 'Edition Preview', this.editionPreviewPanel),
        createTabConfig(adminPanelTabId, 'Admin', this.adminPanel)
    ])

    this.multiPanelUI = new MultiPanelUI({
        logo: `<a href="${this.options.urlGenerator.home()}" title="Home">
<img src="${this.options.urlGenerator.images()}/apm-logo-plain.svg" height="40px" alt="logo"/></a>`,
        topBarContent: () => {
          return `<div class="top-bar-item top-bar-title" id="${editionTitleId}">Multi-panel User Interface</div>${thisObject.genCtInfoDiv()}`
        },
        topBarRightAreaContent: () => {
          return `<div class="toolbar-group"><button class="top-bar-button text-danger" id="error-button">${this.icons.error}</button>
<button class="top-bar-button" id="save-button">${this.icons.saveEdition}</button></div>`
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
      this.saveButtonPopoverContent = 'TBD'
      this.saveButtonPopoverTitle = 'TBD'
      this.saveButton = $('#save-button')
      this.saveButton.popover({
        trigger: 'hover',
        placement: 'left',
        html: true,
        title: () => { return this.saveButtonPopoverTitle},
        content: () => { return this.saveButtonPopoverContent}
      })
      thisObject._updateSaveArea()
      this.saveButton.on('click', thisObject.genOnClickSaveButton())

      // error
      this.errorButton = $('#error-button')
      this.errorButtonPopoverContent = 'TBD'
      this.errorButtonPopoverTitle = 'Error'
      this.errorButton.popover({
        trigger: 'hover',
        placement: 'left',
        html: true,
        title: () => { return this.errorButtonPopoverTitle},
        content: () => { return this.errorButtonPopoverContent}
      })
      this._updateErrorUi()
    })
  }

  _genOnHighlightMainText(apparatusType) {
    return (index, on) => {
      this.mainTextPanel.highlightTextForLemma(apparatusType, index, on)
    }
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

  _getMainTextWitnessCtRowIndex() {
    return this.ctData['editionWitnessIndex'] !== undefined ? this.ctData['editionWitnessIndex'] :
      this.ctData['witnessOrder'][0]

  }

  genOnConfirmMainTextEdit() {
    return (section, tokenIndex, newText) => {
      //console.log(`Confirming edit of main text token ${tokenIndex} in section ${prettyPrintArray(section)} with new text '${newText}'`)
      let token = this.edition.getMainTextToken( new LocationInSection(section, tokenIndex))
      if (token.isEmpty()) {
        console.warn(`Trying to confirm edit of nonexistent main text token`)
        return false
      }
      let ctIndex = token.collationTableIndex
      if (ctIndex === -1) {
        console.warn(`Trying to confirm edit of token that does not have a reference in the collation table`)
        return false
      }
      let changesInCt = this._editMainText(ctIndex, newText)
      if (changesInCt) {
        this._updateSaveArea()
        this._reGenerateEdition(`Main text edit`)
        this._updateDataInPanels()
      }
      return changesInCt
    }
  }

  _updateDataInPanels(updateWitnessInfo = false) {
    if (this.errorDetected) {
      console.log(`Not updating data in panels because of error`)
      return
    }

    this.mainTextPanel.updateData(this.ctData, this.edition)  // mainTextPanel takes care of updating the apparatus panels
    this.collationTablePanel.updateCtData(this.ctData, 'EditionComposer')
    this.editionPreviewPanel.updateData(this.ctData, this.edition)
    this.witnessInfoPanel.updateCtData(this.ctData, updateWitnessInfo)
  }



  /**
   * Changes the text in the main text witness for the given index
   * Returns true if there was an actual change in the collation table.
   *
   * @param {number} ctIndex
   * @param {string} newText
   * @return {boolean}
   * @private
   */
  _editMainText(ctIndex, newText) {
    let thisObject = this

    function replaceEditionWitnessToken(ctRow, tokenIndex, newText) {
      let tokenType = Util.strIsPunctuation(newText) ? TranscriptionTokenType.PUNCTUATION : TranscriptionTokenType.WORD
      thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['tokenClass'] = WitnessTokenClass.EDITION
      thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['text'] = newText
      thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['tokenType'] = tokenType
      thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizedText'] = ''
      thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizationSource'] = ''

      if (tokenType === TranscriptionTokenType.WORD) {
        if (thisObject.ctData['automaticNormalizationsApplied'].length !== 0) {
          // apply normalizations for this token
          let norm = thisObject.normalizerRegister.applyNormalizerList(thisObject.ctData['automaticNormalizationsApplied'], newText)
          if (norm !== newText) {
            console.log(`New text normalized:  ${newText} => ${norm}`)
            thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizedText'] = norm
            thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
          }
        }
      }
    }
    let ctRow = this._getMainTextWitnessCtRowIndex()
    let editionWitnessRef = this.ctData['collationMatrix'][ctRow][ctIndex]
    //console.log(`Editing witness token: row ${ctRow}, col ${ctIndex}, ref ${editionWitnessRef}`)
    if (editionWitnessRef === -1) {
      console.warn(`Null reference found editing witness token: row ${ctRow}, col ${ctIndex}, ref ${editionWitnessRef}`)
      return false
    }
    let witnessToken = this.ctData['witnesses'][ctRow]['tokens'][editionWitnessRef]
    if (witnessToken === undefined) {
      console.warn(`Undefined witness token editing witness token: row ${ctRow}, col ${ctIndex}, ref ${editionWitnessRef}`)
      return false
    }
    console.log(witnessToken)
    newText = Util.trimWhiteSpace(newText)
    if (witnessToken.text === newText) {
      //console.log(`No change in text`)
      return false
    }

    // parse new text into witness tokens
    let parsedText = parseWordsAndPunctuation(newText)
    console.log(parsedText)
    if (parsedText.length === 0) {
      // empty text
      console.log(`Empty text `)
      // TODO: delete the column in the CT if there is nothing in the witnesses?
      this.ctData['witnesses'][ctRow]['tokens'][editionWitnessRef]['text'] = newText
      this.ctData['witnesses'][ctRow]['tokens'][editionWitnessRef]['tokenType'] = TranscriptionTokenType.EMPTY
      return true
    }
    if (parsedText.length === 1) {
      // single word
      console.log(`Single token in new text: ${parsedText[0].text}`)
      replaceEditionWitnessToken(ctRow, editionWitnessRef, newText)
      return true
    }
    // more than one word
    this.ctData = CtData.insertColumnsAfter(this.ctData, ctIndex, parsedText.length-1)
    for (let col = 0; col < parsedText.length; col++ ) {
      replaceEditionWitnessToken(ctRow, editionWitnessRef + col, parsedText[col].text)
    }
    console.log(`New ct Data after multiple word edit`)
    console.log(this.ctData)
    return true
  }

  genOnConfirmArchive() {
    let thisObject = this
    return () => { return new Promise( (resolve, reject) => {
      // console.log(`About to archive table`)
      this.ctData['archived'] = true
      let apiCallOptions = {
        collationTableId: this.tableId,
        collationTable: this.ctData,
        descr: 'Archived',
        source: 'edit',
        baseSiglum: this.ctData['sigla'][0]
      }
      $.post(
        this.apiSaveCollationUrl,
        {data: JSON.stringify(apiCallOptions)}
      ).done(  (apiResponse) => {
        // console.log("Success archiving table")
        // console.log(apiResponse)
        this.lastSavedCtData = Util.deepCopy(thisObject.ctData)
        // thisObject.lastSavedEditorMatrix = thisObject.tableEditor.getMatrix().clone()
        this.versionInfo = apiResponse.versionInfo
        // thisObject.witnessUpdates = []
        // for(let i=0; i < thisObject.lastWitnessUpdateCheckResponse['witnesses'].length; i++) {
        //   if (thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated']) {
        //     thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated'] = false
        //   }
        // }
        this.unsavedChanges = false
        // thisObject.updateWitnessInfoDiv()
        this._updateSaveArea()
        resolve(this.versionInfo)
      }).fail((resp) => {
        console.log("ERROR: cannot archive table")
        this.ctData['archived'] = false
        console.log(resp)
        reject()
      })
    })}
  }

  /**
   *
   * @param {string} detail
   * @private
   */
  _setError(detail)  {
    this.errorDetected = true
    this.errorDetail = detail
    this._updateErrorUi()
  }

  _updateErrorUi() {
     if (this.errorDetected) {
       this.errorButton.removeClass('hidden').addClass('blink')
       this.errorButtonPopoverContent = `<p>Software error detected, please make a note of what you were doing and report it to the developers. </p>
<p>${this.errorDetail}</p>`
     } else {
       this.errorButton.removeClass('blink').addClass('hidden')
     }
     this._updateSaveArea()
  }


  genOnExportPdf() {
    let thisObject = this
    return (svg) => {
      return new Promise( (resolve, reject) => {
        let apiUrl = thisObject.options.urlGenerator.apiConvertSvg()
        if (svg === '') {
          console.log('No SVG for PDF export')
          resolve('')
        }
        console.log(`Calling export PDF API`)
        $.post(
          apiUrl,
          {data: JSON.stringify({
              pdfId: `ct-${thisObject.options.tableId}`,
              svg: svg
            })}
        ).done(
          apiResponse => {
            resolve(apiResponse.url)
          }
        ).fail (
          error => {
            console.error('PDF API error')
            console.log(error)
            reject()
          }
        )
      })
    }
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

  genOnClickSaveButton() {
    return () => {
      let changes = this.getChangesInCtData()
      if (changes.length !== 0) {
        this.unsavedChanges = true
        this.saveButton.popover('hide')
        this.saveButton.html(this.icons.busy)
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassSaving)
        console.log('Saving table via API call to ' + this.apiSaveCollationUrl)
        let description = ''
        for (let change of changes) {
          description += change + '. '
        }
        let apiCallOptions = {
          collationTableId: this.tableId,
          collationTable: this.ctData,
          descr: description,
          source: 'edit',
          baseSiglum: this.ctData['sigla'][0]
        }
        $.post(
          this.apiSaveCollationUrl,
          {data: JSON.stringify(apiCallOptions)}
        ).done(  (apiResponse) => {
          console.log("Success saving table")
          console.log(apiResponse)
          this.saveButton.html(this.icons.saveEdition)
          this.lastSavedCtData = Util.deepCopy(this.ctData)
          this.versionInfo = apiResponse.versionInfo
          this.adminPanel.updateVersionInfo(this.versionInfo)
          this.witnessUpdates = []
          this.witnessInfoPanel.onDataSave()
          this.unsavedChanges = false
          this.saveErrors = false
          this._updateSaveArea()
        }).fail((resp) => {
          this.saveErrors = true
          this.saveButton.html(this.icons.saveEdition)
          console.error("Could not save table")
          console.log(resp)
          this._updateSaveArea()
        })
      }
    }
  }

  genGetWitnessData() {
    return (witnessId) => {
      return new Promise( (resolve, reject) => {
        let apiUrl = this.options.urlGenerator.apiWitnessGet(witnessId, 'standardData')
        $.get(apiUrl).then( (resp) => {
          // got witness data
          // normalize its tokens first
          let witnessData = resp['witnessData']
          witnessData['tokens'] = CtData.applyNormalizationsToWitnessTokens(
            witnessData['tokens'],
            this.normalizerRegister,
            this.ctData['automaticNormalizationsApplied']
          )

          resolve(witnessData)
        }).fail( (resp) => {
          let errorMsg = `Server status ${resp.status}`
          if (resp.responseJSON !== undefined) {
            errorMsg += `, error message: '${resp.responseJSON.error}'`
          }
          console.warn(`Error getting witness data ${witnessId} from server: ${errorMsg}`)
          reject(`Server communication error`)
        })
      })
    }
  }

  genUpdateWitness() {
    return (witnessIndex, changeData, newWitness) => {

      console.log(`Updating witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]})`)

      //process column inserts
      let insertedColumns = 0
      let newTokenIndexes = []
      changeData.ctChanges.forEach( (change) => {
        if (change.type === 'insertColAfter') {
          console.log(`Processing insertCol after ${change.afterCol}, newTokenIndex = ${change.tokenIndexInNewWitness}`)
          CtData.insertColumnsAfter(this.ctData, change.afterCol+insertedColumns, 1)
          insertedColumns++
          newTokenIndexes.push({ index: change.afterCol+insertedColumns, new: change.tokenIndexInNewWitness})
        }
      })


      // Update references in collation table
      // this takes care of all 'replace' and 'empty' changes
      console.log(`Updating references in collation table`)
      this.ctData['collationMatrix'][witnessIndex] = this.ctData['collationMatrix'][witnessIndex].map((ref, i) => {
        if (ref === -1) {
          // console.log(`Col ${i}: ref -1`)
          return ref
        }
        let newRef = changeData['tokenConversionArray'][ref]
        if (newRef === undefined) {
          newRef = -1
          console.warn(`Col ${i}: Found undefined new ref in token conversion array, currentRef = ${ref}, setting to -1 for now`)
        }
        // if (newRef === ref) {
        //   console.log(`Col ${i}: ref ${ref} does not change`)
        // } else {
        //   console.log(`Col ${i}: ref ${ref} changes to ${newRef}`)
        // }
        return newRef
      })

      newTokenIndexes.forEach( (nti) => {
        let oldRef = this.ctData['collationMatrix'][witnessIndex][nti.index]
        if (oldRef !== -1) {
          console.warn(`Col: ${nti.index}, reference is not -1, cannot change to ${nti.new}. This should not happen!`)
        } else {
          console.log(`Col: ${nti.index}, ref changes from ${oldRef}  to ${nti.new}`)
          this.ctData['collationMatrix'][witnessIndex][nti.index]  = nti.new
        }
      })

      // 3. replace witness in ctData
      this.ctData['witnesses'][witnessIndex] = newWitness

      //4. Clean up references
      // TODO: fix this, it should not be necessary
      let cleaner = new CtDataCleaner({verbose: true})
      this.ctData = cleaner.fixEditionWitnessReferences(this.ctData)

      console.log(`New CT data after update`)
      console.log(this.ctData)

      // 4. update panels
      this.witnessUpdates.push(witnessIndex)
      this._updateSaveArea()
      this._reGenerateEdition(`Witness Update`)
      this._updateDataInPanels(false)
      this.witnessInfoPanel.markWitnessAsJustUpdated(witnessIndex)
      return true
    }
  }

  genCheckWitnessUpdates() {
    let thisObject = this
    return (currentWitnessUpdateData) => {
      return new Promise( (resolve, reject) => {
        let apiUrl = thisObject.options.urlGenerator.apiWitnessCheckUpdates()
        $.post(apiUrl, { data: JSON.stringify(currentWitnessUpdateData)})
          .done(function(apiResponse){
              resolve(apiResponse)
          })
          .fail( function(resp) {
            console.error('Error checking witness updates')
            console.log(resp)
            reject()
          })
      })
    }
  }

  genFetchSiglaPresets() {
    return () => {
      return new Promise ( (resolve, reject) => {
        let apiSiglaPresetsUrl = this.options.urlGenerator.apiGetSiglaPresets()
        let apiCallOptions = {
          lang: this.ctData['lang'],
          witnesses: this.ctData['witnesses'].filter(w => { return w['witnessType'] === 'fullTx'}).map(w => w['ApmWitnessId'])
        }
        $.post(apiSiglaPresetsUrl, { data: JSON.stringify(apiCallOptions) })
          .done(apiResponse => {
            //console.log(apiResponse)
            if (apiResponse['presets'] === undefined) {
              resolve([])
            } else {
              resolve(apiResponse['presets'])
            }
        }).fail(resp => {
          console.log('Error loading sigla presets')
          console.log(resp)
          reject(resp)
        })
      })
    }
  }

  genSaveSiglaPreset() {
    return (apiCallData) => {
      return new Promise( (resolve, reject) => {
        console.log('About to call save preset API')
        console.log(apiCallData)
        let apiUrl = this.options.urlGenerator.apiSaveSiglaPreset()
        $.post(apiUrl, { data: JSON.stringify(apiCallData)}).done( () =>{
          resolve()
        }).fail( (resp) => {
          reject(resp)
        })
      })
    }
  }


  _updateSaveArea() {

    console.log(`Updating save area`)

    if (this.errorDetected) {
      this.saveButtonPopoverTitle = 'Saving is disabled'
      this.saveButtonPopoverContent = `<p>Software error detected</p>`
      this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
      this.saveButton
        .prop('disabled', true)
      return
    }

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

      if (this.saveErrors) {
        this.saveButtonPopoverContent += `<p class="text-danger">Edition could not be saved, please try again</p>`
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassError)
      } else {
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassChanges)
        this.saveButton.prop('disabled', false)
      }
    } else {
      console.log(`No changes`)
      this.unsavedChanges = false
      this.adminPanel.allowArchiving()
      let lastVersion = this.versionInfo[this.versionInfo.length-1]
      this.saveButtonPopoverContent = `Last save: ${Util.formatVersionTime(lastVersion['timeFrom'])}`
      this.saveButtonPopoverTitle = 'Nothing to save'
      this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges)
      this.saveButton.prop('disabled', true)
    }
  }

  /**
   *
   * @param {string} source
   * @return {(function(*=): void)|*}
   */
  genOnCtDataChange(source) {
    return (newCtData) => {
      console.log(`New CT Data received from ${source}`)
      this.ctData = CtData.copyFromObject(newCtData)
      console.log(this.ctData)
      this._reGenerateEdition(`New data received from ${source}`)
      // even if the new data source is mainTextPanel, need to tell the panel that there's a new edition
      this.mainTextPanel.updateData(this.ctData, this.edition)
      if (source !== 'collationTablePanel') {
        this.collationTablePanel.updateCtData(newCtData, 'EditionComposer')
      }
      this.editionPreviewPanel.updateData(this.ctData, this.edition)
      this.witnessInfoPanel.updateCtData(this.ctData, false)
      this._updateSaveArea()
    }
  }

  getChangesInCtData() {
    let changes = []

    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push("New title: '" + this.ctData['title'] + "'" )
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['collationMatrix'], this.lastSavedCtData['collationMatrix'],
      (a,b) => { return a===b }, 2)) {
      changes.push('Changes in collation alignment')
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['witnessOrder'], this.lastSavedCtData['witnessOrder'])) {
      changes.push('New witness order')
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['sigla'], this.lastSavedCtData['sigla'])) {
      changes.push('Changes in sigla')
    }

    if (!ArrayUtil.varsAreEqual(this.ctData['customApparatuses'], this.lastSavedCtData['customApparatuses'])) {
      changes.push('Changes in custom apparatus entries')
    }

    if(this.ctData['type'] === CollationTableType.EDITION) {
      let editionWitnessIndex = this.ctData['witnessOrder'][0]
      let oldText = this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      let newText = this.ctData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      if (oldText !== newText) {
        changes.push('Changes in edition text')
      }
    }

    this.witnessUpdates.forEach( (updatedWitnessIndex) => {
      changes.push(`Witness ${this.ctData['witnessTitles'][updatedWitnessIndex]} updated`)
    })

    if (!ArrayUtil.arraysAreEqual(this.ctData['groupedColumns'], this.lastSavedCtData['groupedColumns'])) {
      changes.push(`Changes in column grouping`)
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['automaticNormalizationsApplied'],
      this.lastSavedCtData['automaticNormalizationsApplied'])) {
      if (this.ctData['automaticNormalizationsApplied'].length===0) {
        changes.push(`Disabled automatic normalizations`)
      } else {
        changes.push(`Applied automatic normalizations: ${this.ctData['automaticNormalizationsApplied'].join('+')}`)
      }
    }

    return changes
  }

  genOnWitnessOrderChange() {
    return (newOrder) => {
      this.ctData['witnessOrder'] = newOrder
      this._reGenerateEdition(`Change in witness order`)
      this._updateDataInPanels()
      this._updateSaveArea()
    }
  }

  genOnSiglaChange() {
    return (newSigla) => {
      this.ctData['sigla'] = newSigla
      this._reGenerateEdition(`Sigla change`)
      this._updateDataInPanels()
      this._updateSaveArea()
    }
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
        thisObject._updateSaveArea()
        document.title = `${thisObject.ctData.title} (${thisObject.ctData['chunkId']})`
      }
      return false
    }
  }

  _reGenerateEdition(context = 'N/A') {
    let eg = new CtDataEditionGenerator({ ctData: this.ctData})
    try {
      this.edition = eg.generateEdition()
    } catch (e) {
      console.error(`Error generating edition`)
      console.error(e)
      this._setError(`Error re-generating edition, context: ${context}`)
    }
    if (!this.errorDetected) {
      console.log(`Edition Recalculated`)
      console.log(this.edition)
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


  _getTitleForApparatusType(type) {
    return 'Apparatus ' + capitalizeFirstLetter(type)
  }

}

/**
 *
 * @param id
 * @param title
 * @param panelObject
 * @return {{onResize: function, postRender: function, contentClasses: ([]|*), onShown: function, onHidden: function, id, title, content: (function(*=, *=, *=): *)}}
 */
function createTabConfig(id, title, panelObject) {
  return {
    id: id,
    title: title,
    content: (tabId, mode, visible) => { return panelObject.generateHtml(tabId, mode, visible) },
    contentClasses: panelObject.getContentClasses(),
    onResize: (id, visible) => {  panelObject.onResize(visible)},
    postRender: (id, mode, visible) => { panelObject.postRender(id, mode, visible) },
    onShown: (id) => { panelObject.onShown(id)},
    onHidden: (id) => { panelObject.onHidden(id)}
  }
}


// Load as global variable so that it can be referenced in the Twig template
window.EditionComposer = EditionComposer