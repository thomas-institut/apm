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
import { Edition } from '../Edition/Edition'
import { ApparatusCommon } from './ApparatusCommon'
import { PanelWithToolbar } from './PanelWithToolbar'
import { getIntArrayIdFromClasses } from '../toolbox/UserInterfaceUtil'
import { doNothing } from '../toolbox/FunctionUtil'
import { CtData } from '../CtData/CtData'
import { onClickAndDoubleClick } from '../toolbox/DoubleClick'
import { FmtText } from '../FmtText/FmtText'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'
import { EditionFreeTextEditor } from './EditionFreeTextEditor'
import { deepCopy, removeExtraWhiteSpace } from '../toolbox/Util.mjs'
import { varsAreEqual } from '../toolbox/ArrayUtil'
import * as SubEntryType from '../Edition/SubEntryType'
import { ApparatusSubEntry } from '../Edition/ApparatusSubEntry'
import { MultiToggle } from '../widgets/MultiToggle'

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

const editIcon = '<small><i class="fas fa-pen"></i></small>'


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
      }
    }
    let oc = new OptionsChecker({ optionsDefinition: optionsSpec, context: 'Apparatus Panel' })
    this.options = oc.getCleanOptions(options)

    this.ctData = CtData.copyFromObject(this.options.ctData)
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
  }

  editApparatusEntry(mainTextFrom, mainTextTo) {
    let entryIndex = this.apparatus.entries.map( (entry) => {return `${entry.from}-${entry.to}`}).indexOf(`${mainTextFrom}-${mainTextTo}`)

    if (entryIndex === -1) {
      this._selectLemma(-1)
      this._loadEntryIntoEntryForm(-1, mainTextFrom, mainTextTo)
    } else {
      this._selectLemma(entryIndex)
      this._loadEntryIntoEntryForm(entryIndex)
    }
    this._showApparatusEntryForm()
  }



  updateData(ctData, edition) {
    this.ctData = CtData.copyFromObject(ctData)
    this.edition = edition
    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.edition.getLang()
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
    let sigla = this.edition.witnesses.map ( (w) => {return w.siglum})

    if (entryIndex !== -1) {
      formTitleElement.html('Apparatus Entry')
      this.entryInEditor = deepCopy(this.edition.apparatuses[apparatusIndex].entries[entryIndex])
      this.entryInEditor.autoEntries = this.entryInEditor.subEntries.filter( (e) => { return e.source === 'auto'})
      this.entryInEditor.customEntryFmtText = FmtTextFactory.empty()
      let customEntries = this.entryInEditor.subEntries.filter( (e) => { return e.type === SubEntryType.FULL_CUSTOM})
      if (customEntries.length !== 0) {
        // only supporting one custom entry for now
        this.entryInEditor.customEntryFmtText = customEntries[0].fmtText
      }
      delete this.entryInEditor.ctGroup
      from = this.entryInEditor.from
      to = this.entryInEditor.to
    } else {
      // new entry
      formTitleElement.html('Apparatus Entry (new)')
      if (from === -1 || to === -1) {
        throw new Error(`Loading new entry with invalid 'from' and 'to' indexes: ${from} - ${to}`)
      }
      this.entryInEditor = {
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
    let ctIndexFrom = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[from].editionWitnessTokenIndex)
    let ctIndexTo = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[to].editionWitnessTokenIndex)
    this.entryInEditor.ctIndexFrom = ctIndexFrom
    this.entryInEditor.ctIndexTo = ctIndexTo
    $(`${formSelector} .ct-table-cols`).html(this._getCtColumnsText(ctIndexFrom, ctIndexTo))

    console.log(this.entryInEditor)
    $(`${formSelector} div.entry-text`).html(this.entryInEditor.lemmaText)
    let autoEntriesHtml = this.entryInEditor.autoEntries.map( (subEntry, sei) => {
      let checkedString = subEntry.enabled ? 'checked' : ''
      return `<div class="form-check sub-entry-app-${apparatusIndex}">
                <input class="form-check-input text-${this.edition.lang} aei-sub-entry-${apparatusIndex}-${sei}" type="checkbox" value="entry-${apparatusIndex}-${sei}" ${checkedString}>
                <label class="form-check-label" for="aei-subentry-${apparatusIndex}-${sei}"> 
                        ${ApparatusCommon.genSubEntryHtmlContent(this.edition.lang, subEntry, sigla )}
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
    return `<div class="aei-form">${this._generateApparatusEntryFormHtml()}</div>
<div class="apparatus text-${this.lang}">${this.cachedHtml}</div>`
  }

  /**
   *
   * @private
   */
  _generateApparatusEntryFormHtml() {
    return `<div class="form-header">
                <h5 class="form-title">Apparatus Entry</h5>
            </div>
            <div class="form-body">
                <form>
                <div class="entry-header">
                    <div class="form-group row">
                        <div class="col-sm-3">Edition Text:</div>
                        <div class="col-sm-9 entry-text text-${this.edition.lang}">
                            some text  
                        </div>
                    </div>
                    <div class="form-group row">
                        <div class="col-sm-3">Collation Table:</div>
                        <div class="col-sm-9 ct-table-cols"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label for="pre-lemma-div" class="col-sm-3 col-form-label">Pre Lemma:</label>
                    <div class="col-sm-9 aei-multitoggle-div pre-lemma-div">
                        <div class="pre-lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-pre-lemma-input" size="5"></div>
                    </div>
                    
                </div>
                <div class="form-group row">
                    <label for="lemma-div" class="col-sm-3 col-form-label">Lemma:</label>
<!--                    <div class="col-sm-9 lemma-div">auto | force-dash | ellipsis | custom</div>-->
                    <div class="col-sm-9 aei-multitoggle-div lemma-div">
                        <div class="lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-lemma-input" size="5"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label for="post-lemma-div" class="col-sm-3 col-form-label">Post Lemma:</label>
<!--                    <div class="col-sm-9 post-lemma-div">auto | custom </div>-->
                    <div class="col-sm-9 aei-multitoggle-div post-lemma-div">
                        <div class="post-lemma-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-post-lemma-input" size="5"></div>
                    </div>
                </div>
                <div class="form-group row">
                     <label for="separator-div" class="col-sm-3 col-form-label">Separator:</label>
<!--                      <div class="col-sm-9 separator-div">auto | off | custom</div>-->
                     <div class="col-sm-9 aei-multitoggle-div separator-div">
                        <div class="separator-toggle aei-multitoggle"> </div>
                        <div><input type="text" class="custom-separator-input" size="3"></div>
                    </div>
                </div>
                <div class="form-group row">
                    <label class="col-sm-3 col-form-label">Automatic Entries:</label>
                    <div class="col-sm-9 auto-entries text-${this.edition.lang}"></div>
                </div>
                <div class="form-group row">
                    <label for="free-text-entry" class="col-sm-3 col-form-label">Custom Entry:</label>
                    <div class="col-sm-7">
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
    $(this.getContainerSelector()).on('click', this._genOnClickPanelContainer())
    if (this.apparatusEntryFormIsVisible) {
      this._showApparatusEntryForm()
    } else {
      this._hideApparatusEntryForm()
    }
    this._setupApparatusEntryForm()
  }

  _setupApparatusEntryForm() {
    let formSelector = this.getApparatusEntryFormSelector()
    this.updateButton = $(`${formSelector} .update-btn`)
    this.updateButton.on('click', this._genOnClickUpdateApparatusButton())
    this.cancelButton = $(`${formSelector} .cancel-btn`)
    this.cancelButton.on('click', this._genOnClickApparatusEntryCancelButton())
    // Init free text editor
    this.freeTextEditor = new EditionFreeTextEditor({
      containerSelector: `${formSelector} div.free-text-entry-div`,
      lang: this.edition.lang,
      onChange: this._genOnChangeFreeTextEditor(),
      debug: false
    })

    // preLemma
    this.preLemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .pre-lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate pre-lemma text'},
        { label: '<i>ante</i>', name: 'ante', helpText: "Standard word 'ante'"},
        { label: '<i>post</i>', name: 'post', helpText: "Standard word 'post'"},
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
      this._editSelectedEntry()
    }
  }


  _genOnClickPanelContainer() {
    return (ev) => {
      if (this.apparatusEntryFormIsVisible) {
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
    this.apparatusEntryFormIsVisible = false
  }

  _showApparatusEntryForm() {
    $(this.getApparatusEntryFormSelector()).removeClass('hidden')
    this.apparatusEntryFormIsVisible = true
  }

  updateApparatus(mainTextTokensWithTypesettingInfo) {
    this.verbose && console.log(`Updating apparatus ${this.options.apparatusIndex}`)
    this.cachedHtml = this._genApparatusHtml(mainTextTokensWithTypesettingInfo)
    $(this.getApparatusDivSelector()).html(this.cachedHtml)
    this._setUpEventHandlers()
    if (this.currentSelectedEntryIndex !== -1) {
      this._selectLemma(this.currentSelectedEntryIndex, false)
    }
  }


  generateToolbarHtml (tabId, mode, visible) {
    return `<div class="panel-toolbar-group">

                <div class="panel-toolbar-item">
                    <a class="edit-entry-btn tb-button hidden" href="#" title="Edit Entry">${editIcon}</a>
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
    if (entryIndex === -1) {
      // Deselect
      if (runCallbacks && this.currentSelectedEntryIndex !== -1) {
        this.options.onHighlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false)
      }
      this.currentSelectedEntryIndex = -1
      this._getEditEntryButtonElement().addClass('hidden')
      this._getClearSelectionButtonElement().addClass('hidden')
      return
    }
    this._getLemmaElement(entryIndex).addClass('lemma-selected')
    this._getEditEntryButtonElement().removeClass('hidden')
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

  _getClearSelectionButtonElement() {
    return  $(`${this.containerSelector} .clear-selection-btn`)
  }

  _genApparatusHtml(mainTextTokensWithTypesettingInfo) {
    let html = ''

    let lastLine = ''
    let sigla = this.edition.getSigla()
    let textDirectionMarker = this.edition.lang === 'la' ? '&lrm;' : '&rlm;'
    this.apparatus.entries.forEach( (apparatusEntry, aeIndex) => {
      html += `<span class="apparatus-entry apparatus-entry-${this.options.apparatusIndex}-${aeIndex}">`
      let currentLine = this._getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo)
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
          preLemmaSpanHtml = ApparatusCommon.getKeywordHtml(FmtText.getPlainText(apparatusEntry.preLemma))
      }
      let preLemmaSpan = preLemmaSpanHtml === '' ? '' : `<span class="pre-lemma">${preLemmaSpanHtml}</span> `

      let lemmaString = ApparatusCommon.getLemmaString(apparatusEntry.lemma, apparatusEntry.lemmaText)
      let lemmaSpan = `<span class="lemma lemma-${this.options.apparatusIndex}-${aeIndex}">${lemmaString}</span>`

      let postLemmaSpan = ''
      if (apparatusEntry.postLemma !== '') {
        let postLemma = ApparatusCommon.getKeywordHtml(FmtText.getPlainText(apparatusEntry.postLemma))
        postLemmaSpan = ` <span class="pre-lemma">${postLemma}</span>`
      }

      let separator = ''

      switch(apparatusEntry.separator) {
        case '':
          separator = ']'
          break

        case 'off':
          separator = ''
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
                            ${ApparatusCommon.genSubEntryHtmlContent(this.lang, subEntry, sigla)}
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