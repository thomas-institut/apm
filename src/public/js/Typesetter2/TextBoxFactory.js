import { TextBox } from './TextBox'



export class TextBoxFactory {

  static simpleText(text, fontSpec = {}){
    let item = new TextBox()
    item.setText(text)

    if (fontSpec.fontFamily !== undefined) {
      item.setFontFamily(fontSpec.fontFamily)
    }

    if (fontSpec.fontSize !== undefined) {
      item.setFontSize(fontSpec.fontSize)
    }

    // TODO: fontWeight, fontStyle, baselineShift
    return item
  }
}