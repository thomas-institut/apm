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

import * as WitnessTokenType from '../../Witness/WitnessTokenType.mjs'
import { MainTextTokenFactory } from '../MainTextTokenFactory.mjs'
import * as MainTextTokenType from '../MainTextTokenType.mjs'
import { Punctuation } from '../../defaults/Punctuation.mjs'

export class EditionMainTextGenerator {

  /**
   *
   * @param {WitnessTokenInterface[]}witnessTokens
   * @param normalized
   * @param normalizationsToIgnore
   * @param lang
   * @return {*[]}
   */
  static generateMainText(witnessTokens,
          normalized = false,  normalizationsToIgnore = [], lang = '') {
    let mainTextTokens = []
    for(let i = 0; i < witnessTokens.length; i++) {
      let witnessToken = witnessTokens[i]
      if (witnessToken === undefined) {
        console.warn(`Witness token ${i} is undefined`)
        continue
      }
      let tokenType = witnessToken.tokenType;
      if (tokenType === WitnessTokenType.EMPTY){
        continue;
      }
      if (tokenType === WitnessTokenType.WHITESPACE) {
        // normally, there won't be whitespace in the collation table
        // but just in case, make sure that no raw whitespace appears in the main text
        continue;
      }

      if (tokenType === WitnessTokenType.FORMAT_MARK) {
        mainTextTokens.push(MainTextTokenFactory.createParagraphEnd(witnessToken.style))
        continue;
      }

      if (tokenType === WitnessTokenType.NUMBERING_LABEL) {
        // console.log(`Generating main text token for numbering label '${witnessToken.text}'`)
        mainTextTokens.push(
          MainTextTokenFactory.createSimpleText(
            MainTextTokenType.NUMBERING_LABEL,
            witnessToken.text,
            i,
            lang)
        );
        continue
      }
      // token

      if (witnessToken.fmtText === undefined) {
        mainTextTokens.push(
           MainTextTokenFactory.createSimpleText(
             MainTextTokenType.TEXT,
             getTextFromWitnessToken(
               witnessToken,
               normalized,
               normalizationsToIgnore
             ),
             i,
             lang
           )
        )

      } else {
        mainTextTokens.push(
          MainTextTokenFactory.createWithFmtText(
            MainTextTokenType.TEXT,
            witnessToken.fmtText,
            i,
            lang
          )
        )
      }
    }
    // TODO: add foliation marks (vertical bars) if applicable

    // Add glue tokens
    let mainTextTokensWithGlue = []
    let firstWordAdded = false
    let nextTokenMustStickToPrevious = false
    for(let i = 0; i < mainTextTokens.length; i++) {
      let mainTextToken = mainTextTokens[i]
      if (mainTextToken.type === MainTextTokenType.PARAGRAPH_END) {
        mainTextTokensWithGlue.push(mainTextToken)
        firstWordAdded = false
        continue
      }
      if (mainTextToken.type === MainTextTokenType.NUMBERING_LABEL) {
        if (firstWordAdded) {
          mainTextTokensWithGlue.push(MainTextTokenFactory.createNormalGlue())
        }
        mainTextTokensWithGlue.push(mainTextToken)
        nextTokenMustStickToPrevious = false
        firstWordAdded = true
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
      if (Punctuation.characterIsPunctuation(tokenPlainText, lang, false) && Punctuation.sticksToPrevious(tokenPlainText, lang) ) {
        addGlue = false
      }
      if (nextTokenMustStickToPrevious) {
        addGlue = false
      }
      if (addGlue) {
        mainTextTokensWithGlue.push(MainTextTokenFactory.createNormalGlue())
      }
      mainTextTokensWithGlue.push(mainTextToken)
      firstWordAdded = true
      nextTokenMustStickToPrevious = Punctuation.characterIsPunctuation(tokenPlainText, lang, false) && Punctuation.sticksToNext(tokenPlainText, lang);
    }
    return mainTextTokensWithGlue
  }
}

/**
 *  Gets the text for the given token, the normal text or
 *  the normalized text if there is one
 * @param {WitnessTokenInterface}witnessToken
 * @param {boolean} normalized
 * @param {string[]} normalizationSourcesToIgnore
 * @returns {string}
 */
function getTextFromWitnessToken(witnessToken, normalized, normalizationSourcesToIgnore = []){
  let text = witnessToken.text;
  if (!normalized) {
    return text;
  }
  if (witnessToken.normalizedText !== undefined && witnessToken.normalizedText !== '') {
    let norm = witnessToken.normalizedText
    let source = witnessToken.normalizationSource !== undefined ? witnessToken.normalizationSource : ''
    if (source === '' || normalizationSourcesToIgnore.indexOf(source) === -1) {
      // if source === '', this is  a normalization from the transcription
      text = norm
    }
  }
  return text
}