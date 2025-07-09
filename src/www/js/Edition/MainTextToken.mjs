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


import * as MainTextTokenType from './MainTextTokenType.mjs'
import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'
import { FmtTextToken } from '../FmtText/FmtTextToken.mjs'

/**
 * A token that can appear in the main text of an edition.
 *
 *   {
 *     type:  string : 'text' | 'glue' | 'empty' | 'paragraph_end'
 *     collationTableIndex:  the corresponding column in the collation table (which in turn points to the)
 *
 *     type === 'text'
 *        text:  a FmtText array
 *        lang: string, two letter code of the text's language
 *
 *   }
 *
 * Normally in APM, the main text of an edition is built automatically from the edition witness in CtData.
 * For the purposes of the collation table and to create an automatic apparatus, the edition witness only
 * needs to contain words and punctuation, whereas an edition main text should also have proper spaces between
 * words and other formatting information suitable to feed a typesetter and produce a nice looking document
 * output.
 *
 * Spaces can be generated programmatically, but other formatting marks need to be included in the edition witness
 * as well. The idea, however, is to include minimal semantic information about these marks in the edition witness
 * having the automatic main text generation algorithm take care of processing them accordingly. This leaves open
 * the possibility of generating different representations of the edition main text.
 *
 *
 *
 *
 */


export class MainTextToken {

  constructor () {
    this.type = MainTextTokenType.EMPTY

    /**
     *
     * @member {FmtTextToken[]}
     */
    this.fmtText = FmtTextFactory.empty()

    /**
     *
     * @member {number}
     */
    this.editionWitnessTokenIndex = -1

    this.style = ''
  }

  /**
   *
   * @return {string}
   */
  getPlainText() {
    return FmtText.getPlainText(this.fmtText)
  }

  /**
   *
   * @return {boolean}
   */
  isEmpty() {
    return this.type === MainTextTokenType.EMPTY
  }

  /**
   *
   * @param {string|array|FmtTextToken} theText
   * @param {number} editionWitnessTokenIndex
   * @param {string} lang
   * @return {MainTextToken}
   */
  setText(theText, editionWitnessTokenIndex = -1, lang = '') {
    this.type = MainTextTokenType.TEXT
    this.fmtText = FmtTextFactory.fromAnything(theText)
    this.editionWitnessTokenIndex = editionWitnessTokenIndex
    return this.setLang(lang)
  }

  /**
   *
   * @param {string}style
   * @return {MainTextToken}
   */
  setStyle(style) {
    this.style = style
    return this
  }

  /**
   *
   * @param {string} lang
   */
  setLang(lang) {
    this.lang = lang === '' ? undefined : lang
    return this
  }

  /**
   *
   * @param {number} editionWitnessTokenIndex
   * @return {MainTextToken}
   */
  setNormalSpace(editionWitnessTokenIndex = -1) {
    this.type = MainTextTokenType.GLUE
    this.fmtText = FmtTextFactory.oneNormalSpace()
    this.editionWitnessTokenIndex = editionWitnessTokenIndex
    return this
  }
}
