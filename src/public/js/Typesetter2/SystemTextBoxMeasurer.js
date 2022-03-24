/**
 * A singleton containing the system text box measurer
 */
import { TextBoxMeasurer } from './TextBoxMeasurer'

export class SystemTextBoxMeasurer {

  constructor () {
    if (SystemTextBoxMeasurer._instance) {
      return SystemTextBoxMeasurer._instance
    }
    SystemTextBoxMeasurer._instance = this

    this.theActualMeasurer = new TextBoxMeasurer()
  }

  /**
   *
   * @param {TextBoxMeasurer} measurer
   */
  setMeasurer(measurer) {
    this.theActualMeasurer = measurer
  }

  /**
   *
   * @param {TextBox}item
   * @return {*}
   */
  getBoxWidth(item) {
    return this.theActualMeasurer.getBoxWidth(item)
  }

  getBoxHeight(token) {
    return this.theActualMeasurer.getBoxHeight(token)
  }
}
