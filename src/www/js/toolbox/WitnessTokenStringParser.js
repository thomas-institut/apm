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

import * as PunctuationOld from '../defaults/Punctuation.mjs'

import { Punctuation} from '../defaults/Punctuation.mjs'
import { WitnessToken } from '../Witness/WitnessToken'
import { pushArray } from './ArrayUtil.mjs'
import { NumeralStyles } from './NumeralStyles.mjs'

export class WitnessTokenStringParser {

  /**
   *
   * @param {string}str
   * @param {string}lang
   * @return WitnessToken[]
   */
  static parseNew (str, lang) {
    // console.log(`Parsing string '${str}', lang='${lang}'`)

    let state = 0
    let tokenArray = []
    let currentWhiteSpace = ''
    let currentWordCharacters = []
    for (let i = 0; i < str.length; i++) {
      let ch = str.charAt(i)
      //console.log(`Processing '${ch}', state = ${state}`)
      switch (state) {
        case 0:
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

        case 1:
          if (this.hasWhiteSpace(ch)) {
            if (currentWordCharacters.length !== 0) {
              let wordTokens = this.parseNonWhiteSpaceCharacters(currentWordCharacters, lang)
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
      let wordTokens = this.parseNonWhiteSpaceCharacters(currentWordCharacters, lang)
      pushArray(tokenArray, wordTokens)
    }
    return tokenArray
  }

  /**
   *
   * @param {string[]}chars
   * @param {string}lang
   * @return WitnessToken[]
   */
  static parseNonWhiteSpaceCharacters(chars, lang) {
    let length = chars.length
    // console.log(`Parsing ${length} non-WS characters `)
    if (length === 0) {
      return []
    }

    let word = chars.join('')

    if (Punctuation.isPunctuation(word, lang)) {
      // all punctuation
      console.log(`Word '${word}' is all punctuation`)
      return [ (new WitnessToken()).setPunctuation(word)]
    }
    if (this.isNumberingLabel(word)) {
      console.log(`Word '${word}' is a numbering label`)
      return [ (new WitnessToken()).setWord(word)]
    }

    if (Punctuation.hasPunctuation(word, lang)) {
      // a mix of punctuation and non-punctuation
      // start a little state machine
      console.log(`Word '${word}' is a mix of punctuation a non-punctuation`)
      let state = 0
      let tokenArray = []
      let curWord = ''
      for (let i = 0; i < chars.length; i++) {
        let char = chars[i]
        let insideWord = i>0 && i < chars.length-1
        switch(state) {
          case 0:
            if (Punctuation.isCharacterPunctuation(char, lang, insideWord )) {
              tokenArray.push( (new WitnessToken()).setPunctuation(char))
            } else {
              curWord += char
              state = 1
            }
            break

          case 1:
            if (Punctuation.isCharacterPunctuation(char, lang, insideWord )) {
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
      // console.log(`Word '${word}' has no punctuation at all`)
      return [ (new WitnessToken()).setWord(word)]
    }
  }

  /**
   * Returns true if the string is a one or more number strings separated by dots
   * and enclosed in square brackets, e.g., [1.1], [1], [1.a], [1.a.iv], etc
   * @param str
   */
  static isNumberingLabel(str) {
    //console.log(`Testing if '${str}' is a numbering label`)
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
    let punctuationArray = PunctuationOld.getValidPunctuationForLang(lang)
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
    let punctuationArray = PunctuationOld.getValidPunctuationForLang(lang)
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