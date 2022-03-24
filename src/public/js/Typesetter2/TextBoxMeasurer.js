

export class TextBoxMeasurer {

  /**
   *
   * @param {TextBox} item
   */
  getBoxWidth(item) {
    // a wild guess based on a monospace font!
    return item.text.length * item.fontSize
  }

  /**
   *
   * @param item
   * @return {TextBox}
   */
  getBoxHeight(item) {
    //just the fontSize... this will be different for different fonts
    return item.fontSize
  }

}