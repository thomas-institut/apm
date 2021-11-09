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
import { ApparatusEntryInput, userCancelledReason } from './ApparatusEntryInput'
import { capitalizeFirstLetter } from '../toolbox/Util.mjs'
import { CtData } from '../CtData/CtData'
import { onClickAndDoubleClick } from '../toolbox/DoubleClick'

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

const editIcon = '<small><i class="fas fa-pen"></i></small>'


export class ApparatusPanel extends  PanelWithToolbar {

  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object' },
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatusIndex: { type: 'number', required: true},
      entrySeparator: { type: 'string', default: verticalLine},
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine},
      onCtDataChange: { type: 'function', default: doNothing},
      onError: { type: 'function', default: doNothing},
      onHighlightMainText: {
        // function to be called when main text needs to be highlighted
        // (lemmaIndexArray, on) => { ... return nothing }
        type: 'function',
        default: doNothing}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:'Apparatus Panel'})
    this.options = oc.getCleanOptions(options)

    this.ctData = CtData.copyFromObject(this.options.ctData)
    /**
     * @member {Edition}
     */
    this.edition = this.options.edition

    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.edition.getLang()
    this.cachedHtml = 'Apparatus coming soon...'
    this.currentSelectedLemma = []
  }

  updateData(ctData, edition) {
    this.ctData = CtData.copyFromObject(ctData)
    this.edition = edition
    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.edition.getLang()
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
    $(this.containerSelector).on('click', this._genOnClickClearSelectionButton())
  }

  _editSelectedEntry() {
    if (this.currentSelectedLemma.length === 0) {
      return
    }
    let apparatusIndex = this.currentSelectedLemma[0]
    let entryIndex = this.currentSelectedLemma[1]
    console.log(`Editing entry: apparatus ${apparatusIndex}, entry ${entryIndex}`)
    let from = this.edition.apparatuses[apparatusIndex].entries[entryIndex].from
    let to = this.edition.apparatuses[apparatusIndex].entries[entryIndex].to
    let currentApparatusEntries = this.edition.apparatuses.map( (app) => {
      let index = app.findEntryIndex(from, to)
      if (index === -1) {
        return []
      }
      return app.entries[index].subEntries
    })
    let entryText = this.edition.apparatuses[apparatusIndex].entries[entryIndex].lemmaText
    let aei = new ApparatusEntryInput({
      apparatuses: this.edition.apparatuses.map( (app, i) => {
        return {  name: app.type, title: capitalizeFirstLetter(app.type), currentEntries: currentApparatusEntries[i]}
      }),
      selectedApparatusIndex: apparatusIndex,
      entryText: entryText,
      ctIndexFrom: CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[from].editionWitnessTokenIndex),  // TODO: change this to proper values
      ctIndexTo: CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[to].editionWitnessTokenIndex),
      lang: this.lang,
      sigla: this.edition.getSigla()
    })
    aei.getEntry().then( (newEntry) => {
      this.verbose && console.log(`Updated apparatus entry `)
      this.verbose && console.log(newEntry)

      this.ctData = ApparatusCommon.updateCtDataWithNewEntry(this.ctData, this.edition, from, to, newEntry, entryText, currentApparatusEntries, this.verbose)
      this.options.onCtDataChange(this.ctData)

    })
      .catch( (reason) => {
        if (reason !== userCancelledReason) {
          console.error(`Fail updating apparatus entry`)
          console.log(reason)
          this.options.onError(`Error updating apparatus entry`)
        }
      })
  }

  _genOnClickEditEntryButton() {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      return this._editSelectedEntry()
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
                <div class="panel-toolbar-item">
                    &nbsp;
                </div>
            </div>`
  }

  _setUpEventHandlers() {
    let lemmaElements = this._getLemmaElements()
    lemmaElements.off()
      .on('mouseenter', this._genOnMouseEnterLemma())
      .on('mouseleave', this._genOnMouseLeaveLemma())
    onClickAndDoubleClick(lemmaElements, this._genOnClickLemma(), this._genOnDoubleClickLemma())
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

  _genOnDoubleClickLemma() {
    return (ev) => {
      this._selectLemmaFromClickTarget(ev.target)
      this._editSelectedEntry()
    }
  }

  _genOnClickLemma() {
    return (ev) => {
      this._selectLemmaFromClickTarget(ev.target)
    }
  }

  _selectLemmaFromClickTarget(clickTarget) {
    let target = $(clickTarget)
    this._getLemmaElements().removeClass('lemma-selected')
    target.removeClass('lemma-hover').addClass('lemma-selected')
    this._getEditEntryButtonElement().removeClass('hidden')
    this._getClearSelectionButtonElement().removeClass('hidden')
    let lemmaIndex = this._getLemmaIndexFromElement(target)
    this.options.onHighlightMainText(this.currentSelectedLemma, false)
    this.options.onHighlightMainText(lemmaIndex, true)
    this.currentSelectedLemma = lemmaIndex
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
      let lemmaString = ApparatusCommon.getLemmaString(apparatusEntry.lemma, apparatusEntry.lemmaText)
      html +=  `${lineHtml} <span class="lemma lemma-${this.options.apparatusIndex}-${aeIndex}">${lemmaString}</span>] `
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