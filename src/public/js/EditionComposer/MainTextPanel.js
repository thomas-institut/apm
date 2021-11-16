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
 * Edition  Panel.
 *
 *  - Edition text and apparatus manipulation in a printed edition type user interface
 */

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { getSingleIntIdFromClasses} from '../toolbox/UserInterfaceUtil'
import {getTypesettingInfo} from '../Typesetter/BrowserTypesettingCalculations'
import { doNothing, wait } from '../toolbox/FunctionUtil'
import { MultiToggle } from '../widgets/MultiToggle'
import { EditableTextField } from '../widgets/EditableTextField'
import { ApparatusCommon } from './ApparatusCommon'
import * as EditionMainTextTokenType from '../Edition/MainTextTokenType'
import { Edition } from '../Edition/Edition'
import { HtmlRenderer } from '../FmtText/Renderer/HtmlRenderer'
import { PanelWithToolbar } from './PanelWithToolbar'
import { prettyPrintArray } from '../toolbox/ArrayUtil'
import { CtData } from '../CtData/CtData'

import { EditionFreeTextEditor } from './EditionFreeTextEditor'
import {FmtTextFactory} from '../FmtText/FmtTextFactory'
import {FmtTextTokenFactory} from '../FmtText/FmtTextTokenFactory'

const EDIT_MODE_OFF = 'off'
const EDIT_MODE_TEXT = 'text'
const EDIT_MODE_APPARATUS = 'apparatus'
const EDIT_MODE_TEXT_BETA = 'text_beta'

const typesetInfoDelay = 200

const betaEditorDivId = 'text-editor-beta'

const icons = {
  addEntry: '<i class="bi bi-plus-lg"></i>'
}

export class MainTextPanel extends PanelWithToolbar {

  constructor (options = {}) {
    super(options)
    let optionsDefinition = {
      ctData: { type: 'object' },
      edition: { type: 'object', objectClass: Edition },
      apparatusPanels: { type: 'array' },
      onError: { type: 'function', default: doNothing},
      onConfirmMainTextEdit: {
        // function to call when the user edits a main text token
        //  (mainTextTokenIndex, newText) => boolean,  if false, no changes are made to the displayed text
        type: 'function',
        default: (section, tokenIndex, newText) => {
          console.log(`Confirming edit of main text token ${tokenIndex} in section ${prettyPrintArray(section)} with new text '${newText}'`)
          return true
        }
      },
      onCtDataChange: { type: 'function', default: doNothing}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  'Edition Panel'})
    this.options = oc.getCleanOptions(options)
    this.ctData = CtData.copyFromObject(this.options.ctData)
    this.edition = this.options.edition
    this.lang = this.options.ctData['lang']
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
    this.currentEditMode = EDIT_MODE_OFF
    this.editingTextToken = false
    this.originalTokenText = '__null__'
    this.tokenBeingEdited = -1
    this.textTokenEditor = null
    this.selection = { from: -1, to: -1 }
    this.selecting = false
    this.cursorInToken = false
    this.tokenIndexOne = -1
    this.tokenIndexTwo = -1
    this.lastTypesetinfo = null
  }

  /**
   *
   * @param {object} ctData
   * @param {Edition} edition
   */
  updateData(ctData, edition) {
    this.ctData = CtData.copyFromObject(ctData)
    this.edition = edition

    this.options.apparatusPanels.forEach( (ap) => {
      ap.updateData(ctData, edition)
    })

    if (this.visible) {
      $(this.getContentAreaSelector()).html(this.generateContentHtml('', '', true))
      this._setupMainTextDivEventHandlers()
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
      this._updateLineNumbersAndApparatuses()
        .then( () => { this.verbose && console.log(`Finished showing edition on update data`) })
    } else {
      // use current typeset info if already calculated
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      if (this.lastTypesetinfo === null) {
        // typeset info not calculated, just get one even if it's incorrect

        this._updateLineNumbersAndApparatuses()
          .then( () => { this.verbose && console.log(`Finished showing edition on update data`) })
      } else {
        this.options.apparatusPanels.forEach( (p) => { p.updateApparatus(this.lastTypesetinfo)})
      }
    }

  }

  generateToolbarHtml (tabId, visible) {
    return `<div class="panel-toolbar-group">
            <div class="panel-toolbar-group" id="edition-panel-mode-toggle"></div>
            <div class="panel-toolbar-group apparatus-toolbar">
                <div class="panel-toolbar-item">
                    <a class="add-entry-btn tb-button hidden" href="#" title="Add custom apparatus entry">${icons.addEntry}</a>
                </div>
            </div>
        </div>`
  }

  generateContentHtml (tabId, mode, visible) {
    if (!visible) {
      // if (mode !== this.lastMode) {
        this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      // }
      return `Waiting to be shown to generate content`
    }
    // this.verbose && console.log(`Generating html for main text panel`)
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
    return this._generateMainTextHtml()
  }

  getContentAreaClasses () {
    return super.getContentAreaClasses().concat([ 'main-text', `text-${this.lang}`, `mode-${this.currentEditMode}`])
  }

  onResize (visible) {
    super.onResize(visible)
    if (!visible) {
      // force a redraw on the next onShown event
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      return
    }
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      // the main text is not typeset properly yet, just wait until the next onShown event
      this.verbose && console.log(`Edition panel resize but not shown yet, nothing to do`)
      return
    }
    // the panel is visible and the main text is drawn in the content area
    switch(this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this.verbose && console.log(`Resize: about to update apparatuses`)
        this._updateLineNumbersAndApparatuses()
          .then( () => { this.verbose && console.log(`Done resizing`)})
        break

      case EDIT_MODE_TEXT_BETA:
        //console.log(`Resize in beta editor mode, nothing to do`)
        break

      default:
        console.error(`Unknown edit mode ${this.currentEditMode} on resize`)
    }

  }

  onShown () {
    super.onShown()
    //this.verbose && console.log(`Edition Panel shown`)
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
      $(this.getContentAreaSelector()).html(this.generateContentHtml('', '', true))
      switch(this.currentEditMode) {
        case EDIT_MODE_OFF:
        case EDIT_MODE_TEXT:
        case EDIT_MODE_APPARATUS:
          this._setupMainTextDivEventHandlers()
          this._updateLineNumbersAndApparatuses()
            .then( () => { this.verbose && console.log(`Finished generating edition panel on shown`) })
          break

        case EDIT_MODE_TEXT_BETA:
          console.log(`Beta editor shown`)
          break

        default:
          console.error(`Unknown edit mode ${this.currentEditMode}`)
      }
    }
  }

  /**
   * Highlights the main text that corresponds to the given lemma index
   * @param {string} apparatusType
   * @param {number[]}lemmaIndex
   * @param {boolean} on
   */
  highlightTextForLemma(apparatusType, lemmaIndex, on) {
    // ignore section index for now
    // TODO: support multiple sections

    if (lemmaIndex.length < 2) {
      return
    }
    let theIndex = lemmaIndex[1]
    let appIndex  = this.edition.apparatuses.map ( (app) => { return app.type}).indexOf(apparatusType)
    if (appIndex === -1) {
      console.warn(`Asked to highlight text for nonexistent apparatus: ${apparatusType}`)
      return
    }

    let entry = this.edition.apparatuses[appIndex].entries[theIndex]
    if (entry === undefined) {
      console.warn(`Asked to highlight text for nonexistent entry ${apparatusType} : [0, ${theIndex}]`)
      return
    }

    for (let i = entry.from; i <= entry.to; i++) {
      let textElement = $(`${this.containerSelector} .main-text-token-${i}`)
      if (on) {
        textElement.addClass('token-highlighted')
      } else {
        textElement.removeClass('token-highlighted')
      }
    }


  }



  postRender (id, mode, visible) {
    this.verbose && console.log(`Post render main text panel, visible = ${visible}`)
    this.onResize(visible)
    this.modeToggle = new MultiToggle({
      containerSelector: '#edition-panel-mode-toggle',
      title: 'Edit: ',
      buttonClass: 'tb-button',
      initialOption: this.currentEditMode,
        wrapButtonsInDiv: true,
        buttonsDivClass: 'panel-toolbar-item',
        buttonDef: [
          { label: 'Off', name: EDIT_MODE_OFF, helpText: 'Turn off editing'},
          { label: 'Text', name: EDIT_MODE_TEXT, helpText: 'Edit main text'},
          { label: 'Apparatus', name: EDIT_MODE_APPARATUS, helpText: 'Add/Edit apparatus entries'},
          { label: 'Text<sup>BETA</sup>', name: EDIT_MODE_TEXT_BETA, helpText: 'Edit main text (beta)'}
        ]

    })
    this.modeToggle.on('toggle',  (ev) => {
      let previousEditMode = this.currentEditMode
      let newEditMode = ev.detail.currentOption
      this._changeEditMode(newEditMode, previousEditMode)
    })
    this._eleAddEntryButton().on('click', this._genOnClickAddEntryButton())
    switch (this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this._setupMainTextDivEventHandlers()
        break

      case EDIT_MODE_TEXT_BETA:
        console.log(`Post render beta mode`)
        break

    }

  }

  _changeEditMode(newEditMode, previousEditMode) {
    this.verbose && console.log(`Edit mode changed from ${previousEditMode} to ${newEditMode}`)

    if (this.editingTextToken) {
      this._stopEditingMainText(this.originalTokenText)
    }
    this._clearSelection()
    $(this.getContentAreaSelector()).removeClass(`mode-${previousEditMode}`).addClass(`mode-${newEditMode}`)

    switch(newEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this.currentEditMode = newEditMode
        if (previousEditMode === EDIT_MODE_TEXT_BETA) {
          $(this.getContentAreaSelector()).html(this._getMainTextHtmlVersion())
          this._setupMainTextDivEventHandlers()
          this._updateLineNumbersAndApparatuses().then( () => { console.log(`Finished switching mode to ${this.currentEditMode}`)})
        }
        break

      case EDIT_MODE_TEXT_BETA:
        this.currentEditMode = newEditMode
        $(this.getContentAreaSelector()).html(this._getMainTextBetaEditor())
        this.freeTextEditor = new EditionFreeTextEditor({
            containerSelector: `#${betaEditorDivId}`,
            lang: this.lang,
            onChange: () =>  { console.log(`Change in text detected`) },
            debug: false
        })

        this.freeTextEditor.setText( this._convertMainTextToFmtText())
        console.log(`Now in beta mode`)
        break

      default:
        console.error(`Unknown edit mode ${newEditMode}`)
    }
  }

  _getLemmaFromSelection() {
    if (this.isSelectionEmpty()) {
      return ''
    }
    let lemma = this.edition.mainText.filter( (token, i) => {
      return i>=this.selection.from && i<=this.selection.to
    }).map ( (token) => { return token.getPlainText()}).join('')
    console.log(`Lemma from selection ${this.selection.from}-${this.selection.to}: '${lemma}'`)
    return lemma
    // let lemma = ''
    // for (let i=this.selection.from; i <= this.selection.to; i++) {
    //   lemma += $(`${this.containerSelector} .main-text-token-${i}`).text() + ' '
    // }
    // return removeExtraWhiteSpace(lemma)
  }

  _genOnClickAddEntryButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      this.verbose && console.log(`Click on add entry button`)
      // let currentApparatuses = this.edition.apparatuses.map( (app, i) => {
      //   let index = app.findEntryIndex( this.selection.from, this.selection.to)
      //   return {
      //     name: app.type,
      //     title: capitalizeFirstLetter(app.type),
      //     entryIndex: index,
      //     preLemma: index === -1 ? '' : app.entries[index].preLemma,
      //     lemma: index === -1 ? '' : app.entries[index].lemma,
      //     postLemma: index === -1 ? '' : app.entries[index].postLemma,
      //     separator: index === -1 ? '' : app.entries[index].separator,
      //     currentEntries: index === -1 ? [] : app.entries[index].subEntries
      //   }
      // })
      let entryText = this._getLemmaFromSelection()
      let from = this.selection.from
      let to = this.selection.to
      this.verbose(`Selection ${from} to ${to}, '${entryText}'`)

      // TODO: show menu with apparatuses and then show the proper tab accordingly
      // let aei = new ApparatusEntryInput({
      //   apparatuses: currentApparatuses,
      //   entryText: entryText,
      //   ctIndexFrom: CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[from].editionWitnessTokenIndex),
      //   ctIndexTo: CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[to].editionWitnessTokenIndex),
      //   lang: this.lang,
      //   sigla: this.edition.getSigla()
      // })
      // aei.getEntry().then( (newEntry) => {
      //   this.verbose && console.log(`Updated apparatus entry `)
      //   this.verbose && console.log(newEntry)
      //   this.ctData = ApparatusCommon.updateCtDataWithNewEntry(this.ctData, this.edition, this.selection.from, this.selection.to, newEntry, entryText, currentApparatusEntries, this.verbose)
      //   this.options.onCtDataChange(this.ctData)
      // })
      //   .catch( (reason) => {
      //     if (reason !== userCancelledReason) {
      //       console.error(`Fail updating apparatus entry`)
      //       console.log(reason)
      //       this.options.onError(`Error adding/updating apparatus entry`)
      //     }
      //   })
    }
  }

  _setupMainTextDivEventHandlers() {
    $(`${this.containerSelector} .main-text`)
      .off()
      .on('click', this._genOnClickMainTextDiv())
      .on('mousedown', this._genOnMouseDownMainTextDiv())
      .on('mouseup', this._genOnMouseUpMainTextDiv())
      .on('mouseleave', this._genOnMouseLeaveDiv())
    $(`${this.containerSelector} span.main-text-token`)
      .off()
      .on('click', this._genOnClickMainTextToken())
      .on('mousedown', this._genOnMouseDownMainTextToken())
      .on('mouseup', this._genOnMouseUpMainTexToken())
      .on('mouseenter', this._genOnMouseEnterToken())
      .on('mouseleave', this._genOnMouseLeaveToken())
  }

  _genOnMouseDownMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      this._stopSelecting()
      this._clearSelection()
    }
  }

  _genOnMouseUpMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // this.verbose && console.log(`Mouse up on main text div`)
      if (this.cursorInToken) {
        return
      }
      if (this.selecting) {
        this._stopSelecting()
        this._clearSelection()
      }
    }
  }


  _genOnClickMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // this.verbose && console.log(`Click on main text div`)
    }
  }

  _genOnClickMainTextToken() {
    return (ev) => {
      ev.stopPropagation()
    }
  }

  _genOnMouseDownMainTextToken() {
    // TODO: deal with right mouse click
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.editingTextToken) {
        return
      }
      let tokenIndex = getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
      if ($(ev.target).hasClass('whitespace')) {
        return
      }
      switch(this.currentEditMode) {
        case EDIT_MODE_TEXT:
          this.verbose && console.log(`Click on main text token ${tokenIndex} in main text edit mode`)
          let tokenSelector = `.main-text-token-${tokenIndex}`
          this.originalTokenText = $(tokenSelector).text()
          this.verbose && console.log(`Text to edit: '${this.originalTokenText}'`)
          this.tokenBeingEdited = tokenIndex
          this.textTokenEditor = new EditableTextField({
            containerSelector:  tokenSelector,
            initialText: this.originalTokenText,
            minTextFormSize: 2,
            startInEditMode: true
          })
          this.textTokenEditor.on('confirm', (ev) => {
            let newText = ev.detail.newText
            // It should be assumed that newText is a valid edit (cell validation should have taken care of wrong edits).
            // Even if newText would simply replace the current main text token, it can be the case that there is a change
            // in the lines, so there should always be a regeneration of the edition, a redraw of the main text
            // and an update to the apparatuses.
            if (this.options.onConfirmMainTextEdit(tokenIndex, newText)) {
              this.verbose && console.log(`Confirming editing, new text = '${newText}'`)
              this._stopEditingMainText(newText)
              this._redrawMainText()
              this._setupMainTextDivEventHandlers()
              this._updateLineNumbersAndApparatuses().then( () => {
                this.verbose && console.log(`Main text redrawn`)
              })
            } else {
              this.verbose && console.log(`Change to main text not accepted`)
              // TODO: indicate this error in some way in the UI, although it should NEVER happen
              this._stopEditingMainText(this.originalTokenText)
            }
          }).on('cancel', () => {
            console.log(`Canceling edit`)
            this._stopEditingMainText(this.originalTokenText)
          })
          this.editingTextToken = true
          break

        case EDIT_MODE_APPARATUS:
          // this.verbose && console.log(`Mouse down on main text ${tokenIndex} token in apparatus edit mode`)
          this._setSelection(tokenIndex, tokenIndex)
          this.tokenIndexOne = tokenIndex
          this._showSelectionInBrowser()
          this._processNewSelection()
          this._startSelecting()
          break
      }
    }
  }

  _stopEditingMainText(text) {
    if (this.editingTextToken)  {
      this.verbose && console.log(`Stopping editing token ${this.tokenBeingEdited}`)
      this.textTokenEditor.destroy()
      let tokenSelector = `.main-text-token-${this.tokenBeingEdited}`
      this.tokenBeingEdited = -1
      this.originalTokenText = '__null__'
      this.editingTextToken = false
      $(tokenSelector).html(text)
        .on('click', this._genOnClickMainTextToken())
        .on('mousedown', this._genOnMouseDownMainTextToken())
        .on('mouseup', this._genOnMouseUpMainTexToken())
        .on('mouseenter', this._genOnMouseEnterToken())
        .on('mouseleave', this._genOnMouseLeaveToken())
    }
  }

  _startSelecting() {
    this.selecting = true
  }

  _stopSelecting() {
    this.selecting = false
  }

  _eleAddEntryButton() {
    return $(`${this.containerSelector} a.add-entry-btn`)
  }

  _processNewSelection() {
    this.verbose && console.log(`New selection: ${this.selection.from} -> ${this.selection.to}`)
    let addEntryButton = this._eleAddEntryButton()
    if (this.isSelectionEmpty()) {
      addEntryButton.addClass('hidden')
    } else {
      addEntryButton.removeClass('hidden')
    }
  }

  isSelectionEmpty() {
    return this.selection.from === -1
  }

  _clearSelectionInBrowser() {
    $(`${this.containerSelector} .main-text-token`).removeClass('token-selected')
  }

  _clearSelection() {
    if (this._selectionsAreEqual(this.selection, this._createSelection(-1, -1))) {
      return
    }
    this._setSelection(-1, -1)
    this._clearSelectionInBrowser()
    this._processNewSelection()
  }


  _setSelection(token1, token2) {
    this.selection = this._createSelection(token1, token2)
  }

  _selectionsAreEqual(sel1, sel2) {
    return sel1.from === sel2.from && sel1.to === sel2.to
  }

  _createSelection(token1, token2) {
    return {
      from: Math.min(token1, token2),
      to: Math.max(token1, token2)
    }
  }

  _showSelectionInBrowser() {
    this._clearSelectionInBrowser()
    for (let i=this.selection.from; i <=this.selection.to; i++) {
      $(`${this.containerSelector} .main-text-token-${i}`).addClass('token-selected')
    }
  }

  _genOnMouseLeaveDiv() {
    return () => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      // this.verbose && console.log(`Mouse leave main text div, selecting = ${this.selecting}`)
      if (this.selecting) {
        this._stopSelecting()
      }
    }
  }

  _genOnMouseLeaveToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.stopPropagation()
      this.cursorInToken = false
    }
  }

  _genOnMouseEnterToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      this.cursorInToken = true
      if (this.selecting) {
        this.tokenIndexTwo =  getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
        // console.log(`Mouse enter on token ${this.tokenIndexTwo} while selecting`)
        this._setSelection(this.tokenIndexOne, this.tokenIndexTwo)
        this._showSelectionInBrowser()
        this._processNewSelection()
      }
    }
  }

  /**
   *
   * @returns {(function(): void)|*}
   * @private
   */
  _genOnMouseUpMainTexToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      if ($(ev.target).hasClass('whitespace')) {
        return
      }
      let tokenIndex = getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
      // this.verbose && console.log(`Mouse up on main text ${tokenIndex} token in apparatus edit mode`)
      if (tokenIndex === -1) {
        console.log(`Mouse up on a token -1`)
        return
      }

      this.tokenIndexTwo = tokenIndex
      if (!this._selectionsAreEqual(this.selection, this._createSelection(this.tokenIndexOne, this.tokenIndexTwo))) {
        this._setSelection(this.tokenIndexOne, this.tokenIndexTwo)
        this._showSelectionInBrowser()
        this._processNewSelection()
      }
      this._stopSelecting()

    }
  }

  _updateLineNumbersAndApparatuses() {
    return wait(typesetInfoDelay).then( () => {
      this.verbose && console.log(`Updating apparatuses div`)
      this.lastTypesetinfo = getTypesettingInfo(this.containerSelector, 'main-text-token-', this.edition.mainText)
      this._drawLineNumbers(this.lastTypesetinfo)
      this.options.apparatusPanels.forEach( (p) => { p.updateApparatus(this.lastTypesetinfo)})
    })
  }

  _redrawMainText() {
    $(this.getContentAreaSelector()).html(this._generateMainTextHtml())
  }

  _generateMainTextHtml() {
    switch(this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        return this._getMainTextHtmlVersion()

      case EDIT_MODE_TEXT_BETA:
        return  this._getMainTextBetaEditor()

      default:
         return `Error: unknown edit mode: ${this.currentEditMode}`
    }
  }

  _convertMainTextToFmtText() {
    console.log(`Converting Main Text to Fmt Text`)
    console.log( this.edition.mainText)
    let fmtText = FmtTextFactory.fromAnything( this.edition.mainText.map( (token) => {
      switch (token.type) {
        case EditionMainTextTokenType.GLUE:
          return FmtTextTokenFactory.normalSpace()

        case EditionMainTextTokenType.TEXT:
          return token.fmtText

        default:
           return []
      }
    }))
    console.log(`Fmt Text:`)
    console.log(fmtText)
    return fmtText
  }

  _getMainTextBetaEditor() {
    return `<div id="${betaEditorDivId}"/>`
  }

  _getMainTextHtmlVersion() {
    let fmtTextRenderer = new HtmlRenderer({plainMode : true })
    let classes = []
    return this.edition.mainText.map( (token, i) => {
      switch(token.type) {
        case EditionMainTextTokenType.GLUE:
          classes = [ 'main-text-token', `main-text-token-${i}`, 'whitespace']
          return `<span class="${classes.join(' ')}"> </span>`

        case EditionMainTextTokenType.TEXT:
          let ctIndex = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, token.editionWitnessTokenIndex)
          classes = [ 'main-text-token', `main-text-token-${i}`, `ct-index-${ctIndex}`]
          return `<span class="${classes.join(' ')} ">${fmtTextRenderer.render(token.fmtText)}</span>`

        default:
          return ''
      }
    }).join('')
  }

  _drawLineNumbers(mainTextTokensWithTypesettingInfo) {

    let lineFrequency = 5
    let mainTexDiv =  $(`${this.containerSelector} .main-text`)
    // let lineHeight = this.lang === 'la' ? "1em" : "1.5em"

    let fontBaseLineRatio = 0.920
    let lineNumberFontSizeFactor = 0.8
    let fontLineHeightFactor = 1.13
    // TODO: find this programmatically
    let mainTextFontSize = 18

    let offsetY = mainTexDiv.offset().top
    let margin = this.lang === 'la' ? 'left' : 'right'
    let posX = margin === 'left' ? 50 : 50
    let lineNumberOverlays =  mainTextTokensWithTypesettingInfo.lineMap
      .filter( (lineSpec) => { return lineSpec.line === 1 || (lineSpec.line % lineFrequency === 0)})
      .map( (lineSpec) => {
        let posY = lineSpec.pY - offsetY
        if (this.lang === 'la') {
          // TODO: do this for the other languages
          let lineOffset = mainTextFontSize*fontBaseLineRatio*(1-lineNumberFontSizeFactor)
          posY = lineSpec.pY - offsetY + lineOffset
          // console.log(`Line number for line ${lineSpec.line}: pY = ${lineSpec.pY}, offset = ${lineOffset}`)
        }

        let lineString = ApparatusCommon.getNumberString(lineSpec.line, this.lang)
        return `<div class="line-number text-${this.lang}" style="position: absolute; 
top: ${posY}px; ${margin}: ${posX}px; line-height: ${fontLineHeightFactor}em;
font-size: ${ mainTextFontSize*lineNumberFontSizeFactor}px;">${lineString}</div>`
      })
      .join('')

    $('#main-text-line-numbers').remove()
    mainTexDiv.append(`<div id="main-text-line-numbers">${lineNumberOverlays}</div>`)
  }
}