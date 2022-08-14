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

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { Edition } from '../Edition/Edition.mjs'
import { ApparatusCommon } from './ApparatusCommon'
import { PanelWithToolbar } from './PanelWithToolbar'
import { getIntArrayIdFromClasses } from '../toolbox/UserInterfaceUtil'
import { doNothing } from '../toolbox/FunctionUtil.mjs'
import { CtData } from '../CtData/CtData'
import { onClickAndDoubleClick } from '../toolbox/DoubleClick'
import { FmtText } from '../FmtText/FmtText.mjs'
import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import { ApparatusEntryTextEditor } from './ApparatusEntryTextEditor'
import { capitalizeFirstLetter, deepCopy, removeExtraWhiteSpace } from '../toolbox/Util.mjs'
import { varsAreEqual } from '../toolbox/ArrayUtil.mjs'
import * as SubEntryType from '../Edition/SubEntryType'
import { ApparatusSubEntry } from '../Edition/ApparatusSubEntry'
import { MultiToggle } from '../widgets/MultiToggle'
import { SiglaGroup }  from '../Edition/SiglaGroup'

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)


const icons = {
  edit: '<small><i class="fas fa-pen"></i></small>',
  cancelEdit: '<i class="bi bi-x-circle"></i>',
  addEntry: '<i class="bi bi-plus-lg"></i>'
}

const editEntryButtonTitle = 'Click to edit selected apparatus entry'
const cancelEditButtonTitle = 'Click to cancel editing apparatus entry'

export class ApparatusPanel extends  PanelWithToolbar {

  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object' },
      edition: { type: 'object', objectClass: Edition, required: true },
      apparatusIndex: { type: 'number', required: true },
      entrySeparator: { type: 'string', default: verticalLine },
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine },
      onCtDataChange: { type: 'function', default: doNothing },
      onError: { type: 'function', default: doNothing },
      onHighlightMainText: {
        // function to be called when main text needs to be highlighted
        // (lemmaIndexArray, on) => { ... return nothing }
        type: 'function',
        default: doNothing
      },
      highlightCollationTableRange: {
        // function to be called when a column range in the collation table
        // needs to be highlighted
        //  (colStart, colEnd) => { ... return nothing }
        type: 'function',
        default: doNothing
      },
      editApparatusEntry : {
        // function that opens an apparatus entry editor, provided by EditionComposer
        type: 'function',
        default: (apparatusIndex, mainTextFrom, mainTextTo) => { console.log(`Edit apparatus ${apparatusIndex}, from ${mainTextFrom} to ${mainTextTo}`)}
      }
    }
    let oc = new OptionsChecker({ optionsDefinition: optionsSpec, context: 'Apparatus Panel' })
    this.options = oc.getCleanOptions(options)

    this.ctData = this._buildWorkingCtData(options.ctData)
    /**
     * @member {Edition}
     */
    this.edition = this.options.edition

    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.edition.getLang()
    this.cachedHtml = 'Apparatus coming soon...'
    this.currentSelectedEntryIndex = -1
    this._hideApparatusEntryForm()
    this.entryInEditor = {}
    this.editedEntry = {}
    this.selectNewEntry = false
    this.newEntryMainTextFrom = -1
    this.newEntryMainTextTo = -1
  }

  _buildWorkingCtData(ctData) {
    let workingCtData = CtData.copyFromObject(ctData)
    workingCtData['siglaGroups'] = ctData['siglaGroups'].map( (sg) => { return SiglaGroup.fromObject(sg)})
    return workingCtData
  }

  editApparatusEntry(mainTextFrom, mainTextTo) {
    this.verbose && console.log(`Editing apparatus entry main text ${mainTextFrom} to ${mainTextTo}`)
    let entryIndex = this.apparatus.entries.map( (entry) => {return `${entry.from}-${entry.to}`}).indexOf(`${mainTextFrom}-${mainTextTo}`)

    if (entryIndex === -1) {
      this.verbose && console.log(`New entry`)
      this._selectLemma(-1)
      this._loadEntryIntoEntryForm(-1, mainTextFrom, mainTextTo)
    } else {
      this.verbose && console.log(`Existing entry ${entryIndex}`)
      this._selectLemma(entryIndex)
      this._loadEntryIntoEntryForm(entryIndex)
    }
    this._showApparatusEntryForm()
  }



  updateData(ctData, edition) {
    this.ctData = this._buildWorkingCtData(ctData)
    this.edition = edition
    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.edition.getLang()
  }

  _buildEntryToEdit(entryIndex, from = -1, to = -1) {
    let apparatusIndex = this.options.apparatusIndex
    let theEntry

    if (entryIndex !== -1) {
      theEntry = deepCopy(this.edition.apparatuses[apparatusIndex].entries[entryIndex])
      theEntry.autoEntries = theEntry.subEntries.filter( (e) => { return e.source === 'auto'})
      theEntry.customEntryFmtText = FmtTextFactory.empty()
      let customEntries = theEntry.subEntries.filter( (e) => { return e.type === SubEntryType.FULL_CUSTOM})
      if (customEntries.length !== 0) {
        // only supporting one custom entry for now
        theEntry.customEntryFmtText = customEntries[0].fmtText
      }
      from = theEntry.from
      to = theEntry.to
    } else {
      // new entry
      if (from === -1 || to === -1) {
        throw new Error(`Loading new entry with invalid 'from' and 'to' indexes: ${from} - ${to}`)
      }
      theEntry = {
        mainTextFrom: from,
        mainTextTo: to,
        preLemma: '',
        lemma: '',
        postLemma: '',
        separator: '',
        autoEntries: [],
        customEntryFmtText: FmtTextFactory.empty(),
        lemmaText:  this.edition.getPlainTextForRange(from, to),
        subEntries: []
      }
    }
    let ctIndexFrom = -1
    let ctIndexTo = -1
    if (from === -1) {
      if (theEntry.ctGroup !== undefined) {
        ctIndexFrom = theEntry.ctGroup.from
      } else {
        console.warn(`Undefined collation table indexes for existing apparatus entry`)
        console.log(theEntry)
      }
    } else {
      ctIndexFrom = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[from].editionWitnessTokenIndex)
    }
    if (to === -1) {
      if (theEntry.ctGroup !== undefined) {
        ctIndexTo = theEntry.ctGroup.to
      } else {
        console.warn(`Undefined collation table indexes for existing apparatus entry`)
        console.log(theEntry)
      }
    } else {
      ctIndexTo = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[to].editionWitnessTokenIndex)
    }
    theEntry.ctIndexFrom = ctIndexFrom
    theEntry.ctIndexTo = ctIndexTo
    delete theEntry.ctGroup

    return theEntry
  }

  /**
   * Reset the apparatus entry form and loads it with the given entry
   * @param {number} entryIndex
   * @param {number} from
   * @param {number} to
   * @private
   */
  _loadEntryIntoEntryForm(entryIndex, from = -1, to = -1) {
    let apparatusIndex = this.options.apparatusIndex
    let formSelector = this.getApparatusEntryFormSelector()
    let formTitleElement = $(`${formSelector} .form-title`)
    console.log(`Loading entry: apparatus ${apparatusIndex}, entry ${entryIndex}`)
    let sigla = this.edition.getSigla()
    this.entryInEditor = this._buildEntryToEdit(entryIndex, from, to)
    if (entryIndex !== -1) {
      formTitleElement.html('Apparatus Entry')
    } else {
      formTitleElement.html('Apparatus Entry (new)')
    }

    $(`${formSelector} .ct-table-cols`).html(this._getCtColumnsText(this.entryInEditor.ctIndexFrom, this.entryInEditor.ctIndexTo))

    console.log(this.entryInEditor)
    $(`${formSelector} div.entry-text`).html(this.entryInEditor.lemmaText)
    let autoEntriesHtml = this.entryInEditor.autoEntries.map( (subEntry, sei) => {
      let checkedString = subEntry.enabled ? 'checked' : ''
      return `<div class="form-check sub-entry-app-${apparatusIndex}">
                <input class="form-check-input text-${this.edition.lang} aei-sub-entry-${apparatusIndex}-${sei}" type="checkbox" value="entry-${apparatusIndex}-${sei}" ${checkedString}>
                <label class="form-check-label" for="aei-subentry-${apparatusIndex}-${sei}"> 
                        ${ApparatusCommon.genSubEntryHtmlContent(this.edition.lang, subEntry, sigla, this.edition.siglaGroups, true)}
                 </label>
                </div>`
    }).join('')
    if (this.entryInEditor.autoEntries.length === 0) {
      autoEntriesHtml = '<em>none</em>'
    }
    $(`${formSelector} form-check-input`).off()
    $(`${formSelector} div.auto-entries`).html(autoEntriesHtml)
    this.entryInEditor.autoEntries.forEach( (autoEntry, i) => {
      $(this._getCheckboxSelector(i)).on('change', this._genOnChangeAutoEntryCheckBox(i))
    })
    this.freeTextEditor.setText(this.entryInEditor.customEntryFmtText)

    this._loadLemmaGroupVariableInForm('preLemma', this.entryInEditor, this.preLemmaToggle, this.customPreLemmaTextInput)
    this._loadLemmaGroupVariableInForm('lemma', this.entryInEditor, this.lemmaToggle, this.customLemmaTextInput)
    this._loadLemmaGroupVariableInForm('postLemma', this.entryInEditor, this.postLemmaToggle, this.customPostLemmaTextInput)
    this._loadLemmaGroupVariableInForm('separator', this.entryInEditor, this.separatorToggle, this.customSeparatorTextInput)

    this.editedEntry = deepCopy(this.entryInEditor)

    this._updateAcceptButton()
  }

  _loadLemmaGroupVariableInForm(variable, entry, toggle, textInput) {
    let option = this._getLemmaGroupVariableToggleOption(entry[variable])
    toggle.setOptionByName(option)
    if (option === 'custom') {
      textInput.removeClass('hidden').val(FmtText.getPlainText(entry[variable]))
    } else {
      textInput.addClass('hidden').val('')
    }
  }

  _getLemmaGroupVariableFromToggle(toggle, textInputElement) {
    switch(toggle.getOption()) {
      case 'auto':
        return ''

      case 'custom':
        return FmtTextFactory.fromAnything(removeExtraWhiteSpace(textInputElement.val()))

      default:
        return toggle.getOption()
    }
  }

  // _getPreLemmaFromToggle() {
  //   return this._getLemmaGroupVariableFromToggle(this.preLemmaToggle, this.customPreLemmaTextInput)
  // }

  _genOnToggleLemmaGroupToggle(variable, toggle, textInput) {
    return () => {
      this.editedEntry[variable] = this._getLemmaGroupVariableFromToggle(toggle, textInput)
      if (Array.isArray(this.editedEntry[variable])) {
        textInput.removeClass('hidden')
      } else {
        textInput.addClass('hidden')
      }
      this._updateAcceptButton()
    }
  }

  // _genOnTogglePreLemmaToggle() {
  //   return () => {
  //     this.editedEntry.preLemma = this._getPreLemmaFromToggle()
  //     if (Array.isArray(this.editedEntry.preLemma)) {
  //       this.customPreLemmaTextInput.removeClass('hidden')
  //     } else {
  //       this.customPreLemmaTextInput.addClass('hidden')
  //     }
  //     this._updateAcceptButton()
  //   }
  // }

  _getLemmaGroupVariableToggleOption(variableValue) {
    if (variableValue === ''){
      return 'auto'
    }
    if (Array.isArray(variableValue)) {
      return 'custom'
    }
    return variableValue
  }

  _genOnChangeAutoEntryCheckBox(index) {
    return () => {
      this.editedEntry.autoEntries[index].enabled = $(this._getCheckboxSelector(index)).prop('checked')
      this._updateAcceptButton()
    }
  }



  _getCtColumnsText(ctFrom, ctTo) {
    if (ctFrom === ctTo) {
      return`${ctFrom+1}`
    }
    return `${ctFrom+1}&ndash;${ctTo+1}`
  }

  generateContentHtml (tabId, mode, visible) {
    let textDirection = this.edition.lang === 'la' ? 'ltr' : 'rtl'
    return `<div class="aei-form" style="direction: ${textDirection}">${this._generateApparatusEntryFormHtml()}</div>
<div class="apparatus text-${this.lang}">${this.cachedHtml}</div>`
  }

  /**
   *
   * @private
   */
  _generateApparatusEntryFormHtml() {
    let shortCol = 2
    let longCol = 12 - shortCol
    const customTextSize = 10
    const customSeparatorTextSize = 3

    return `<div class="form-header">
                <h5 class="form-title">Apparatus Entry</h5>
            </div>
            <div class="form-body">
                <form>
                <div class="entry-header">
                    <div class="form-group row">
                        <div class="col-sm-${shortCol}">Edition Text:</div>
                        <div class="col-sm-${longCol} entry-text text-${this.edition.lang}">
                            some text  
                        </div>
                    </div>
                    <div class="form-group row">
                        <div class="col-sm-${shortCol}">Collation Table:</div>
                        <div class="col-sm-${longCol} ct-table-cols"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label for="pre-lemma-div" class="col-sm-${shortCol} col-form-label">Pre Lemma:</label>
                    <div class="col-sm-${longCol} aei-multitoggle-div pre-lemma-div">
                        <div class="pre-lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-pre-lemma-input" size="${customTextSize}"></div>
                    </div>
                    
                </div>
                <div class="form-group row">
                    <label for="lemma-div" class="col-sm-${shortCol} col-form-label">Lemma:</label>
                    <div class="col-sm-${longCol} aei-multitoggle-div lemma-div">
                        <div class="lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-lemma-input" size="${customTextSize}"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label for="post-lemma-div" class="col-sm-${shortCol} col-form-label">Post Lemma:</label>
                    <div class="col-sm-${longCol} aei-multitoggle-div post-lemma-div">
                        <div class="post-lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-post-lemma-input" size="${customTextSize}"></div>
                    </div>
                </div>
                <div class="form-group row">
                     <label for="separator-div" class="col-sm-${shortCol} col-form-label">Separator:</label>
                     <div class="col-sm-${longCol} aei-multitoggle-div separator-div">
                        <div class="separator-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-separator-input" size="${customSeparatorTextSize}"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label class="col-sm-${shortCol} col-form-label">Automatic Entries:</label>
                    <div class="col-sm-${longCol} auto-entries text-${this.edition.lang}"></div>
                </div>
                <div class="form-group row">
                    <label for="free-text-entry" class="col-sm-${shortCol} col-form-label">Custom Entry:</label>
                    <div class="col-sm-${longCol}">
                        <div class="free-text-entry-div"></div>
                    </div>
                </div>
                </form>
            </div>
            <div class="form-footer">
                <button type="button" class="btn btn-sm btn-danger update-btn">Update Apparatus</button>
                <button type="button" class="btn btn-sm btn-primary cancel-btn">Cancel</button>
            </div>
            <div class="info-div"></div>`
  }

  getContentAreaClasses () {
    return super.getContentAreaClasses()
  }

  getApparatusDivSelector() {
    return `${this.containerSelector} div.apparatus`
  }

  getApparatusEntryFormSelector() {
    return  `${this.containerSelector} div.aei-form`
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this._getEditEntryButtonElement().on('click', this._genOnClickEditEntryButton())
    this.edition.apparatuses.forEach( (app, index) => {
      $(`${this.containerSelector} .add-entry-apparatus-${index}`).on('click', this._genOnClickAddEntryButton(index))
    })
    $(this.getContainerSelector()).on('click', this._genOnClickPanelContainer())
    if (this.apparatusEntryFormIsVisible) {
      this._showApparatusEntryForm()
    } else {
      this._hideApparatusEntryForm()
    }
    this._setupApparatusEntryForm()
  }

  _genOnClickAddEntryButton(appIndex) {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()

      this.verbose && console.log(`Click on add entry button for apparatus ${appIndex}, currently selected entry: ${this.currentSelectedEntryIndex}`)
      if (this.currentSelectedEntryIndex === -1) {
        return
      }
      let entryToEdit = this._buildEntryToEdit(this.currentSelectedEntryIndex)
      console.log(entryToEdit)
      this.options.editApparatusEntry(appIndex, entryToEdit.from, entryToEdit.to)
      this._getAddEntryDropdownButton().dropdown('hide')
    }
  }

  _setupApparatusEntryForm() {
    let formSelector = this.getApparatusEntryFormSelector()
    this.updateButton = $(`${formSelector} .update-btn`)
    this.updateButton.on('click', this._genOnClickUpdateApparatusButton())
    this.cancelButton = $(`${formSelector} .cancel-btn`)
    this.cancelButton.on('click', this._genOnClickApparatusEntryCancelButton())
    // Init free text editor
    this.freeTextEditor = new ApparatusEntryTextEditor({
      containerSelector: `${formSelector} div.free-text-entry-div`,
      lang: this.edition.lang,
      onChange: this._genOnChangeFreeTextEditor(),
      debug: false
    })

    // preLemma
    let anteKeyword = ApparatusCommon.getKeywordString('ante', this.edition.lang)
    let postKeyword = ApparatusCommon.getKeywordString('post', this.edition.lang)
    let anteLabel = ApparatusCommon.getKeywordHtml('ante', this.edition.lang)
    let postLabel = ApparatusCommon.getKeywordHtml('post', this.edition.lang)
    this.preLemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .pre-lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate pre-lemma text'},
        { label: anteLabel, name: 'ante', helpText: `Standard keyword '${anteKeyword}'`},
        { label: postLabel, name: 'post', helpText: `Standard keyword '${postKeyword}'`},
        { label: 'Custom', name: 'custom', helpText: "Enter custom pre-lemma text"},
      ]
    })
    this.customPreLemmaTextInput = $(`${formSelector} .custom-pre-lemma-input`)
    this.customPreLemmaTextInput.addClass('hidden')
    this.preLemmaToggle.on('toggle', this._genOnToggleLemmaGroupToggle('preLemma', this.preLemmaToggle, this.customPreLemmaTextInput))
    this.customPreLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('preLemma', this.preLemmaToggle, this.customPreLemmaTextInput))

    // lemma
    this.lemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate lemma'},
        { label: '<i>dash</i>', name: 'dash', helpText: "Force dash (&mdash;) between first and last words"},
        { label: '<i>ellipsis</i>', name: 'ellipsis', helpText: "Force ellipsis (...) between first and last words"},
        { label: 'Custom', name: 'custom', helpText: "Enter custom lemma text"},
      ]
    })
    this.customLemmaTextInput = $(`${formSelector} .custom-lemma-input`)
    this.customLemmaTextInput.addClass('hidden')
    this.lemmaToggle.on('toggle', this._genOnToggleLemmaGroupToggle('lemma', this.lemmaToggle, this.customLemmaTextInput))
    this.customLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('lemma', this.lemmaToggle, this.customLemmaTextInput) )


    // postLemma
    this.postLemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .post-lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate post lemma text'},
        { label: 'Custom', name: 'custom', helpText: "Enter custom post lemma text"},
      ]
    })
    this.customPostLemmaTextInput = $(`${formSelector} .custom-post-lemma-input`)
    this.customPostLemmaTextInput.addClass('hidden')
    this.postLemmaToggle.on('toggle', this._genOnToggleLemmaGroupToggle('postLemma', this.postLemmaToggle, this.customPostLemmaTextInput))
    this.customPostLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('postLemma', this.postLemmaToggle, this.customPostLemmaTextInput))

    // separator
    this.separatorToggle = new MultiToggle({
      containerSelector: `${formSelector} .separator-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate separator'},
        { label: 'Off', name: 'off', helpText: "Turn off separator"},
        { label: '&nbsp; : &nbsp;', name: 'colon', helpText: "Colon ':'"},
        { label: 'Custom', name: 'custom', helpText: "Enter custom separator"},
      ]
    })
    this.customSeparatorTextInput = $(`${formSelector} .custom-separator-input`)
    this.customSeparatorTextInput.addClass('hidden')
    this.separatorToggle.on('toggle', this._genOnToggleLemmaGroupToggle('separator', this.separatorToggle, this.customSeparatorTextInput))
    this.customSeparatorTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('separator', this.separatorToggle, this.customSeparatorTextInput))

  }

  _genOnKeyUpLemmaGroupCustomTextInput(variable, toggle, textInput) {
    return () => {
      this.editedEntry[variable] = this._getLemmaGroupVariableFromToggle(toggle, textInput)
      this._updateAcceptButton()
    }
  }

  // _genOnKeyUpPreLemmaCustomTextInput() {
  //   return () => {
  //     this.editedEntry.preLemma = this._getPreLemmaFromToggle()
  //     this._updateAcceptButton()
  //   }
  // }

  // _genOnKeyUpLemmaCustomTextInput() {
  //   return () => {
  //     this.editedEntry.lemma = this._getLemmaGroupVariableFromToggle(this.lemmaToggle, this.customLemmaTextInput)
  //     this._updateAcceptButton()
  //   }
  // }

  _genOnClickUpdateApparatusButton() {
    return () => {
      if (varsAreEqual(this.entryInEditor, this.editedEntry)) {
        // nothing to do
        return
      }
      // so, there are changes
      this.updateButton.addClass('hidden')
      this.cancelButton.addClass('hidden')
      let infoDiv =$(`${this.getApparatusEntryFormSelector()} div.info-div`)
      infoDiv.html(`Updating edition...`)
      let entryForCtData = {
        from: this.editedEntry.ctIndexFrom,
        to: this.editedEntry.ctIndexTo,
        preLemma:  this.editedEntry.preLemma,
        lemma: this.editedEntry.lemma,
        postLemma: this.editedEntry.postLemma,
        separator: this.editedEntry.separator
      }
      entryForCtData.subEntries = this.editedEntry.autoEntries.map( (autoEntry) => {
        // a hack to get a valid hash string
        let se = new ApparatusSubEntry()
        se.type = 'auto'
        se.fmtText = autoEntry.fmtText
        se.source = autoEntry.source
        se.type = autoEntry.type
        se.witnessData = autoEntry.witnessData

        return {
          type: 'auto',
          enabled: autoEntry.enabled,
          hash: se.hashString()
        }
      })
      if (this.editedEntry.customEntryFmtText !== []) {
        entryForCtData.subEntries.push( {
          type: 'fullCustom',
          enabled: true,
          fmtText: this.editedEntry.customEntryFmtText
        })
      }
      this.ctData = CtData.updateCustomApparatuses(this.ctData, this.apparatus.type, entryForCtData)
      this.cancelButton.removeClass('hidden')
      infoDiv.html('')
      this._hideApparatusEntryForm()
      if (this.currentSelectedEntryIndex === -1) {
        this.selectNewEntry = true
        this.newEntryMainTextFrom = this.editedEntry.mainTextFrom
        this.newEntryMainTextTo = this.editedEntry.mainTextTo
        this.verbose && console.log(`Just updated a new entry: ${this.newEntryMainTextFrom} to ${this.newEntryMainTextTo}`)
      } else {
        this.selectNewEntry = false
      }
      this.options.onCtDataChange(this.ctData)
    }
  }

  _getCheckboxSelector(subEntryIndex) {
    return `${this.getApparatusEntryFormSelector()} .aei-sub-entry-${this.options.apparatusIndex}-${subEntryIndex}`
  }

  _genOnChangeFreeTextEditor() {
    return () => {
      if (this.apparatusEntryFormIsVisible) {
        this.editedEntry.customEntryFmtText = this.freeTextEditor.getFmtText()
        // console.log(`New text in free text editor`)
        // console.log(this.editedEntry.customEntryFmtText)
        this._updateAcceptButton()
      }
    }
  }

  _updateAcceptButton() {
    if (!varsAreEqual(this.entryInEditor, this.editedEntry)) {
      this.updateButton.removeClass('hidden')
    } else {
      this.updateButton.addClass('hidden')
    }
    // console.log(`Changes in apparatus entry form`)
    // console.log(this.editedEntry)
  }

  _genOnClickApparatusEntryCancelButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      this._hideApparatusEntryForm()
    }
  }

  _editSelectedEntry() {
    if (this.currentSelectedEntryIndex === -1) {
      return
    }

    this._loadEntryIntoEntryForm(this.currentSelectedEntryIndex)
    this._showApparatusEntryForm()
  }

  _genOnClickEditEntryButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.apparatusEntryFormIsVisible) {
        this._hideApparatusEntryForm()
      } else {
        this._editSelectedEntry()
      }
    }
  }


  _genOnClickPanelContainer() {
    return (ev) => {
      if (this.apparatusEntryFormIsVisible) {
        return
      }
      if ($(ev.target).hasClass('btn')) {
        return
      }
      if ($(ev.target).hasClass('apparatus')) {
        return
      }
      // click outside of apparatus when the entry form is hidden
      ev.preventDefault()
      ev.stopPropagation()
      if (this.currentSelectedEntryIndex !== -1) {
        this._selectLemma(-1)
      }
      this._getAddEntryDropdownButton().dropdown('hide')
    }
  }

  /**
   *
   * @return {JQuery}
   * @private
   */
  _getAllLemmaElements() {
    return $(`${this.getContentAreaSelector()} span.lemma`)
  }

  _getLemmaElement(entryIndex) {
    return $(`${this.getContentAreaSelector()} span.lemma-${this.options.apparatusIndex}-${entryIndex}`)
  }

  _hideApparatusEntryForm() {
    $(this.getApparatusEntryFormSelector()).addClass('hidden')
    this._getEditEntryButtonElement().html(icons.edit).attr('title', editEntryButtonTitle)
    if (this.currentSelectedEntryIndex === -1) {
      this._getEditEntryButtonElement().addClass('hidden')
    }
    this.options.highlightCollationTableRange(-1, -1)
    this.apparatusEntryFormIsVisible = false
  }

  _showApparatusEntryForm() {
    this.verbose && console.log(`Showing apparatus entry form`)
    $(this.getApparatusEntryFormSelector()).removeClass('hidden')
    this._getEditEntryButtonElement().html(icons.cancelEdit).attr('title', cancelEditButtonTitle).removeClass('hidden')
    this.options.highlightCollationTableRange(this.entryInEditor.ctIndexFrom, this.entryInEditor.ctIndexTo)
    this.apparatusEntryFormIsVisible = true
  }

  updateApparatus(mainTextTokensWithTypesettingInfo) {
    this.verbose && console.log(`Updating apparatus ${this.options.apparatusIndex}`)
    this.cachedHtml = this._genApparatusHtml(mainTextTokensWithTypesettingInfo)
    $(this.getApparatusDivSelector()).html(this.cachedHtml)
    this._setUpEventHandlers()
    if (this.currentSelectedEntryIndex !== -1) {
      this._selectLemma(this.currentSelectedEntryIndex, false)
    } else {
      this.verbose && console.log(`Apparatus update with no selected entry`)
      if (this.selectNewEntry) {
        this.verbose && console.log(`Finding new entry to select: ${this.newEntryMainTextFrom} - ${this.newEntryMainTextTo}`)
        this.currentSelectedEntryIndex =
          this.apparatus.entries.map( (entry) => {return `${entry.from}-${entry.to}`}).indexOf(`${this.newEntryMainTextFrom}-${this.newEntryMainTextTo}`)
          this._selectLemma(this.currentSelectedEntryIndex, false)
      }
    }
  }


  generateToolbarHtml (tabId, mode, visible) {
    let appIndex = this.options.apparatusIndex
    let apparatusLinks = this.edition.apparatuses.map( (app, index) => {
        if (index === appIndex) {
          return ''
        }
        return `<a class="dropdown-item add-entry-apparatus-${index}" href="">${capitalizeFirstLetter(app.type)}</a>`
    }).join('')

    return `<div class="panel-toolbar-group">
                <div class="panel-toolbar-item">
                    <a class="edit-entry-btn tb-button hidden" href="#" title="${editEntryButtonTitle}">${icons.edit}</a>
                </div>
                 <div class="panel-toolbar-item add-entry-dropdown hidden">
                  <div class="dropdown">
                     <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" 
                     id="add-entry-dropdown-${appIndex}" data-toggle="dropdown" aria-expanded="false" title="Click to add/edit entry in other apparatus">
                            ${icons.addEntry}
                     </button>
                     <div class="dropdown-menu" aria-labelledby="add-entry-dropdown-${appIndex}">${apparatusLinks}</div>
                  </div>
               </div>
               <div class="panel-toolbar-item"> 
                &nbsp;
               </div>
            </div>`
  }

  _setUpEventHandlers() {
    let lemmaElements = this._getAllLemmaElements()
    lemmaElements.off()
      .on('mouseenter', this._genOnMouseEnterLemma())
      .on('mouseleave', this._genOnMouseLeaveLemma())
    onClickAndDoubleClick(lemmaElements, this._genOnClickLemma(), this._genOnDoubleClickLemma())
  }

  _genOnMouseEnterLemma() {
    return (ev) => {
      if (this.apparatusEntryFormIsVisible) {
        return
      }
      let target = $(ev.target)
      if (!target.hasClass('lemma-selected')) {
        target.addClass('lemma-hover')
      }
    }
  }

  _genOnMouseLeaveLemma() {
    return (ev) => {
      if (this.apparatusEntryFormIsVisible) {
        return
      }
      $(ev.target).removeClass('lemma-hover')
    }
  }

  _genOnDoubleClickLemma() {
    return (ev) => {
      this._selectLemmaFromClickTarget(ev.target)
      this._editSelectedEntry()
    }
  }

  _genOnClickLemma() {
    return (ev) => {
      if (!this.apparatusEntryFormIsVisible) {
        this._selectLemmaFromClickTarget(ev.target)
      }
    }
  }

  _selectLemma(entryIndex, runCallbacks = true) {
    //console.log(`Selecting ${entryIndex}, runCallbacks = ${runCallbacks}`)
    this._getAllLemmaElements().removeClass('lemma-selected lemma-hover')
    this.options.highlightCollationTableRange(-1, -1)
    if (entryIndex === -1) {
      // Deselect
      if (runCallbacks && this.currentSelectedEntryIndex !== -1) {
        this.options.onHighlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false)
      }
      this.currentSelectedEntryIndex = -1
      this._getEditEntryButtonElement().addClass('hidden')
      this._getAddEntryDropdownElement().addClass('hidden')
      this._getClearSelectionButtonElement().addClass('hidden')
      return
    }
    this._getLemmaElement(entryIndex).addClass('lemma-selected')
    this._getEditEntryButtonElement().removeClass('hidden')
    this._getAddEntryDropdownElement().removeClass('hidden')
    this._getClearSelectionButtonElement().removeClass('hidden')
    let fullEntryArray = [this.options.apparatusIndex, entryIndex]
    if (runCallbacks) {
      if (this.currentSelectedEntryIndex !== -1) {
        this.options.onHighlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false)
      }
      this.options.onHighlightMainText(fullEntryArray, true)
    }
    this.currentSelectedEntryIndex = entryIndex
  }

  _selectLemmaFromClickTarget(clickTarget) {
    let target = $(clickTarget)
    let fullEntryArray = this._getLemmaIndexFromElement(target)
    this._selectLemma(fullEntryArray[1])
  }

  onHidden () {
    super.onHidden()
    if(this.currentSelectedEntryIndex !== -1) {
      this.options.onHighlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false)
    }

  }

  onShown () {
    super.onShown()
    if(this.currentSelectedEntryIndex !== -1) {
      this.options.onHighlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], true)
      if (this.apparatusEntryFormIsVisible) {
        this.options.highlightCollationTableRange(this.entryInEditor.ctIndexFrom, this.entryInEditor.ctIndexTo)
      } else {
        this.options.highlightCollationTableRange(-1, -1)
      }
    } else {
      if (this.apparatusEntryFormIsVisible) {
        this.options.highlightCollationTableRange(this.entryInEditor.ctIndexFrom, this.entryInEditor.ctIndexTo)
      } else {
        this.options.highlightCollationTableRange(-1, -1)
      }
    }
  }

  _getLemmaIndexFromElement(element) {
    return getIntArrayIdFromClasses(element, 'lemma-')
  }

  /**
   *
   * @return {*}
   * @private
   */
  _getEditEntryButtonElement() {
    return  $(`${this.containerSelector} .edit-entry-btn`)
  }

  _getAddEntryDropdownElement() {
    return  $(`${this.containerSelector} div.add-entry-dropdown`)
  }

  _getAddEntryDropdownButton() {
    return  $(`#add-entry-dropdown-${this.options.apparatusIndex}`)
  }

  _getClearSelectionButtonElement() {
    return  $(`${this.containerSelector} .clear-selection-btn`)
  }

  _getOccurrenceInLine(mainTextIndex, tokensWithTypesetInfo) {
    if (tokensWithTypesetInfo[mainTextIndex] === undefined) {
      return 1
    }
    return tokensWithTypesetInfo[mainTextIndex].occurrenceInLine
  }

  _getTotalOccurrencesInLine(mainTextIndex, tokensWithTypesetInfo) {
    if (tokensWithTypesetInfo[mainTextIndex] === undefined) {
      return 1
    }
    return tokensWithTypesetInfo[mainTextIndex].numberOfOccurrencesInLine
  }

  _getLemmaHtml(apparatusEntry, typesettingInfo) {

    let lemmaComponents = ApparatusCommon.getLemmaComponents(apparatusEntry.lemma, apparatusEntry.lemmaText)

    switch(lemmaComponents.type) {
      case 'custom':
        return lemmaComponents.text

      case 'full':
        let lemmaNumberString = ''
        if (lemmaComponents.numWords === 1) {
          let occurrenceInLine = this._getOccurrenceInLine(apparatusEntry.from, typesettingInfo.tokens)
          let numberOfOccurrencesInLine = this._getTotalOccurrencesInLine(apparatusEntry.from, typesettingInfo.tokens)
          if (numberOfOccurrencesInLine > 1) {
            lemmaNumberString = `<sup>${ApparatusCommon.getNumberString(occurrenceInLine, this.edition.lang)}</sup>`
          }
        }
        return `${lemmaComponents.text}${lemmaNumberString}`

      case 'shortened':
        let lemmaNumberStringFrom = ''
        let occurrenceInLineFrom = this._getOccurrenceInLine(apparatusEntry.from, typesettingInfo.tokens)
        let numberOfOccurrencesInLineFrom = this._getTotalOccurrencesInLine(apparatusEntry.from, typesettingInfo.tokens)
        if (numberOfOccurrencesInLineFrom > 1) {
          lemmaNumberStringFrom = `<sup>${ApparatusCommon.getNumberString(occurrenceInLineFrom, this.edition.lang)}</sup>`
        }
        let lemmaNumberStringTo = ''
        let occurrenceInLineTo = this._getOccurrenceInLine(apparatusEntry.to, typesettingInfo.tokens)
        let numberOfOccurrencesInLineTo = this._getTotalOccurrencesInLine(apparatusEntry.to, typesettingInfo.tokens)
        if (numberOfOccurrencesInLineTo > 1) {
          lemmaNumberStringTo = `<sup>${ApparatusCommon.getNumberString(occurrenceInLineTo, this.edition.lang)}</sup>`
        }
        return `${lemmaComponents.from}${lemmaNumberStringFrom}${lemmaComponents.separator}${lemmaComponents.to}${lemmaNumberStringTo}`

      default:
        console.warn(`Unknown lemma component type '${lemmaComponents.type}'`)
        return 'ERROR'
    }
  }



  _genApparatusHtml(mainTextTokensWithTypesettingInfo) {
    // console.log(`Generating Apparatus html`)
    // console.log(mainTextTokensWithTypesettingInfo)
    // console.log(mainTextTokensWithTypesettingInfo.tokens.filter( (t) => { return t.type === 'text' && t.occurrenceInLine > 1}))
    let html = ''

    let lastLine = ''
    let sigla = this.edition.getSigla()
    let textDirectionMarker = this.edition.lang === 'la' ? '&lrm;' : '&rlm;'

    this.apparatus.entries.forEach( (apparatusEntry, aeIndex) => {
      html += `<span class="apparatus-entry apparatus-entry-${this.options.apparatusIndex}-${aeIndex}">`
      let currentLine
      try {
        currentLine = this._getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo)
      } catch (e) {
        console.error(`Error getting lineNumber string in apparatus entry ${aeIndex}`)
        console.log(apparatusEntry)
      }

      let lineHtml = `${textDirectionMarker}&nbsp;${this.options.entrySeparator}&nbsp;`
      if (currentLine !== lastLine) {
        let lineSep = aeIndex !== 0 ? `${this.options.apparatusLineSeparator}&nbsp;` : ''
        lineHtml = `${textDirectionMarker}${lineSep}<b class="apparatus-line-number">${currentLine}</b>`
        lastLine = currentLine
      }
      // build lemma section
      let preLemmaSpanHtml = ''
      switch(apparatusEntry.preLemma) {
        case '':
           // do nothing
          break

        case 'ante':
        case 'post':
          preLemmaSpanHtml = ApparatusCommon.getKeywordHtml(apparatusEntry.preLemma, this.edition.lang)
          break

        default:
          preLemmaSpanHtml = ApparatusCommon.getKeywordHtml(FmtText.getPlainText(apparatusEntry.preLemma), this.edition.lang)
      }
      let preLemmaSpan = preLemmaSpanHtml === '' ? '' : `<span class="pre-lemma">${preLemmaSpanHtml}</span> `


      let lemmaSpan = `<span class="lemma lemma-${this.options.apparatusIndex}-${aeIndex}">${this._getLemmaHtml(apparatusEntry, mainTextTokensWithTypesettingInfo)}</span>`

      let postLemmaSpan = ''
      if (apparatusEntry.postLemma !== '') {
        let postLemma = ApparatusCommon.getKeywordHtml(FmtText.getPlainText(apparatusEntry.postLemma), this.edition.lang)
        postLemmaSpan = ` <span class="pre-lemma">${postLemma}</span>`
      }

      let separator

      switch(apparatusEntry.separator) {
        case '':
          if (apparatusEntry.allSubEntriesAreOmissions()) {
            separator = ''
          } else {
            separator = ']'
          }
          break

        case 'off':
          separator = ''
          break

        case 'colon':
          separator = ':'
          break

        default:
          separator = FmtText.getPlainText(apparatusEntry.separator)
      }

      html +=  `${lineHtml} ${preLemmaSpan}${lemmaSpan}${postLemmaSpan}${separator} `
      apparatusEntry.subEntries.forEach( (subEntry, subEntryIndex) => {
        let classes = [ 'sub-entry', `sub-entry-${subEntryIndex}`, `sub-entry-type-${subEntry.type}`, `sub-entry-source-${subEntry.source}`]
        if (!subEntry.enabled) {
          classes.push('sub-entry-disabled')
        }
        html+= `<span class="${classes.join(' ')}">
                            ${ApparatusCommon.genSubEntryHtmlContent(this.lang, subEntry, sigla, this.edition.siglaGroups)}
         </span>&nbsp;&nbsp;&nbsp;`
      })
      html += '</span>'
    })
    if (html === '') {
      html = `<i>... empty ...</i>`
    }
    return html
  }

  _getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo) {
    if (mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.from] === undefined) {
      // before the main text
      return ApparatusCommon.getNumberString(1, this.lang)
    }

    let startLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.from].lineNumber
    let endLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.to] === undefined ? '???' :
      mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.to].lineNumber

    if (startLine === endLine) {
      return ApparatusCommon.getNumberString(startLine, this.lang)
    }
    return `${ApparatusCommon.getNumberString(startLine, this.lang)}-${ApparatusCommon.getNumberString(endLine, this.lang)}`
  }


}