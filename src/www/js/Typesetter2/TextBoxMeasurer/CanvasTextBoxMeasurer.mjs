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

  getBoxWidth (token) {
    let context = this.__getContext()
    let fontWeight = token.getFontWeight() === '' ? 'normal' : token.getFontWeight()
    let fontStyle = token.getFontStyle() === '' ? 'normal' : token.getFontStyle()
    let fontVariant = 'normal'
    context.font = `${fontStyle} ${fontVariant} ${fontWeight} ${token.fontSize}px ${token.getFontFamily()} `
    let metrics = context.measureText(token.text);
    return resolvedPromise(metrics.width)
  }

  getBoxHeight (token) {
    // TODO: change this to a better measurement
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