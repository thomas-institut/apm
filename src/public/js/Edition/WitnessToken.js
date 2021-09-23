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

import * as WitnessTokenType from '../constants/WitnessTokenType'

export class WitnessToken {

  constructor () {
    this.tokenType = WitnessTokenType.EMPTY
    this.text = ''
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
    return this
  }
}