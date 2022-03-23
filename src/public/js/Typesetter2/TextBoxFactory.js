import { TextBoxToken } from './TextBoxToken'
import { TextBox } from './TextBox'



export class TextBoxFactory {

  static simpleText(text, fontSpec = {}){
    let token = new TextBoxToken()
    token.setText(text)

    if (fontSpec.fontFamily !== undefined) {
      token.setFontFamily(fontSpec.fontFamily)
    }

    if (fontSpec.fontSize !== undefined) {
      token.setFontSize(fontSpec.fontSize)
    }

    // TODO: fontWeight, fontStyle, baselineShift

    let b = new TextBox()

    b.setTextTokens([token])
    return b
  }
}