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
 // *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

// defaults
import { defaultLanguageDefinition } from '../defaults/languages'

// utilities
import * as Util from '../toolbox/Util.mjs'
import { capitalizeFirstLetter, deepCopy } from '../toolbox/Util.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { pushArray } from '../toolbox/ArrayUtil.mjs'
import * as ArrayUtil from '../toolbox/ArrayUtil.mjs'
import { KeyCache } from '../toolbox/KeyCache/KeyCache'
import { ServerLogger } from '../Server/ServerLogger'

// MultiPanel UI
import { MultiPanelUI } from '../MultiPanelUI/MultiPanelUI'
import { TabConfig } from '../MultiPanelUI/TabConfig'

// Panels
import { WitnessInfoPanel } from './WitnessInfoPanel'
import { CollationTablePanel } from './CollationTablePanel'
import { AdminPanel } from './AdminPanel'
import { MainTextPanel } from './MainTextPanel'
import { ApparatusPanel } from './ApparatusPanel'
import { EditionPreviewPanelNew } from './EditionPreviewPanelNew'
import { TechSupportPanel } from './TechSupportPanel'

// Widgets
import { EditableTextField } from '../widgets/EditableTextField'

// Normalizations
import { NormalizerRegister } from '../pages/common/NormalizerRegister'
import { ToLowerCaseNormalizer } from '../normalizers/TokenNormalizer/ToLowerCaseNormalizer'
import { IgnoreArabicVocalizationNormalizer } from '../normalizers/TokenNormalizer/IgnoreArabicVocalizationNormalizer'
import { IgnoreShaddaNormalizer } from '../normalizers/TokenNormalizer/IgnoreShaddaNormalizer'
import { RemoveHamzahMaddahFromAlifWawYahNormalizer } from '../normalizers/TokenNormalizer/RemoveHamzahMaddahFromAlifWawYahNormalizer'
import { IgnoreTatwilNormalizer } from '../normalizers/TokenNormalizer/IgnoreTatwilNormalizer'
import { IgnoreIsolatedHamzaNormalizer } from '../normalizers/TokenNormalizer/IgnoreIsolatedHamzaNormalizer'


// CtData and Edition core
import { CtData } from '../CtData/CtData'
import { CtDataEditionGenerator } from '../Edition/EditionGenerator/CtDataEditionGenerator'
import * as CollationTableType from '../constants/CollationTableType'
import { Edition } from '../Edition/Edition.mjs'
import * as NormalizationSource from '../constants/NormalizationSource.mjs'
import * as WitnessType from '../Witness/WitnessType'
import { EditionWitnessReferencesCleaner } from '../CtData/CtDataCleaner/EditionWitnessReferencesCleaner'
import { CollationTableConsistencyCleaner } from '../CtData/CtDataCleaner/CollationTableConsistencyCleaner'
import * as WitnessTokenType from '../Witness/WitnessTokenType.mjs'

import { PdfDownloadUrl } from './PdfDownloadUrl'
import { IgnoreHyphen } from '../normalizers/TokenNormalizer/IgnoreHyphen'

// import { Punctuation} from '../defaults/Punctuation.mjs'
// CONSTANTS

// tab ids
const editionTitleId = 'edition-title'
const collationTableTabId = 'collation-table'
const mainTextTabId = 'main-text-panel'
// const editionPreviewTabId = 'edition-preview'
const editionPreviewNewTabId = 'edition-preview-new'
const witnessInfoTabId = 'witness-info'
const adminPanelTabId = 'admin'
const techSupportTabId = 'tech'

// save button
const saveButtonTextClassNoChanges = 'text-muted'
const saveButtonTextClassChanges = 'text-primary'
const saveButtonTextClassSaving = 'text-warning'
const saveButtonTextClassError = 'text-danger'


export class EditionComposer {

  constructor(options) {
    console.log(`Initializing Edition Composer`)

    // first load the fonts!

    // let fontsToLoad = [  '14pt AdobeArabic', 'bold 14pt AdobeArabic', '1em Apm_FreeSerif', '1em Noto Sans']
    //
    // fontsToLoad.forEach( (fontName) => {
    //   document.fonts.load(fontName).then( () => { console.log(`Font '${fontName}' loaded`)}).catch( (e) => {
    //     console.log(`Error loading font '${fontName}'`)
    //   })
    // })

    let optionsDefinition = {
      userId: { type:'NonZeroNumber', required: true},
      isTechSupport: { type: 'boolean', default: false},
      lastVersion: { type: 'boolean'},
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
      error: '<i class="bi bi-bug-fill"></i>',
      addEntry: '<i class="bi bi-plus-lg"></i>'
    }

    this.errorDetected = false
    this.errorDetail = ''

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    this.serverLogger = new ServerLogger({
      apiCallUrl: this.options.urlGenerator.apiAdminLog(),
      module: 'EditionComposer'
    })

    this.ctData =CtData.getCleanAndUpdatedCtData(this.options['collationTableData'])

    console.log('Clean CT Data')
    console.log(this.ctData)

    this.lang = this.ctData['lang']

    // Normalizers
    this.normalizerRegister = new NormalizerRegister()
    this.registerStandardNormalizers()
    // this.availableNormalizers = this.normalizerRegister.getRegisteredNormalizers()

    this.lastSavedCtData = Util.deepCopy(this.ctData)
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo
    this.lastVersion= this.options.lastVersion

    if (!this.lastVersion) {
      console.warn('Working on an older version of the Edition/CollationTable')
    }

    this.cache = new KeyCache()

    this.edition = new Edition()
    this._reGenerateEdition()

    document.title = `${this.ctData.title} (${this.ctData['chunkId']})`

    let thisObject = this

    this.convertingToEdition = false
    this.saving = false
    this.witnessUpdates = []
    this.editionSources = null

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
      editApparatusEntry: (apparatusIndex, ctIndexFrom, ctIndexTo) => { this.editApparatusEntryFromCollationTable(apparatusIndex, ctIndexFrom, ctIndexTo)},
      verbose: true
    })
    this.witnessInfoPanel = new WitnessInfoPanel({
      verbose: true,
      userId: this.options.userId,
      containerSelector: `#${witnessInfoTabId}`,
      ctData: this.ctData,
      onWitnessOrderChange: this.genOnWitnessOrderChange(),
      onSiglaChange: this.genOnSiglaChange(),
      onCtDataChange: this.genOnCtDataChange('witnessInfoPanel'),
      checkForWitnessUpdates: this.genCheckWitnessUpdates(),
      updateWitness: this.genUpdateWitness(),
      getWitnessData: this.genGetWitnessData(),
      fetchSiglaPresets: this.genFetchSiglaPresets(),
      fetchSources: this.genFetchSources(),
      addEditionSources: this.genAddEditionSources(),
      saveSiglaPreset: this.genSaveSiglaPreset(),
      getPageInfo: this.genGetPageInfo(),
      getDocUrl: this.genGetDocUrl(),
      getPageUrl: this.genGetPageUrl()
    })

    this.adminPanel = new AdminPanel({
      urlGen: this.options.urlGenerator,
      tableId: this.tableId,
      verbose: false,
      containerSelector: `#${adminPanelTabId}`,
      versionInfo: this.versionInfo,
      peopleInfo: this.options.peopleInfo,
      ctType: this.ctData['type'],
      archived: this.ctData['archived'],
      canArchive: true,
      onConfirmArchive: this.genOnConfirmArchive()
    })



    this.apparatusPanels = this.edition.apparatuses
      .map( (apparatus, index) => {
        return new ApparatusPanel({
          ctData: this.ctData,
          containerSelector: `#apparatus-${index}`,
          edition: this.edition,
          apparatusIndex: index,
          onHighlightMainText: this._genOnHighlightMainText(apparatus.type),
          highlightCollationTableRange: this._genHighlightCollationTable(),
          onCtDataChange: this.genOnCtDataChange(`ApparatusPanel ${index}`),
          onError: (msg) => { this._setError(`${msg} (Apparatus ${index})`)},
          verbose: true,
          editApparatusEntry: (apparatusIndex, mainTextFrom, mainTextTo) => { this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo)}
        }
      )})

    this.mainTextPanel = new MainTextPanel({
      containerSelector: `#${mainTextTabId}`,
      ctData: this.ctData,
      edition: this.edition,
      apparatusPanels: this.apparatusPanels,
      debug: true,
      onError: (msg) => { this._setError(`${msg} (Main Text Panel)`)},
      onCtDataChange: this.genOnCtDataChange('mainTextPanel'),
      editApparatusEntry: (apparatusIndex, mainTextFrom, mainTextTo) => { this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo)},
      editionWitnessTokenNormalizer: this.genEditionWitnessTokenNormalizer()
    })

    this.techSupportPanel = new TechSupportPanel({
      containerSelector: `#${techSupportTabId}`,
      active: false,
      ctData: this.ctData,
      edition: this.edition
    })

    this.editionPreviewPanelNew = new EditionPreviewPanelNew({
      containerSelector: `#${editionPreviewNewTabId}`,
      // ctData: this.ctData,
      edition: this.edition,
      langDef: this.options.langDef,
      onEditionTypeset: (typesetEdition) => { this.techSupportPanel.updateTypesetEdition(typesetEdition)},
      getPdfDownloadUrl: this.genGetPdfDownloadUrlForPreviewPanel(),
      debug: true
    })

    // tab arrays
    let panelOneTabs = [
      TabConfig.createTabConfig(mainTextTabId, 'Main Text', this.mainTextPanel),
      TabConfig.createTabConfig(collationTableTabId, 'Collation Table', this.collationTablePanel),
      TabConfig.createTabConfig(witnessInfoTabId, 'Witness Info', this.witnessInfoPanel)
    ]

    let panelTwoTabs = this.edition.apparatuses
      .map( (apparatus, index) => {
        return TabConfig.createTabConfig(
          `apparatus-${index}`,
          this._getTitleForApparatusType(apparatus.type),
          this.apparatusPanels[index],
          this._getLinkTitleForApparatusType(apparatus.type)
         )
      })
      .concat([
        // TabConfig.createTabConfig(editionPreviewTabId, 'Edition Preview', this.editionPreviewPanel),
        TabConfig.createTabConfig(editionPreviewNewTabId, 'Edition Preview', this.editionPreviewPanelNew),
        TabConfig.createTabConfig(adminPanelTabId, 'Admin', this.adminPanel),
    ])

    if (this.options.isTechSupport) {
      // console.log(`Adding tech support panel`)
      this.techSupportPanel.setActive(true)
      panelTwoTabs.push( TabConfig.createTabConfig(techSupportTabId, 'Tech', this.techSupportPanel))
    }

    this.multiPanelUI = new MultiPanelUI({
        logo: `<a href="${this.options.urlGenerator.siteHome()}" title="Home">
<img src="${this.options.urlGenerator.images()}/apm-logo-plain.svg" height="40px" alt="logo"/></a>`,
        topBarContent: () => {
          let warningSign = ''
          if (!this.lastVersion) {
            warningSign = `<a href="" class="text-danger" title="WARNING: showing an older version of this edition">${this.icons.alert}</a>&nbsp;`
          }
          return `<div class="top-bar-item top-bar-title" >${warningSign}<span id="${editionTitleId}">Multi-panel User Interface</span></div>${thisObject.genCtInfoDiv()}`
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

  _genHighlightCollationTable() {
    return (colStart, colEnd) => {
      if (colEnd === undefined) {
        console.warn(`Undefined col end`)
        console.trace()
      }
      //console.log(`Highlighting CT ${colStart} - ${colEnd}`)
      this.collationTablePanel.highlightColumnRange(colStart, colEnd)
    }
  }

  _genOnHighlightMainText(apparatusType) {
    return (index, on) => {
      this.mainTextPanel.highlightTextForLemma(apparatusType, index, on)
    }
  }

  editApparatusEntryFromCollationTable(apparatusIndex, ctFrom, ctTo) {
    console.log(`Adding apparatus entry for apparatus ${apparatusIndex} from collation table: ${ctFrom} to ${ctTo}`)
    if (ctFrom === -1 || ctTo === -1) {
      console.warn(`Invalid CT column range`)
      return
    }
    console.log(`Getting main text index from out of ct ${ctFrom}`)
    let mainTextFrom = this._getMainTextIndexFromCtIndex(ctFrom)
    if (mainTextFrom === -1) {
      console.warn(`No main text found for given CT index`)
      return
    }
    console.log(`Getting main text index to out of ct ${ctTo}`)
    let mainTextTo = this._getMainTextIndexFromCtIndex(ctTo)
    if (mainTextTo === -1) {
      console.warn(`No main text found for given CT index`)
      return
    }
    this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo)
  }

  _getMainTextIndexFromCtIndex(ctIndex) {
    let ctData = this.ctData
    let editionWitnessTokenIndex = ctData['collationMatrix'][ctData['editionWitnessIndex']][ctIndex]
    console.log(`Edition witness token index for ct ${ctIndex} is ${editionWitnessTokenIndex}`)
    for (let i = 0; i < this.edition.mainText.length; i++) {
      if (this.edition.mainText[i].editionWitnessTokenIndex === editionWitnessTokenIndex) {
        return i
      }
    }
    return -1
  }

  editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo) {
    console.log(`Got request to edit apparatus entry in apparatus ${this.edition.apparatuses[apparatusIndex].type}, from ${mainTextFrom} to ${mainTextTo}`)

    this.apparatusPanels[apparatusIndex].editApparatusEntry(mainTextFrom, mainTextTo)
    $(`#apparatus-${apparatusIndex}-tab`).tab('show')
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
        // this.normalizerRegister.registerNormalizer(
        //   'ignoreHyphen',
        //   new IgnoreHyphen(),
        //   {
        //     lang: 'la',
        //     label: 'Ignore Hyphens',
        //     help: "E.g., 'cor-de' and 'corde' will be taken to be the same word"
        //   }
        // )
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

  _updateDataInPanels(updateWitnessInfo = false) {
    if (this.errorDetected) {
      console.log(`Not updating data in panels because of error`)
      return
    }

    this.mainTextPanel.updateData(this.ctData, this.edition)  // mainTextPanel takes care of updating the apparatus panels
    this.collationTablePanel.updateCtData(this.ctData, 'EditionComposer')
    // this.editionPreviewPanel.updateData(this.ctData, this.edition)
    this.editionPreviewPanelNew.updateData(this.edition)
    this.witnessInfoPanel.updateCtData(this.ctData, updateWitnessInfo)
    this.techSupportPanel.updateData(this.ctData, this.edition)
  }

  genEditionWitnessTokenNormalizer() {
    return (token) => this.applyNormalizationsToWitnessToken(token)
  }

  applyNormalizationsToWitnessToken(token) {
    if (token.tokenType !== WitnessTokenType.WORD) {
      return token
    }
    if (token['normalizedText'] !== '') {
      // token has been normalized already by the parser
      return token
    }
    let newToken = deepCopy(token)
    if (this.ctData['automaticNormalizationsApplied'].length !== 0) {
      // apply normalizations for this token
      let norm = this.normalizerRegister.applyNormalizerList(this.ctData['automaticNormalizationsApplied'], token.text)
      if (norm !== token.text) {
        newToken['normalizedText'] = norm
        newToken['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
      }
    }

    return newToken
  }



  // /**
  //  * Changes the text in the main text witness for the given index
  //  * Returns true if there was an actual change in the collation table.
  //  *
  //  * @param {number} ctIndex
  //  * @param {string} newText
  //  * @return {boolean}
  //  * @private
  //  */
  // _editMainText(ctIndex, newText) {
  //   let thisObject = this
  //
  //   function replaceEditionWitnessToken(ctRow, tokenIndex, newText, lang) {
  //     let tokenType = Punctuation.stringIsAllPunctuation(newText, lang) ? WitnessTokenType.PUNCTUATION : WitnessTokenType.WORD
  //     thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['tokenClass'] = WitnessTokenClass.EDITION
  //     if (thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['fmtText'] === undefined) {
  //       // no formatting, just copy the text
  //       thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['text'] = newText
  //     } else {
  //       //there is some formatting
  //       console.log(`Replacing edition witness token that contains formatting`)
  //       console.log(`newText: ${newText}`)
  //       console.log(`current fmtText: `)
  //       console.log(thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['fmtText'])
  //       let newFmtText = FmtText.withPlainText(thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['fmtText'], newText)
  //       thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['fmtText'] = newFmtText
  //       thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['text'] = FmtText.getPlainText(newFmtText)
  //       console.log(`new fmtText: `)
  //       console.log(thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['fmtText'])
  //     }
  //
  //     thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['tokenType'] = tokenType
  //     thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizedText'] = ''
  //     thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizationSource'] = ''
  //
  //     if (tokenType === WitnessTokenType.WORD) {
  //       if (thisObject.ctData['automaticNormalizationsApplied'].length !== 0) {
  //         // apply normalizations for this token
  //         let norm = thisObject.normalizerRegister.applyNormalizerList(thisObject.ctData['automaticNormalizationsApplied'], newText)
  //         if (norm !== newText) {
  //           console.log(`New text normalized:  ${newText} => ${norm}`)
  //           thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizedText'] = norm
  //           thisObject.ctData['witnesses'][ctRow]['tokens'][tokenIndex]['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
  //         }
  //       }
  //     }
  //   }
  //   let witnessIndex = this._getMainTextWitnessIndex()
  //   let editionWitnessRef = this.ctData['collationMatrix'][witnessIndex][ctIndex]
  //   //console.log(`Editing witness token: row ${ctRow}, col ${ctIndex}, ref ${editionWitnessRef}`)
  //   if (editionWitnessRef === -1) {
  //     console.warn(`Null reference found editing witness token: row ${witnessIndex}, col ${ctIndex}, ref ${editionWitnessRef}`)
  //     return false
  //   }
  //   let witnessToken = this.ctData['witnesses'][witnessIndex]['tokens'][editionWitnessRef]
  //   if (witnessToken === undefined) {
  //     console.warn(`Undefined witness token editing witness token: row ${witnessIndex}, col ${ctIndex}, ref ${editionWitnessRef}`)
  //     return false
  //   }
  //   //console.log(witnessToken)
  //   newText = Util.trimWhiteSpace(newText)
  //   if (witnessToken.text === newText) {
  //     //console.log(`No change in text`)
  //     return false
  //   }
  //
  //   // parse new text into witness tokens
  //   let parsedText = EditionWitnessTokenStringParser.parse(newText, this.lang).filter ( (t) => {
  //     return t.tokenType === WitnessTokenType.WORD || t.tokenType === WitnessTokenType.PUNCTUATION
  //   })
  //   console.log(`Parsed new text`)
  //   console.log(parsedText)
  //   if (parsedText.length === 0) {
  //     // empty text
  //     console.log(`Empty text `)
  //     // TODO: delete the column in the CT if there is nothing in the witnesses?
  //     this.ctData = CtData.emptyWitnessToken(this.ctData, witnessIndex, editionWitnessRef)
  //     return true
  //   }
  //   if (parsedText.length === 1) {
  //     // single word
  //     console.log(`Single token in new text: ${parsedText[0].text}`)
  //     replaceEditionWitnessToken(witnessIndex, editionWitnessRef, newText, this.lang)
  //     return true
  //   }
  //   // more than one word
  //   // first determine if the current token text is in the new text
  //   console.log(`Finding old text in the new text`)
  //   let currentTokenIndex = parsedText.map( (t) => { return t.text}).indexOf(witnessToken.text)
  //   if (currentTokenIndex !== -1) {
  //     console.log(`The old text is in position ${currentTokenIndex+1} of ${parsedText.length}`)
  //     this.ctData = CtData.insertColumnsAfter(this.ctData, ctIndex-1, currentTokenIndex)
  //     this.ctData = CtData.insertColumnsAfter(this.ctData, ctIndex+currentTokenIndex, parsedText.length-1-currentTokenIndex)
  //   } else {
  //     console.log(`The old text is not in the new text`)
  //     this.ctData = CtData.insertColumnsAfter(this.ctData, ctIndex, parsedText.length-1)
  //   }
  //   for (let col = 0; col < parsedText.length; col++ ) {
  //     replaceEditionWitnessToken(witnessIndex, editionWitnessRef + col, parsedText[col].text, this.lang)
  //   }
  //   console.log(`New ct Data after multiple word edit`)
  //   console.log(this.ctData)
  //   return true
  // }

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
    this.serverLogger.error('main', detail, { tableId: this.ctData['tableId']})
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

  genGetPdfDownloadUrlForPreviewPanel() {
    return PdfDownloadUrl.genGetPdfDownloadUrlForPreviewPanel(this.options.urlGenerator)
    // return (rawData) => {
    //   return new Promise( (resolve, reject) => {
    //     let apiUrl = this.options.urlGenerator.apiTypesetRaw()
    //     let dataJson = JSON.stringify(rawData)
    //     console.log(`About to make API call for PDF download url, data size is ${dataJson.length}`)
    //     console.log(`Calling typeset API at ${apiUrl}`)
    //     $.post(
    //       apiUrl,
    //       {data: JSON.stringify({
    //           jsonData: dataJson
    //         })}
    //     ).done(
    //       apiResponse => {
    //         console.log(`Got response from the server:`)
    //         console.log(apiResponse)
    //         if (apiResponse.url === undefined) {
    //           console.error('No url given by server')
    //           reject()
    //         }
    //         resolve(apiResponse.url)
    //       }
    //     ).fail (
    //       error => {
    //         console.error('PDF API error')
    //         console.log(error)
    //         reject()
    //       }
    //     )
    //   })
    // }
  }


  // genOnExportPdf() {
  //   let thisObject = this
  //   return (svg) => {
  //     return new Promise( (resolve, reject) => {
  //       let apiUrl = thisObject.options.urlGenerator.apiConvertSvg()
  //       if (svg === '') {
  //         console.log('No SVG for PDF export')
  //         resolve('')
  //       }
  //       console.log(`Calling export PDF API`)
  //       $.post(
  //         apiUrl,
  //         {data: JSON.stringify({
  //             pdfId: `ct-${thisObject.options.tableId}`,
  //             svg: svg
  //           })}
  //       ).done(
  //         apiResponse => {
  //           resolve(apiResponse.url)
  //         }
  //       ).fail (
  //         error => {
  //           console.error('PDF API error')
  //           console.log(error)
  //           reject()
  //         }
  //       )
  //     })
  //   }
  // }

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
      if (this.saving) {
        console.warn(`Click on save button while saving`)
        return
      }
      let changes = this.getChangesInCtData()
      if (changes.length !== 0) {
        this.saving = true
        this.unsavedChanges = true
        this.saveButton.popover('hide')
        this.saveButton.html(this.icons.busy)
        this.saveButtonPopoverContent = 'Saving...'
        this.saveButtonPopoverTitle = ''
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
          this.saving = false
          this._updateSaveArea()
        }).fail((resp) => {
          this.saveErrors = true
          this.saving = false
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

      let originalTimeStamp = this.ctData['witnesses'][witnessIndex]['timeStamp']

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
      let referencesCleaner = new EditionWitnessReferencesCleaner({verbose: true})
      this.ctData = referencesCleaner.getCleanCtData(this.ctData)

      // 5.Fixes inconsistencies
      let consistencyCleaner = new CollationTableConsistencyCleaner({verbose: true})
      this.ctData = consistencyCleaner.getCleanCtData(this.ctData)
      let inconsistencyErrors = consistencyCleaner.getErrors()
      if (inconsistencyErrors.length !== 0) {
        console.warn(`Inconsistencies found after update!`)
        this.serverLogger.warning('witnessUpdate', `Inconsistencies found in witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]}), table ${this.ctData['tableId']}`, inconsistencyErrors)
      } else {
        this.serverLogger.info('witnessUpdate', `Witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]}) updated in table ${this.ctData['tableId']}`)
      }

      console.log(`New CT data after update`)
      console.log(this.ctData)

      // 4. update panels
      this.witnessUpdates.push({
        witnessIndex: witnessIndex,
        originalTimeStamp: originalTimeStamp,
        updatedTimeStamp: this.ctData['witnesses'][witnessIndex]['timeStamp']
      })
      this._updateSaveArea()
      this._reGenerateEdition(`Witness Update`)
      this._updateDataInPanels(false)
      this.witnessInfoPanel.markWitnessAsJustUpdated(witnessIndex)
      return true
    }
  }

  genCheckWitnessUpdates() {
    return (currentWitnessUpdateData) => {
      return new Promise( (resolve, reject) => {
        let apiUrl = this.options.urlGenerator.apiWitnessCheckUpdates()
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

  genGetDocUrl() {
    return (docId) => {
      return this.options.urlGenerator.siteDocPage(docId)
    }
  }

  genGetPageUrl() {
    return (docId, pageSeq, col) => {
      return this.options.urlGenerator.sitePageView(docId, pageSeq, col)
    }
  }

  genGetPageInfo() {
    return (pageIds) => {
      return new Promise( (resolve, reject) => {

        let pageIdsToGetFromServer = []
        let pageInfoInCache = []
        pageIds.forEach( (pageId) => {
          let cachedInfo = this.cache.retrieve(`PageInfo-${pageId}`)
          if (cachedInfo === null) {
            pageIdsToGetFromServer.push(pageId)
          } else {
            pageInfoInCache.push(cachedInfo)
          }
        })
        if (pageIdsToGetFromServer.length === 0) {
          resolve(pageInfoInCache)
        }
        let apiUrl = this.options.urlGenerator.apiGetPageInfo()
        $.post(apiUrl, { data: JSON.stringify({pages: pageIdsToGetFromServer})})
          .done((pageInfoArrayFromServer) => {
            pageInfoArrayFromServer.forEach( (pageInfo) => {
              this.cache.store(`PageInfo-${pageInfo.id}`, pageInfo)
            })
            pushArray(pageInfoInCache, pageInfoArrayFromServer)
            resolve(pageInfoInCache)
          })
          .fail( function(resp) {
            console.error('Error getting page info')
            console.log(resp)
            reject()
          })
      })
    }
  }

  genAddEditionSources() {
    return (sourceDataArray) => {
      console.log(`Adding sources`)
      console.log(sourceDataArray)
      let currentNumWitnesses = this.ctData.witnesses.length
      sourceDataArray.forEach( (sourceData, index) => {
        this.ctData.witnesses.push( {
          witnessType: WitnessType.SOURCE,
          title: sourceData.title,
          ApmWitnessId: 'source:' + sourceData['tid']
        })
        this.ctData.witnessTitles.push(sourceData.title)
        this.ctData.witnessOrder.push(currentNumWitnesses + index)
        this.ctData.sigla.push(sourceData.defaultSiglum)
      })
      console.log(`New CT data after adding sources`)
      console.log(this.ctData)
      this._updateSaveArea()
      this._reGenerateEdition(`Source added`)
      this._updateDataInPanels(true)
    }
  }

  filterOutUsedSources(sourceInfoArray) {
    return sourceInfoArray.filter( (sourceInfo)=> {
      let sourceApmId = `source:${sourceInfo['tid']}`;
      for (let i = 0; i < this.ctData.witnesses.length; i++) {
        if (this.ctData.witnesses[i]['ApmWitnessId'] === sourceApmId) {
          return false;
        }
      }
      return true;
    })
  }

  genFetchSources() {
    return () => {
      return new Promise( (resolve, reject) => {
        if (this.editionSources !== null) {
          resolve(this.filterOutUsedSources(this.editionSources))
        }
        $.get(this.options.urlGenerator.apiEditionSourcesGetAll())
          .done( (apiResponse) => {
            this.editionSources = apiResponse
            resolve(this.filterOutUsedSources(this.editionSources))
          })
          .fail ( (resp) => {
            reject(resp)
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

    // console.log(`Updating save area`)

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
      // console.log(`No changes`)
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
      // this.editionPreviewPanel.updateData(this.ctData, this.edition)
      this.editionPreviewPanelNew.updateData(this.edition)
      this.witnessInfoPanel.updateCtData(this.ctData, true)
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

    if (!ArrayUtil.varsAreEqual(this.ctData['siglaGroups'], this.lastSavedCtData['siglaGroups'])) {
      changes.push('Changes in sigla groups')
    }


    if (!ArrayUtil.varsAreEqual(this.ctData['customApparatuses'], this.lastSavedCtData['customApparatuses'])) {
      changes.push('Changes in custom apparatus entries')
    }

    if(this.ctData['type'] === CollationTableType.EDITION) {
      let editionWitnessIndex = this.ctData['editionWitnessIndex']
      let oldText = this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      let newText = this.ctData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      if (oldText !== newText) {
        changes.push('Changes in edition text')
      } else {
        if (!ArrayUtil.varsAreEqual(this.ctData['witnesses'][editionWitnessIndex]['tokens'], this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'])){
          changes.push('Formatting changes in edition text')
        }
      }
    }

    this.witnessUpdates.forEach( (updateInfo) => {
      let index = updateInfo.witnessIndex
      changes.push(`Witness ${this.ctData['witnessTitles'][index]} updated from ${updateInfo.originalTimeStamp} to ${updateInfo.updatedTimeStamp}`)
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
    return  (data) => {
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = this.normalizeTitleString(data.detail.newText)
        if (normalizedNewTitle === '') {
          console.debug('Empty new title')
          this.titleField.setText(this.ctData['title'])
          return true
        }
        //console.debug('New title: ' + normalizedNewTitle)
        this.ctData['title'] = normalizedNewTitle
        this.titleField.setText(normalizedNewTitle)
        this._updateSaveArea()
        document.title = `${this.ctData.title} (${this.ctData['chunkId']})`
      }
      return true
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
    let warningSign = ''
    return `<div id="ct-info" title="${workAuthorName}, ${workTitle}; table ID: ${this.tableId}">${this.options.workId}-${this.options.chunkNumber}</div>`
  }

  /**
   *
   * @param {string}type
   * @return {string}
   * @private
   */
  _getTitleForApparatusType(type) {
    return 'App ' + capitalizeFirstLetter(type)
  }

  /**
   *
   * @param {string}type
   * @return {string}
   * @private
   */
  _getLinkTitleForApparatusType(type){
    return `Click to show the Apparatus ${capitalizeFirstLetter(type)}`
  }
}

// Load as global variable so that it can be referenced in the Twig template
window.EditionComposer = EditionComposer