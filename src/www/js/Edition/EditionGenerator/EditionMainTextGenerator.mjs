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

import * as WitnessTokenType from '../../Witness/WitnessTokenType.js'
import { MainTextTokenFactory } from '../MainTextTokenFactory.js'
import * as MainTextTokenType from '../MainTextTokenType.js'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'

const noGluePunctuation = '.,:;?!'
  + String.fromCodePoint(0x60C) // // Arabic comma
  + String.fromCodePoint(0x61F) // Arabic question mark

export class EditionMainTextGenerator {

  /**
   * Takes an array of witness tokens and creates an array of MainTextSection objects with the
   * main text, taking care of adding glue in the proper places
   * @param witnessTokens
   * @param {boolean}normalized
   * @param {*[]}normalizationsToIgnore
   * @param {string}lang
   */
  static generateMainText(witnessTokens, normalized = false, normalizationsToIgnore = [], lang = '') {

    return this.generateMainTextTokensWithGlue(witnessTokens, normalized, normalizationsToIgnore, lang)
  }

  static generatePlainText(witnessTokens) {
    return this.generateMainTextTokensWithGlue(witnessTokens, false).map( (token) => {
      return token.getPlainText()
    }).join('')
  }

  /**
   *
   * @param witnessTokens
   * @param normalized
   * @param normalizationsToIgnore
   * @param lang
   * @return {*[]}
   */
  static generateMainTextTokensWithGlue(witnessTokens, normalized = false, normalizationsToIgnore = [], lang = '') {
    let mainTextTokens = []
    for(let i = 0; i < witnessTokens.length; i++) {
      let witnessToken = witnessTokens[i]
      if (witnessToken === undefined) {
        console.warn(`Witness token ${i} is undefined`)
        continue
      }
      let tokenType = witnessToken[INPUT_TOKEN_FIELD_TYPE]
      if (tokenType === WitnessTokenType.EMPTY){
        continue
      }
      if (tokenType === WitnessTokenType.WHITESPACE) {
        // normally, there won't be whitespace in the collation table
        // but just in case, make sure that no raw whitespace appears in the main text
        continue
      }

      if (tokenType === WitnessTokenType.FORMAT_MARK) {
        mainTextTokens.push(MainTextTokenFactory.createParagraphEnd(witnessToken['style']))
        continue
      }
      if (witnessToken.fmtText === undefined) {
        mainTextTokens.push(
          MainTextTokenFactory.createSimpleText(getTextFromWitnessToken(witnessToken, normalized, normalizationsToIgnore), i, lang)
        )
      } else {
        mainTextTokens.push(
          MainTextTokenFactory.createWithFmtText(witnessToken.fmtText, i, lang)
        )
      }

    }
    // add glue
    let mainTextTokensWithGlue = []
    let firstWordAdded = false
    for(let i = 0; i < mainTextTokens.length; i++) {
      let mainTextToken = mainTextTokens[i]
      if (mainTextToken.type === MainTextTokenType.PARAGRAPH_END) {
        mainTextTokensWithGlue.push(mainTextToken)
        firstWordAdded = false
        continue
      }

      if (mainTextToken.type !== MainTextTokenType.TEXT){
        continue
      }
      let tokenPlainText = mainTextToken.getPlainText()
      if (tokenPlainText === undefined) {
        console.warn(`Found main text token with no text at index ${i}`)
        continue
      }

      let addGlue = true
      if (!firstWordAdded) {
        addGlue = false
      }
      if (noGluePunctuation.includes(tokenPlainText)) {
        addGlue = false
      }
      if (addGlue) {
        mainTextTokensWithGlue.push(MainTextTokenFactory.createNormalGlue())
      }
      mainTextTokensWithGlue.push(mainTextToken)
      firstWordAdded = true
    }
    return mainTextTokensWithGlue
  }
}

/**
 *  Gets the text for the given token, the normal text or
 *  the normalized text if there is one
 * @param witnessToken
 * @param {boolean} normalized
 * @param {string[]} normalizationSourcesToIgnore
 * @returns {*}
 */
function getTextFromWitnessToken(witnessToken, normalized, normalizationSourcesToIgnore = []){
  let text = witnessToken[INPUT_TOKEN_FIELD_TEXT]
  if (!normalized) {
    return text
  }
  if (witnessToken[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== undefined && witnessToken[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== '') {
    let norm = witnessToken[INPUT_TOKEN_FIELD_NORMALIZED_TEXT]
    let source = witnessToken[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] !== undefined ? witnessToken[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] : ''
    if (source === '' || normalizationSourcesToIgnore.indexOf(source) === -1) {
      // if source === '', this is  a normalization from the transcription
      text = norm
    }
  }
  return text
}