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
import { Typesetter2 } from './Typesetter2.mjs'

const defaultFontFamily = 'FreeSerif'
const defaultFontSize = Typesetter2.pt2px(12)


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
    this.fontFamily = defaultFontFamily

    /**
     * The font size in pixels
     * @type {number}
     */
    this.fontSize = defaultFontSize

    /**
     * A font style: normal (''), italic, small caps, etc
     * @type {string}
     */
    this.fontStyle = ''
    /**
     * The font weight: normal (''), bold, semi-bold
     * @type {string}
     */
    this.fontWeight = ''


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

  getFontWeight() {
    return this.fontWeight
  }

  setFontWeight(weight) {
    this.fontWeight = weight
    return this
  }

  getFontStyle() {
    return this.fontStyle
  }

  setFontStyle(style) {
    this.fontStyle = style
    return this
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
    return this
  }

  /**
   * Resets the item's width and height to undefined
   */
  resetMeasurements() {
    this.width = -1
    this.height = -1
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'TextBox'
    obj.text = this.text
    obj.fontFamily = this.fontFamily
    obj.fontSize = this.fontSize
    if (this.fontStyle !== '') {
      obj.fontStyle = this.fontStyle
    }
    if (this.fontWeight !== '') {
      obj.fontWeight = this.fontWeight
    }

    return obj
  }

  setFromObject (object, mergeValues) {
    super.setFromObject(object, mergeValues)
    const template = {
      text: '',
      fontFamily: defaultFontFamily,
      fontSize: defaultFontSize,
      fontStyle: '',
      fontWeight: '',

    }
    this._copyValues(template, object, mergeValues)
    return this
  }
}