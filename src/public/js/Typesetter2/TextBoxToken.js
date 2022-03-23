import { SystemTextBoxMeasurer } from './SystemTextBoxMeasurer'

export class TextBoxToken {

  constructor () {
    this.text = ''
    this.fontFamily = 'serif'
    this.fontSize = 16
    this.fontStyle = 'normal'
    this.fontWeight = 'normal'
    this.baselineShift = 0

    this.width = -1
    this.height = -1
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
    this.width = (new SystemTextBoxMeasurer()).getTokenWidth(this)
    this.height = (new SystemTextBoxMeasurer()).getTokenHeight(this)
  }

  __resetMeasurements() {
    this.width = -1
    this.height = -1
  }


}