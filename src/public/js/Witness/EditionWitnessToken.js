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

import { WitnessToken } from './WitnessToken'
import * as WitnessTokenType from './WitnessTokenType'
import * as WitnessTokenClass from './WitnessTokenClass'
import * as SpaceType from '../Typesetter/SpaceType'
import * as WitnessFormat from './WitnessFormat'
import * as EditionWitnessParagraphStyle from './EditionWitnessParagraphStyle'

/**
 * A token that can appear in an edition witness
 */

export class EditionWitnessToken extends WitnessToken {

  constructor () {
    super()
    this.tokenClass = WitnessTokenClass.EDITION
    this.style = ''
  }

  /**
   * Creates a paragraph end mark with the given style
   * @param style
   */
  setParagraphEnd(style = EditionWitnessParagraphStyle.NORMAL) {
    this.setFormat(WitnessFormat.PARAGRAPH_END)
    this.style = style
  }

  /**
   * Creates a space with the given type
   *
   * @param {string} spaceType
   */
  setSpace(spaceType = SpaceType.NORMAL) {
    this.type = WitnessTokenType.WHITESPACE
    this.setWhitespace(' ')
    this.style = spaceType
  }

}