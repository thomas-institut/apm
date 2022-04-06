import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'

export class TextBoxMeasurer {

  /**
   *
   * @param {TextBox} item
   * @return {Promise}
   */
  getBoxWidth(item) {
    // a wild guess based on a monospace font!
    return resolvedPromise(item.text.length * item.fontSize)
  }

  /**
   * Returns the height of a text box from the baseline
   * @param {TextBox} item
   * @return {Promise}
   */
  getBoxHeight(item) {
    //just the fontSize... this will be different for different fonts
    return resolvedPromise(item.fontSize)
  }

}