import { Box } from './Box'
import * as TypesetterItemDirection from './TypesetterItemDirection'
import { SystemTextBoxMeasurer } from './SystemTextBoxMeasurer'

export class TextBox extends Box {

  constructor () {
    super(TypesetterItemDirection.HORIZONTAL)
    this.text = ''
    this.fontFamily = 'serif'
    this.fontSize = 16
    this.fontStyle = ''
    this.fontWeight = ''
    this.width = -1
    this.height = -1
    this.textDirection = 'ltr'
  }

  getWidth() {
    if (this.width === -1) {
      this.__measure()
    }
    return this.width
  }

  getHeight() {
    if (this.height === -1) {
      this.__measure()
    }
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
    // TODO: detect and reject whitespace
    this.text = text
    this.__resetMeasurements()
    return this
  }

  getFontFamily() {
    return this.fontFamily
  }


  setFontFamily(fontFamily) {
    this.fontFamily = fontFamily
    this.__resetMeasurements()
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
    this.__resetMeasurements()
  }

  __measure() {
    this.width = (new SystemTextBoxMeasurer()).getBoxWidth(this)
    this.height = (new SystemTextBoxMeasurer()).getBoxHeight(this)
  }

  __resetMeasurements() {
    this.width = -1
    this.height = -1
  }

}