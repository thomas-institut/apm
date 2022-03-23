

export class TextBoxTokenMeasurer {

  /**
   *
   * @param {TextBoxToken} token
   */
  getTokenWidth(token) {
    // a wild guess based on a monospace font!
    return token.text.length * token.fontSize
  }

  /**
   *
   * @param token
   * @return {TextBoxToken}
   */
  getTokenHeight(token) {
    //just the fontSize... this will be different for different fonts
    return token.fontSize
  }

}