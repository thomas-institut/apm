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

import * as Punctuation from '../defaults/Punctuation'
import { WitnessToken } from '../Edition/WitnessToken'

export class WitnessTokenStringParser {

  /**
   *
   * @param str
   * @param lang
   * @return {WitnessToken[]}
   */
  static parse(str, lang = '') {
    // TODO: redo this with a state machine
    let tokenArray = []
    let currentWord = ''
    let currentWhiteSpace = ''
    str.split('').forEach( (ch) => {
      if (this.isWordToken(ch, lang)) {
        // word
        currentWord += ch
        if (currentWhiteSpace !== '') {
          tokenArray.push( (new WitnessToken()).setWhitespace(currentWhiteSpace))
          currentWhiteSpace = ''
        }
        return
      }
      if (this.strIsPunctuation(ch, lang)) {
        // punctuation
        if (currentWord !== '') {
          tokenArray.push( (new WitnessToken()).setWord(currentWord))
          currentWord = ''
        }
        if (currentWhiteSpace !== '') {
          tokenArray.push( (new WitnessToken()).setWhitespace(currentWhiteSpace))
          currentWhiteSpace = ''
        }
        tokenArray.push( (new WitnessToken()).setPunctuation(ch))
        return
      }
      // whitespace
      if (currentWord !== '') {
        tokenArray.push( (new WitnessToken()).setWord(currentWord))
        currentWord = ''
      }
      currentWhiteSpace += ch
    })
    if (currentWord !== '') {
      tokenArray.push( (new WitnessToken()).setWord(currentWord))
    }

    return tokenArray
  }


  /**
   *
   * @param text
   * @param lang, if an empty string only common characters are checked
   * @return {boolean}
   */
  static strIsPunctuation(text, lang = '') {
    if (text === undefined) {
      return false
    }
    let punctuationArray = Punctuation.getValidPunctuationForLang(lang)
    for (let i = 0; i < text.length; i++) {
      if (punctuationArray.indexOf(text.substr(i, 1)) === -1) {
        return false
      }
    }
    return true
  }

  static isWordToken(text, lang = '') {
    return !this.hasWhiteSpace(text) && !this.hasPunctuation(text, lang)
  }

  static hasPunctuation(text, lang = '') {
    let punctuationArray = Punctuation.getValidPunctuationForLang(lang)
    for (let i = 0; i < text.length; i++) {
      if (punctuationArray.indexOf(text.substr(i, 1)) !== -1) {
        return true
      }
    }
    return false
  }

  static hasWhiteSpace(text) {
    return /\s/.test(text)
  }

}