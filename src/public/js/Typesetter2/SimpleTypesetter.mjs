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
import { Glue } from './Glue.mjs'
import { TextBox } from './TextBox.mjs'
import { MINUS_INFINITE, Penalty } from './Penalty.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'
import { Box } from './Box.mjs'
import * as MetadataKey from './MetadataKey.mjs'
import * as ListType from './ListType.mjs'
import * as GlueType from './GlueType.mjs'

const signature = 'SimpleTypesetter 0.1'

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
        minLineSkip: { type: 'number', default: 3},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
    this.minLineSkip = this.options.minLineSkip
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
        return line.addMetadata(MetadataKey.LINE_NUMBER_IN_PARAGRAPH, lineNumberInParagraph++)
          .addMetadata(MetadataKey.LINE_RATIO, line.getWidth() / this.lineWidth)
          .addMetadata(MetadataKey.LIST_TYPE, ListType.LINE)
      })
      // add inter-line glue
      for (let i = 0; i < lines.length; i++) {
        outputList.pushItem(lines[i])
        let interLineGlue = new Glue(TypesetterItemDirection.VERTICAL)
        interLineGlue.addMetadata(MetadataKey.GLUE_TYPE, GlueType.INTER_LINE)
        if (i !== lines.length -1) {
          let nextLineHeight = lines[i+1].getHeight()
          interLineGlue.setHeight(this.__getInterLineGlueHeight(nextLineHeight))
            .setWidth(this.lineWidth)
            .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, true)
        } else {
          interLineGlue.setHeight(0)
            .setWidth(this.lineWidth)
            .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, false)
        }
        outputList.pushItem(interLineGlue)
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
      let outputList = new ItemList(TypesetterItemDirection.HORIZONTAL)
      let currentY = 0
      let currentVerticalList = new ItemList(TypesetterItemDirection.VERTICAL)
      if (list.hasMetadata(MetadataKey.LIST_TYPE)) {
        currentVerticalList.addMetadata(MetadataKey.LIST_TYPE, list.getMetadata(MetadataKey.LIST_TYPE))
      }
      inputList.getList().forEach((item, i) => {
        if (item instanceof Glue) {
          currentY += item.getHeight()
          currentVerticalList.pushItem(item)
          return
        }
        if (item instanceof ItemList) {
          if (item.getDirection() === TypesetterItemDirection.VERTICAL) {
            console.warn(`Ignoring vertical list while typesetting a vertical list, item index ${i}`)
            console.log(item)
            return
          }
          currentY += item.getHeight()
          if (currentY > this.textAreaHeight) {
            // new page!
            currentVerticalList.trimEndGlue()
            outputList.pushItem(currentVerticalList)
            currentVerticalList = new ItemList(TypesetterItemDirection.VERTICAL)
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
    if (mainTextList.getDirection() !== TypesetterItemDirection.VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    return new Promise ( async (resolve) => {
      let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)

      let paragraphNumber = 0
      for (const verticalItem of mainTextList.getList()) {
        if (verticalItem instanceof Glue) {
          if (verticalItem.getDirection() === TypesetterItemDirection.VERTICAL) {
            verticalListToTypeset.pushItem(verticalItem)
          } else {
            console.warn(`${signature}: ignoring horizontal glue while building main text vertical list`)
          }
          continue
        }
        if (verticalItem instanceof ItemList) {
          if (verticalItem.getDirection() === TypesetterItemDirection.HORIZONTAL) {
            this.debug && console.log(`Processing horizontal list, i.e., a paragraph`)
            paragraphNumber++
            let typesetParagraph = await this.typesetHorizontalList(verticalItem)
            typesetParagraph.getList().forEach((typesetItem) => {
              if (typesetItem instanceof ItemList) {
                typesetItem.addMetadata(MetadataKey.PARAGRAPH_NUMBER, paragraphNumber)
              }
              verticalListToTypeset.pushItem(typesetItem)
            })
          }
        }
      }
      // this.debug && console.log(`Finished assembling vertical list to typeset`)
      // this.debug && console.log(deepCopy(verticalListToTypeset))
      // set any interLine glue that still unset and add absolute line numbers
      verticalListToTypeset = this.__fixInterLineGlue(verticalListToTypeset)
      // this.debug && console.log(`Finished fixing inter line glue`)
      // this.debug && console.log(deepCopy(verticalListToTypeset))
      verticalListToTypeset = this.__addAbsoluteLineNumbers(verticalListToTypeset)
      verticalListToTypeset.addMetadata(MetadataKey.LIST_TYPE, ListType.MAIN_TEXT)

      let pageList = await this.typesetVerticalList(verticalListToTypeset)
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

  __addAbsoluteLineNumbers(verticalList) {
    let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
    let lineNumber = 0
    verticalList.getList().forEach( (item) => {
      if (item instanceof ItemList
        && item.hasMetadata(MetadataKey.LIST_TYPE)
        && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
        lineNumber++
        item.addMetadata(MetadataKey.LINE_NUMBER, lineNumber)
      }
      outputList.pushItem(item)
    })
    return outputList
  }

  /**
   *
   * @param verticalList
   * @return ItemList
   * @private
   */
  __fixInterLineGlue(verticalList) {
    this.debug && console.log(`Fixing inter line glue`)
    let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
    let state = 0
    let currentInterLineGlue = null
    let tmpItems = []
    verticalList.getList().forEach((item, i) => {
      switch (state) {
        case 0:
          if (item.hasMetadata(MetadataKey.GLUE_TYPE)
            && item.getMetadata(MetadataKey.GLUE_TYPE) === GlueType.INTER_LINE
            && item.getMetadata(MetadataKey.INTER_LINE_GLUE_SET) === false
          ) {
            this.debug && console.log(`Item ${i} is inter line glue that is not set`)
            currentInterLineGlue = item
            state = 1
          } else {
            outputList.pushItem(item)
          }
          break

        case 1:
          if (item instanceof ItemList
            && item.hasMetadata(MetadataKey.LIST_TYPE)
            && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {

            this.debug && console.log(`Got a line in state 1, setting inter line glue`)
            let nextLineHeight = item.getHeight()
            currentInterLineGlue.setHeight(this.__getInterLineGlueHeight(nextLineHeight))
              .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, true)
            outputList.pushItem(currentInterLineGlue)
            this.debug && console.log(`Pushing ${tmpItems.length} item(s) in temp stack to output list`)
            outputList.pushItemArray(tmpItems)
            outputList.pushItem(item)
            tmpItems = []
            currentInterLineGlue = null
            state = 0
          } else {
            this.debug && console.log(`Saving item ${i} in temp stack`)
            tmpItems.push(item)
          }
          break
      }
    })
    outputList.pushItemArray(tmpItems)
    return outputList
  }

  __getInterLineGlueHeight(nextLineHeight) {
      return Math.max(this.minLineSkip, this.lineSkip - nextLineHeight)
  }




}