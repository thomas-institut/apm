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


import * as MainTextTokenType from './MainTextTokenType'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'
import { FmtText } from '../FmtText/FmtText'

export class MainTextToken {
  constructor () {
    this.type = MainTextTokenType.EMPTY

    /**
     *
     * @member { FmtTextToken[] }
     */
    this.fmtText = FmtTextFactory.empty()
    this.collationTableIndex = -1
  }

  getPlainText() {
      return FmtText.getPlainText(this.fmtText)
  }

  /**
   *
   * @param {string|array|FmtTextToken} theText
   * @param {number} ctIndex
   */
  setText(theText, ctIndex = -1) {
    this.type = MainTextTokenType.TEXT
    this.fmtText = FmtTextFactory.fromAnything(theText)
    this.collationTableIndex = ctIndex
  }


  setNormalSpace(ctIndex = -1) {
    this.type = MainTextTokenType.GLUE
    this.fmtText = FmtTextFactory.oneNormalSpace()
    this.collationTableIndex = ctIndex
  }
}

