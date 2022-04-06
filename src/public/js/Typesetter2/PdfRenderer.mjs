/*
 *  Copyright (C) 2022 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


import { TypesetterRenderer } from './TypesetterRenderer.mjs'
import { Typesetter2 } from './Typesetter2.mjs'
import { Glue } from './Glue.mjs'
import { ItemList } from './ItemList.mjs'
import { TextBox } from './TextBox.mjs'
import { Box } from './Box.mjs'

import { OptionsChecker } from '@thomas-inst/optionschecker'

export class PdfRenderer extends  TypesetterRenderer{


  constructor (options) {
    super()
    const optionsSpec = {
      pdfDocument: { type: 'object', required: true},
      fonts: { type: 'object', required: true},
      defaultPageHeight: { type: 'number', default: -1}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'PDF-Renderer'})
    let cleanOptions = oc.getCleanOptions(options)
    this.pdfDocument = cleanOptions.pdfDocument
    this.fonts = cleanOptions.fonts
    this.pageHeight = cleanOptions.defaultPageHeight
  }

  /**
   *
   * @param {number}pageHeight
   */
  setPageHeight(pageHeight) {
    this.pageHeight = pageHeight
  }

  renderHorizontalList (list, shiftX = 0, shiftY = 0) {
    // console.log(`Rendering horizontal list, shift ${shiftX}, ${shiftY}`)
    // console.log(list)
    let currentX = shiftX + list.getShiftX()
    let listHeight = list.getHeight()
    let listHeightInPt = Typesetter2.px2pt(listHeight)
    list.getList().forEach( (horizontalItem) => {
      if (horizontalItem instanceof Glue) {
        currentX += horizontalItem.getWidth()
        return
      }
      if (horizontalItem instanceof TextBox) {
        let pdfFont = this.__getPdfFontForTextBox(horizontalItem)

        this.pdfPage.drawText(horizontalItem.getText(), {
          x: Typesetter2.px2pt(currentX+horizontalItem.getShiftX()) ,
          y: this.pageHeight - Typesetter2.px2pt(shiftY+horizontalItem.getShiftY()) -  listHeightInPt,
          size: Typesetter2.px2pt(horizontalItem.getFontSize()),
          font: pdfFont
        })
        currentX += horizontalItem.getWidth()
        return
      }
      if (horizontalItem instanceof Box) {
        currentX += horizontalItem.getWidth()
      }
    })
    return true

  }

  renderVerticalList (list, shiftX = 0, shiftY = 0) {
    // console.log(`Rendering vertical list, shift: ${shiftX}, ${shiftY}`)
    // console.log(list)
    let currentY = shiftY + list.getShiftY()
    list.getList().forEach( (item) => {
      if (item instanceof Glue) {
        currentY += item.getHeight()
        return
      }
      if (item instanceof ItemList) {
        // a line
        let lineHeight = item.getHeight()
        this.renderHorizontalList(item, shiftX + list.getShiftX(), currentY)
        currentY += lineHeight
      }
    })
    return true
  }

  renderPage (page) {
    this.pdfPage = this.pdfDocument.addPage([Typesetter2.px2pt(page.width), Typesetter2.px2pt(page.height)])
    this.setPageHeight(Typesetter2.px2pt(page.height))
    super.renderPage(page)
  }

  /**
   *
   * @param {TypesetterPage[]}pageArray
   */
  renderDocument(pageArray) {
    pageArray.forEach( (page) => {this.renderPage(page)})
  }

  /**
   *
   * @param {TextBox}textBox
   * @private
   */
  __getPdfFontForTextBox(textBox) {
    // first version, just simple font specs (no italic, no bold)
    if (this.fonts[textBox.getFontFamily()] !== undefined) {
      return this.fonts[textBox.getFontFamily()]
    }

    throw new Error(`Font family in textBox not defined for PDF render: '${textBox.getFontFamily()}'`)

  }

}