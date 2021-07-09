/*
 *  Copyright (C) 2019-20 Universität zu Köln
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

import { defaultLanguageDefinition } from './defaults/languages'
import * as CollationTableType from './constants/CollationTableType'
import * as CollationTableInitStrategy from './constants/CollationTableConversionInitStrategy'
import * as WitnessType from './constants/WitnessType'
import * as TokenType from './constants/TokenType'
import * as TokenClass from './constants/TokenClass'
import * as NormalizationSource from './constants/NormalizationSource'


import { editModeOff, columnGroupEvent, columnUngroupEvent, TableEditor } from './TableEditor'
import * as CollationTableUtil from './CollationTableUtil'
import * as PopoverFormatter from './CollationTablePopovers'

import {EditionViewerSvg} from './EditionViewerSvg'
import {PrintedEditionGenerator} from './PrintedEditionGenerator'

// widgets
import { EditableTextField } from './widgets/EditableTextField'
import { transientAlert} from './widgets/TransientAlert'
import { NiceToggle, toggleEvent} from './widgets/NiceToggle'
import { MultiToggle, optionChange} from './widgets/MultiToggle'

import * as HttpStatusCode from './toolbox/HttpStatusCode'

// utilities
import * as Util from './toolbox/Util.mjs'
import * as ArrayUtil from './toolbox/ArrayUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { Matrix } from '@thomas-inst/matrix'
import { CriticalApparatusGenerator } from './CriticalApparatusGenerator'
import { EditionViewerHtml } from './EditionViewerHtml'
import { ConfirmDialog } from './ConfirmDialog'
import { VERBOSITY_DEBUG_PLUS, WitnessDiffCalculator } from './WitnessDiffCalculator'
import { FULL_TX } from './constants/TokenClass'

// Normalizations

import { NormalizerRegister } from './NormalizerRegister'

import { ToLowerCaseNormalizer } from './normalizers/ToLowerCaseNormalizer'
import { IgnoreArabicVocalizationNormalizer } from './normalizers/IgnoreArabicVocalizationNormalizer'
import { IgnoreShaddaNormalizer } from './normalizers/IgnoreShaddaNormalizer'
import { RemoveHamzahMaddahFromAlifWawYahNormalizer } from './normalizers/RemoveHamzahMaddahFromAlifWawYahNormalizer'
import { IgnoreTatwilNormalizer } from './normalizers/IgnoreTatwilNormalizer'
import { IgnoreIsolatedHamzaNormalizer } from './normalizers/IgnoreIsolatedHamzaNormalizer'
import { deepCopy } from './toolbox/Util.mjs'

/** @namespace Twig */

// constants

export class CollationTableEditor {
  //collationTable;

  constructor(options) {

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

    let oc = new OptionsChecker(optionsDefinition, "EditCollationTable")
    this.options = oc.getCleanOptions(options)

    // icons
    this.icons = {
      // moveUp: '&#x1f861;',
      moveUp: '&uarr;',
      // moveDown: '&#x1f863;',
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
      loadPreset: '<i class="fas fa-upload"></i>'
    }

    this.rtlClass = 'rtltext'
    this.ltrClass = 'ltrtext'

    this.apiSaveCollationUrl = this.options.urlGenerator.apiSaveCollation()

    let originalCtData = deepCopy(this.options['collationTableData'])
    console.log('Original CtData')
    console.log(originalCtData)

    this.ctData = this.options['collationTableData']
    // use default ordering if ctData does not have one
    if (this.ctData['witnessOrder'] === undefined) {
      console.log('Providing default witnessOrder')
      this.ctData['witnessOrder'] = []
      for(let i=0; i < this.ctData['witnesses'].length; i++) {
        this.ctData['witnessOrder'][i] = i
      }
    }
    if (this.ctData['witnessOrder'].length !== this.ctData['witnesses'].length) {
      console.error('Not enough witnesses in witnessOrder')
      console.log(this.ctData['witnessOrder'])
    }
    // default type is collation table
    if (this.ctData['type'] === undefined) {
      this.ctData['type'] = CollationTableType.COLLATION_TABLE
    }
    // no group, if ctData does not have it
    if (this.ctData['groupedColumns'] === undefined) {
      this.ctData['groupedColumns'] = []
    }

    // check normalization settings
    if (this.ctData['automaticNormalizationsApplied'] === undefined) {
      this.ctData['automaticNormalizationsApplied'] = []
    }

    // let originalCtData = Util.deepCopy(this.ctData)

    console.groupCollapsed(`CT Data Consistency Check`)
    // fix -1 references in edition witness
    if (this.ctData['type'] === CollationTableType.EDITION) {
      this.fixEditionWitnessReferences()
    }

    // consistency check
    this.checkCollationTableConsistency()

    // console.log(`Original CT Data`)
    // console.log(originalCtData)
    // console.log(`CT Data after fixes`)
    // console.log(this.ctData)
    console.groupEnd()

    // by default, the table is not archived
    if (this.ctData['archived']  === undefined) {
      this.ctData['archived'] = false
    }

    this.normalizerRegister = new NormalizerRegister()
    this.registerStandardNormalizers()

    console.log(`Available normalizers`)
    console.log(this.normalizerRegister.getRegisteredNormalizers())

    this.lastSavedCtData = Util.deepCopy(this.ctData)
    this.witnessUpdates = []
    this.tableId = this.options['tableId']
    this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes()
    this.resetTokenDataCache()
    this.siglaPresets = []
    this.siglaPresetLoaded = ''

    // DOM elements
    // this.ctTitleDiv = $('#collationtabletitle')
    // this.ctTitleEditButton = $('#cttitleedit')

    this.ctInfoDiv = $('#collationtableinfo')
    this.breadcrumbCtTitleSpan = $('#breadcrumb-cttitle')
    this.witnessesDivSelector = '#witnessesdiv'
    // this.witnessesDiv = $(this.witnessesDivSelector)
    this.versionInfoDiv = $('#versionhistorydiv')
    this.editionTabTitle = $('#edition-tab-title')
    this.ctDivId = 'collationtablediv'
    this.ctDiv = $('#' + this.ctDivId)
    this.editionSvgDiv = $('#edition-svg-div')
    this.editionHtmlDiv = $('#edition-html-container')
    // this.editionEngineInfoDiv = $('#edition-engine-info-div')
    this.saveButton = $('#savebutton')
    this.saveMsg = $('#save-msg')
    this.lastSaveSpan = $('#lastSave')
    this.exportCsvButton = $('#export-csv-button')
    this.exportSvgButton = $('#export-svg-button')
    this.exportPdfButton = $('#export-pdf-button')
    this.convertToEditionDiv = $('#convert-to-edition-div')
    this.convertToEditionButton = $('#convert-to-edition-btn')
    this.archiveTableButton = $('#archive-table-btn')
    this.normalizationSettingsButton = $('#normalizations-settings-button')

    document.title = `${this.ctData.title} (${this.ctData['chunkId']})`

    this.exportCsvButton.attr("download", `ApmCT_${this.options.workId}-${this.options.chunkNumber}.csv`)
    this.exportSvgButton.attr("download", `ApmQuickEdition_${this.options.workId}-${this.options.chunkNumber}.svg`)

    let thisObject = this

    this.titleField = new EditableTextField({
      containerSelector: '#cttitletext',
      initialText: this.ctData['title'],
      onConfirm: this.genOnConfirmTitleField()
    })

      if (this.ctData.type === CollationTableType.COLLATION_TABLE) {
      this.breadcrumbCtTitleSpan.html("Saved Collation Table")
      this.editionTabTitle.html('Quick Edition')
    } else {
      this.breadcrumbCtTitleSpan.html("Edition")
      this.editionTabTitle.html("Edition Preview")
    }

    this.ctInfoDiv.html(this.genCtInfoDiv())

    // Witness info div
    this.lastWitnessUpdateCheckResponse = ''
    this.updateWitnessInfoDiv()
    this.checkForWitnessUpdates()
    $(this.witnessesDivSelector + ' .check-witness-update-btn').on('click', function(){
      if (!thisObject.checkingForWitnessUpdates) {
        thisObject.checkForWitnessUpdates()
      }
    })
    this.updateVersionInfo()
    this.convertingToEdition = false
    if (this.ctData.type === CollationTableType.COLLATION_TABLE) {
      this.convertToEditionDiv.removeClass('hidden')
      this.convertToEditionButton.on('click', this.genOnClickConvertToEditionButton())
    } else {
      this.convertToEditionDiv.addClass('hidden')
    }


    this.editionSvgDiv.html('Quick edition coming soon...')
    this.ctDiv.html('Collation table coming soon...')
    this.fitCtDivToViewPort()
    this.fitEditionDivToViewPort()

    this.saveButton.on('click', this.genOnClickSaveButton())
    this.textDirection = this.options.langDef[this.ctData['lang']].rtl ? 'rtl' : 'ltr'

    // viewSettings
    this.viewSettings = {
      highlightVariants: true,
      showNormalizations: false
    }

    // popovers for collation table
    this.setUpPopovers()
    this.popoversOn()

    this.popoversToggle = new NiceToggle({
      containerSelector: '#popovers-toggle',
      title: 'Popovers: ',
      onIcon: '<i class="fas fa-toggle-on"></i>',
      onPopoverText: 'Click to disable popovers',
      offIcon: '<i class="fas fa-toggle-off"></i>',
      offPopoverText: 'Click to enable popovers'
    })
    this.popoversToggle.on(toggleEvent, function (ev) {
      if (ev.detail.toggleStatus) {
        thisObject.popoversOn()
      } else {
        thisObject.popoversOff()
      }
    })

    // Normalizers
    this.availableNormalizers = this.normalizerRegister.getRegisteredNormalizers()

    if (this.availableNormalizers.length !== 0) {
      // Set up normalization toggle and settings button
      this.savedNormalizerSettings = this.ctData['automaticNormalizationsApplied'].length === 0 ?
        this.availableNormalizers : this.ctData['automaticNormalizationsApplied']
      this.setupNormalizationSettingsButton()
      this.normalizationsToggle = new NiceToggle({
        containerSelector: '#normalizations-toggle',
        title: 'Normalizations: ',
        initialValue: this.ctData['automaticNormalizationsApplied'].length !== 0,
        onIcon: '<i class="fas fa-toggle-on"></i>',
        onPopoverText: 'Click to disable automatic normalizations',
        offIcon: '<i class="fas fa-toggle-off"></i>',
        offPopoverText: 'Click to enable automatic normalizations'
      })

      this.normalizationsToggle.on(toggleEvent, (ev) => {
        if (ev.detail.toggleStatus) {
          thisObject.normalizationSettingsButton.show()
        } else {
          thisObject.normalizationSettingsButton.hide()
        }
        let automaticNormalizationsApplied  = ev.detail.toggleStatus ?
          thisObject.savedNormalizerSettings : []
        thisObject.applyAutomaticNormalizations(automaticNormalizationsApplied)

      })
      if (this.normalizationsToggle.isOn) {
        this.normalizationSettingsButton.show()
      } else {
        this.normalizationSettingsButton.hide()
      }
    } else {
      // No normalizations available, no need to show normalization settings
      this.normalizationSettingsButton.hide()
    }

    this.normalizationSettingsButton.on('click', this.genOnClickNormalizationSettings())

    this.modeToggle = new MultiToggle({
      containerSelector: '#mode-toggle',
      title: '<b>Edit Mode:</b>',
      buttonClass: 'tb-button',
      initialOption: 'off',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'ct-toolbar-item',
      buttonDef: [
        { label: 'Off', name: 'off', helpText: 'Turn off editing'},
        { label: 'Move', name: 'move', helpText: 'Show controls to move/add/delete cells'},
        { label: 'Group', name: 'group', helpText: 'Show controls to group columns'},
      ]
    })

    this.modeToggle.on(optionChange, (ev) => {
      //console.log('New Edit Mode: ' + ev.detail.currentOption)
      thisObject.tableEditor.setEditMode(ev.detail.currentOption)

    })

    // text direction for collation table div

    if (this.options.langDef[this.ctData['lang']].rtl) {
      this.ctDiv.removeClass(this.ltrClass)
      this.ctDiv.addClass(this.rtlClass)
    } else {
      this.ctDiv.removeClass(this.rtlClass)
      this.ctDiv.addClass(this.ltrClass)
    }
    this.unsavedChanges = false

    // Export PDF
    this.exportPdfButton.on('click', this.genOnClickExportPdfButton())

    let label = this.ctData.type === CollationTableType.EDITION ? 'Edition' : 'Collation Table'
    this.archiveTableButton.html(`Archive This ${label}`)
    if (this.ctData['archived'] === false) {
      this.archiveTableButton.on('click', this._genOnClickArchiveTable())
    } else {
      this.archiveTableButton.addClass('disabled')
        .prop('disabled', true)
    }

    this.setupTableEditor()
    this.updateSaveArea()
    this.setCsvDownloadFile()
    this.updateEditionPreview()

    $('#edition-tab-title-new').on('click', () => {
      console.log('New Panel clicked')
      if (thisObject.editionViewerHtml !== undefined) {
        thisObject.editionViewerHtml.renderApparatuses()
        setTimeout(() => {
        thisObject.fitEditionDivToViewPort() }, 250)
      }
    })

    $(window).on('beforeunload', function() {
      if (thisObject.unsavedChanges || thisObject.convertingToEdition) {
        //console.log("There are changes in editor")
        return false // make the browser ask if the user wants to leave
      }
    })

    $(window).on('resize',
      () => {
        thisObject.fitCtDivToViewPort()
        thisObject.fitEditionDivToViewPort()
      })
  }

  /**
   *
   * @param normalizationsToApply {string[]}
   */
  applyAutomaticNormalizations(normalizationsToApply) {
    let normalizationsSourcesToOverwrite = [
      NormalizationSource.AUTOMATIC_COLLATION,
      NormalizationSource.COLLATION_EDITOR_AUTOMATIC
    ]
    console.log(`Applying normalizations: [ ${normalizationsToApply.join(', ')} ]`)
    this.ctData['automaticNormalizationsApplied'] = normalizationsToApply

    let thisObject = this
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      // console.log(`Processing witness ${i}`)
      let changesInWitness = false
      let newWitnessTokens = this.ctData['witnesses'][i]['tokens'].map( (token, tokenIndex) => {
        if (token['tokenType'] === TokenType.WORD) {
          if (normalizationsToApply.length !== 0) {
            // overwrite normalizations with newly calculated ones
            if (token['normalizationSource'] === undefined ||
              (token['normalizedText'] === '' && token['normalizationSource'] === '') ||
              normalizationsSourcesToOverwrite.indexOf(token['normalizationSource']) !== -1) {
              let normalizedText = thisObject.normalizerRegister.applyNormalizerList(normalizationsToApply, token['text'])
              if (normalizedText === token['text']) {
                //no changes
                return token
              }
              let newToken = deepCopy(token)
              newToken['normalizedText'] = normalizedText
              newToken['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
              console.log(`Witness ${i}, token ${tokenIndex} normalized, ${token['text']} => ${normalizedText}`)
              changesInWitness = true
              return newToken
            } else {
              return token
            }
          } else {
            // remove automatic normalizations
            let newToken = deepCopy(token)
            if (token['normalizedText'] !== undefined &&
              normalizationsSourcesToOverwrite.indexOf(token['normalizationSource']) !== -1) {
              console.log(`Erasing normalization from token ${tokenIndex}, currently '${token['normalizedText']}'`)
              newToken['normalizedText'] = undefined
              newToken['normalizationSource'] = undefined
              changesInWitness = true
            }
            return newToken
          }
        } else {
          return token
        }
      })
      if (changesInWitness) {
        this.ctData['witnesses'][i]['tokens'] = newWitnessTokens
      } else {
        // console.log(`No changes`)
      }
    }
    console.log(`New CT Data after automatic normalizations: [${normalizationsToApply.join(', ')}]`)
    console.log(this.ctData)

    // Update UI
    this.resetTokenDataCache()
    this.setupTableEditor()
    this.updateEditionPreview()
    this.updateSaveArea()
    this.setCsvDownloadFile()
  }

  _genOnClickArchiveTable() {
    let thisObject = this
    let label = this.ctData.type === CollationTableType.EDITION ? 'edition' : 'collation table'
    return () => {
      if (thisObject.ctData['archived'] || thisObject.unsavedChanges) {
        return
      }
      let confirmDialog = new ConfirmDialog({
        body: `
<p>Are you sure you want to archive this ${label}?</p>
<p>The ${label} will no longer be accessible and only an administrator can restore it.</p>`,
        acceptButtonLabel: 'Archive',
        cancelButtonLabel: 'Cancel',
        acceptFunction: (id) => {
          console.log(`About to archive ${label}, id ${id}`)
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
            console.log("Success archiving table")
            console.log(apiResponse)
            thisObject.lastSavedCtData = Util.deepCopy(thisObject.ctData)
            thisObject.lastSavedEditorMatrix = thisObject.tableEditor.getMatrix().clone()
            thisObject.versionInfo = apiResponse.versionInfo
            thisObject.witnessUpdates = []
            for(let i=0; i < thisObject.lastWitnessUpdateCheckResponse['witnesses'].length; i++) {
              if (thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated']) {
                thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated'] = false
              }
            }
            thisObject.unsavedChanges = false
            thisObject.updateWitnessInfoDiv()
            thisObject.updateSaveArea()
            thisObject.updateVersionInfo()
            thisObject.updateEditionPreview()
          }).fail(function(resp){
            thisObject.archiveTableButton.html(`Error archiving, click to try again`)
            console.error("Cannot archive table")
            thisObject.ctData['archived'] = false
            console.log(resp)
          })
        }
      })
      confirmDialog.show()
    }
  }

  checkCollationTableConsistency() {
    console.log(`Checking collation table consistency`)
    let inconsistenciesFound = false
    for (let wIndex = 0; wIndex < this.ctData['witnesses'].length; wIndex++) {
      let ctRow = this.ctData['witnessOrder'].indexOf(wIndex)
      let title = this.ctData['witnessTitles'][wIndex]
      let errorsFound = false
      // console.log(`* Checking witness consistency for witness ${wIndex} (${title}), ctRow = ${ctRow}`)
      // check that the collation table has all text tokens present
      if (this.ctData['type'] === CollationTableType.EDITION && wIndex === this.ctData['editionWitnessIndex']) {
        // console.log(`... edition witness, skipping`)
        continue
      }
      let ctMatrix = new Matrix(0,0,-1)
      ctMatrix.setFromArray(this.ctData['collationMatrix'])
      let row = ctMatrix.getRow(wIndex);
      let lastTokenInCt = -1
      let lastGoodCtCol = -1

      // fix 'null' tokens... which should NEVER happen
      this.ctData['witnesses'][wIndex]['tokens'] =
        this.ctData['witnesses'][wIndex]['tokens'].map( (t, i) => {
          if (t === null) {
            console.log(`Found null token in witness ${wIndex}, index ${i}`)
            return {
              tokenType: TokenType.WORD,
              text: '',
              tokenClass: TokenClass.FULL_TX,
              sourceItems: [],
              textBox: 1,
              line: 1
            }
          }
          return t
        })

      this.ctData['witnesses'][wIndex]['tokens'].forEach( (t, i) => {
        if (t.tokenType === TokenType.WORD) {
          let ctIndex = row.indexOf(i)
          if (ctIndex === -1) {
            errorsFound = true
            inconsistenciesFound = true
            console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
            console.log(`- text token ${i} not in collation table, text = '${t.text}', last token in CT: ${lastTokenInCt} @ col ${lastGoodCtCol+1}`)
            // fix it!
            let nextNullRefIndex = this.findNextNullRefInArray(row, lastGoodCtCol)
            if (nextNullRefIndex === -1) {
              console.log(`--- No room for token in CT, need to add a new column (not implemented yet)`)
            } else {
                // shift may be needed
                let nColsToShift = nextNullRefIndex - lastGoodCtCol - 1
                for (let c = 0; c < nColsToShift; c++) {
                  ctMatrix.setValue(wIndex, nextNullRefIndex-c, ctMatrix.getValue(wIndex, nextNullRefIndex-c-1))
                }
                ctMatrix.setValue(wIndex,lastGoodCtCol+1, i)
                row = ctMatrix.getRow(wIndex)
                lastGoodCtCol = lastGoodCtCol+1
                lastTokenInCt = i
                console.log(`--- Fixed, ${ nColsToShift !== 0 ? 'shifted ' + nColsToShift + ' cols' : ' no shift needed'}, token now in ct col ${lastGoodCtCol+1}`)
            }
          } else {
            lastTokenInCt = i
            lastGoodCtCol = ctIndex
          }
        }
      })
      // check that tokens in CT are in the right order
      let lastTokenRef = -1
      let lastColumn = -1
      let columnsInWrongOrder = false
      row = ctMatrix.getRow(wIndex)
      row.forEach( (tokenRef,ctIndex) => {
        if (tokenRef === -1) {
          return
        }
        if (tokenRef <= lastTokenRef) {
          console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
          console.log(` - Token at column ${ctIndex+1} is in the wrong order, ref = ${tokenRef}, last ref = ${lastTokenRef} at col ${lastColumn+1}`)
          columnsInWrongOrder = true
        }
        lastTokenRef = tokenRef
        lastColumn = ctIndex
      })
      if (columnsInWrongOrder) {
        errorsFound = true
        inconsistenciesFound = true
        // re-order the columns
        let orderedTokenRefs = row.filter( (ref) => {return ref!==-1}).sort( (a,b) => {
          if (a>b) {
            return 1
          }
          if (a < b) {
            return -1
          }
          return  0
        })
        // console.log(`Sorted refs`)
        // console.log(orderedTokenRefs)
        let goodRefIndex = -1
        row.forEach( (ref, i) => {
          if (ref === -1) {
            ctMatrix.setValue(wIndex, i, -1)
          } else {
            goodRefIndex++
            ctMatrix.setValue(wIndex, i, orderedTokenRefs[goodRefIndex])
          }
        })
        console.log(`-- Order problems fixed`)
        // console.log(`Original row`)
        // console.log(row)
        // console.log(`Fixed row`)
        // console.log(ctMatrix.getRow(wIndex))
      }
      if (errorsFound) {
        // replace fixed collation table
        this.ctData['collationMatrix'] = this.matrixToArray(ctMatrix)
      } else {
        // console.log(`... no problems found`)
      }
    }
    if (inconsistenciesFound) {
      console.log(`... finished, inconsistencies fixed.`)
    } else {
      console.log(`... all good, no inconsistencies found`)
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
            label: 'Ignore vocalization',
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

  matrixToArray(matrix) {
    let theArray = []
    for (let i = 0; i < matrix.nRows; i++) {
      theArray[i] = matrix.getRow(i)
    }
    return theArray
  }
  findNextNullRefInArray(theArray, startingIndex) {
    for (let i = startingIndex; i < theArray.length; i++) {
      if (theArray[i] === -1) {
        return i
      }
    }
    return -1
  }

  fixEditionWitnessReferences() {

    console.log(`Checking for -1 references in edition witness`)
    let editionWitnessIndex = this.ctData['editionWitnessIndex']
    if (editionWitnessIndex === undefined) {
      // not an edition, nothing to do
      return
    }
    let editionWitnessTokens = this.ctData.witnesses[editionWitnessIndex]['tokens']
    let ctEditionRow = this.ctData.collationMatrix[editionWitnessIndex]

    let foundNullRef = false
    let newEditionWitnessTokens = ctEditionRow.map ( (ref, i) => {
      if (ref === -1) {
        console.log(`Adding empty token in edition witness at column ${i}`)
        foundNullRef = true
        return { 'tokenClass':  TokenClass.EDITION, 'tokenType': TokenType.EMPTY, 'text': ''}
      }
      return editionWitnessTokens[ref]
    })

    if (foundNullRef) {
      let newCtEditionRow = ctEditionRow.map( (ref, i) => {
        return i
      })
      // console.log('Old Edition Witness Tokens')
      // console.log(editionWitnessTokens)
      // console.log('New Edition Witness Tokens')
      // console.log(newEditionWitnessTokens)
      // console.log('Old CT edition row')
      // console.log(ctEditionRow)
      // console.log('New CT Edition Row')
      // console.log(newCtEditionRow)

      this.ctData.witnesses[editionWitnessIndex]['tokens'] = newEditionWitnessTokens
      this.ctData.collationMatrix[editionWitnessIndex] = newCtEditionRow

    } else {
      console.log('...all good, none found')
    }
  }

  fitCtDivToViewPort() {
    let ctDivTop = this.ctDiv.offset().top
    let windowHeight = document.defaultView.innerHeight
    let currentHeight = this.ctDiv.height()
    let newHeight = windowHeight - ctDivTop - 10
    if (newHeight !== currentHeight) {
      //console.log(`Current H: ${currentHeight}, newHeight: ${newHeight}`)
      this.ctDiv.height(newHeight)
    }
  }

  fitEditionDivToViewPort() {
    let ctDivTop = this.editionHtmlDiv.offset().top
    let windowHeight = document.defaultView.innerHeight
    let currentHeight = this.editionHtmlDiv.height()
    let newHeight = windowHeight - ctDivTop - 20
    if (newHeight !== currentHeight) {
      //console.log(`Current H: ${currentHeight}, newHeight: ${newHeight}`)
      this.editionHtmlDiv.height(newHeight)
    }
  }
  //
  // editMode() {
  //   return this.modeToggle.getOption()
  // }

  genOnClickExportPdfButton() {
    let thisObject = this
    return function() {
      console.log('Export PDF clicked')
      let buttonHtml = thisObject.exportPdfButton.html()
      thisObject.exportPdfButton.html(`Generating PDF...` + thisObject.icons.busy)
      let svg = thisObject.editionSvgDiv.html()
      if (svg === '') {
        return false
      }
      console.log('Calling API')
      let apiUrl = thisObject.options.urlGenerator.apiConvertSvg()
      $.post(
        apiUrl,
        {data: JSON.stringify({
            pdfId: `ct-${thisObject.options.tableId}`,
            svg: svg
        })}
      ).done(
        apiResponse => {
          window.open(apiResponse.url)
          thisObject.exportPdfButton.html(buttonHtml)
        }
      ).fail (
        error => {
          console.error('API error')
          console.log(error)
        }
      )
      return false
    }
  }

  checkForWitnessUpdates() {
    let profiler = new SimpleProfiler('Check-Witness-Updates')
    this.checkingForWitnessUpdates = true
    let button = $(this.witnessesDivSelector + ' .check-witness-update-btn')
    button.html('Checking... ' + this.icons.busy)
    button.attr('title', '')
    let thisObject = this

    let apiUrl = this.options.urlGenerator.apiWitnessCheckUpdates()
    let apiCallOptions = {
      witnesses: []
    }
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      if (this.ctData['witnesses'][i]['witnessType'] === WitnessType.FULL_TX) {
        apiCallOptions.witnesses[i] = {
          id: this.ctData['witnesses'][i]['ApmWitnessId']
        }
      }
    }
    $.post(apiUrl, { data: JSON.stringify(apiCallOptions)})
      .done(function(apiResponse){
        //console.log('Got witness updates info from server')
        //console.log(apiResponse)
        thisObject.lastWitnessUpdateCheckResponse = apiResponse
        thisObject.checkingForWitnessUpdates = false
        thisObject.updateWitnessUpdateCheckInfo(apiResponse)
        profiler.stop()
      })
      .fail( function(resp) {
        console.error('Error checking witness updates')
        console.log(resp)
    })
  }

  setupNormalizationSettingsButton() {
    if (this.savedNormalizerSettings.length !== this.availableNormalizers.length) {
      this.normalizationSettingsButton.html(`${this.icons.editSettings}<sup>*</sup>`)
      this.normalizationSettingsButton.attr('title',
        `${this.savedNormalizerSettings.length} of ${this.availableNormalizers.length} normalizations applied. Click to change.`)
    } else {
      console.log(`All normalizations`)
      this.normalizationSettingsButton.html(`${this.icons.editSettings}`)
      this.normalizationSettingsButton.attr('title', `All standard normalizations applied. Click to change.`)
    }
  }

  genOnClickNormalizationSettings(){
    let thisObject = this
    return (ev) => {
      ev.preventDefault()
      let availableNormalizers = thisObject.normalizerRegister.getRegisteredNormalizers()
      if (availableNormalizers.length === 0) {
        console.warn(`Click on normalization settings, but no normalizations are available`)
        return
      }

      let modalSelector = '#normalization-settings-modal'
      $('body')
        .remove(modalSelector)
        .append(thisObject.getTemplateNormalizationSettingsDialog().render())

      let togglesDiv = $(`${modalSelector} .normalization-toggles`)

      let normalizerMetadata = availableNormalizers.map ( (name) => {
        let obj = thisObject.normalizerRegister.getNormalizerMetadata(name)
        obj.name = name
        return obj
      })
      let togglesHtml = '<ul class="normalization-list">'
      normalizerMetadata.forEach( (data) => {
        togglesHtml += `<li><input type="checkbox" class="normalizer-checkbox normalizer-${data['name']}" title="${data['help']}">&nbsp;&nbsp;${data['label']}</li>`
      })
      togglesHtml += '</ul>'

      togglesDiv.html(togglesHtml)

      let currentlyAppliedNormalizers = thisObject.ctData['automaticNormalizationsApplied']

      currentlyAppliedNormalizers.forEach( (name) => {
        $(`${modalSelector} .normalizer-${name}`).prop('checked', true)
      })

      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let submitButton = $(`${modalSelector} .submit-btn`)
      let statusSpan = $(`${modalSelector} .status-span`)

      cancelButton.on('click', function(){
        $(modalSelector).modal('hide')
      })

      submitButton.on('click', () => {
        let checkedNormalizers = availableNormalizers.filter( (name) => {
          return $(`${modalSelector} .normalizer-${name}`).prop('checked')
        })

        console.log(`Checked normalizers`)
        console.log(checkedNormalizers)
        if (!ArrayUtil.arraysAreEqual(checkedNormalizers, currentlyAppliedNormalizers, (a, b) => { return a===b})){
          console.log(`Change in applied normalizers`)
          if (checkedNormalizers.length === 0) {
            // this is the same as turning normalizations off
            submitButton.hide()
            cancelButton.hide()
            statusSpan.html(`Turning off normalizations  ${thisObject.icons.busy}`)

            thisObject.applyAutomaticNormalizations([])
            thisObject.savedNormalizerSettings = thisObject.availableNormalizers
            thisObject.normalizationsToggle.toggleOff()
            thisObject.normalizationSettingsButton.hide()

          } else {
            submitButton.hide()
            cancelButton.hide()
            statusSpan.html(`Recalculating normalizations ${thisObject.icons.busy}`)
            thisObject.applyAutomaticNormalizations(checkedNormalizers)
            thisObject.savedNormalizerSettings = checkedNormalizers
          }
        } else {
          console.log(`No change in applied normalizers `)
        }
        this.setupNormalizationSettingsButton()
        submitButton.show()
        cancelButton.show()
        statusSpan.html('')
        $(modalSelector).modal('hide')
      })


      $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: false
      })
      $(modalSelector).modal('show')
    }
  }

  genOnClickConvertToEditionButton() {
    let thisObject = this
    return () => {
      if (thisObject.ctData.type === CollationTableType.EDITION) {
        return true
      }

      let modalSelector = '#convert-to-edition-modal'

      let twigTemplate = thisObject.getTemplateConvertToEditionDialog()
      $('body').remove(modalSelector)
        .append(twigTemplate.render({ firstWitnessTitle: thisObject.ctData['witnessTitles'][thisObject.ctData.witnessOrder[0]]}))
      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let submitButton = $(`${modalSelector} .submit-btn`)
      let resultSpan = $(`${modalSelector} .result`)
      let mostCommonVariantCheck = $(`${modalSelector} .most-common-variant-check`)
      let topWitnessCheck = $(`${modalSelector} .top-witness-check`)

      cancelButton.on('click', function(){
        $(modalSelector).modal('hide')
      })
      submitButton.on('click', function(){
        cancelButton.addClass('hidden')
        submitButton.addClass('hidden')
        mostCommonVariantCheck.prop('disabled', true)
        topWitnessCheck.prop('disabled', true)
        let initStrategy = topWitnessCheck.prop('checked') ?
          CollationTableInitStrategy.TOP_WITNESS :
          CollationTableInitStrategy.MOST_COMMON_VARIANT
        $(modalSelector + ' .modal-body').addClass('text-muted')
        resultSpan.html(`Waiting for server's response... ${thisObject.icons.busy}`).addClass('text-warning')
        thisObject.convertingToEdition = true
        $.post(
            thisObject.options.urlGenerator.apiConvertCollationTable(thisObject.tableId),
            { data: JSON.stringify({
                tableId: thisObject.tableId,
                initStrategy: initStrategy
              }) }
        )
          .then( (apiResponse) => {
            resultSpan.html(`<b>Done!</b> The new edition is available <b><a href="${apiResponse.url}">here</a></b>`)
            resultSpan.removeClass('text-warning')
              .addClass('text-success')
            thisObject.convertingToEdition = false
          })
          .fail( (resp) => {
            resultSpan.html(`<b>Error! Please report to administrator.<br/>Status code ${resp.status}`)
              .removeClass('text-warning')
              .addClass('text-danger')
            cancelButton.removeClass('hidden')
            thisObject.convertingToEdition = false
            console.error('Cannot convert to edition')
            console.log(resp)
          })

      })
      $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: false
      })
      $(modalSelector).modal('show')
    }
  }

  genOnClickWitnessUpdate(witnessIndex) {
    let thisObject = this
    return function() {
      let profiler = new SimpleProfiler('Witness-Update')
      let twigTemplate = thisObject.getTemplateUpdateDialog(witnessIndex)
      let currentWitness = thisObject.ctData['witnesses'][witnessIndex]
      let newWitnessInfo = thisObject.lastWitnessUpdateCheckResponse['witnesses'][witnessIndex]
      if (newWitnessInfo['upToDate']) {
        console.error(`Attempt to update witness ${witnessIndex}, which is up to date`)
        return false
      }

      $('body').append(twigTemplate.render({
        witnessTitle: thisObject.ctData['witnessTitles'][witnessIndex],
        currentVersion: Util.formatVersionTime(currentWitness['timeStamp']),
        newVersion: Util.formatVersionTime(newWitnessInfo['lastUpdate']),
      }))
      let modalSelector = `#update-modal-${witnessIndex}`
      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let acceptButton = $(`${modalSelector} .accept-btn`)
      let loadP = $(modalSelector + ' .load')
      let calcP = $(modalSelector + ' .calc-changes')
      let reviewP = $(modalSelector + ' .review-changes')
      let doChangesP = $(modalSelector + ' .do-changes')
      let changesDiv = $(modalSelector + ' .changes')

      // Set step titles
      let loadStepTitle = '1. Load New Version'
      let calcChangesStepTitle = '2. Calculate Changes'
      let reviewChangesStepTitle = '3. Review Changes'
      let doChangesStepTitle = '4. Update Collation Table'

      loadP.html(loadStepTitle)
      calcP.html(calcChangesStepTitle)
      reviewP.html(reviewChangesStepTitle)
      doChangesP.html(doChangesStepTitle)

      cancelButton.on('click', function(){
        $(modalSelector).modal('hide')
        $(modalSelector).remove()
        thisObject.updateWitnessModalOn = false
      })
      $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: false
      })
      $(modalSelector).on('shown.bs.modal', function () {
        profiler.lap('all set to start process')
        thisObject.updateWitnessModalOn = true
        // 1. Load new version
        // 1.1. move to step 1 in the UI
        loadP.html(`${loadStepTitle} ${thisObject.icons.busy}`)
        loadP.removeClass('status-waiting')
        loadP.addClass('status-running')
        // 1.2. actually load the new version
        let apiUrl = thisObject.options.urlGenerator.apiWitnessGet(newWitnessInfo['updatedWitnessId'], 'standardData')
        $.get(apiUrl)
          .then(
            // Load new version success
            serverResponse => {
              // 2. Calculate changes
              profiler.lap('witness loaded')
              console.log('Loaded witness')
              console.log(serverResponse)
              let newWitness = serverResponse['witnessData']

              // 2.1 move to step 2 in the UI
              loadP.html(`${loadStepTitle} ${thisObject.icons.checkOK}`)
              loadP.removeClass('status-running')
              loadP.addClass('status-done')
              calcP.html(`${calcChangesStepTitle} ${thisObject.icons.busy}`)
              calcP.removeClass('status-waiting')
              calcP.addClass('status-running')

              // 2.2 the actual calculation
              let witnessDiffCalculator = new WitnessDiffCalculator({ verbosity: VERBOSITY_DEBUG_PLUS })
              let ctRowIndex = thisObject.ctData['witnessOrder'].indexOf(witnessIndex)
              let collationRow = thisObject.tableEditor.getRow(ctRowIndex)
              let changes =  witnessDiffCalculator.getChangesBetweenWitnesses(ctRowIndex, collationRow, currentWitness, newWitness)

              return { changes: changes, newWitness: newWitness}
            },
            //  Load new version fail
            reason => {
              loadP.removeClass('status-running')
              loadP.addClass('status-fail')
              let errorMsg = 'FAIL:'
              errorMsg += `Server status ${reason.status}`
              if (reason.responseJSON !== undefined) {
                errorMsg += `, error message: '${reason.responseJSON.error}'`
              }
              loadP.html(`${loadStepTitle} ${thisObject.icons.checkCross} ${errorMsg}`)
              console.error('Could not load new version from server')
              console.log(reason)
              throw reason //stop the chain
            }
          )
          .then(
            changeData => {
              profiler.lap('changes calculated')
              let changes = changeData['changes']
              console.log(changes)
              // 3. Review Changes
              calcP.html(`${calcChangesStepTitle} ${thisObject.icons.checkOK}`)
              calcP.removeClass('status-running')
              calcP.addClass('status-done')

              // show changes
              let html = ''
              html += '<h5>Changes:</h5>'
              html += '<ul>'
              if (changes.ctChanges.length !== 0) {

                function tokenText(token) {
                  let text = `'${token.text}'`
                  if (token['normalizedText'] !== undefined) {
                    text += ` (normalization: '${token['normalizedText']}')`
                  }
                  return text
                }

                for(const ctChange of changes.ctChanges) {
                  html += '<li>'
                  switch (ctChange.type) {
                    case 'insertColAfter':
                      html += `New column will be added after column ${ctChange.afterCol+1} (${tokenText(ctChange.currentToken)}) with the word ${tokenText(ctChange.newToken)}`
                      break

                    case 'emptyCell':
                      html += `Column ${ctChange.col+1} will be emptied, currently contains the word ${tokenText(ctChange.currentToken)}`
                      break

                    case 'replace':
                      html += `Column ${ctChange.col+1} will change from ${tokenText(ctChange.currentToken)} to ${tokenText(ctChange.newToken)}`
                      break

                    default:
                      console.log('Unsupported change found in collation table changes')
                      console.log(ctChange)
                  }
                  html += '</li>'
                }
              }
              if (changes.nonCtChanges.length !== 0) {
                html += '<li>Minor changes in the transcription that do not affect the collation table, e.g., added spaces, punctuation, etc.</li>'
              }
              if (changes.ctChanges.length === 0 && changes.nonCtChanges.length === 0) {
                html += '<li>Minor changes in underlying data that do not affect the collation table, e.g., internal APM data, line numbers, etc.'
              }
              html += '</ul>'
              changesDiv.html(html)

              reviewP.removeClass('status-waiting')
              reviewP.addClass('status-running')
              acceptButton.removeClass('hidden')
              acceptButton.on('click', function () {
                // 4. Do Changes!!
                profiler.lap('user clicked the accept button')
                console.log('Changes accepted')
                reviewP.html(`${reviewChangesStepTitle} ${thisObject.icons.checkOK}`)
                reviewP.removeClass('status-running')
                reviewP.addClass('status-done')
                acceptButton.addClass('hidden')
                cancelButton.prop('disabled', true)

                doChangesP.removeClass('status-waiting')
                doChangesP.addClass('status-running')
                doChangesP.html(`${doChangesStepTitle} ${thisObject.icons.busy}`)

                // actually do the changes!
                thisObject.updateWitness(witnessIndex, changeData)
                // changes done!

                doChangesP.removeClass('status-running')
                doChangesP.addClass('status-done')
                doChangesP.html(`${doChangesStepTitle} ${thisObject.icons.checkOK}`)
                cancelButton.html('Done!')
                cancelButton.prop('disabled', false)
                profiler.stop()
              })
            })
          .catch( reason => {
            console.log(`Errors detected, reason: ${reason}`)
        })
      })
      // go!
      $(modalSelector).modal('show')
    }
  }

  updateWitness(witnessIndex, changeData) {
    let ctRow = this.ctData['witnessOrder'].indexOf(witnessIndex)
    let profiler =new SimpleProfiler('updateWitness')
    let changes = changeData.changes
    console.log(`About to update witness ${witnessIndex}, ctRow = ${ctRow} `)
    console.log(changeData)

    //1. update the current references in the collation table row
    // this will take care of 'emptyCell'  and 'replace' changes in changes.ctChanges
    let currentCtRow = this.tableEditor.getRow(ctRow)
    for(let i = 0; i < currentCtRow.length; i++) {
      let currentRef = this.tableEditor.getValue(ctRow, i)
      if (currentRef !== -1) {
        let newRef = changes['tokenConversionArray'][currentRef]
        if (newRef === undefined) {
          newRef = -1
          console.warn(`Found undefined new ref in token conversion array, currentRef = ${currentRef}, setting to -1 for now`)
        }
        //console.log(`Changing ref in table editor row ${ctRow}, col ${i}, from ${currentRef} to ${changes['tokenConversionArray'][currentRef]} `)
        this.tableEditor.setValue(ctRow, i, newRef)
      }
    }

    // 2. insert columns as needed
    let columnsInserted = 0
    for (const change of changes.ctChanges) {
      if (change.type === 'insertColAfter') {
        console.log(`Processing column insert`)
        this.tableEditor.insertColumnAfter(change.afterCol + columnsInserted)
        columnsInserted++
        console.log(`Columns inserted: ${columnsInserted}`)
        for (let row = 0; row < this.tableEditor.matrix.nRows; row++) {
          console.log(`Setting reference at row ${row}, col ${change.afterCol+columnsInserted} to -1`)
          this.tableEditor.setValue(row, change.afterCol + columnsInserted,-1)
        }
        console.log(`Updating reference in tableEditor row ${ctRow}, col ${change.afterCol + columnsInserted}, new ref=${change.tokenIndexInNewWitness}`)
        this.tableEditor.setValue(ctRow, change.afterCol + columnsInserted, change.tokenIndexInNewWitness)
        let clonedMatrix = this.tableEditor.matrix.clone()
        clonedMatrix.logMatrix('Table editor Matrix (cloned)')
      }
    }

    // 3. replace witness in ctData
    this.ctData['witnesses'][witnessIndex] = changeData.newWitness

    // 4. Reflect changes in user interface
    this.witnessUpdates.push({witnessIndex: witnessIndex, changeData: changeData})
    this.lastWitnessUpdateCheckResponse['witnesses'][witnessIndex]['upToDate'] = true
    this.lastWitnessUpdateCheckResponse['witnesses'][witnessIndex]['justUpdated'] = true
    this.ctData['collationMatrix'] = this.getCollationMatrixFromTableEditor()
    console.log('New ctData')
    console.log(this.ctData)
    this.fixEditionWitnessReferences()
    // console.log('After fix references')
    // console.log(this.ctData)
    this.checkCollationTableConsistency()
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes()
    this.resetTokenDataCache()
    this.setupTableEditor()
    //this.recalculateVariants()
    //this.tableEditor.redrawTable()
    this.updateWitnessInfoDiv()
    this.updateSaveArea()
    this.setCsvDownloadFile()
    this.updateEditionPreview()

    profiler.stop()
  }

  updateWitnessUpdateCheckInfo(apiResponse) {
    let infoSpan = $(this.witnessesDivSelector + ' .witness-update-info')
    let button = $(this.witnessesDivSelector + ' .check-witness-update-btn')
    let witnessesUpToDate = true
    for(let i=0; i < apiResponse['witnesses'].length; i++) {
      let witnessUpdateInfo = apiResponse['witnesses'][i]
      if (!witnessUpdateInfo['upToDate']) {
        let warningTd = $(`${this.witnessesDivSelector} td.outofdate-td-${i}`)
        if (witnessUpdateInfo['lastUpdate'] === -1) {
          // witness no longer defined
          warningTd.html(`<span>${this.icons.checkFail} Chunk no longer present in this witness`)
        } else {
          witnessesUpToDate = false
          let warningHtml =  `<span>${this.icons.checkFail} Last version:  `
          warningHtml += `${Util.formatVersionTime(witnessUpdateInfo['lastUpdate'])} `
          warningHtml += `<a title="Click to update witness" class="btn btn-outline-secondary btn-sm witness-update-btn witness-update-btn-${i}">Update</a>`
          warningTd.html(warningHtml)
        }
      }
      if (witnessUpdateInfo['justUpdated']) {
        let warningHtml =  `<span>${this.icons.checkOK} Just updated. Don't forget to save!`
        let warningTd = $(`${this.witnessesDivSelector} td.outofdate-td-${i}`)
        warningTd.html(warningHtml)
      }
      $(`${this.witnessesDivSelector} .witness-update-btn-${i}`).on('click', this.genOnClickWitnessUpdate(i))
    }
    if (witnessesUpToDate) {
      infoSpan.removeClass('text-warning')
      infoSpan.addClass('text-success')
      infoSpan.html(`${this.icons.checkOK} All witnesses are up to date (last checked ${Util.formatVersionTime(apiResponse.timeStamp)})`)
    } else {
      infoSpan.removeClass('text-success')
      infoSpan.addClass('text-warning')
      infoSpan.html(`${this.icons.checkFail} One or more witnesses out of date (last checked ${Util.formatVersionTime(apiResponse.timeStamp)})`)
    }

    button.html('Check now')
    button.attr('title', 'Click to check for updates to witness transcriptions')
  }

  setUpPopovers() {
    this.ctDiv.popover({
      trigger: "hover",
      selector: '.withpopover',
      delay: {show: 500 , hide:0},
      placement: 'top',
      html: true,
      title: '',
      container: 'body',
      content: this.genPopoverContentFunction()
    })
  }

  // hideAllCurrentPopovers() {
  //   $('div.popover').hide()
  //   this.ctDiv.popover('dispose')
  // }

  restoreHiddenPopovers() {
    // $('div.popover').show()
    // this.setUpPopovers()
  }

  genOnEnterCellEditMode() {
    let thisObject = this
    return (row, col) => {
      console.log (`Enter cell edit ${row}:${col}`)
      $(thisObject.tableEditor.getTdSelector(row, col)).popover('hide').popover('disable')

      return true
    }
  }

  genOnLeaveCellEditMode() {
    let thisObject = this
    return (row, col) => {
      console.log(`Leave cell edit ${row}:${col}`)
      $(thisObject.tableEditor.getTdSelector(row, col)).popover('enable')
      thisObject.restoreHiddenPopovers()
    }
  }

  genPopoverContentFunction() {
    let thisObject = this
    return function() {
      if (!thisObject.popoversAreOn) {
        return ''
      }

      let cellIndex = thisObject.tableEditor._getCellIndexFromElement($(this))
      if (cellIndex === null) {
        console.error('Popover requested on a non-cell element!')
      }

      if (thisObject.tableEditor.isCellInEditMode(cellIndex.row, cellIndex.col)){
        // console.log(`Cell ${cellIndex.row}:${cellIndex.col} in is cell edit mode`)
        return ''
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][cellIndex.row]
      //if (thisObject.ctData['witnesses'][witnessIndex]['witnessType'] === WitnessType.FULL_TX) {
        let tokenIndex = thisObject.tableEditor.getValue(cellIndex.row, cellIndex.col)
        console.log(`Getting popover for witness index ${witnessIndex}, token ${tokenIndex}, col ${cellIndex.col}`)
        return thisObject.getPopoverHtml(witnessIndex, tokenIndex, cellIndex.col)
      //}
      //console.log(`No popover text on witness ${witnessIndex}, row ${cellIndex.row}, col ${cellIndex.col}`)
      //return ''
    }
  }

  popoversOn() {
    this.popoversAreOn = true
    this.setUpPopovers()
  }

  popoversOff() {
    this.popoversAreOn = false
    this.ctDiv.popover('dispose')
  }

  getCollationMatrixFromTableEditor() {
    let matrix = this.tableEditor.getMatrix()
    let cMatrix = []
    for(let row = 0; row < matrix.nRows; row++) {
      let witnessIndex = this.ctData['witnessOrder'][row]
      cMatrix[witnessIndex] = []
      for (let col =0; col < matrix.nCols; col++) {
        cMatrix[witnessIndex][col] = matrix.getValue(row, col)
      }
    }
    return cMatrix
  }

  setupTableEditor() {
    let collationTable = this.ctData
    let rowDefinition = []
    for (let i = 0; i < collationTable['witnessOrder'].length; i++) {
      let wIndex = collationTable['witnessOrder'][i]
      let title = ''
      // if (collationTable.type === CollationTableType.EDITION && wIndex === collationTable['editionWitnessIndex']) {
        title = collationTable['witnessTitles'][wIndex]
      // } else {
      //   title = `${collationTable['witnessTitles'][wIndex]} (${collationTable['sigla'][wIndex]})`
      // }

      let tokenArray = collationTable['collationMatrix'][wIndex]
      let isEditable = false
      if (collationTable['witnesses'][wIndex]['witnessType'] === WitnessType.EDITION) {
        isEditable = true
      }
      rowDefinition.push({
        title: title,
        values: tokenArray,
        isEditable: isEditable
      })
    }
    let icons = TableEditor.genTextIconSet()
    icons.editCell = this.icons.editText
    icons.confirmCellEdit = this.icons.confirmEdit
    icons.cancelCellEdit = this.icons.cancelEdit

    this.tableEditor = new TableEditor({
      id: this.ctDivId,
      textDirection: this.textDirection,
      redrawOnCellShift: false,
      showInMultipleRows: true,
      columnsPerRow: 15, // TODO: change this
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: () => -1,
      isEmptyValue: this.genIsEmpty(),
      groupedColumns: this.ctData.groupedColumns,
      generateCellContent: this.genGenerateCellContentFunction(),
      generateCellContentEditMode: this.genGenerateCellContentEditModeFunction(),
      onCellEnterEditMode: this.genOnEnterCellEditMode(),
      onCellLeaveEditMode: this.genOnLeaveCellEditMode(),
      onCellConfirmEdit: this.genOnCellConfirmEditFunction(),
      cellValidationFunction: this.genCellValidationFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      icons: icons
    })

    this.variantsMatrix = null // will be calculated before table draw

    let thisObject = this

    this.tableEditor.setOption('canDeleteColumn', this.genCanDeleteColumn())

    // hide popovers before moving cells
    this.tableEditor.on('cell-pre-shift', function(data){
      for(const selector of data.detail.selectors) {
        $(selector).popover('hide')
      }
    })

    // recalculate variants before redrawing the table
    this.tableEditor.on('table-drawn-pre', function () {
      thisObject.recalculateVariants()
    })
    // handle cell shifts
    this.tableEditor.on('cell-post-shift',this.genOnCellPostShift())

    this.tableEditor.editModeOn(false)
    this.tableEditor.redrawTable()
    this.tableEditor.on('column-delete', this.genOnColumnDelete())
    this.tableEditor.on('column-add', this.genOnColumnAdd())
    this.tableEditor.on('column-add column-delete cell-shift content-changed', this.genOnCollationChanges())
    this.tableEditor.on(columnGroupEvent, this.genOnGroupUngroupColumn(true))
    this.tableEditor.on(columnUngroupEvent, this.genOnGroupUngroupColumn(false))
    this.tableEditor.setEditMode(editModeOff)
  }

  genOnColumnAdd() {
    let thisObject = this
    return () => {
      thisObject.ctData['groupedColumns'] = thisObject.tableEditor.columnSequence.groupedWithNextNumbers
      if (thisObject.ctData['type']===CollationTableType.EDITION) {
        thisObject.syncEditionWitnessAndTableEditorFirstRow()
      }
    }
  }

  syncEditionWitnessAndTableEditorFirstRow() {
    let editionWitnessIndex = this.ctData['witnessOrder'][0]
    this.ctData['witnesses'][editionWitnessIndex].tokens = this.getEditionWitnessTokensFromMatrixRow(
      this.ctData['witnesses'][editionWitnessIndex].tokens,
      this.tableEditor.matrix.getRow(0)
    )
    for (let i = 0; i < this.tableEditor.matrix.nCols; i++) {
      this.tableEditor.matrix.setValue(0, i, i)
    }
  }

  genOnColumnDelete() {
    let thisObject = this
    return () => {
      thisObject.ctData['groupedColumns'] = thisObject.tableEditor.columnSequence.groupedWithNextNumbers
      if (thisObject.ctData['type'] === CollationTableType.COLLATION_TABLE) {
        // nothing else to do for regular collation tables
        return
      }
      thisObject.syncEditionWitnessAndTableEditorFirstRow()
    }
  }

  genCanDeleteColumn() {
    let thisObject = this
    return (col) => {
      switch(thisObject.ctData['type']) {
        case CollationTableType.COLLATION_TABLE:
          return thisObject.tableEditor.isColumnEmpty(col)

        case CollationTableType.EDITION:
          let theMatrixCol = thisObject.tableEditor.getMatrix().getColumn(col)
          let editionWitnessIndex = thisObject.ctData['witnessOrder'][0]
          let editionToken = thisObject.ctData['witnesses'][editionWitnessIndex]['tokens'][theMatrixCol[0]]
          if (editionToken !== undefined && editionToken.tokenType !== TokenType.EMPTY) {
            // an undefined editionToken means that the edition token is empty
            return false
          }
          for(let i = 1; i < theMatrixCol.length; i++) {
            if (theMatrixCol[i] !== -1) {
              return false
            }
          }
          return true

        default:
          console.warn('Unknown collation table type!')
          return false
      }
    }
  }

  getEditionWitnessTokensFromMatrixRow(currentTokens, matrixRow) {
    return matrixRow.map(
      ref => ref === -1 ?  { tokenClass: TokenClass.EDITION, tokenType: TokenType.EMPTY,text: ''} : currentTokens[ref]
    )
  }

  genIsEmpty() {
    let thisObject = this
    return (row, col, ref) => {
      if (ref === -1) {
        return true
      }

      let witnessIndex = thisObject.ctData['witnessOrder'][row]
      let token = thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]
      return token.tokenType === TokenType.EMPTY
    }
  }

  genOnCellPostShift() {
    let thisObject = this
    return function(data) {
      let profiler = new SimpleProfiler('Cell-Post-Shift')
      let direction = data.detail.direction
      let numCols = data.detail.numCols
      let firstCol = data.detail.firstCol
      let lastCol = data.detail.lastCol
      let theRow = data.detail.row

      //console.log(`Cell post shift event`)
      //console.log(data.detail)

      // deal with shifts in edition witness
      if (thisObject.ctData['type'] === CollationTableType.EDITION && theRow === 0) {
        thisObject.syncEditionWitnessAndTableEditorFirstRow()
      }

      thisObject.recalculateVariants()

      let firstColToRedraw = direction === 'right' ? firstCol : firstCol-numCols
      let lastColToRedraw = direction === 'right' ? lastCol+numCols : lastCol

      new Promise( (resolve) => {
        // TODO: somehow tell the user that something is happening!
        resolve()
      })
        .then( () => {
          // refresh the cells in the row being shifted
          for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
            //console.log(`Refreshing cell ${theRow}:${col}`)
            thisObject.tableEditor.refreshCell(theRow, col)
            thisObject.tableEditor.setupCellEventHandlers(theRow,col)
          }
          //profiler.lap('theRow cells refreshed')
        })
        .then( () => {
          // refresh cell classes of the other cells so that variants are shown
          for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
            for (let row = 0; row < thisObject.variantsMatrix.nRows; row++) {
              if (row !== theRow) {
                //console.log(`Refreshing classes for ${theRow}:${col}`)
                thisObject.tableEditor.refreshCellClasses(row, col)
              }
            }
          }
          //profiler.lap('classes refreshed')
        })
        .finally( () => {
          profiler.stop()
        })
    }
  }

  recalculateVariants() {
    let refWitness = -1
    if (this.ctData.type === 'edition') {
      refWitness = this.ctData['editionWitnessIndex']
    }
    this.variantsMatrix = CollationTableUtil.genVariantsMatrix(this.tableEditor.getMatrix(),
      this.ctData['witnesses'], this.ctData['witnessOrder'], refWitness)
  }

  genOnCollationChanges() {
    let thisObject = this
    return function() {
      new Promise( resolve => {
        thisObject.updateSaveArea()
        resolve()
      })
      .then( () => { thisObject.ctData['collationMatrix'] = thisObject.getCollationMatrixFromTableEditor() })
      .then( () => { thisObject.setCsvDownloadFile() })
      .then( () => { thisObject.updateEditionPreview() })
    }
  }

  getPopoverHtml(witnessIndex, tokenIndex, col) {
    if (tokenIndex === -1) {
      return ''
    }
    let popoverHtml  = this.getPopoverHtmlFromCache(witnessIndex, tokenIndex)
    if (popoverHtml !== undefined) {
      // console.log(`Popover from cache: '${popoverHtml}'`)
      return popoverHtml
    }
    let witnessToken = this.ctData['witnesses'][witnessIndex]

    popoverHtml = PopoverFormatter.getPopoverHtml(
      witnessIndex,
      tokenIndex,
      witnessToken,
      witnessToken['tokenClass'] === FULL_TX ? this.getPostNotes(witnessIndex, col, tokenIndex) : [],
      this.options.peopleInfo
    )

    this.storePopoverHtmlInCache(witnessIndex, tokenIndex, popoverHtml)
    return popoverHtml
  }

  invalidateTokenDataCacheForToken(witnessIndex, tokenIndex) {
    if (this.tokenDataCache[witnessIndex][tokenIndex] !== undefined) {
      this.tokenDataCache[witnessIndex][tokenIndex] = {}
    }
  }

  getPopoverHtmlFromCache(witnessIndex, tokenIndex) {
    return this.getDataFieldFromTokenDataCache('popoverHtml', witnessIndex, tokenIndex)
  }

  storePopoverHtmlInCache(witnessIndex, tokenIndex, popoverHtml){
    this.storeDataFieldInTokenDataCache('popoverHtml', witnessIndex, tokenIndex, popoverHtml)
  }

  resetTokenDataCache() {
    this.tokenDataCache = {}
  }

  getDataFieldFromTokenDataCache(fieldName, witnessIndex, tokenIndex) {
    if (this.tokenDataCache[witnessIndex] !== undefined && this.tokenDataCache[witnessIndex][tokenIndex] !== undefined) {
      return this.tokenDataCache[witnessIndex][tokenIndex][fieldName]
    }
    return undefined
  }

  storeDataFieldInTokenDataCache(fieldName, witnessIndex, tokenIndex, data) {
    if (this.tokenDataCache[witnessIndex] === undefined) {
      this.tokenDataCache[witnessIndex] = {}

    }
    if (this.tokenDataCache[witnessIndex][tokenIndex] === undefined) {
      this.tokenDataCache[witnessIndex][tokenIndex] = {}
    }
    this.tokenDataCache[witnessIndex][tokenIndex][fieldName] = data
  }

  aggregateNonTokenItemIndexes(witnessData, tokenRefArray) {
    if (witnessData['witnessType'] !== WitnessType.FULL_TX) {
      return
    }
    let rawNonTokenItemIndexes = witnessData['nonTokenItemIndexes']
    let numTokens = witnessData['tokens'].length

    let resultingArray = []

    // aggregate post
    let aggregatedPost = []
    for (let i = numTokens -1; i >= 0; i--) {
      let tokenPost = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['post'] !== undefined) {
        tokenPost = rawNonTokenItemIndexes[i]['post']
      }
      aggregatedPost = aggregatedPost.concat(tokenPost)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i] = { post: aggregatedPost }
        aggregatedPost = []
      }
    }

    // aggregate pre
    let aggregatedPre = []
    for (let i = 0; i < numTokens; i++ ) {
      let tokenPre = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['pre'] !== undefined) {
        tokenPre = rawNonTokenItemIndexes[i]['pre']
      }
      aggregatedPre = aggregatedPre.concat(tokenPre)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i]['pre'] = aggregatedPre
        aggregatedPre = []
      }
    }
    return resultingArray
  }


  calculateAggregatedNonTokenItemIndexes() {
    let indexes = []
    for (let witnessIndex = 0; witnessIndex < this.ctData['witnesses'].length; witnessIndex++) {
      let tokenRefs = this.ctData['collationMatrix'][witnessIndex]
      let witness = this.ctData['witnesses'][witnessIndex]
      indexes[witnessIndex] = this.aggregateNonTokenItemIndexes(witness, tokenRefs)
    }

    return indexes
  }

  getPostNotes(row, col, tokenIndex) {
    //let theToken = this.ctData

    if (this.aggregatedNonTokenItemIndexes[row][tokenIndex] === undefined) {
      console.log(`Undefined aggregate non-token item index for row ${row}, tokenIndex ${tokenIndex}`)
      return []
    }
    let postItemIndexes = this.aggregatedNonTokenItemIndexes[row][tokenIndex]['post']
    let itemWithAddressArray = this.ctData['witnesses'][row]['items']
    let notes = []
    for(const itemIndex of postItemIndexes) {
      let theItem = itemWithAddressArray[itemIndex]
      let itemNotes = []
      if (theItem['notes'] !== undefined) {
        itemNotes = theItem['notes']
      }
      for(const note of itemNotes) {
        notes.push(note)
      }
    }
    return notes
  }


  genGenerateCellClassesFunction() {
    let thisObject = this
    return function(tableRow, col, value) {
      if (value === -1) {
        return [ 'token-type-empty']
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]
      let tokenArray = thisObject.ctData['witnesses'][witnessIndex]['tokens']
      let itemWithAddressArray = thisObject.ctData['witnesses'][witnessIndex]['items']

      let token = tokenArray[value]

      let classes = thisObject.getTokenClasses(token)

      switch(token.tokenClass) {
        case TokenClass.FULL_TX:
          classes.push('withpopover')

          //variant class
          if (thisObject.viewSettings.highlightVariants) {
            // Note that the variantsMatrix refers to the tableRow not to the witness row
            let variant  = thisObject.variantsMatrix.getValue(tableRow, col)
            if (variant !== 0) {
              // no class for variant 0
              classes.push('variant-' + variant )
            }
          }
          // get itemZero
          if (token['sourceItems'].length !==0) {

          }
          // default language class
          let lang = thisObject.ctData['witnesses'][witnessIndex]['lang']
          let itemZero = null

          if (token['sourceItems'].length !== 0) {
            let itemZeroIndex = token['sourceItems'][0]['index']
            itemZero = itemWithAddressArray[itemZeroIndex]
            if (itemZero['lang'] !== undefined) {
              lang = itemZero['lang']
            }
          }
          classes.push('text-' + lang)

          if (token['sourceItems'].length === 1) {
            // td inherits the classes from the single source item
            return classes.concat(thisObject.getClassesFromItem(itemZero))
          }
          break

        case TokenClass.EDITION:
          classes.push('withpopover')
          let langCode = thisObject.ctData['lang']
          classes.push('text-' + langCode)

      }

      return classes
    }
  }

  getTokenClasses(token) {
    let classes = []
    classes.push('token-type-' + token.tokenType)
    classes.push('token-class-' + token.tokenClass)

    return classes
  }

  genGenerateTableClassesFunction() {
    let thisObject = this
    return function() {
      let langCode = thisObject.ctData['lang']
      return [ ('te-table-' + langCode) ]
    }
  }

  genGenerateCellContentEditModeFunction() {
    let thisObject = this
    return (tableRow, col, value) => {
      if (value === -1) {
        console.warn(`Editing a null cell (value = -1) at row ${tableRow}, col ${col}`)
        return ''
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]
      let tokenArray = thisObject.ctData['witnesses'][witnessIndex]['tokens']
      let token = tokenArray[value]
      if (token['tokenClass'] === TokenClass.EDITION) {
        return token['text']
      }
      return 'ERROR!'
    }
  }

  genCellValidationFunction() {

    function areAllOtherRowsEmpty(theCol, theRow) {
      for (let i = 0; i < theCol.length; i++) {
        if (i !== theRow && theCol[i]!== -1) {
          return false
        }
      }
      return true
    }

    let thisObject = this
    return (tableRow, col, currentText) => {
        let returnObject = { isValid: true, warnings: [], errors: [] }

      //console.log(`Validating text '${currentText}'`)
      let trimmedText = Util.trimWhiteSpace(currentText)
      if (Util.isWordToken(trimmedText)) {
          // TODO: do not allow words when the rest of the witnesses only have punctuation
          return returnObject
      }
      let isPunctuationAllowed = areAllOtherRowsEmpty(thisObject.tableEditor.getMatrix().getColumn(col), tableRow)
      if (Util.isPunctuationToken(trimmedText) && isPunctuationAllowed) {
          return returnObject
      }
      returnObject.isValid = false
      if (isPunctuationAllowed) {
        returnObject.errors.push(`Please enter either a single word, punctuation or leave blank`)
      } else {
        returnObject.errors.push(`Please enter a single word or leave blank`)
      }

      return returnObject
    }
  }

  genOnCellConfirmEditFunction() {
    let thisObject = this
    return (tableRow, col, newText) => {
      //console.log(`Confirm edit on  ${tableRow}:${col}`)
      //console.log(`New text = '${newText}'`)
      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]
      //console.log(`Witness index: ${witnessIndex}` )
      let ref = thisObject.ctData['collationMatrix'][witnessIndex][col]
      //console.log(`Current ref: ${ref}`)
      if (ref === -1) {
        // TODO: deal with null refs in edition witness
        console.warn(`Trying to edit a -1 ref at witness ${witnessIndex}, row ${tableRow}, col ${col}`)
        return { valueChange: false, value: ref}
      }

      let currentText = thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['text']
      if (currentText === newText) {
        // no change!
        return { valueChange: false, value: ref}
      }
      newText = Util.trimWhiteSpace(newText)
      if (newText === '') {
        // empty token
        thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['text'] = newText
        thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['tokenType'] = TokenType.EMPTY
      } else  {
        let tokenType = Util.isPunctuationToken(newText) ? TokenType.PUNCTUATION : TokenType.WORD
        thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['text'] = newText
        thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['tokenType'] = tokenType
        if (tokenType === TokenType.WORD) {
          if (thisObject.ctData['automaticNormalizationsApplied'].length !== 0) {
            // apply normalizations for this token
            let norm = thisObject.normalizerRegister.applyNormalizerList(thisObject.ctData['automaticNormalizationsApplied'], newText)
            if (norm !== newText) {
              console.log(`New text normalized:  ${newText} => ${norm}`)
              thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['normalizedText'] = norm
              thisObject.ctData['witnesses'][witnessIndex]['tokens'][ref]['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
            }
          }
        }

      }

      thisObject.invalidateTokenDataCacheForToken(witnessIndex, ref)
      //thisObject.recalculateVariants()

      console.log('Edition Witness updated')
      console.log(thisObject.ctData['witnesses'][witnessIndex]['tokens'])
      // ref stays the same
      return { valueChange: true, value: ref}
    }
  }

  genGenerateCellContentFunction() {
    let thisObject = this
    let noteIconSpan = ' <span class="noteicon"><i class="far fa-comment"></i></span>'
    let normalizationSymbol = '<b><sub>N</sub></b>'
    const EMPTY_CONTENT = '&mdash;'
    return function(tableRow, col, value) {
      //let profiler = new SimpleProfiler(`cc-tr${tableRow}-c${col}-v${value}`)
      if (value === -1) {
        return EMPTY_CONTENT
      }

      let witnessIndex = thisObject.ctData['witnessOrder'][tableRow]

      let cellCachedContent = thisObject.getDataFieldFromTokenDataCache('cellContent', witnessIndex, value)
      if (cellCachedContent !== undefined) {
        //profiler.lap('cache hit')
        return cellCachedContent
      }

      let tokenArray = thisObject.ctData['witnesses'][witnessIndex]['tokens']
      let token = tokenArray[value]
      if (token.tokenClass === TokenClass.EDITION) {
        return token['text'] === '' ? EMPTY_CONTENT : token['text']
      }
      let postNotes = thisObject.getPostNotes(witnessIndex, col, value)
      if (token['sourceItems'].length === 1 && postNotes.length === 0) {
        if (thisObject.viewSettings.showNormalizations && token['normalizedText'] !== undefined) {
          return token['normalizedText'] + normalizationSymbol
        }
        //thisObject.storeDataFieldInTokenDataCache('cellContent', witnessIndex, value, token.text)
        return token.text
      }
      // spans for different items
      let itemWithAddressArray = thisObject.ctData['witnesses'][witnessIndex]['items']
      let cellHtml = ''
      for (const itemData of token['sourceItems']) {
        let theItem = itemWithAddressArray[itemData['index']]
        let itemText = ''
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData['charRange'].from, itemData['charRange'].to + 1)
        }
        if (theItem.type === 'TextualItem' && itemText!== "\n") {
          cellHtml += '<span class="' + thisObject.getClassesFromItem(theItem).join(' ') + '">'
          // TODO: check to see if this is a bug in itemization! see I-DE-BER-SB-4o.Inc.4619, AW47-47
          // filter out leading new lines
          let theText = itemText.replace(/^\n/, '')
          cellHtml += theText
          cellHtml += '</span>'
        }
      }
      // if there are notes after the token, put the note icon

      if (postNotes.length > 0) {
        cellHtml += noteIconSpan
      }

      thisObject.storeDataFieldInTokenDataCache('cellContent', witnessIndex, value, cellHtml)
      //profiler.lap('Cache miss')
      return cellHtml
    }
  }

  getClassesFromItem(item) {
    let classes = []
    let hand = 0
    if (item.hand !== undefined) {
      hand = item.hand
    }
    if (hand !== 0) {
      // no class for hand 0
      classes.push( 'hand-' + hand)
    }

    if (item.format !== undefined && item.format !== '') {
      classes.push(item.format)
    }
    if (item['clarity'] !== undefined && item['clarity'] !== 1) {
      classes.push('unclear')
    }
    if (item['textualFlow']!== undefined && item['textualFlow'] === 1) {
      classes.push('addition')
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion')
    }
    if (item['normalizationType'] !== undefined && item['normalizationType'] !== '') {
      classes.push(item['normalizationType'])
    }
    return classes
  }

  updateVersionInfo(){
    let html = ''

    html += '<table class="versioninfo">'
    html += '<tr><th>N</th><th>Id</th><th>Author</th><th>Time</th><th>Description</th></tr>'

    for(let i=this.versionInfo.length-1; i >= 0; i--)   {
      let version = this.versionInfo[i]
      html += '<tr>'
      html += '<td>' + (i+1) + '</td>'
      html += '<td>' + version['id'] + '</td>'
      html += '<td class="author">' + this.options.peopleInfo[version['authorId']].fullname + '</td>'
      html += '<td class="time">' + Util.formatVersionTime(version['timeFrom']) + '</td>'
      html += '<td>' + version['description'] + '</td>'

      html += '<td>'
      if (version['isMinor']) { html += '[m]'}
      if (version['isReview']) { html += ' [r]'}
        html += '</td>'
      html += '</tr>'
    }

    this.versionInfoDiv.html(html)
  }

  genOnClickSaveButton() {
    let thisObject = this
    return function() {
      let changes = thisObject.changesInCtData()
      if (changes.length !== 0) {
        thisObject.unsavedChanges = true
        thisObject.saveButton.popover('hide')
        thisObject.saveButton.html('Saving...')
        console.log('Saving table via API call to ' + thisObject.apiSaveCollationUrl)
        let description = ''
        for (let change of changes) {
          description += change + '. '
        }
        thisObject.ctData['collationMatrix'] = thisObject.getCollationMatrixFromTableEditor()
        let apiCallOptions = {
          collationTableId: thisObject.tableId,
          collationTable: thisObject.ctData,
          descr: description,
          source: 'edit',
          baseSiglum: thisObject.ctData['sigla'][0]
        }
        $.post(
          thisObject.apiSaveCollationUrl,
          {data: JSON.stringify(apiCallOptions)}
        ).done( function (apiResponse){
          console.log("Success saving table")
          console.log(apiResponse)
          thisObject.lastSavedCtData = Util.deepCopy(thisObject.ctData)
          thisObject.lastSavedEditorMatrix = thisObject.tableEditor.getMatrix().clone()
          thisObject.versionInfo = apiResponse.versionInfo
          thisObject.witnessUpdates = []
          for(let i=0; i < thisObject.lastWitnessUpdateCheckResponse['witnesses'].length; i++) {
            if (thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated']) {
              thisObject.lastWitnessUpdateCheckResponse['witnesses'][i]['justUpdated'] = false
            }
          }
          thisObject.unsavedChanges = false
          thisObject.updateWitnessInfoDiv()
          thisObject.updateSaveArea()
          thisObject.updateVersionInfo()
          thisObject.updateEditionPreview()
        }).fail(function(resp){
          let saveMsgHtml = ''
          saveMsgHtml += `<p class="text-danger">${thisObject.icons['alert']} Cannot save table!</p>`
          saveMsgHtml += `<p class="text-warning">Status ${resp.status}: ${HttpStatusCode.getText(resp.status)}</p>`
          thisObject.saveMsg.html(saveMsgHtml)
          thisObject.saveButton.html('Save Changes')
          thisObject.saveMsg.removeClass('hidden')
          console.error("Cannot save table")
          console.log(resp)
        })
      }
    }
  }

  updateWitnessInfoDiv() {
    // Turn off current event handlers
    $(this.witnessesDivSelector + ' .move-up-btn').off()
    $(this.witnessesDivSelector + ' .move-down-btn').off()

    // set table html
    $(this.witnessesDivSelector + ' .witnessinfotable').html(this.genWitnessTableHtml())

    // set up witness move buttons
    let firstPos = this.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
    let firstMoveUpButton = $(`${this.witnessesDivSelector} td.witness-pos-${firstPos} > .move-up-btn`)
    firstMoveUpButton.addClass('opacity-0').addClass('disabled')
    let lastPos = this.ctData['witnessOrder'].length -1
    $(this.witnessesDivSelector + ' td.witness-pos-' + lastPos +  ' > .move-down-btn').addClass('disabled')
    $(this.witnessesDivSelector + ' .move-up-btn').on('click', this.genOnClickUpDownWitnessInfoButton('up'))
    $(this.witnessesDivSelector + ' .move-down-btn').on('click',this.genOnClickUpDownWitnessInfoButton('down') )

    // set up siglum editors
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      new EditableTextField({
        containerSelector: this.witnessesDivSelector + ' .siglum-' + i,
        initialText: this.ctData['sigla'][i],
        onConfirm: this.genOnConfirmSiglumEdit(i)
      })
    }
    // update witness update check info
    if (this.lastWitnessUpdateCheckResponse !== ''){
      this.updateWitnessUpdateCheckInfo(this.lastWitnessUpdateCheckResponse)
    }

    // set up sigla presets buttons
    $(this.witnessesDivSelector + ' .save-sigla-btn').on('click', this.genOnClickSaveSiglaPreset())
    $(this.witnessesDivSelector + ' .load-sigla-btn').on('click', this.genOnClickLoadSiglaPreset())

    if (this.siglaPresets.length === 0)  {
      $(this.witnessesDivSelector + ' .load-sigla-btn').addClass('hidden')
    }

    this.fetchSiglaPresets()

  }


  genOnClickLoadSiglaPreset() {
    let thisObject = this
    return function() {
      console.log('Click on load sigla preset')
      if (thisObject.siglaPresets.length === 0) {
        console.log('No sigla presets to apply')
        return
      }
      let dialogTemplate = thisObject.getTemplateLoadSiglaPreset()
      $('body').append(dialogTemplate.render())
      let modalSelector= '#load-sigla-preset-modal'
      let cancelButton = $(`${modalSelector} .cancel-btn`)
      let loadButton = $(`${modalSelector} .load-btn`)
      let presetSelect =  $(`${modalSelector} .preset-select`)
      let siglaTableBody =  $(`${modalSelector} .sigla-table-body`)

      presetSelect.html(
        thisObject.siglaPresets.map((p) => {
          return `<option value="${p.presetId}">${p.title}, <em>${p.userName}</em></option>`
        }).join('')
      )
      let p = thisObject.siglaPresets[0]
      siglaTableBody.html(thisObject.getWitnessSiglaArrayFromPreset(p).map( w => {
        return `<tr></tr><td>${w.title}</td><td>${w.currentSiglum}</td><td>${w.presetSiglum}</td></tr>`
      }).join(''))

      presetSelect.on('change', () => {
        let id =  Util.safeGetIntVal(presetSelect, 'presetSelect')
        let p =  thisObject.siglaPresets.filter( (p) => { return p.presetId === id})[0]
        siglaTableBody.html(thisObject.getWitnessSiglaArrayFromPreset(p).map( w => {
          return `<tr></tr><td>${w.title}</td><td>${w.currentSiglum}</td><td>${w.presetSiglum}</td></tr>`
        }).join(''))
      })

      loadButton.on('click', () => {
        let id =  Util.safeGetIntVal(presetSelect, 'presetSelect')
        let p =  thisObject.siglaPresets.filter( (p) => { return p.presetId === id})[0]
        thisObject.getWitnessSiglaArrayFromPreset(p).forEach( (w) => {
          thisObject.ctData.sigla[w.index] = w.presetSiglum
        })
        thisObject.siglaPresetLoaded = p.title
        $(modalSelector).modal('hide')
        $(modalSelector).remove()
        thisObject.updateWitnessInfoDiv()
        thisObject.updateSaveArea()
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




  genOnClickSaveSiglaPreset() {
    let thisObject = this
    return function() {
      console.log('Click on save sigla')
      const overWritePresetButtonLabel = 'Overwrite Preset'
      const createPresetButtonLabel = 'Create New Preset'
      let dialogTemplate = thisObject.getTemplateSaveSiglaPreset()
      $('body').append(dialogTemplate.render())

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
      let userPresets = thisObject.siglaPresets.filter( (p) => {
        return p.userId === thisObject.options.userId
      })

      if (userPresets.length === 0) {
        // no user presets, just show the create new area
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
      let siglaTableBody = thisObject.ctData.witnesses.filter( (w) => {
        return w['witnessType'] === 'fullTx'
      }).map( (w, i) => {
        return `<tr></tr><td>${thisObject.ctData['witnessTitles'][i]}</td><td>${thisObject.ctData.sigla[i]}</td></tr>`
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
        let lang = thisObject.ctData.lang
        let witnessSiglaArray = {}
        thisObject.ctData.witnesses.forEach( (w, i) => {
          if (w['witnessType'] === 'fullTx') {
            witnessSiglaArray[w['ApmWitnessId']] = thisObject.ctData.sigla[i]
          }
        })

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

        console.log('About to call save preset API')
        console.log(apiCallData)
        let apiUrl = thisObject.options.urlGenerator.apiSaveSiglaPreset()
        footInfoLabel.html('Saving....')
        saveButton.addClass('hidden')
        $.post(apiUrl, { data: JSON.stringify(apiCallData)}).done( () =>{
          console.log('Save preset success')
          if (apiCommand === 'new') {
            footInfoLabel.html('New preset created ')
          } else {
            footInfoLabel.html('Preset overwritten')
          }
          cancelButton.html('Close')
          // reload presets
          thisObject.fetchSiglaPresets()
        }).fail( () => {
           if (apiCommand === 'new') {}
           footInfoLabel.html('Error: could not save new preset')
           saveButton.removeClass('hidden')
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




  genOnConfirmSiglumEdit(witnessIndex) {
    let thisObject = this
    return function(ev) {
      let newText = Util.removeWhiteSpace(ev.detail['newText'])
      let oldText = ev.detail['oldText']
      let editor = ev.detail['editor']
      if (oldText === newText || newText === '') {
        // just reset the editor's text in case the edited text contained whitespace
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
        return false
      }
      //console.log('Change in siglum for witness index ' + witnessIndex +  ' to ' + newText)
      if (thisObject.ctData['sigla'].indexOf(newText) !== -1) {
        transientAlert($(thisObject.witnessesDivSelector + ' .warning-td-' + witnessIndex), '',
          "Given siglum '" + newText + "' already exists, no changes made", 2000, 'slow')
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
      }
      // Change the siglum
      thisObject.ctData['sigla'][witnessIndex] = newText
      thisObject.updateEditionPreview()
      thisObject.updateSaveArea()

    }
  }


  /**
   * generates the on click function for the witness info move buttons
   * Notice that the direction is from the point of view of the table: moving
   * up in the table means actually moving to an lesser position in the witness
   * order array. The top witness in the table is actually position 0.
   * @param direction
   * @returns {function(...[*]=)}
   */
  genOnClickUpDownWitnessInfoButton(direction) {
    let thisObject = this
    return function(ev) {
      if ($(ev.currentTarget).hasClass('disabled')) {
        return false
      }
      let classes = Util.getClassArrayFromJQueryObject($(ev.currentTarget.parentNode))
      //console.log('Parent Classes')
      //console.log(classes)

      let index = thisObject.getWitnessIndexFromClasses(classes)
      let position = thisObject.getWitnessPositionFromClasses(classes)
      let numWitnesses = thisObject.ctData['witnesses'].length
      console.log('Click move ' + direction + ' button on witness ' + index + ', position ' + position)

      let firstPos = thisObject.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
      let lastPos = numWitnesses - 1

      if (direction === 'down' && position === lastPos) {
        // at the last position, cannot move up
        console.log('Nowhere to move down the table')
        return false
      }

      if (direction === 'up' && position === firstPos) {
        // at the first position, cannot move down
        console.log('Nowhere to move up')
        return false
      }

      let indexOffset = direction === 'up' ? -1 : 1

      ArrayUtil.swapElements(thisObject.ctData['witnessOrder'],position, position+indexOffset)

      $(this.witnessesDivSelector + ' .witnessinfotable').html('Updating...')
      thisObject.setupTableEditor()
      thisObject.updateEditionPreview()
      thisObject.updateWitnessInfoDiv()
      thisObject.updateSaveArea()
      thisObject.setCsvDownloadFile()

    }
  }

  getWitnessIndexFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witness-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[1])
      }
    }
    return index
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

  genWitnessTableHtml() {
    let html = ''

    html+= '<table class="witnesstable">'
    html+= '<tr><th></th><th>Witness</th><th>Version used</th>'
    html += `<th>Siglum &nbsp;`
    html += `<a class="tb-button load-sigla-btn" title="Load sigla from preset">${this.icons.loadPreset}</a>&nbsp;`
    html += `<a class="tb-button save-sigla-btn" title="Save current sigla as preset">${this.icons.savePreset}</a>`
    html += `</th>`
    html += '</tr>'

    for(let i = 0; i < this.ctData['witnessOrder'].length; i++) {
      let wIndex = this.ctData['witnessOrder'][i]
      let witness = this.ctData['witnesses'][wIndex]
      if (witness['witnessType'] === WitnessType.EDITION) {
        continue
      }
      let siglum = this.ctData['sigla'][wIndex]
      let witnessTitle = this.ctData['witnessTitles'][wIndex]
      let witnessClasses = [
        'witness-' + wIndex,
        'witness-type-' + witness['witnessType'],
        'witness-pos-' + i
        ]
      let siglumClass = 'siglum-' + wIndex
      let warningTdClass = 'warning-td-' + wIndex
      let outOfDateWarningTdClass = 'outofdate-td-' + wIndex

      html += '<tr>'

      html += `<td class="${witnessClasses.join(' ')} cte-witness-move-td">`

      html += `<span class="btn move-up-btn" title="Move up">${this.icons.moveUp}</span>`
      html += `<span class="btn move-down-btn" title="Move down">${this.icons.moveDown}</span>`
      html += '</td>'

      html += '<td>' + witnessTitle + '</td>'
      html += '<td>' + Util.formatVersionTime(witness['timeStamp']) + '</td>'
      html += '<td class="' + siglumClass + '">'+ siglum + '</td>'

      html += '<td class="' + warningTdClass + '"></td>'
      html += '<td class="' + outOfDateWarningTdClass + '"></td>'
      html += '</tr>'
    }
    html += '</table>'
    //html += '<div class="warning-area-1"></div>'
    return html
  }

  updateSaveArea() {
    if (this.ctData['archived']) {
      this.saveButton.addClass('hidden')
      this.saveMsg.html('Archived').removeClass('hidden').addClass('text-info')
      this.archiveTableButton
        .attr('title', 'Already archived')
        .addClass('disabled')
      let lastVersion = this.versionInfo[this.versionInfo.length-1]
      this.lastSaveSpan.html(Util.formatVersionTime(lastVersion['timeFrom']))
      return
    }
    let changes = this.changesInCtData()
    if (changes.length !== 0) {
      //console.log('Detected changes in data')
      //console.log(changes)
      this.unsavedChanges = true
      this.archiveTableButton
        .attr('title', 'Save or discard changes before attempting to archive this table/edition')
        .addClass('disabled')

      this.saveButton.html('Save Changes')
      this.buttonPopoverContent = '<p>'
      this.buttonPopoverContent += '<ul>'
      for (const change of changes){
        this.buttonPopoverContent += '<li>' + change + '</li>'
      }
      this.buttonPopoverContent += '</ul></p>'
      let thisObject = this
      this.saveButton.popover({
        trigger: 'hover',
        placement: 'left',
        title: "Click to save changes",
        html: true,
        content: function() { return thisObject.buttonPopoverContent}
      })
      this.saveButton.removeClass('hidden')
      this.saveMsg.addClass('hidden')

    } else {
      //console.log('no changes in data')
      this.unsavedChanges = false
      this.archiveTableButton
        .attr('title', 'Click to archive this table/edition')
        .removeClass('disabled')
      this.saveButton.addClass('hidden')
      this.saveMsg.addClass('hidden')
    }

    let lastVersion = this.versionInfo[this.versionInfo.length-1]
    this.lastSaveSpan.html(Util.formatVersionTime(lastVersion['timeFrom']))
  }

  changesInCtData() {
    let changes = []
    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push("New title: '" + this.ctData['title'] + "'" )
    }
    let currentCollationMatrix = this.getCollationMatrixFromTableEditor()
    if (!CollationTableUtil.collationMatricesAreEqual(currentCollationMatrix, this.lastSavedCtData['collationMatrix'])) {
      changes.push('Changes in collation alignment')
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['witnessOrder'], this.lastSavedCtData['witnessOrder'])) {
      changes.push('New witness order')
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['sigla'], this.lastSavedCtData['sigla'])) {
      if (this.siglaPresetLoaded !== '') {
        changes.push(`Changes in sigla. Preset '${this.siglaPresetLoaded}' loaded`)
      } else {
        changes.push('Changes in sigla')
      }
    } else {
      // no changes, this cancels any loaded preset
      this.siglaPresetLoaded = ''
    }

    if(this.ctData['type'] === CollationTableType.EDITION) {
      let editionWitnessIndex = this.ctData['witnessOrder'][0]
      let oldText = this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      let newText = this.ctData['witnesses'][editionWitnessIndex]['tokens'].map(token => token.text).join(' ')
      if (oldText !== newText) {
        changes.push('Changes in edition text')
      }
    }

    if (this.witnessUpdates.length !== 0) {
      for(const witnessUpdate of this.witnessUpdates) {
        changes.push(`Witness ${this.ctData['witnessTitles'][witnessUpdate.witnessIndex]} updated`)
      }
    }

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

  fetchSiglaPresets() {
    console.log('Fetching sigla presets')
    let apiSiglaPresetsUrl = this.options.urlGenerator.apiGetSiglaPresets()
    let apiCallOptions = {
      lang: this.ctData['lang'],
      witnesses: this.ctData['witnesses'].filter( w => { return w['witnessType'] === 'fullTx'}).map( w => w['ApmWitnessId'])
    }
    let thisObject = this
    $.post(apiSiglaPresetsUrl, { data: JSON.stringify(apiCallOptions)}
    ).done( apiResponse => {
      //console.log(apiResponse)
      if (apiResponse['presets'] !== undefined) {
        thisObject.siglaPresets = apiResponse['presets']
        if (thisObject.siglaPresets.length !== 0) {
          // show load sigla button
          $(thisObject.witnessesDivSelector + ' .load-sigla-btn').removeClass('hidden')
        }
      }
    }).fail( resp => {
      console.log('Error loading sigla presets')
      console.log(resp)
    })
  }

  // getColumnGroups() {
  //   this.tableEditor.getColumnGroups()
  // }

  updateEditionPreview() {
    this.editionSvgDiv.html("Generating printed edition preview... <i class=\"fa fa-spinner fa-spin fa-fw\"></i>")

    // TESTING THE NEW GENERATOR
    let apparatusGenerator = new CriticalApparatusGenerator()
    let genCriticalApp =apparatusGenerator.generateCriticalApparatus(this.ctData, this.ctData['witnessOrder'][0])
    console.log(`Generated critical apparatus (NEW)`)
    console.log(genCriticalApp)
    this.editionViewerHtml = new EditionViewerHtml({
      ctData: this.ctData,
      mainTextTokens: genCriticalApp.mainTextTokens,
      containerSelector: '#edition-html-container',
      apparatusArray: [ { type: 'critical', entries: genCriticalApp.criticalApparatus} ]
    })
    this.editionViewerHtml.renderMainText()

    let peg = new PrintedEditionGenerator()
    let edition = peg.generateEdition(this.ctData, this.ctData['witnessOrder'][0])
    let ev = new EditionViewerSvg( {
      lang: edition.lang,
      collationTokens: edition.mainTextTokens,
      apparatusArray: edition.apparatusArray,
      isRightToLeft: (edition.textDirection === 'rtl'),
      fontFamily: this.options.langDef[this.ctData['lang']].editionFont,
      addGlue: false
    })
    this.editionSvgDiv.html(ev.getSvg())
    this.setSvgDownloadFile()
  }

  genOnGroupUngroupColumn(isGrouped) {
    let thisObject = this
    return (data) => {
      console.log(`Column ${data.detail.col} ${isGrouped ? 'grouped' : 'ungrouped'}`)
      console.log('New sequence grouped with next')
      thisObject.ctData['groupedColumns'] = data.detail.groupedColumns
      thisObject.updateSaveArea()
      thisObject.updateEditionPreview()
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
    let html = ''

    let workTitle = this.options.workInfo['title']
    let workAuthorId = this.options.workInfo['authorId']
    let workAuthorName = this.options.peopleInfo[workAuthorId]['fullname']

    html += `<p>${workAuthorName}, <i>${workTitle}</i>, chunk ${this.options.chunkNumber}  (${this.options.workId}-${this.options.chunkNumber})`
    html += '<p>Table ID: ' + this.tableId + '</p>'
    return html
  }

  setCsvDownloadFile() {
    let href = 'data:text/csv,' + encodeURIComponent(this.generateCsv())
    this.exportCsvButton.attr('href', href)
  }

  setSvgDownloadFile() {
    let href = 'data:image/svg+xml,' + encodeURIComponent(this.editionSvgDiv.html())
    this.exportSvgButton.attr('href', href)

  }

  /**
   * Generates a CSV string from the collation table
   * @returns {string}
   */
  generateCsv() {
    let sep = ','
    let collationTable = this.ctData
    let titles = collationTable['witnessTitles']
    let numWitnesses = collationTable['witnesses'].length
    let collationMatrix = collationTable['collationMatrix']
    let order = collationTable['witnessOrder']

    let output = ''
    for (let i=0; i < numWitnesses; i++) {
      let witnessIndex = order[i]
      let title = titles[witnessIndex]
      output += title + sep
      let ctRefRow = collationMatrix[witnessIndex]
      for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
        let tokenRef = ctRefRow[tkRefIndex]
        let tokenCsvRep = ''
        if (tokenRef !== -1 ) {
          let token = collationTable.witnesses[witnessIndex].tokens[tokenRef]
          tokenCsvRep = this.getCsvRepresentationForToken(token, this.viewSettings.showNormalizations)
        }
        output += tokenCsvRep + sep
      }
      output += "\n"
    }
    return output
  }

  getCsvRepresentationForToken(tkn, showNormalizations) {
    if (tkn.empty) {
      return ''
    }
    let text = tkn.text
    if (showNormalizations) {
      text = tkn['norm']
    }
    return '"' + text + '"'
  }

  getTemplateSaveSiglaPreset() {
    return Twig.twig({
      data: `
<div id="save-sigla-preset-modal" class="modal" role="dialog">
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
</div>      
      `
    })
  }
  


  getTemplateLoadSiglaPreset() {
    return Twig.twig({
      data: `
<div id="load-sigla-preset-modal" class="modal" role="dialog">
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
</div>      
      `
    })
  }

  getTemplateNormalizationSettingsDialog() {
    return Twig.twig({
      data: `
<div id="normalization-settings-modal" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Normalizations To Apply</h5>
            </div>
            <div class="modal-body">

            <h6>Standard</h6>
            <div class="normalization-toggles"></div>
            <span class="status-span text-warning"></span>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger submit-btn">Apply</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
                
            </div>
        </div>
    </div>
</div>      
      `
    })
  }

  getTemplateUpdateDialog(witnessIndex) {
    return Twig.twig( {
      data: `
<div id="update-modal-${witnessIndex}" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Update witness {{witnessTitle}}</h5>
            </div>
            <div class="modal-body">
                <div class="info">
                    <p><b>Current version:</b> {{currentVersion}}</p>
                    <p style="margin-left: 30px"><i class="fas fa-long-arrow-alt-down"></i></p>
                    <p><b>New version:</b> {{newVersion}}</p>
                </div>
                <div class="process">
                    <p class="load status-waiting"></p>
                    <p class="calc-changes status-waiting"></p>
                    <p class="review-changes status-waiting"></p>
                    <div class="changes"></div>
                    <p class="do-changes status-waiting"></p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger accept-btn hidden">Accept Changes and Update</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
            </div>
      </div>
    </div>
</div>    
    `})
  }

  getTemplateConvertToEditionDialog() {
    return Twig.twig( {
      data: `
<div id="convert-to-edition-modal" class="modal" role="dialog">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add Main Text</h5>
            </div>
            <div class="modal-body">
                <div class="info">
                    <p>This will convert this saved collation table into an edition.</p>
                </div>
               <div class="form">
                    <p>Choose how to initialize the main text:</p>
                    <div class="form-group form-check">
                        <input type="radio" name="init-edition" class="form-check-input most-common-variant-check" disabled>
                        <label class="form-check-label" for="exampleCheck1">Use the most common variant in each column (coming soon...)</label>
                    </div>
                    <div class="form-group form-check">
                        <input type="radio" name="init-edition" class="form-check-input top-witness-check" checked>
                        <label class="form-check-label" for="exampleCheck1">Copy current top witness: <b>{{firstWitnessTitle}}</b></label>
                    </div>
               </div>
            </div>
            <div class="modal-footer">
                <span class="result"></span>
                <button type="button" class="btn btn-danger submit-btn">Submit</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
            </div>
      </div>
    </div>
</div>    
    `})
  }

}