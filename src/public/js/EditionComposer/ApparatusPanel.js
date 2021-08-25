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

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

const editIcon = '<small><i class="fas fa-pen"></i></small>'
const clearSelectionIcon = '<i class="bi bi-backspace"></i>'

export class ApparatusPanel extends  PanelWithToolbar {

  constructor (options) {
    super(options)
    let optionsSpec = {
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatusIndex: { type: 'number', required: true},
      entrySeparator: { type: 'string', default: verticalLine},
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine},
      onHighlightMainText: {
        // function to be called when main text needs to be highlighted
        // (lemmaIndexArray, on) => { ... return nothing }
        type: 'function',
        default: doNothing}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:'Apparatus Panel'})
    this.options = oc.getCleanOptions(options)
    /**
     * @member {Apparatus}
     */
    this.apparatus = this.options.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.options.edition.getLang()
    this.cachedHtml = 'Apparatus coming soon...'
    this.currentSelectedLemma = []
  }

  updateEdition(edition) {
    this.options.edition = edition
    this.apparatus = this.options.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.options.edition.getLang()
    if (this.visible) {

    }
  }

  generateContentHtml (tabId, mode, visible) {
    return this.cachedHtml
  }

  getContentAreaClasses () {
    return super.getContentAreaClasses().concat( ['apparatus', `text-${this.lang}`])
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this._getEditEntryButtonElement().on('click', this._genOnClickEditEntryButton())
    // this._getClearSelectionButtonElement().on('click', this._genOnClickClearSelectionButton() )
    $(this.containerSelector).on('click', this._genOnClickClearSelectionButton())
  }

  _genOnClickEditEntryButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.currentSelectedLemma.length === 0) {
        return false
      }
      console.log(`Click on edit entry: ${this.currentSelectedLemma[1]}`)
    }
  }

  _genOnClickClearSelectionButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      this.options.onHighlightMainText(this.currentSelectedLemma, false)
      this.currentSelectedLemma = []
      this._getEditEntryButtonElement().addClass('hidden')
      this._getClearSelectionButtonElement().addClass('hidden')
      this._getLemmaElements().removeClass('lemma-selected')
    }
  }

  /**
   *
   * @return {JQuery}
   * @private
   */
  _getLemmaElements() {
    return $(`${this.getContentAreaSelector()} span.lemma`)
  }

  updateApparatus(mainTextTokensWithTypesettingInfo) {
    this.verbose && console.log(`Updating apparatus ${this.options.apparatusIndex}`)
    this.cachedHtml = this._genApparatusHtml(mainTextTokensWithTypesettingInfo)
    $(this.getContentAreaSelector()).html(this.cachedHtml)
    this._setUpEventHandlers()
  }


  generateToolbarHtml (tabId, mode, visible) {
    return `<div class="panel-toolbar-group">
                <div class="panel-toolbar-item">
                    <a class="edit-entry-btn tb-button hidden" href="#" title="Edit Entry">${editIcon}</a>
                </div>
                 <!--<div class="panel-toolbar-item">
                    <a class="clear-selection-btn tb-button hidden" href="#" title="Clear Selection">${clearSelectionIcon}</a>
                </div>-->
            </div>`
  }

  _setUpEventHandlers() {
    this._getLemmaElements().off()
      .on('mouseenter', this._genOnMouseEnterLemma())
      .on('mouseleave', this._genOnMouseLeaveLemma())
      .on('click', this._genOnClickLemma())
  }

  _genOnMouseEnterLemma() {
    return (ev) => {
      let target = $(ev.target)
      if (!target.hasClass('lemma-selected')) {
        target.addClass('lemma-hover')
      }
    }
  }

  _genOnMouseLeaveLemma() {
    return (ev) => {
      $(ev.target).removeClass('lemma-hover')
    }
  }

  _genOnClickLemma() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      this._getLemmaElements().removeClass('lemma-selected')
      let target = $(ev.target)
      target.removeClass('lemma-hover').addClass('lemma-selected')
      this._getEditEntryButtonElement().removeClass('hidden')
      this._getClearSelectionButtonElement().removeClass('hidden')
      let lemmaIndex = this._getLemmaIndexFromElement(target)
      this.options.onHighlightMainText(this.currentSelectedLemma, false)
      this.options.onHighlightMainText(lemmaIndex, true)
      this.currentSelectedLemma = lemmaIndex
    }
  }

  onHidden () {
    super.onHidden()
    if (this.currentSelectedLemma.length !== 0) {
      this.options.onHighlightMainText(this.currentSelectedLemma, false)
    }
    this.options.onHighlightMainText(this.currentSelectedLemma, false)
  }

  onShown () {
    super.onShown()
    if (this.currentSelectedLemma.length !== 0) {
      this.options.onHighlightMainText(this.currentSelectedLemma, true)
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
    let sigla = this.options.edition.getSigla()
    this.apparatus.entries.forEach( (apparatusEntry, aeIndex) => {
      html += `<span class="apparatus-entry apparatus-entry-${this.options.apparatusIndex}-${aeIndex}">`
      let currentLine = this._getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo)
      let lineHtml = `&nbsp;${this.options.entrySeparator}&nbsp;`
      if (currentLine !== lastLine) {
        let lineSep = aeIndex !== 0 ? `${this.options.apparatusLineSeparator}&nbsp;` : ''
        lineHtml = `${lineSep}<b class="apparatus-line-number">${currentLine}</b>`
        lastLine = currentLine
      }
      html +=  `${lineHtml} <span class="lemma lemma-${this.options.apparatusIndex}-${aeIndex}">${apparatusEntry.lemma}</span>] `
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


  /**
   *
   * @returns {string}
   * @private
   */
  // _getTextDirection() {
  //   if (this.lang === 'he' || this.lang === 'ar') {
  //     return 'rtl'
  //   }
  //   return 'ltr'
  // }

}