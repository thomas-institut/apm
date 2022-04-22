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

import { Typesetter2 } from './Typesetter2.mjs'
import { ItemList } from './ItemList.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { HORIZONTAL, VERTICAL } from './TypesetterItemDirection.mjs'
import { Glue } from './Glue.mjs'
import { TextBox } from './TextBox.mjs'
import { MINUS_INFINITE, Penalty } from './Penalty.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'
import { Box } from './Box.mjs'

const signature = 'SimpleTypesetter 0.1'

export const paragraphNumberKey = 'paragraphNumber'
export const lineNumberInParagraphKey = 'lineNumberInParagraph'
export const lineNumberKey = 'lineNumber'
export const lineRatioKey = 'lineRatio'

export class SimpleTypesetter extends Typesetter2 {
  constructor (options) {
    super()
    let oc = new OptionsChecker({
      context: 'SimpleTypesetter',
      optionsDefinition: {
        pageWidth: { type: 'number', required: true},
        pageHeight: { type: 'number', required: true},
        marginTop: { type: 'number', default: 50},
        marginBottom: { type: 'number', default: 50},
        marginLeft: { type: 'number', default: 50},
        marginRight: { type: 'number', default: 50},
        lineSkip: { type: 'number', default: 24},
        parSkip: { type: 'number', default: 0},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
    this.debug = this.options.debug
  }

  typesetHorizontalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetHorizontalList(list)
      this.debug && console.log(`Typesetting horizontal list, lineWidth = ${this.lineWidth}`)
      let lines = []
      let currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
      let currentX = 0
      for (const item of inputList.getList()) {
        if (item instanceof Glue) {
          this.debug && console.log(`Processing glue at currentX = ${currentX}`)
          currentX += item.getWidth()
          this.debug && console.log(`New currentX = ${currentX}`)
          currentLine.pushItem(item)
          continue
        }

        if (item instanceof TextBox) {
          this.debug && console.log(`Processing text box at currentX = ${currentX}, text = '${item.getText()}'`)
          // Measure the text box before proceeding
          if (item.getWidth() === -1) {
            this.debug && console.log(`Getting text box width`)
            let measuredWidth = await this.options.textBoxMeasurer.getBoxWidth(item)
            item.setWidth(measuredWidth)
          }
          if (item.getHeight() === -1) {
            let measuredHeight = await this.options.textBoxMeasurer.getBoxHeight(item)
            item.setHeight(measuredHeight)
          }

          currentX += item.getWidth()
          this.debug && console.log(`New currentX = ${currentX}`)
          if (currentX > this.lineWidth) {
            // new line
            this.debug && console.log(`New line`)
            currentLine.trimEndGlue()
            lines.push(currentLine)
            currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
            currentX = item.getWidth()
          }
          currentLine.pushItem(item)
          continue
        }
        if (item instanceof Box) {
          this.debug && console.log(`Processing box at currentX = ${currentX}`)
          currentX += item.getWidth()
          this.debug && console.log(`New currentX = ${currentX}`)
          currentLine.pushItem(item)
          continue
        }
        if (item instanceof Penalty) {
          if (item.getPenalty() === MINUS_INFINITE) {
            // force line break
            currentLine.trimEndGlue()
            lines.push(currentLine)
            currentX = 0
          }
        }
      }
      currentLine.trimEndGlue()
      if (currentLine.getItemCount() !== 0) {
        lines.push(currentLine)
      }
      let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
      if (lines.length === 0) {
        return outputList
      }
      // add some metadata to the lines
      let lineNumberInParagraph = 1
      lines = lines.map((line) => {
        return line.setHeight(line.getHeight())
      }).map( (line) => {
        return line.addMetadata(lineNumberInParagraphKey, lineNumberInParagraph++).addMetadata(lineRatioKey, line.getWidth() / this.lineWidth)
      })
      // add inter-line glue
      outputList.pushItem(lines[0])
      for (let i = 1; i < lines.length; i++) {
        let interLineGlue = new Glue(TypesetterItemDirection.VERTICAL)
        let lineHeight = lines[i].getHeight()
        interLineGlue.setHeight(this.lineSkip-lineHeight).setWidth(this.lineWidth)
        outputList.pushItem(interLineGlue)
        outputList.pushItem(lines[i])
      }
      resolve(outputList)
    })
  }

  /**
   *
   * @param {ItemList}list
   * @return {Promise}
   */
  typesetVerticalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetVerticalList(list)
      let outputList = new ItemList(HORIZONTAL)
      let currentY = 0
      let currentVerticalList = new ItemList(VERTICAL)
      if (list.hasMetadata('type')) {
        currentVerticalList.addMetadata('type', list.getMetadata('type'))
      }
      inputList.getList().forEach((item, i) => {
        if (item instanceof Glue) {
          currentY += item.getHeight()
          currentVerticalList.pushItem(item)
          return
        }
        if (item instanceof ItemList) {
          if (item.getDirection() !== HORIZONTAL) {
            console.warn(`Ignoring vertical list while typesetting a vertical list, item index ${i}`)
            console.log(item)
            return
          }
          currentY += item.getHeight()
          if (currentY > this.textAreaHeight) {
            // new page!
            currentVerticalList.trimEndGlue()
            outputList.pushItem(currentVerticalList)
            currentVerticalList = new ItemList(VERTICAL)
            currentVerticalList.pushItem(item)
            currentY = item.getHeight()
          } else {
            currentVerticalList.pushItem(item)
          }
          return
        }
        console.warn(`Ignoring non-glue non-list item while typesetting vertical list, item index ${i}`)
        console.log(item)
      })
      if (currentVerticalList.getList().length !== 0) {
        currentVerticalList.trimEndGlue()
        outputList.pushItem(currentVerticalList)
      }
      resolve(outputList)
    })
  }

  typeset (mainTextList) {
    if (mainTextList.getDirection() !== VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    return new Promise ( async (resolve) => {
      let verticalListToTypeset = new ItemList(VERTICAL)

      let paragraphNumber = 0
      for (const verticalItem of mainTextList.getList()) {
        if (verticalItem instanceof Glue) {
          verticalListToTypeset.pushItem(verticalItem)
          continue
        }
        if (verticalItem instanceof ItemList) {
          if (verticalItem.getDirection() === HORIZONTAL) {
            this.debug && console.log(`Processing horizontal list, i.e., a paragraph`)
            paragraphNumber++
            let typesetParagraph = await this.typesetHorizontalList(verticalItem)
            typesetParagraph.getList().forEach((typesetItem) => {
              if (typesetItem instanceof ItemList) {
                typesetItem.addMetadata(paragraphNumberKey, paragraphNumber)
              }
              verticalListToTypeset.pushItem(typesetItem)
            })
          }
        }
      }
      // add inter-paragraph glue
      let gotLine = false
      let previousLine = null
      let verticalListToTypesetForReal = new ItemList(VERTICAL)
      verticalListToTypesetForReal.addMetadata('type', 'MainText')
      let lineNumber = 1
      verticalListToTypeset.getList().forEach( (item) => {
        if (item instanceof ItemList) {
          item.addMetadata(lineNumberKey, lineNumber++)
          if (gotLine) {
            // one line after the other, add inter paragraph glue
            console.log(`one line after the other, add inter paragraph glue`)
            let interParagraphGlue = new Glue(TypesetterItemDirection.VERTICAL)
            let lineHeight = item.getHeight()
            interParagraphGlue.setHeight(this.lineSkip-lineHeight+this.options.parSkip).setWidth(this.lineWidth)
            verticalListToTypesetForReal.pushItem(previousLine)
            verticalListToTypesetForReal.pushItem(interParagraphGlue)
            previousLine = item
          } else {
            // got a line after some glue
            gotLine = true
            previousLine = item
          }
        } else {
          // glue
          if (gotLine) {
            verticalListToTypesetForReal.pushItem(previousLine)
          }
          gotLine = false
          verticalListToTypesetForReal.pushItem(item)
        }
      })
      if (gotLine) {
        verticalListToTypesetForReal.pushItem(previousLine)
      }
      let pageList = await this.typesetVerticalList(verticalListToTypesetForReal)
      let doc = new TypesetterDocument()
      doc.addMetadata('typesetter', signature)
      doc.setPages(pageList.getList().map((pageItemList) => {
        pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop)
        return new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
          [pageItemList])
      }))
      doc.setDimensionsFromPages()
      resolve(doc)
    })
  }

}