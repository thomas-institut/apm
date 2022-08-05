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

import { ItemList } from './ItemList.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'

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
   * Converts a horizontal list into a vertical list
   * consisting of a series of lines of a certain width (given previously
   * to the typesetter) and inter-line glue
   *
   * In essence, splits a horizontal list into lines.
   *
   * Normally it is in this method that text boxes are measured so that
   * line widths are respected and later on the text boxes can
   * be rendered correctly.
   *
   * @param {ItemList}list
   * @return {Promise<ItemList>}
   */
  typesetHorizontalList(list) {
    // performs type checks and returns the input list if there's no problem
    // the actual typesetting work should be done by a child of this class
    if (!(list instanceof ItemList)) {
      throw new Error('typesetHorizontalList called with non-ItemList item ')
    }
    if (list.getDirection() !== TypesetterItemDirection.HORIZONTAL) {
      throw new Error('typesetHorizontalList called with a vertical list')
    }
    return resolvedPromise(list)
  }

  /**
   * Converts a vertical list into a horizontal list consisting of vertical lists
   * where each one fits into a given height (previously given to the typesetter).
   *
   * In essence, splits a vertical list into pages
   *
   * @param {ItemList}list
   * @return {Promise<ItemList>}
   */
  typesetVerticalList(list) {
    // performs type checks and returns the input list if there's no problem
    // the actual typesetting work should be done by a child of this class
    if (!(list instanceof ItemList)) {
      throw new Error('typesetVerticalList called with non-ItemList item ')
    }
    if (list.getDirection() !== TypesetterItemDirection.VERTICAL) {
      throw new Error('typesetVerticalList called with a horizontal list')
    }
    return resolvedPromise(list)
  }

  /**
   * Typesets an ItemList returning a TypesetterDocument
   *
   * Each concrete typesetter may impose constraints on the type
   * of list and items that are allowed as input. Normally,
   * the input list will be a vertical list with the paragraphs of the
   * main text block.
   *
   * The optional data parameter can be used to provide additional guiding
   * information to the typesetter
   *
   * @param {ItemList}list
   * @param {any} data
   * @return {Promise<TypesetterDocument>}
   */
  typeset(list, data = null) {
    return resolvedPromise(new TypesetterDocument())
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