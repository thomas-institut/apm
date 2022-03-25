import { TypesetterRenderer } from './TypesetterRenderer'
import { Typesetter2 } from './Typesetter2'

export class PdfRenderer extends  TypesetterRenderer{


  constructor (pdfPage, pageHeight, fonts) {
    super()
    this.pdfPage = pdfPage
    this.fonts = fonts
    this.pageHeight = pageHeight
  }

  renderHorizontalList (list, shiftX = 0, shiftY = 0) {

  }

  renderVerticalList (list, shiftX = 0, shiftY = 0) {
    let fontSize = 12
    this.pdfPage.drawText('PDF renderer not implemented yet', {
      x: Typesetter2.px2pt(shiftX),
      y: this.pageHeight - Typesetter2.px2pt(shiftY) - fontSize,
      size: fontSize,
      font: this.fonts[0]
    })
  }

}