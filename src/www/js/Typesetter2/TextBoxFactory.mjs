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

import { TextBox } from './TextBox.mjs'

/**
 * A TextBox item factory
 */
export class TextBoxFactory {

  /**
   *
   * @param {string}text
   * @param {FontDefinition}fontSpec
   * @param {'rtl'|'ltr'|''}textDirection
   * @return {TextBox}
   */
  static simpleText(text, fontSpec = {}, textDirection = ''){
    let item = new TextBox()
    item.setText(text)

    if (fontSpec.fontFamily !== undefined) {
      item.setFontFamily(fontSpec.fontFamily)
    }

    if (fontSpec.fontSize !== undefined) {
      item.setFontSize(fontSpec.fontSize)
    }

    if (fontSpec.fontWeight !== undefined) {
      item.setFontWeight(fontSpec.fontWeight)
    }

    if (fontSpec.fontStyle !== undefined) {
      item.setFontStyle(fontSpec.fontStyle)
    }
    // TODO: baselineShift

    if (textDirection!=='') {
      item.setTextDirection(textDirection)
    }
    return item
  }

}

