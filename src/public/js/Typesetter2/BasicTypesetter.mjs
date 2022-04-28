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

const signature = 'BasicTypesetter 0.1'

const INFINITE_BADNESS = 100000000

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

  _calculateBadnessForPenalty(itemArray, penalty) {
    return this._calculateAdjustmentRatio(itemArray, this.lineWidth)+penalty
  }

  _calculateBadness(itemArray) {
    let adjRatio = this._calculateAdjustmentRatio(itemArray, this.lineWidth)
    if (adjRatio === null || adjRatio < -1) {
      return INFINITE_BADNESS
    }
    let badness = 100*Math.pow( Math.abs(adjRatio), 3)
    return badness > INFINITE_BADNESS ? INFINITE_BADNESS : badness
  }

  /**
   * Determines line break points in an item array
   * using the best-fit algorithm
   * @param {TypesetterItem[]}itemArray
   * @return {number[]}
   * @private
   */
  _getBreakPoints(itemArray) {
    this.debug && console.log(`Getting break points of a paragraph with ${itemArray.length} items`)
    let breaks = []
    let currentBadness = INFINITE_BADNESS
    let currentLine = []
    let currentBestBreakPoint = -1
    itemArray.forEach( (item, i) => {
      if (item instanceof Box) {
        // this.debug && console.log(`Item ${i} is a Box, pushing it`)
        currentLine.push(item)
        return
      }
      if (item instanceof Penalty) {
        // this.debug && console.log(`Item ${i} is a Penalty`)
        let itemPenalty = item.getPenalty()
        if (itemPenalty === MINUS_INFINITE_PENALTY) {
          breaks.push(i)
          currentLine=[]
          return
        }
        if (currentLine.length !== 0 && itemPenalty < INFINITE_PENALTY) {
          // tentative breaking point
          let breakBadness = this._calculateBadnessForPenalty(currentLine, itemPenalty)
          if (breakBadness > currentBadness) {
            // we found a minimum, eject line
            breaks.push(i)
            currentLine=[]
          } else {
            currentBadness = breakBadness
          }
        }
      }
      // this.debug && console.log(`Item ${i} is Glue`)
      // item is glue
      if (itemArray[i-1] instanceof Box) {
        // this.debug && console.log(`Previous item was a Box, so this is a tentative break point`)
        // tentative break point
        let breakBadness = this._calculateBadness(currentLine)
        this.debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)

        if (breakBadness > currentBadness) {
          // we found a minimum, eject line
          this.debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
          breaks.push(currentBestBreakPoint)
          currentLine=[]
          // this.debug && console.log(`Initializing next line`)
          let j = currentBestBreakPoint
          while (j <= i && !itemArray[j] instanceof Box ) {
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
    })
    return breaks
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
      // first, measure all text boxes
      let itemArray = inputList.getList()
      for (let i = 0; i < itemArray.length; i++) {
        if (itemArray[i] instanceof  TextBox) {
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
      }

      let lineBreaks = this._getBreakPoints(itemArray)
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