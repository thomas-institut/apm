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



import GI from 'node-gtk/lib/index.js'
const Cairo = GI.require('cairo')
const Pango  = GI.require('Pango')
const PangoCairo = GI.require('PangoCairo')
import { PangoMeasurer } from './PangoMeasurer.mjs'
import {resolvedPromise} from '../www/js/toolbox/FunctionUtil.mjs'
import { Typesetter2} from '../www/js/Typesetter2/Typesetter2.mjs'

const measuringScale = 1000

export class PangoMeasurerNodeGTK extends PangoMeasurer {
  constructor () {
    super()
    const surface = new Cairo.ImageSurface(Cairo.Format.RGB24, 300, 300)
    this.ctx = new Cairo.Context(surface)
    this.layout = PangoCairo.createLayout(this.ctx)
    this.debug = true
  }

  measureText(text, fontDesc) {

    const fd = Pango.fontDescriptionFromString(fontDesc)
    this.layout.setFontDescription(fd)
    this.layout.setText(text)
    let extents = this.layout.getExtents()
    return {ink: extents[0], logical: extents[1], baseline: this.layout.getBaseline()}
  }

  __getPangoMeasurements (textBox) {
    let fontDesc = `${textBox.getFontFamily()} ${textBox.getFontWeight()} ${textBox.getFontStyle()} ${Typesetter2.px2pt(textBox.getFontSize())*measuringScale}`
    console.log(`Measuring '${textBox.getText()}' with font desc '${fontDesc}'`)
    let extents = this.measureText(textBox.getText(), fontDesc);

    let divisor = Pango.SCALE * measuringScale
    let returnObject = {
      fontSize: textBox.getFontSize(),
      width: extents.logical.width/ divisor,
      height: extents.logical.height /divisor,
      baseline: extents.baseline / divisor,
      blToFsRatio: extents.baseline / (divisor*textBox.getFontSize()),
      inkHeight: extents.ink.height/divisor,
      inkToBaseLineRation: extents.ink.height / extents.baseline
    }
    this.debug && console.log(returnObject)
    return resolvedPromise(returnObject)
  }

}