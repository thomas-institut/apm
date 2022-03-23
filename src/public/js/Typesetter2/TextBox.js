import { Box } from './Box'
import { maxValue } from '../toolbox/ArrayUtil'

export class TextBox extends Box {

  constructor () {
    super()
    this.textTokens = []
  }

  /**
   *
   * @param {TextBoxToken[]}textTokens
   */
  setTextTokens(textTokens) {
    this.textTokens = textTokens
    this.__measureTokens()
  }

  setFontFamily(fontFamily) {
    this.textTokens = this.textTokens.map ( (t) => { return t.setFontFamily(fontFamily)})
    return this
  }

  setFontSize(fontSize) {
    this.textTokens = this.textTokens.map ( (t) => { return t.setFontSize(fontSize)})
  }


  __measureTokens() {
    this.height = maxValue(this.textTokens.map( (token) =>{return token.getHeight()}))
    this.width = this.textTokens.map ( (token) => { return token.getWidth()}).reduce ( (total, num) => { return total + num})
  }


}