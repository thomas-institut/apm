import { TextBoxMeasurer } from './TextBoxMeasurer'
import { BrowserUtilities } from '../toolbox/BrowserUtilities'

export class CanvasTextBoxMeasurer extends TextBoxMeasurer {

  getBoxWidth (token) {
    let context = this.__getContext()
    context.font = `${token.fontSize}px '${token.fontFamily}'`;
    //console.log(`Measuring token`)
    //console.log(token)
    let metrics = context.measureText(token.text);
    //console.log(`Metrics`)
    //console.log(metrics)
    return metrics.width
  }

  getBoxHeight (token) {
    // TODO: change this to a better measurement
    return token.fontSize
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