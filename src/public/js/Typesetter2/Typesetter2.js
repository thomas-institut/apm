/*
 *  Copyright (C) 2012 Universität zu Köln
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

/**
 * The new typesetter class
 */


export class Typesetter2 {

  constructor () {
    if (this.constructor === Typesetter2) {
      throw new Error("Abstract classes cannot be instantiated")
    }
  }

  /**
   *
   * @param {TypesetterToken2[]} tokensToTypeset
   */
  typesetTokens(tokensToTypeset) {
    console.error(`typesetTokens called on abstract class Typesetter2`)
    return tokensToTypeset
  }

  // Unit conversion methods


  static cm2px(cm) {
    return cm * 37.795275590551184 //   = mm * 96 [px/in] / 2.54 [cm/in]
  }
  static px2cm(px) {
    return px / 37.795275590551184 //   = px * 1/96 [in/px] * 2.54 [cm/in]
  }

  static pt2px(pt) {
    return pt * 4 / 3  // = pt * 72 [pt/in] *  1/96 [in/px]
  }

  static px2pt(px) {
    return px * 3 / 4
  }


}