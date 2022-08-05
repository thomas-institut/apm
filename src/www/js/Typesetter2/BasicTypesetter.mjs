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
import { Penalty } from './Penalty.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer/TextBoxMeasurer.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'
import * as MetadataKey from './MetadataKey.mjs'
import * as ListType from './ListType.mjs'
import * as GlueType from './GlueType.mjs'
import { toFixedPrecision } from '../toolbox/Util.mjs'
import { FirstFitLineBreaker } from './LineBreaker/FirstFitLineBreaker.mjs'
import { LineBreaker } from './LineBreaker/LineBreaker.mjs'
import { AddPageNumbers } from './PageProcessor/AddPageNumbers.mjs'
import { AddLineNumbers } from './PageProcessor/AddLineNumbers.mjs'

const signature = 'BasicTypesetter 0.1'

// const validPageNumbersPositions = [ 'top', 'bottom']
// const validAligns = [ 'center', 'left', 'right']

const defaultFontFamily = 'FreeSerif'
const defaultFontSize = Typesetter2.pt2px(12)

export class BasicTypesetter extends Typesetter2 {
  constructor (options) {
    super()
    let oc = new OptionsChecker({
      context: signature,
      optionsDefinition: {
        pageWidth: { type: 'number', required: true},
        pageHeight: { type: 'number', required: true},
        marginTop: { type: 'number', default: 50},
        marginBottom: { type: 'number', default: 50},
        marginLeft: { type: 'number', default: 50},
        marginRight: { type: 'number', default: 50},
        lineSkip: { type: 'number', default: 24},
        minLineSkip: { type: 'number', default: 0},
        defaultFontFamily: { type: 'string', default: defaultFontFamily},
        defaultFontSize: { type: 'number', default: defaultFontSize},
        showPageNumbers: { type: 'boolean', default: true},
        pageNumbersOptions: { type: 'object', default: {}},
        showLineNumbers: { type: 'boolean', default: true},
        lineNumbersOptions: { type: 'object', default: {}},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        justify: { type: 'boolean', default: true},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
    this.minLineSkip = this.options.minLineSkip
    this.debug = this.options.debug
    this.pageOutputProcessors = []
    if (this.options.showPageNumbers) {
      let pnOc = new OptionsChecker({
        context: `${signature} - Page Numbers`,
        optionsDefinition: {
          position: { type: 'string', default: 'bottom'},
          align: {type: 'string', default: 'center'},
          margin: { type: 'number', default: Typesetter2.cm2px(0.5) },
          fontFamily: { type: 'string', default: defaultFontFamily},
          fontSize: { type: 'number', default: defaultFontSize*0.8},
        }
      })
      let pnOptions = pnOc.getCleanOptions(this.options.pageNumbersOptions)
      this.addPageOutputProcessor( this.__constructAddPageNumberProcessor(pnOptions))
    }
    if (this.options.showLineNumbers) {
      let lnOc = new OptionsChecker({
        context: `${signature} - Line Numbers`,
        optionsDefinition: {
          xPosition: { type: 'number', default: this.options.marginLeft - Typesetter2.cm2px(0.5)},
          align: {type: 'string', default: 'right'},
          fontFamily: { type: 'string', default: defaultFontFamily},
          fontSize: { type: 'number', default: defaultFontSize*0.6},
          numberStyle: { type: 'string', default: ''},
          showLineOne: {type: 'boolean', default: true},
          lineNumberShift: { type: 'number', default: 0},
          frequency: { type: 'number', default: 5},
        }
      })
      let lnOptions = lnOc.getCleanOptions(this.options.lineNumbersOptions)
      this.addPageOutputProcessor(this.__constructAddLineNumbersProcessor(lnOptions))
    }

  }

  /**
   *
   * @param {PageProcessor}pageOutputProcessor
   */
  addPageOutputProcessor(pageOutputProcessor) {
    this.pageOutputProcessors.push(pageOutputProcessor)
  }

  typesetHorizontalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetHorizontalList(list)
      // this.debug && console.log(`Typesetting horizontal list, desired lineWidth = ${this.lineWidth}`)

      // First fit algorithm
      let itemArray = inputList.getList()

      // this.debug && console.log(`Sending item array to FirstFitLineBreaker`)
      let lines = await FirstFitLineBreaker.breakIntoLines(itemArray, this.lineWidth, this.options.textBoxMeasurer)

      // this.debug && console.log(`Got ${lines.length} lines back`)
      // this.debug && console.log(lines)

      // post-process lines
      let lineNumberInParagraph = 1
      lines = lines.map((line) => {
        // add list type
        line.addMetadata(MetadataKey.LIST_TYPE, ListType.LINE)

        // add line number
        line.addMetadata(MetadataKey.LINE_NUMBER_IN_PARAGRAPH, lineNumberInParagraph++)

        // set height
        line.setHeight(line.getHeight())

        // align item baselines
        let lineHeight = line.getHeight()
        line.setList( line.getList().map( (item) => {
          if (item instanceof TextBox) {
            if (item.getHeight() < lineHeight) {
              item.setShiftY(lineHeight - item.getHeight() +item.shiftY)
            }
          }
          return item
        }))

        // adjust glue
        let adjRatio = LineBreaker.calculateAdjustmentRatio(line.getList(), this.lineWidth)
        line.addMetadata(MetadataKey.ADJUSTMENT_RATIO, adjRatio)
        let unadjustedLineWidth = line.getWidth()
        line.addMetadata(MetadataKey.UNADJUSTED_LINE_WIDTH, toFixedPrecision(unadjustedLineWidth, 3))
        if (adjRatio !== null) {
          line.setList( line.getList().map( (item) => {
            if (item instanceof Glue) {
              if (adjRatio>=0) {
                item.setWidth(item.getWidth() + adjRatio*item.getStretch())
              } else {
                item.setWidth(item.getWidth() + adjRatio*item.getShrink())
              }
            }
            return item
          }))
        }
        line.addMetadata(MetadataKey.LINE_RATIO, toFixedPrecision(line.getWidth() / unadjustedLineWidth, 3))

        // take care of rtl text
        line = this.__reorderRtlText(line)
        return line
      })

      let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
      if (lines.length === 0) {
        return outputList
      }

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
            if (list.hasMetadata(MetadataKey.LIST_TYPE)) {
              currentVerticalList.addMetadata(MetadataKey.LIST_TYPE, list.getMetadata(MetadataKey.LIST_TYPE))
            }
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

  /**
   * Typesets a list of paragraphs into a multipage document
   *
   * Each vertical item in the input list must be either a horizontal list
   * containing a paragraph or vertical glue.
   *
   * A paragraph is a horizontal list containing text and
   * inter-word glue. The typesetter will convert it to
   * a vertical list with the paragraph properly split into lines and
   * then break it into pages
   *
   *
   *
   * @param mainTextList
   * @param data
   * @return {Promise<TypesetterDocument>}
   */
  typeset (mainTextList, data = null) {
    if (mainTextList.getDirection() !== TypesetterItemDirection.VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    return new Promise ( async (resolve) => {
      // Generate a vertical list to be typeset
      let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
      let paragraphNumber = 0
      // Go over each vertical item in the input list
      for (const verticalItem of mainTextList.getList()) {
        if (verticalItem instanceof Glue) {
          if (verticalItem.getDirection() === TypesetterItemDirection.VERTICAL) {
            // VERTICAL GLUE, just add it to the list to typeset
            verticalListToTypeset.pushItem(verticalItem)
          } else {
            console.warn(`${signature}: ignoring horizontal glue while building main text vertical list`)
          }
          continue
        }
        if (verticalItem instanceof ItemList) {
          if (verticalItem.getDirection() === TypesetterItemDirection.HORIZONTAL) {
            // HORIZONTAL LIST, i.e., a paragraph
            // this.debug && console.log(`Processing horizontal list, i.e., a paragraph`)
            paragraphNumber++
            let typesetParagraph = await this.typesetHorizontalList(verticalItem)
            typesetParagraph.getList().forEach((typesetItem) => {
              if (typesetItem instanceof ItemList) {
                // add paragraph number info to each line in the paragraph
                typesetItem.addMetadata(MetadataKey.PARAGRAPH_NUMBER, paragraphNumber)
              }
              verticalListToTypeset.pushItem(typesetItem)
            })
          }
        }
        // any other item type is ignored
      }
      // set any interLine glue that still unset and add absolute line numbers
      verticalListToTypeset = this.__fixInterLineGlue(verticalListToTypeset)
      verticalListToTypeset = this.__addAbsoluteLineNumbers(verticalListToTypeset)
      verticalListToTypeset.addMetadata(MetadataKey.LIST_TYPE, ListType.MAIN_TEXT)

      let pageList = await this.typesetVerticalList(verticalListToTypeset)
      let doc = new TypesetterDocument()
      doc.addMetadata('typesetter', signature)
      let thePages = pageList.getList().map((pageItemList) => {
        pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop)
        return new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
          [pageItemList])
      }).map( (page, pageIndex) => {
        // add metadata
        page.addMetadata(MetadataKey.PAGE_NUMBER, pageIndex+1)
        // "normal" foliation, other processors may change it
        page.addMetadata(MetadataKey.PAGE_FOLIATION, `${pageIndex+1}`)
        return page
      })
      // Apply page processors
      let processedPages = []
      for (let pageIndex = 0; pageIndex < thePages.length; pageIndex++){
        let processedPage = thePages[pageIndex]
        for (let processorIndex = 0; processorIndex < this.pageOutputProcessors.length; processorIndex++) {
          // this.debug && console.log(`Applying page output processor ${processorIndex}`)
          processedPage = await this.pageOutputProcessors[processorIndex].process(processedPage)
        }
        processedPages.push(processedPage)
      }
      doc.setPages(processedPages)
      doc.setDimensionsFromPages()
      resolve(doc)
    })
  }

  /**
   *
   * @param {ItemList}line
   * @return {ItemList}
   * @private
   */
  __reorderRtlText(line) {
    // first version: assume horizontal lists are processed LTR
    // so, RTL item must be arranged in reverse order
    let state = 0
    let orderedTokenIndices = []
    let reverseStack = []
    let glueArray = []
    let hasRTLText = false
    line.getList().forEach( (item, i) => {
      switch (state) {
        case 0:
          if (item instanceof Glue) {
            orderedTokenIndices.push(i)
            break
          }
          if (item instanceof Penalty) {
            orderedTokenIndices.push(i)
            break
          }
          if (item instanceof TextBox) {
            if (item.getTextDirection() === 'rtl') {
              reverseStack.push(i)
              hasRTLText = true
              state = 1
              break
            }
          }
          // item is a box or an LTR text box
          orderedTokenIndices.push(i)
          break

        case 1:
          if (item instanceof Glue) {
            glueArray.push(i)
            break
          }
          if (item instanceof Penalty) {
            reverseStack.push(i)
            break
          }
          if (item instanceof TextBox) {
            if (item.getTextDirection() !== 'rtl') {
              // back to LTR
              while (reverseStack.length > 0) {
                orderedTokenIndices.push(reverseStack.pop())
              }
              // push hanging glue tokens
              for (let j = 0; j < glueArray.length; j++) {
                orderedTokenIndices.push(glueArray[j])
              }
              glueArray = []
              orderedTokenIndices.push(i)
              state = 0
            } else {
              // still RTL
              // put glue array in reverse stack
              while(glueArray.length > 0) {
                reverseStack.push(glueArray.pop())
              }
              reverseStack.push(i)
            }
            break
          }
          // item is a box or a TRL text box
          reverseStack.push(i)
          break
      }
    })
    // dump whatever is on the reverse stack
    // empty the reverse stack
    while(reverseStack.length > 0) {
      orderedTokenIndices.push(reverseStack.pop())
    }
    // empty the glue array
    for (let j = 0; j < glueArray.length; j++) {
      orderedTokenIndices.push(glueArray[j])
    }
    // some sanity checks
    if (orderedTokenIndices.length !== line.getItemCount()) {
      console.error(`Ordered token indices and tokensWithInitial glue are not the same length: 
        ${orderedTokenIndices.length} !== ${line.getItemCount()}`)
    }
    // if there was some RTL text, reorder items
    if (hasRTLText) {
      this.debug && console.log(`Line has RTL text`)
      line.addMetadata(MetadataKey.HAS_RTL_TEXT, true)
      let originalItemArray = line.getList()
      line.setList(orderedTokenIndices.map( (index) => {
        return originalItemArray[index].addMetadata(MetadataKey.ORIGINAL_ARRAY_INDEX, index)
      }))
      this.debug && console.log(`Processed line`)
      this.debug && console.log(line)
    }
    return line
  }

  __addAbsoluteLineNumbers(verticalList) {
    let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
    let lineNumber = 0
    verticalList.getList().forEach( (item) => {
      if (item instanceof ItemList
        && item.hasMetadata(MetadataKey.LIST_TYPE)
        && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
        lineNumber++
        // this.debug && console.log(`Adding line number ${lineNumber} metadata`)
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
    // this.debug && console.log(`Fixing inter line glue`)
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
            // this.debug && console.log(`Item ${i} is interline glue that is not set`)
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

            // this.debug && console.log(`Got a line in state 1, setting inter line glue`)
            let nextLineHeight = item.getHeight()
            currentInterLineGlue.setHeight(this.__getInterLineGlueHeight(nextLineHeight))
              .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, true)
            outputList.pushItem(currentInterLineGlue)
            // this.debug && console.log(`Pushing ${tmpItems.length} item(s) in temp stack to output list`)
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

  /**
   * @return AddPageNumbers
   * @private
   */
  __constructAddPageNumberProcessor(options) {
    let pageNumbersMarginTop = this.options.pageHeight - this.options.marginBottom + options.margin
    let pageNumbersMarginLeft = this.options.marginLeft
    let lineWidth = this.options.pageWidth - this.options.marginRight - this.options.marginLeft

    if (options.position === 'top') {
      pageNumbersMarginTop = this.options.marginTop - options.margin - options.fontSize
    }
    return new AddPageNumbers({
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      marginTop: pageNumbersMarginTop,
      marginLeft: pageNumbersMarginLeft,
      lineWidth: lineWidth,
      align: options.align,
      textBoxMeasurer: this.options.textBoxMeasurer
    })
  }

  /**
   *
   * @return {AddLineNumbers}
   * @private
   */
  __constructAddLineNumbersProcessor(options) {
    options.textBoxMeasurer = this.options.textBoxMeasurer
    return new AddLineNumbers(options)
  }
}