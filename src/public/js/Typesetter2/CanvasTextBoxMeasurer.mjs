import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'
import { BrowserUtilities } from '../toolbox/BrowserUtilities.mjs'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'

export class CanvasTextBoxMeasurer extends TextBoxMeasurer {

  getBoxWidth (token) {
    let context = this.__getContext()
    context.font = `${token.fontSize}px '${token.fontFamily}'`;
    let metrics = context.measureText(token.text);
    return resolvedPromise(metrics.width)
  }

  getBoxHeight (token) {
    // TODO: change this to a better measurement
    return resolvedPromise(token.fontSize)
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