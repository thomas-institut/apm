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
import { INFINITE_PENALTY, MINUS_INFINITE_PENALTY, Penalty } from './Penalty.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'
import { Box } from './Box.mjs'
import * as MetadataKey from './MetadataKey.mjs'
import * as ListType from './ListType.mjs'
import * as GlueType from './GlueType.mjs'
import { toFixedPrecision } from '../toolbox/Util.mjs'
import { makeCopyOfArray } from '../toolbox/ArrayUtil.mjs'
import { ObjectFactory } from './ObjectFactory.mjs'

const signature = 'BasicTypesetter 0.1'

const INFINITE_BADNESS = 100000000
const FLAG_PENALTY = 3000

export class BasicTypesetter extends Typesetter2 {
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
        minLineSkip: { type: 'number', default: 0},
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
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {number}desiredLineWidth
   * @private
   */
  _calculateAdjustmentRatio(itemArray, desiredLineWidth) {
    // this.debug && console.log(`Calculation adj ratio, desired LW = ${desiredLineWidth}`)
    // this.debug && console.log( `on ${itemArray.length} items`)
    let totalWidth = itemArray.map( (item) => {
      return item.getWidth()
    }).reduce( (total, x) => { return total+x}, 0)
    // this.debug && console.log(`Total width: ${totalWidth}`)
    if (desiredLineWidth === totalWidth) {
      return 0
    }
    if (totalWidth < desiredLineWidth) {
      // short line
      let totalGlueStretch = itemArray.map( (item) => {
        if (item instanceof Glue) {
          return item.getStretch()
        }
        return 0
      }).reduce( (total, x) => { return total+x}, 0)
      // this.debug && console.log(`total glue stretch = ${totalGlueStretch}`)
      if (totalGlueStretch <=0) {
        return null
      }
      return (desiredLineWidth - totalWidth)/totalGlueStretch
    }
    // long line
    let totalGlueShrink = itemArray.map ( (item) => {
      if (item instanceof Glue) {
        return item.getShrink()
      }
      return 0
    }).reduce( (total, x) => { return total+x}, 0)
    // this.debug && console.log(`total glue shrink = ${totalGlueShrink}`)
    if (totalGlueShrink <=0) {
      return null
    }
    return (desiredLineWidth - totalWidth)/totalGlueShrink
  }

  __measureTextBoxes(itemArray) {
    return new Promise ( async (resolve) => {
      for (let i = 0; i < itemArray.length; i++) {
        if (itemArray[i] instanceof TextBox) {
          if (itemArray[i].getWidth() === -1) {
            //this.debug && console.log(`Getting text box width`)
            let measuredWidth = await this.options.textBoxMeasurer.getBoxWidth(itemArray[i])
            itemArray[i].setWidth(measuredWidth)
          }
          if (itemArray[i].getHeight() === -1) {
            let measuredHeight = await this.options.textBoxMeasurer.getBoxHeight(itemArray[i])
            itemArray[i].setHeight(measuredHeight)
          }
        }
        if (itemArray[i] instanceof  Penalty) {
          if (itemArray[i].hasItemToInsert() && itemArray[i].getItemToInsert() instanceof TextBox) {
            let item = itemArray[i].getItemToInsert()
            if (item.getWidth() === -1){
              let measuredWidth = await this.options.textBoxMeasurer.getBoxWidth(item)
              item.setWidth(measuredWidth)
            }
            if (item.getHeight() === -1){
              let measureHeight = await this.options.textBoxMeasurer.getBoxHeight(item)
              item.setHeight(measureHeight)
            }
          }
        }
      }
      resolve()
    })
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {Penalty|null} penalty
   * @param {number}flagsInARow
   * @return {Promise}
   * @private
   */
  _calculateBadness(itemArray, penalty= null, flagsInARow = 0) {
    return new Promise( async (resolve) =>{
      let lineItemArray =  makeCopyOfArray(itemArray)
      let penaltyValue = 0
      if (penalty !== null) {
        penaltyValue = penalty.getPenalty()
        if (penalty.hasItemToInsert()) {
          lineItemArray.push(penalty.getItemToInsert())
        }
        if (penalty.isFlagged()) {
          penaltyValue += (flagsInARow +1)*FLAG_PENALTY
        }
      }
      lineItemArray = this.__compactItemArray(lineItemArray)
      await this.__measureTextBoxes(lineItemArray)
      if (this.debug) {
        let tmpList = (new ItemList()).setList(lineItemArray)
        // console.log(`Calculating badness of line '${tmpList.getText()}'`)
      }
      let adjRatio = this._calculateAdjustmentRatio(lineItemArray, this.lineWidth)
      if (adjRatio === null || adjRatio < -1) {
        resolve(INFINITE_BADNESS)
      }
      let badness = 100*Math.pow( Math.abs(adjRatio), 3)
      resolve(badness > INFINITE_BADNESS ? INFINITE_BADNESS : badness + penaltyValue)
    })

  }

  /**
   * Determines line break points in an item array
   * using the best-fit algorithm
   * @param {TypesetterItem[]}itemArray
   * @return {Promise}
   * @private
   */
  _getBreakPoints(itemArray) {
    return new Promise( async (resolve) => {
      this.debug && console.log(`Getting break points of a paragraph with ${itemArray.length} items`)
      let breaks = []
      let currentBadness = INFINITE_BADNESS
      let currentLine = []
      let currentBestBreakPoint = -1
      let flagsInARow = 0
      for(let i =0; i < itemArray.length; i++) {
        let item = itemArray[i]
        if (item instanceof Box) {
          // this.debug && console.log(`Item ${i} is a Box, pushing it`)
          currentLine.push(item)
          continue
        }
        if (item instanceof Penalty) {
          this.debug && console.log(`Item ${i} is a Penalty`)
          let penaltyValue = item.getPenalty()
          if (penaltyValue === MINUS_INFINITE_PENALTY) {
            this.debug && console.log(`Infinite penalty, so add a break at ${i}`)
            breaks.push(i)
            flagsInARow = 0
            currentLine=[]
            continue
          }
          if (currentLine.length !== 0 && penaltyValue < INFINITE_PENALTY) {
            // tentative breaking point
            let breakBadness = await this._calculateBadness(currentLine, item, flagsInARow)
            this.debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              this.debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
              breaks.push(currentBestBreakPoint)
              let itemAtBreak = itemArray[currentBestBreakPoint]
              if (itemAtBreak instanceof Penalty) {
                if (itemAtBreak.isFlagged()) {
                  flagsInARow++
                  this.debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`)
                }
              } else {
                this.debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`)
                flagsInARow = 0
              }
              currentLine=[]
              // this.debug && console.log(`Initializing next line`)
              let j = currentBestBreakPoint
              while (j <= i && !(itemArray[j] instanceof Box) ) {
                // this.debug && console.log(`... skipping item ${j}, not a box`)
                j++
              }
              while (j <=i) {
                // this.debug && console.log(`...adding item ${j}`)
                currentLine.push(itemArray[j])
                j++
              }

              currentBadness = INFINITE_BADNESS
              currentBestBreakPoint = -1
            } else {
              currentBestBreakPoint = i
              currentBadness = breakBadness
            }
          }
          continue
        }
        // this.debug && console.log(`Item ${i} is Glue`)
        // item is glue
        if (itemArray[i-1] instanceof Box) {
          // this.debug && console.log(`Previous item was a Box, so this is a tentative break point`)
          // tentative break point
          let breakBadness = await this._calculateBadness(currentLine)
          // this.debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)

          if (breakBadness > currentBadness) {
            // we found a minimum, eject line
            this.debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
            breaks.push(currentBestBreakPoint)
            let itemAtBreak = itemArray[currentBestBreakPoint]
            if (itemAtBreak instanceof Penalty) {
              if (itemAtBreak.isFlagged()) {
                flagsInARow++
                this.debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`)
              }
            } else {
              this.debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`)
              flagsInARow = 0
            }
            currentLine=[]
            // this.debug && console.log(`Initializing next line`)
            let j = currentBestBreakPoint
            while (j <= i && !(itemArray[j] instanceof Box) ) {
              // this.debug && console.log(`... skipping item ${j}, not a box`)
              j++
            }
            while (j <=i) {
              // this.debug && console.log(`...adding item ${j}`)
              currentLine.push(itemArray[j])
              j++
            }

            currentBadness = INFINITE_BADNESS
            currentBestBreakPoint = -1
          } else {
            // this.debug && console.log(`...which is less or equal than current badness (${currentBadness}), so ${i} is the current best break point `)
            currentBadness = breakBadness
            currentBestBreakPoint = i
            currentLine.push(item)
          }
        } else {
          if (currentLine.length !== 0) {
            // this.debug && console.log(`Pushing it to currentLine`)
            currentLine.push(item)
          }
        }
      }
      resolve(breaks)
    })
  }

  /**
   * Tries to merge an item with another item
   * E.g. two text boxes with the same font descriptions
   * Returns an array of items with 1 item if there was
   * a merge or with 2 item if no merge was possible
   * @param {TypesetterItem}item
   * @param {TypesetterItem}nextItem
   * @return {TypesetterItem[]}
   * @private
   */
  __mergeItemWithNext(item, nextItem) {
    if (item.constructor.name !== nextItem.constructor.name) {
      // no merge possible between two items of different class
      //this.debug && console.log(`Cannot merge ${item.constructor.name} with ${nextItem.constructor.name}`)
      return [ item, nextItem]
    }
    // merging only text boxes for now
    if (item instanceof TextBox && nextItem instanceof TextBox) {
      // this.debug && console.log(`Trying to merge two text boxes: '${item.getText()}' + '${nextItem.getText()}'`)
      if (item.getFontFamily() !== nextItem.getFontFamily()) {
        // this.debug && console.log(`... not the same font family: '${item.getFontFamily()}' !== '${nextItem.getFontFamily()}'`)
        return [item, nextItem]
      }
      if (item.getFontSize() !== nextItem.getFontSize()) {
        // this.debug && console.log(`... not the same font size`)
        return [item, nextItem]
      }
      if (item.getFontWeight() !== nextItem.getFontWeight()) {
        // this.debug && console.log(`... not the same font weight`)
        return [item, nextItem]
      }
      if (item.getFontStyle() !== nextItem.getFontStyle()) {
        // this.debug && console.log(`... not the same font style`)
        return [item, nextItem]
      }
      // this.debug && console.log(`...font specs are equal, merging`)
      // creating a new object so that the original object is not changed
      let newItem = ObjectFactory.fromObject(item.getExportObject())
      return [ newItem.setText(item.getText() + nextItem.getText())]
    }
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @private
   */
  __compactItemArray(itemArray) {
    //this.debug && console.log(`Compacting line`)
    return itemArray.reduce( (currentArray, item) => {
      if (currentArray.length === 0) {
        return [item]
      }
      let lastItem = currentArray.pop()
      let mergedArray = this.__mergeItemWithNext(lastItem, item)
      for (let i = 0; i < mergedArray.length; i++) {
        currentArray.push(mergedArray[i])
      }
      return currentArray
    }, [])
  }

  /**
   * Gets an array of ItemList corresponding to each line from
   * an item array and an array of break points.
   * @param {TypesetterItem[]}itemArray
   * @param {number[]}breakpoints
   * @return {ItemList[]}
   * @private
   */
  _getLinesFromBreakpoints(itemArray, breakpoints) {
    let lines = []
    let lineStartIndex = 0
    breakpoints.forEach( (breakIndex) => {
      let newLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
      while(!(itemArray[lineStartIndex] instanceof Box) && lineStartIndex < breakIndex) {
        lineStartIndex++
      }
      for (let i = lineStartIndex; i < breakIndex; i++) {
          newLine.pushItem(itemArray[i])
      }
      let breakItem = itemArray[breakIndex]
      if (breakItem instanceof Penalty) {
        if (breakItem.hasItemToInsert()) {
          // add the item
          newLine.pushItem(breakItem.getItemToInsert())
        }
      }
      // filter out penalties
      newLine.setList( newLine.getList().filter ( (item) => {
        return !(item instanceof Penalty)
      }))
      newLine.setList(this.__compactItemArray(newLine.getList()))
      lines.push(newLine)
      lineStartIndex = breakIndex
    })
    return lines
  }


  typesetHorizontalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetHorizontalList(list)
      this.debug && console.log(`Typesetting horizontal list, desired lineWidth = ${this.lineWidth}`)

      // First fit algorithm
      // first, measure current text boxes
      // note that since there some text boxes might get merged later on, this
      // does not guarantee that ALL text boxes used during the process will have
      // a valid measurement
      let itemArray = inputList.getList()
      //await this.__measureTextBoxes(itemArray)


      let lineBreaks = await this._getBreakPoints(itemArray)
      // add a break at the end if there isn't one
      if (lineBreaks[lineBreaks.length-1] !== itemArray.length -1) {
        lineBreaks.push(itemArray.length -1)
      }
      this.debug && console.log(`Break points:`)
      this.debug && console.log(lineBreaks)
      let lines = this._getLinesFromBreakpoints(itemArray, lineBreaks)
      this.debug && console.log(`Lines:`)
      this.debug && console.log(lines.map( (line) => {
        return { text: line.getText(), data: line.metadata}
      }))
      // final line measurement
      // should be very quick since all possible merged combinations have been measured before
      for (let i = 0; i < lines.length; i++) {
        await this.__measureTextBoxes(lines[i].getList())
      }

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
        let adjRatio = this._calculateAdjustmentRatio(line.getList(), this.lineWidth)
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
          // item is a box or a LTR text box
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