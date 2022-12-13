import { LineBreaker } from './LineBreaker.mjs'
import { TextBox } from '../TextBox.mjs'
import { INFINITE_PENALTY, MINUS_INFINITE_PENALTY, Penalty } from '../Penalty.mjs'
import { Box } from '../Box.mjs'
import { makeCopyOfArray } from '../../toolbox/ArrayUtil.mjs'
import { ItemList } from '../ItemList.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import * as MetadataKey from '../MetadataKey.mjs'
import { ObjectFactory } from '../ObjectFactory.mjs'


const INFINITE_BADNESS = 100000000
const FLAG_PENALTY = 3000

const debug = false

export class FirstFitLineBreaker extends LineBreaker {

  static breakIntoLines(itemArray, lineWidth, textBoxMeasurer) {
    return new Promise(async (resolve) => {
      let lineBreaks = await this._getBreakPoints(itemArray, lineWidth, textBoxMeasurer)
      // add a break at the end if there isn't one
      if (lineBreaks[lineBreaks.length-1] !== itemArray.length -1) {
        lineBreaks.push(itemArray.length -1)
      }
      debug && console.log(`Break points:`)
      debug && console.log(lineBreaks)
      let lines = this._getLinesFromBreakpoints(itemArray, lineBreaks)
      debug && console.log(`Lines:`)
      debug && console.log(lines.map( (line) => {
        return { text: line.getText(), data: line.metadata}
      }))
      // final line measurement
      // should be very quick since all possible merged combinations have been measured before
      for (let i = 0; i < lines.length; i++) {
        await this._measureTextBoxes(lines[i].getList(), textBoxMeasurer)
      }
      resolve(lines)
    })
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @return {Promise<void>}
   * @private
   */
  static _measureTextBoxes(itemArray, textBoxMeasurer) {
    return new Promise ( async (resolve) => {
      for (let i = 0; i < itemArray.length; i++) {
        let item = itemArray[i]
        if (item instanceof TextBox) {
          if (item.getWidth() === -1) {
            //debug && console.log(`Getting text box width`)
            let measuredWidth = await textBoxMeasurer.getBoxWidth(item)
            item.setWidth(measuredWidth)
          }
          if (itemArray[i].getHeight() === -1) {
            let measuredHeight = await textBoxMeasurer.getBoxHeight(item)
            itemArray[i].setHeight(measuredHeight)
          }
        }
        if (itemArray[i] instanceof Penalty) {
          if (itemArray[i].hasItemToInsert() && itemArray[i].getItemToInsert() instanceof TextBox) {
            let item = itemArray[i].getItemToInsert()
            if (item.getWidth() === -1){
              let measuredWidth = await textBoxMeasurer.getBoxWidth(item)
              item.setWidth(measuredWidth)
            }
            if (item.getHeight() === -1){
              let measureHeight = await textBoxMeasurer.getBoxHeight(item)
              item.setHeight(measureHeight)
            }
          }
        }
      }
      resolve()
    })
  }


  /**
   * Determines line break points in an item array using the best-fit algorithm
   * @param {TypesetterItem[]}itemArray
   * @param {number}lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @return {Promise<number[]>}
   * @private
   */
  static _getBreakPoints(itemArray, lineWidth, textBoxMeasurer) {
    return new Promise( async (resolve) => {
      debug && console.log(`Getting break points of a paragraph with ${itemArray.length} items`)
      let breaks = []
      let currentBadness = INFINITE_BADNESS
      let currentLine = []
      let currentBestBreakPoint = -1
      let flagsInARow = 0
      for(let i =0; i < itemArray.length; i++) {
        let item = itemArray[i]
        if (item instanceof Box) {
          // item is a BOX
          // debug && console.log(`Item ${i} is a Box, pushing it`)
          currentLine.push(item)
          continue
        }
        if (item instanceof Penalty) {
          // item is a PENALTY
          debug && console.log(`Item ${i} is a Penalty`)
          let penaltyValue = item.getPenalty()
          if (penaltyValue === MINUS_INFINITE_PENALTY) {
            debug && console.log(`Infinite penalty, so add a break at ${i}`)
            breaks.push(i)
            flagsInARow = 0
            currentLine=[]
            continue
          }
          if (currentLine.length !== 0 && penaltyValue < INFINITE_PENALTY) {
            // tentative breaking point
            let breakBadness = await this._calculateBadness(currentLine, lineWidth, textBoxMeasurer, item, flagsInARow)
            debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
              breaks.push(currentBestBreakPoint)
              let itemAtBreak = itemArray[currentBestBreakPoint]
              if (itemAtBreak instanceof Penalty) {
                if (itemAtBreak.isFlagged()) {
                  flagsInARow++
                  debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`)
                }
              } else {
                debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`)
                flagsInARow = 0
              }
              currentLine=[]
              // debug && console.log(`Initializing next line`)
              let j = currentBestBreakPoint
              while (j <= i && !(itemArray[j] instanceof Box) ) {
                // debug && console.log(`... skipping item ${j}, not a box`)
                j++
              }
              while (j <=i) {
                // debug && console.log(`...adding item ${j}`)
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
        // debug && console.log(`Item ${i} is Glue`)
        // item is GLUE
        if (itemArray[i-1] instanceof Box) {
          // debug && console.log(`Previous item was a Box, so this is a tentative break point`)
          // tentative break point
          let breakBadness = await this._calculateBadness(currentLine, lineWidth, textBoxMeasurer)
          // debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)

          if (breakBadness > currentBadness) {
            // we found a minimum, eject line
            debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
            breaks.push(currentBestBreakPoint)
            let itemAtBreak = itemArray[currentBestBreakPoint]
            if (itemAtBreak instanceof Penalty) {
              if (itemAtBreak.isFlagged()) {
                flagsInARow++
                debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`)
              }
            } else {
              debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`)
              flagsInARow = 0
            }
            currentLine=[]
            // debug && console.log(`Initializing next line`)
            let j = currentBestBreakPoint
            while (j <= i && !(itemArray[j] instanceof Box) ) {
              // debug && console.log(`... skipping item ${j}, not a box`)
              j++
            }
            while (j <=i) {
              // debug && console.log(`...adding item ${j}`)
              currentLine.push(itemArray[j])
              j++
            }

            currentBadness = INFINITE_BADNESS
            currentBestBreakPoint = -1
          } else {
            // debug && console.log(`...which is less or equal than current badness (${currentBadness}), so ${i} is the current best break point `)
            currentBadness = breakBadness
            currentBestBreakPoint = i
            currentLine.push(item)
          }
        } else {
          if (currentLine.length !== 0) {
            // debug && console.log(`Pushing it to currentLine`)
            currentLine.push(item)
          }
        }
      }
      resolve(breaks)
    })
  }


  /**
   * Calculates the badness of an item array based on a lineWidth of the given line width
   * (This is where text boxes are measured)
   * @param {TypesetterItem[]}itemArray
   * @param {number}lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {Penalty|null} penalty
   * @param {number} flagsInARow
   * @return {Promise<number>}
   * @private
   */
  static _calculateBadness(itemArray, lineWidth, textBoxMeasurer, penalty= null, flagsInARow = 0) {
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
      await this._measureTextBoxes(lineItemArray, textBoxMeasurer)
      // if (debug) {
      //   let tmpList = (new ItemList()).setList(lineItemArray)
      //   // console.log(`Calculating badness of line '${tmpList.getText()}'`)
      // }
      let adjRatio = LineBreaker.calculateAdjustmentRatio(lineItemArray, lineWidth)
      if (adjRatio === null || adjRatio < -1) {
        resolve(INFINITE_BADNESS)
      }
      let badness = 100*Math.pow( Math.abs(adjRatio), 3)
      resolve(badness > INFINITE_BADNESS ? INFINITE_BADNESS : badness + penaltyValue)
    })
  }



  /**
   * Gets an array of ItemList corresponding to each line from
   * an item array and an array of break points.
   * @param {TypesetterItem[]}itemArray
   * @param {number[]}breakpoints
   * @return {ItemList[]}
   * @private
   */
  static _getLinesFromBreakpoints(itemArray, breakpoints) {
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
      // Compact the line (i.e., merge consecutive text boxes with the format, and consecutive glue
      newLine.setList(this.__compactItemArray(newLine.getList()))
      lines.push(newLine)
      lineStartIndex = breakIndex
    })
    return lines
  }


  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @private
   */
  static __compactItemArray(itemArray) {
    //debug && console.log(`Compacting line`)
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
   * Tries to merge an item with another item
   * E.g. two text boxes with the same font descriptions
   * Returns an array of items with 1 item if there was
   * a merge or with 2 item if no merge was possible
   * @param {TypesetterItem}item
   * @param {TypesetterItem}nextItem
   * @return {TypesetterItem[]}
   * @private
   */
  static __mergeItemWithNext(item, nextItem) {
    if (item.constructor.name !== nextItem.constructor.name) {
      // no merge possible between two items of different class
      //debug && console.log(`Cannot merge ${item.constructor.name} with ${nextItem.constructor.name}`)
      return [ item, nextItem]
    }
    // merging only text boxes for now
    if (item instanceof TextBox && nextItem instanceof TextBox) {
      // debug && console.log(`Trying to merge two text boxes: '${item.getText()}' + '${nextItem.getText()}'`)
      if (item.getFontFamily() !== nextItem.getFontFamily()) {
        // debug && console.log(`... not the same font family: '${item.getFontFamily()}' !== '${nextItem.getFontFamily()}'`)
        return [item, nextItem]
      }
      if (item.getFontSize() !== nextItem.getFontSize()) {
        // debug && console.log(`... not the same font size`)
        return [item, nextItem]
      }
      if (item.getFontWeight() !== nextItem.getFontWeight()) {
        // debug && console.log(`... not the same font weight`)
        return [item, nextItem]
      }
      if (item.getFontStyle() !== nextItem.getFontStyle()) {
        // debug && console.log(`... not the same font style`)
        return [item, nextItem]
      }
      if (item.getTextDirection() !== nextItem.getTextDirection()) {
        debug && console.log(`... not the same text direction`)
        return [item, nextItem]
      }
      // debug && console.log(`...font specs are equal, merging`)
      // creating a new object so that the original object is not changed
      let newItem = ObjectFactory.fromObject(item.getExportObject())

      newItem.addMetadata(MetadataKey.MERGED_ITEM, true)
      newItem.setTextDirection(item.getTextDirection())
      newItem.setText(item.getText() + nextItem.getText())
      // Save source items in metadata:
      // Note that this will create a deep tree of source items when more
      // than two items end up being merged. When a source, unmerged item
      // is merged with merged item, the resulting MetadataKey.SOURCE_ITEMS_EXPORT metadata
      // will still be an array of two objects, the first one will
      // in turn have an array of two objects in its MetadataKey.SOURCE_ITEMS_EXPORT metadata
      newItem.addMetadata(MetadataKey.SOURCE_ITEMS_EXPORT, [
          item.getExportObject(),
          nextItem.getExportObject()
        ])
      // }
      // console.log(`New merged item`)
      // console.log(newItem)
      return [ newItem ]
    }
    // other than text boxes
    return [item, nextItem]
  }

}