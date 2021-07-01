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

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)


export class ApparatusPanel extends  PanelWithToolbar {

  constructor (options) {
    super(options)
    let optionsSpec = {
      edition: { type: 'object', objectClass: Edition, required: true},
      apparatusIndex: { type: 'number', required: true},
      entrySeparator: { type: 'string', default: verticalLine},
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine}
    }
    let oc = new OptionsChecker(optionsSpec, 'Apparatus Panel')
    this.options = oc.getCleanOptions(options)
    /**
     * @member {Apparatus}
     */
    this.apparatus = this.options.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.options.edition.getLang()
    this.cachedHtml = 'Apparatus coming soon...'
  }

  updateEdition(edition) {
    this.options.edition = edition
    this.apparatus = this.options.edition.apparatuses[this.options.apparatusIndex]
    this.lang = this.options.edition.getLang()
  }

  generateContentHtml (tabId, mode, visible) {
    return this.cachedHtml
  }

  getContentAreaClasses () {
    return super.getContentAreaClasses().concat( ['apparatus', `text-${this.lang}`])
  }

  updateApparatus(mainTextTokensWithTypesettingInfo) {
    this.verbose && console.log(`Updating apparatus ${this.options.apparatusIndex}`)
    this.cachedHtml = this._genApparatusHtml(mainTextTokensWithTypesettingInfo)
    $(this.getContentAreaSelector()).html(this.cachedHtml)
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
        html+= `<span class="sub-entry sub-entry-${subEntryIndex}">
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