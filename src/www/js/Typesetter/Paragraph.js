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


import * as HorizontalAlign from './HorizontalAlign'
import { deepCopy } from '../toolbox/Util.ts'

/**
 *
 */


export class Paragraph {

  constructor () {
    this.lineHeight = 16
    this.textAlignment = HorizontalAlign.JUSTIFIED
    this.spaceAfter = 0
    this.spaceBefore = 0
    /**
     *
     * @type {TypesetterToken[]}
     */
    this.tokens = []

    this.isTypeset = false
    this.linesTypeset = -1
    this.typesetParagraphHeight = -1
    this.paragraphNumber = -1

  }

  setLineHeight(lh) {
    this.lineHeight = lh
    return this
  }

  setTextAlignment(ta) {
    this.textAlignment = ta
    return this
  }

  setSpaceAfter(spaceAfter) {
    this.spaceAfter = spaceAfter
    return this
  }

  setSpaceBefore(spaceBefore) {
    this.spaceBefore = spaceBefore
    return this
  }

  setTokens(tokens) {
    this.tokens = tokens
    this.isTypeset = false
    return this
  }

  /**
   * Shifts the x, y and line number for all tokens in the paragraph
   * @param dX
   * @param dY
   * @param dL
   */
  shiftTokens(dX, dY, dL = 0) {
    if (!this.isTypeset) {
      return
    }

    this.tokens = this.tokens.map( (token) => {
      token.deltaX += dX
      token.deltaY += dY
      token.lineNumber += dL
      return token
    })
  }



}