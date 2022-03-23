/**
 * A singleton containing the system text box measurer
 */
import { TextBoxTokenMeasurer } from './TextBoxTokenMeasurer'

export class SystemTextBoxMeasurer {

  constructor () {
    if (SystemTextBoxMeasurer._instance) {
      return SystemTextBoxMeasurer._instance
    }
    SystemTextBoxMeasurer._instance = this

    this.theActualMeasurer = new TextBoxTokenMeasurer()
  }

  /**
   *
   * @param {TextBoxTokenMeasurer} measurer
   */
  setMeasurer(measurer) {
    this.theActualMeasurer = measurer
  }

  /**
   *
   * @param {TextBoxToken}token
   * @return {*}
   */
  getTokenWidth(token) {
    return this.theActualMeasurer.getTokenWidth(token)
  }

  getTokenHeight(token) {
    return this.theActualMeasurer.getTokenHeight(token)
  }
}
