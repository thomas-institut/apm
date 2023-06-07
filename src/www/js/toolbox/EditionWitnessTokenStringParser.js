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

import { Punctuation} from '../defaults/Punctuation.mjs'
import { WitnessToken } from '../Witness/WitnessToken'
import { pushArray } from './ArrayUtil.mjs'
import { NumeralStyles } from './NumeralStyles.mjs'
import { EditionWitnessToken } from '../Witness/EditionWitnessToken'
import { IgnoreIntraWordQuotationMark } from '../normalizers/ParserNormalizer/IgnoreIntraWordQuotationMark'

export class EditionWitnessTokenStringParser {

  /**
   * Parses a string into an array of WitnessToken
   * @param {string}str
   * @param {string}lang
   * @param detectNumberingLabels
   * @return {WitnessToken[]}
   */
  static parse (str, lang, detectNumberingLabels = true) {
    // console.log(`Parsing string '${str}', lang='${lang}'`)
    let state = 0
    let tokenArray = []
    let currentWhiteSpace = ''
    let currentWordCharacters = []
    for (let i = 0; i < str.length; i++) {
      let ch = str.charAt(i)
      //console.log(`Processing '${ch}', state = ${state}`)
      switch (state) {
        case 0: // accumulating whitespace
          if (this.hasWhiteSpace(ch)) {
            currentWhiteSpace += ch
          } else {
            if (currentWhiteSpace !== '') {
              tokenArray.push( (new WitnessToken()).setWhitespace(currentWhiteSpace))
              currentWhiteSpace = ''
            }
            currentWordCharacters.push(ch)
            state = 1
          }
          break

        case 1: // accumulating other characters
          if (this.hasWhiteSpace(ch)) {
            if (currentWordCharacters.length !== 0) {
              let wordTokens = this.parseNonWhiteSpaceCharacters(currentWordCharacters, lang, detectNumberingLabels)
              pushArray(tokenArray, wordTokens)
              currentWordCharacters = []
              state = 0
            }
          } else {
            currentWordCharacters.push(ch)
          }
      }
    }
    if (currentWordCharacters.length !== 0) {
      let wordTokens = this.parseNonWhiteSpaceCharacters(currentWordCharacters, lang, detectNumberingLabels)
      pushArray(tokenArray, wordTokens)
    }
    return tokenArray
  }

  /**
   * Parse an array of characters without whitespace into an
   * array of WitnessToken
   * @param {string[]}chars
   * @param {string}lang
   * @param {boolean}detectNumberingLabels
   * @return WitnessToken[]
   * @private
   */
  static parseNonWhiteSpaceCharacters(chars, lang, detectNumberingLabels = true) {
    let length = chars.length
    // console.log(`Parsing ${length} non-WS characters `)
    if (length === 0) {
      return []
    }

    let word = chars.join('')

    if (Punctuation.stringIsAllPunctuation(word, lang)) {
      // all punctuation
      console.log(`Word '${word}' is all punctuation`)
      return [ (new WitnessToken()).setPunctuation(word)]
    }
    if (detectNumberingLabels && this.isNumberingLabel(word)) {
      console.log(`Word '${word}' is a numbering label`)
      return [ (new EditionWitnessToken()).setNumberingLabel(word)]
    }

    let norm = new IgnoreIntraWordQuotationMark()

    if (norm.isApplicable(word, lang)) {
      console.log(`Applying IgnoreIntraWordQuotationMark to '${word}'`)
      return norm.normalizeString(word, lang)
    }

    if (Punctuation.stringHasPunctuation(word, lang)) {
      // a mix of punctuation and non-punctuation
      // start a little state machine
      // TODO: detect matching square brackets and don't generate punctuation for the closing one
      //  e.g:  'Roma[m]' should be a single word
      // console.log(`Word '${word}' is a mix of punctuation a non-punctuation`)
      let state = 0
      let tokenArray = []
      let curWord = ''
      for (let i = 0; i < chars.length; i++) {
        let char = chars[i]
        let insideWord = i>0 && i < chars.length-1
        switch(state) {
          case 0:
            if (Punctuation.characterIsPunctuation(char, lang, insideWord )) {
              tokenArray.push( (new WitnessToken()).setPunctuation(char))
            } else {
              curWord += char
              state = 1
            }
            break

          case 1:
            if (Punctuation.characterIsPunctuation(char, lang, insideWord )) {
              tokenArray.push( (new WitnessToken()).setWord(curWord))
              curWord = ''
              tokenArray.push( (new WitnessToken()).setPunctuation(char))
              state = 0
            } else {
              curWord += char
            }
            break
        }
      }
      if (state === 1) {
        tokenArray.push( (new WitnessToken()).setWord(curWord))
      }
      return tokenArray
    } else {
      // no punctuation at all
      // console.log(`Word '${word}' has no punctuation at all`
      return [ (new WitnessToken()).setWord(word)]
    }
  }

  /**
   * Returns true if the string is a one or more number strings separated by dots
   * and enclosed in square brackets, e.g., [1.1], [1], [1.a], [1.a.iv], etc
   * @param str
   */
  static isNumberingLabel(str) {
    let strLength = str.length
    if (strLength < 3) {
      return false
    }
    if (str.charAt(0) !== '[' || str.charAt(strLength-1) !== ']') {
      //console.log(`Start/End square brackets not found, not a numbering label`)
      return false
    }
    let innerStringFields = str.substring(1, strLength-1).split('.')
    // console.log(`Inner string fields:`)
    // console.log(innerStringFields)

    if (innerStringFields.length === 0) {
      return false
    }
    let firstField = innerStringFields[0]

    // if the first field is a number, assume that the rest are also numbers or
    // appropriate numbering labels. This allows for complex numbering schemes
    // TODO: actually check for such schemes by allowing specific numbering sequences: latin/greek letter, roman numerals
    return NumeralStyles.isArabicNumber(firstField) || NumeralStyles.isWesternNumber(firstField);
  }

  /**
   * Returns true if the given text has neither white space nor punctuation
   * @param {string}text
   * @param {string}lang
   * @return {boolean}
   */
  static isWordToken(text, lang = '') {
    return !this.hasWhiteSpace(text) && !Punctuation.stringHasPunctuation(text, lang)
  }

  /**
   * Returns true if the given text has white space
   * @param {string}text
   * @return {boolean}
   * @private
   */
  static hasWhiteSpace(text) {
    return /\s/.test(text)
  }

}