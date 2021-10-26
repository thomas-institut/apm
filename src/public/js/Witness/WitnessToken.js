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

import * as WitnessTokenType from './WitnessTokenType'
import * as NormalizationSource from '../constants/NormalizationSource'

/**
 * A token that can appear in a witness
 *
 *    tokenType :  'empty' | 'whitespace' | 'punctuation' | 'word' | 'format'
 *    text: string, the text associated with the token
 *    normalizedText: string
 *    normalizationSource: string, an indication of where the normalization comes from
 *    tokenClass: string, a further specification of the token type, it normally declares where the token
 *       comes from:  'fullTx' (a full transcription), 'edition', etc
 *
 *    depending on the type and class, a token can have other properties
 *
 *   tokenType === 'format'
 *     Used to store format marks such as section and paragraph breaks, non-breaking space, etc. Some
 *     of these may appear in the collation table for information purposes, as opposed to whitespace, which
 *     is normally not visible in the collation table.
 */


export class WitnessToken {

  constructor () {
    this.tokenType = WitnessTokenType.EMPTY
    this.text = ''
    this.tokenClass = ''
    this.normalizedText = ''
    this.normalizationSource = NormalizationSource.NONE
  }

  /**
   *
   * @param {string}wordString
   * @return {WitnessToken}
   */
  setWord(wordString) {
    this.tokenType = WitnessTokenType.WORD
    this.text = wordString
    return this
  }

  /**
   *
   * @param {string}punctuationString
   * @return {WitnessToken}
   */
  setPunctuation(punctuationString) {
    this.tokenType = WitnessTokenType.PUNCTUATION
    this.text = punctuationString
    return this
  }

  /**
   *
   * @param {string}whiteSpaceString
   * @return {WitnessToken}
   */
  setWhitespace(whiteSpaceString = ' ') {
    this.tokenType = WitnessTokenType.WHITESPACE
    this.text = whiteSpaceString
    this.normalizedText = ''
    this.normalizationSource = NormalizationSource.NONE
    return this
  }

  /**
   *
   * @param {string} formatText
   * @return {WitnessToken}
   */
  setFormat(formatText) {
    this.tokenType = WitnessTokenType.FORMAT
    this.text = formatText
    this.normalizedText = ''
    this.normalizationSource = NormalizationSource.NONE
    return this
  }

  /**
   *
   * @param {string} normalizedText
   * @param {string} normalizationSource
   * @return {WitnessToken}
   */
  setNormalization(normalizedText, normalizationSource = NormalizationSource.DEFAULT) {
    this.normalizedText = normalizedText
    this.normalizationSource = normalizationSource
    return this
  }
}