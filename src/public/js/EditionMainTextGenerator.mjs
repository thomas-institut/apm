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


import * as TokenType from './constants/TranscriptionTokenType.js'

const E_TOKEN_TYPE_TEXT = 'text'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'


/**
 * Generates a object consisting of main text edition tokens and a
 * an array that maps indexes in this array to indexes in the collation table row.
 *
 * @param witnessTokens
 * @param normalized
 * @param normalizationsToIgnore
 * @returns {{mainTextTokens: [], ctToMainTextMap: []}}
 */

export function generateMainText(witnessTokens, normalized = true, normalizationsToIgnore = []) {
  let mainTextTokens = []
  let ctTokensToMainText = []
  let currentMainTextIndex = -1
  for(let i = 0; i < witnessTokens.length; i++) {
    let witnessToken = witnessTokens[i]
    let tokenType = witnessToken[INPUT_TOKEN_FIELD_TYPE]
    if (tokenType === TokenType.EMPTY){
      ctTokensToMainText.push(-1)
      continue
    }
    if (tokenType === TokenType.WHITESPACE) {
      // normally, there won't be whitespace in the collation table
      // but just in case, make sure that no raw whitespace appears in the main text
      ctTokensToMainText.push(-1)
      continue
    }
    currentMainTextIndex++
    mainTextTokens.push({
      type: E_TOKEN_TYPE_TEXT,
      text: getTextFromInputToken(witnessToken, normalized, normalizationsToIgnore),
      collationTableIndex: i
    })
    ctTokensToMainText.push(currentMainTextIndex)
  }
  return {
    mainTextTokens: mainTextTokens,
    ctToMainTextMap: ctTokensToMainText
  }
}



/**
 *  Gets the text for the given token, the normal text or
 *  the normalized text if there is one
 * @param token
 * @param normalized
 * @param normalizationSourcesToIgnore
 * @returns {*}
 */

function getTextFromInputToken(token, normalized, normalizationSourcesToIgnore = []){
  let text = token[INPUT_TOKEN_FIELD_TEXT]
  if (!normalized) {
    return text
  }
  if (token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== undefined && token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== '') {
    let norm = token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT]
    let source = token[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] !== undefined ? token[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] : ''
    if (source === '' || normalizationSourcesToIgnore.indexOf(source) === -1) {
      // if source === '', this is  a normalization from the transcription
      text = norm
    }
  }
  return text
}