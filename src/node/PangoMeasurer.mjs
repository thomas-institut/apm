import { TextBoxMeasurer } from '../public/js/Typesetter2/TextBoxMeasurer.mjs'


export class PangoMeasurer extends TextBoxMeasurer {

  getBoxHeight (item) {
    return super.getBoxHeight(item)
  }

  getBoxWidth (item) {
    return super.getBoxWidth(item)
  }
}