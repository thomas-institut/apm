
import GI from 'node-gtk/lib/index.js'
const Cairo = GI.require('cairo')
const Pango  = GI.require('Pango')
const PangoCairo = GI.require('PangoCairo')
import { PangoMeasurer } from './PangoMeasurer.mjs'
import {resolvedPromise} from '../public/js/toolbox/FunctionUtil.mjs'

export class PangoMeasurerNodeGTK extends PangoMeasurer {
  constructor () {
    super()
    const surface = new Cairo.ImageSurface(Cairo.Format.RGB24, 300, 300)
    this.ctx = new Cairo.Context(surface)
    this.layout = PangoCairo.createLayout(this.ctx)
  }

  __measureText(text, fontDesc) {
    const fd = Pango.fontDescriptionFromString(fontDesc)
    this.layout.setFontDescription(fd)
    this.layout.setText(text)
    let extents = this.layout.getExtents()
    return {ink: extents[0], logical: extents[1]}
  }

  __getPangoMeasurements (textBox) {
    let extents = this.__measureText(textBox.getText(), `${textBox.getFontFamily()} ${textBox.getFontSize()}`)
    return resolvedPromise({ width: extents.logical.width/ Pango.SCALE, height: extents.logical.height /  Pango.SCALE, baseline:this.layout.getBaseline() / Pango.SCALE})
  }

}