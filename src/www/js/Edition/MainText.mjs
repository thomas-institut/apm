/*
 *  Copyright (C) 2022 Universität zu Köln
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

import * as EditionMainTextTokenType from './MainTextTokenType.mjs'

/**
 * Functions to deal with an array of MainTexToken
 */


export class MainText {

  static getParagraphs(mainTextTokens) {
    if (mainTextTokens.length === 0) {
      return []
    }
    let paragraphs = []

    let currentParagraph = { type: '', tokens: []}
    mainTextTokens.forEach( (token, tokenIndex) => {
      token.originalIndex = tokenIndex
      if (token.type === EditionMainTextTokenType.PARAGRAPH_END) {
        currentParagraph.type = token.style === '' ? 'normal' : token.style
        paragraphs.push(currentParagraph)
        currentParagraph = { type: '', tokens: []}
      } else {
        token.originalIndex = tokenIndex
        currentParagraph.tokens.push(token)
      }
    })
    currentParagraph.type = 'normal'
    paragraphs.push(currentParagraph)
    return paragraphs

  }

}