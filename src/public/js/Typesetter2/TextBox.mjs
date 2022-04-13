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

import { Box } from './Box.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'

/**
 * A text to be rendered with a given font family, size, style and weight
 */
export class TextBox extends Box {

  constructor () {
    super(TypesetterItemDirection.HORIZONTAL)
    /**
     * A string of printable text
     * @type {string}
     */
    this.text = ''
    /**
     * A font name that should be consistent with
     * the renderer's font capabilities.
     * @type {string}
     */
    this.fontFamily = 'serif'

    /**
     * The font size in pixels
     * @type {number}
     */
    this.fontSize = 16

    /**
     * A font style: normal (''), italic, small caps, etc
     * @type {string}
     */
    this.fontStyle = ''
    /**
     * The font weight: normal (''), bold, semibold
     * @type {string}
     */
    this.fontWeight = ''
    /**
     * The text's writing direction: ltr or rtl
     * A correct value here might be necessary for
     * correct rendering in some contexts.
     * @type {string}
     */
    this.textDirection = 'ltr'

    /**
     * Width and height start as undefined.
     * Normally typesetters will invoke some measurement mechanism
     * when laying out the text in a line
     */
    this.width = -1
    this.height = -1

  }

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  getText() {
    return this.text
  }

  setLeftToRight() {
    this.textDirection = 'ltr'
    return this
  }

  setRightToLeft() {
    this.textDirection = 'rtl'
    return this
  }

  getTextDirection() {
    return this.textDirection
  }

  /**
   *
   * @param {string} text
   */
  setText(text) {
    // TODO: detect and reject newlines, control characters, etc
    if (this.text === text) {
      return
    }
    this.text = text
    this.resetMeasurements()
    return this
  }

  getFontFamily() {
    return this.fontFamily
  }


  setFontFamily(fontFamily) {
    this.fontFamily = fontFamily
    this.resetMeasurements()
    return this
  }

  getFontSize() {
    return this.fontSize
  }

  /**
   * Font size in pixels (or whatever absolute unit the intended renderer uses)
   * @param {number} fontSize
   */
  setFontSize(fontSize) {
    this.fontSize = fontSize
    this.resetMeasurements()
  }

  /**
   * Resets the item's width and height to undefined
   */
  resetMeasurements() {
    this.width = -1
    this.height = -1
  }

}