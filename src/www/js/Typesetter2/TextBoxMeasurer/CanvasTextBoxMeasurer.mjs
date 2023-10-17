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

import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'
import { BrowserUtilities } from '../../toolbox/BrowserUtilities.mjs'
import { resolvedPromise } from '../../toolbox/FunctionUtil.mjs'
import { FontBaselineInfo } from '../FontBaselineInfo.mjs'


export class CanvasTextBoxMeasurer extends TextBoxMeasurer {

  constructor (useCache = true) {
    super()
    this.useCache = useCache
    if (this.useCache) {
      // this.heightCache = new Map()
      this.widthCache = new Map()
      this.cacheHits = 0
      this.realMeasurements = 0
    }
    this.debug = false
  }

  /**
   *
   * @param {TextBox}textBox
   * @private
   */
  __getCacheKeyForTextBox(textBox) {
    return `${textBox.getText()}${textBox.getFontFamily()}${textBox.getFontSize()}${textBox.getFontWeight()}${textBox.getFontStyle()}`
  }

  getBoxWidth (textBox) {
    let myDebug = false
    // if (textBox.getText().charAt(0) === 'f' && textBox.getFontSize() === 16) {
    //    myDebug = true
    // }

    if (this.useCache) {
      let cacheKey = this.__getCacheKeyForTextBox(textBox)
      if (this.widthCache.has(cacheKey)) {
        this.debug && console.log(`Getting width from cache`)
        this.cacheHits++
        return resolvedPromise(this.widthCache.get(cacheKey))
      } else {
        this.realMeasurements++
      }
    }
    this.debug && console.log(`Measuring width`)

    let context = this.__getContext()
    let fontWeight = textBox.getFontWeight() === '' ? 'normal' : textBox.getFontWeight()
    let fontStyle = textBox.getFontStyle() === '' ? 'normal' : textBox.getFontStyle()
    let fontVariant = 'normal'
    context.font = `${fontStyle} ${fontVariant} ${fontWeight} ${textBox.fontSize}px ${textBox.getFontFamily()}`
    let metrics = context.measureText(textBox.text);
    myDebug && console.log(`Text width for '${textBox.getText()}', font '${context.font}'is ${metrics.width}px`)
    myDebug && console.log(metrics)
    return resolvedPromise(metrics.width)
  }

  getBoxHeight (token) {
    // TODO: change this to a better measurement
    // no need to cache this
    return resolvedPromise(FontBaselineInfo.getBaseline(token.getFontFamily(), token.getFontSize()))
  }

  __getCanvas() {
    if (typeof(this.canvas) === 'undefined') {
      this.canvas = document.createElement("canvas")
      BrowserUtilities.setCanvasHiPDI(this.canvas, 100, 100)
    }
    return this.canvas
  }

  __getContext() {
    return this.__getCanvas().getContext("2d")
  }

}