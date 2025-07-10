import { LineBreaker } from './LineBreaker.mjs'
import { TextBox } from '../TextBox.mjs'
import { INFINITE_PENALTY, MINUS_INFINITE_PENALTY, Penalty } from '../Penalty.mjs'
import { Box } from '../Box.mjs'
import { makeCopyOfArray } from '../../toolbox/ArrayUtil.mjs'
import { ItemList } from '../ItemList.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import * as MetadataKey from '../MetadataKey.mjs'
import { ObjectFactory } from '../ObjectFactory.mjs'
import { Glue } from '../Glue.mjs'
import { AdjustmentRatio } from '../AdjustmentRatio.mjs'
import { ItemArray } from '../ItemArray.mjs'
import { BidiOrderInfoArray } from '../Bidi/BidiOrderInfoArray.mjs'
import { LevelInfo } from '../Bidi/LevelInfo.mjs'
import { BidiOrderInfo } from '../Bidi/BidiOrderInfo.mjs'


const INFINITE_BADNESS = 100000000
const FLAG_PENALTY = 3000

const debug = false

export class FirstFitLineBreaker extends LineBreaker {


  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {number} lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {BidiOrderInfo[]}bidiOrderInfoArray
   * @return {Promise<ItemList[]>}
   */
  static breakIntoLines(itemArray, lineWidth, textBoxMeasurer, bidiOrderInfoArray) {
    return new Promise(async (resolve) => {
      if (itemArray.length !== bidiOrderInfoArray.length) {
        console.error(`itemArray is not the same length as bidiOrderInfoArray`)
        resolve([])
        return
      }

      // save the original array indexes into the items
      itemArray = itemArray.map( (item, index) => {
        item.addMetadata(MetadataKey.ORIGINAL_ARRAY_INDEX, index)
        return item
      })

      let lineBreaks = await this.getBreakPoints(itemArray, lineWidth, textBoxMeasurer, bidiOrderInfoArray)
      // add a break at the end if there isn't one
      if (lineBreaks[lineBreaks.length-1] !== itemArray.length -1) {
        lineBreaks.push(itemArray.length -1)
      }
      debug && console.log(`Break points:`)
      debug && console.log(lineBreaks)
      let lines = this.getLinesFromBreakpoints(itemArray, lineBreaks)
      debug && console.log(`Lines:`)
      debug && console.log(lines.map( (line) => {
        return { text: line.getText(), data: line.metadata}
      }))
      // final line measurement
      // should be very quick since all possible merged combinations have been measured before
      for (let i = 0; i < lines.length; i++) {
        await ItemArray.measureTextBoxes(lines[i].getList(), textBoxMeasurer)
      }
      resolve(lines)
    })
  }

  /**
   * Determines line break points in an item array using the best-fit algorithm
   * @param {TypesetterItem[]}itemArray
   * @param {number}lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {BidiOrderInfo[]}bidiOrderInfoArray
   * @return {Promise<number[]>}
   * @private
   */
  static getBreakPoints(itemArray, lineWidth, textBoxMeasurer, bidiOrderInfoArray) {
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
          // just add it to current line
          currentLine.push(item)
          continue
        }
        if (item instanceof Penalty) {
          // item is a PENALTY
          let penaltyValue = item.getPenalty()
          if (penaltyValue === MINUS_INFINITE_PENALTY) {
            // minus infinite penalty, add a break
            breaks.push(i)
            flagsInARow = 0
            currentLine=[]
            continue
          }
          if (currentLine.length !== 0 && penaltyValue < INFINITE_PENALTY) {
            // tentative breaking point
            let breakBadness = await this.calculateHorizontalBadness(currentLine, lineWidth, textBoxMeasurer, item, flagsInARow)
            debug && console.log(`Badness breaking at ${i} is ${breakBadness}`)
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
              breaks.push(currentBestBreakPoint)
              flagsInARow = this.getUpdatedFlagsInARow(itemArray[currentBestBreakPoint], flagsInARow)
              currentLine = this.initializeLine(currentBestBreakPoint, i, itemArray)
              currentBadness = INFINITE_BADNESS
              currentBestBreakPoint = -1
            } else {
              currentBestBreakPoint = i
              currentBadness = breakBadness
            }
          }
          continue
        }
        if (item instanceof Glue) {
          if (i > 0 && itemArray[i-1] instanceof Box) {
            // Since the previous item was a box, this is tentative break point
            let breakBadness = await this.calculateHorizontalBadness(currentLine, lineWidth, textBoxMeasurer)
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `)
              breaks.push(currentBestBreakPoint)
              flagsInARow = this.getUpdatedFlagsInARow(itemArray[currentBestBreakPoint], flagsInARow)
              currentLine = this.initializeLine(currentBestBreakPoint, i, itemArray)
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
              // add the glue item only if the current is not empty
              currentLine.push(item)
            }
          }
          continue
        }
        console.warn(`Unknown TypesetterItem, we should NEVER get here!`)
      }
      resolve(breaks)
    })
  }

  /**
   * Increases or reset the given flagsInARow based on the item at a break
   * @param {TypesetterItem}itemAtBreak
   * @param {number}flagsInARow
   * @return {number}
   * @private
   */
  static getUpdatedFlagsInARow(itemAtBreak, flagsInARow) {
    if (itemAtBreak instanceof Penalty) {
      if (itemAtBreak.isFlagged()) {
        flagsInARow++
        debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`)
      }
    } else {
      debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`)
      flagsInARow = 0
    }
    return flagsInARow
  }

  /**
   * Initializes a line with the items from the previous break point to
   * the current index, skipping all the non-box items at the start
   * of the range.
   * @param {number}breakPoint
   * @param {number}currentItemIndex
   * @param {TypesetterItem[]}itemArray
   * @return {TypesetterItem[]}
   * @private
   */
  static initializeLine(breakPoint, currentItemIndex, itemArray) {
    let line=[]

    // Skip initial non-box items
    let j = breakPoint
    while (j <= currentItemIndex && !(itemArray[j] instanceof Box) ) {
      j++
    }
    // Add the rest
    while (j <=currentItemIndex) {
      line.push(itemArray[j])
      j++
    }
    return line
  }

  /**
   * Calculates the horizontal badness of an item array based on the given line width
   *
   * (This is where text boxes are measured)
   * @param {TypesetterItem[]}itemArray
   * @param {number}lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {Penalty|null} penalty
   * @param {number} flagsInARow
   * @return {Promise<number>}
   * @private
   */
  static calculateHorizontalBadness(itemArray, lineWidth, textBoxMeasurer, penalty= null, flagsInARow = 0) {
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
      // lineItemArray = this.compactItemArray(lineItemArray)
      await ItemArray.measureTextBoxes(lineItemArray, textBoxMeasurer)
      let adjRatio = AdjustmentRatio.calculateHorizontalAdjustmentRatio(lineItemArray, lineWidth)
      if (adjRatio === null) {
        // no glue available to adjust the line. Terrible.
        resolve(INFINITE_BADNESS)
      }
      if (adjRatio < -1) {
        // No shrinking past the maximum, so any adjustment ratio of -1 or less is infinitely bad
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
  static getLinesFromBreakpoints(itemArray, breakpoints) {
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
      lines.push(newLine)
      lineStartIndex = breakIndex
    })
    return lines
  }


  /**
   * Compacts an item array and its corresponding bidiDisplayOrderArray by performing all possible merges between
   * consecutive items with the same text direction
   * @param {TypesetterItem[]}itemArray
   * @param {BidiOrderInfo[]}bidiOrderInfoArray
   */
  static compactItemArray(itemArray, bidiOrderInfoArray) {
    let spotDebug = false
    // if (itemArray.length === 145) {
    //   spotDebug = true
    // }
    if (itemArray.length === 0) {
      return { itemArray: [], bidiOrderInfoArray: []}
    }
    if (itemArray.length === 1) {
      return { itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray}
    }
    spotDebug && console.log(`Compacting item array`)
    spotDebug && console.log(`Original bidiOrder`)
    spotDebug && console.log(bidiOrderInfoArray)
    let levelInfoArray = BidiOrderInfoArray.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray)
    let defaultTextDirection = BidiOrderInfoArray.detectDefaultTextDirectionFromLevelInfoArray(levelInfoArray, bidiOrderInfoArray)

    spotDebug && console.log(`Default text direction is '${defaultTextDirection}'`)
    let newItemArray = []
    let newBidiOrderInfoArray = []
    let lastIndex = -1
    levelInfoArray.forEach( (levelInfo, index) => {
      spotDebug && console.log(`Processing level info ${index}`)
      spotDebug && console.log(levelInfo)
      let levelItemArray = []
      for (let i = levelInfo.start; i <= levelInfo.end; i++) {
        levelItemArray.push(itemArray[i])
      }
      let compactedLevelRun = this.compactLevelItemArray(levelItemArray)
      spotDebug && console.log(`Original level run has ${levelItemArray.length} items, compacted has ${compactedLevelRun.length}`)
      newItemArray.push(...compactedLevelRun)
      let newLevelStartIndex = lastIndex +1
      let newLevelEndIndex = lastIndex + compactedLevelRun.length

      for (let i = 0; i < compactedLevelRun.length; i++) {
        let newBidiOrderInfo = new BidiOrderInfo()
        newBidiOrderInfo.textDirection = levelInfo.textDirection
        newBidiOrderInfo.inputIndex = newLevelStartIndex+i
        newBidiOrderInfo.embeddingLevel = levelInfo.level
        if (levelInfo.textDirection === defaultTextDirection) {
          newBidiOrderInfo.displayOrder = newLevelStartIndex+i
        } else {
          newBidiOrderInfo.displayOrder = newLevelEndIndex-i
        }
        // note that intrinsicTextDirection is not set in the newBidiOrderInfo object
        // this should not be a problem because that information is not needed for display
        newBidiOrderInfoArray.push(newBidiOrderInfo)
      }
      lastIndex = newLevelEndIndex
    })
    spotDebug && console.log(`New item array`)
    spotDebug && console.log(newItemArray)
    return { itemArray: newItemArray, bidiOrderInfoArray: newBidiOrderInfoArray}
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @return {*}
   */
  static compactLevelItemArray(itemArray) {
    return itemArray.reduce( (currentArray, item) => {
      if (currentArray.length === 0) {
        return [item]
      }
      let lastItem = currentArray.pop()
      let mergedArray = this.mergeItemWithNext(lastItem, item)
      currentArray.push(...mergedArray)
      return currentArray
    }, [])
  }


  /**
   * Tries to merge an item with another item, for example,
   * two text boxes with the same font descriptions.
   *
   * Returns an array of items with 1 item if there was
   * a merge or with 2 item if no merge was possible
   * @param {TypesetterItem}item
   * @param {TypesetterItem}nextItem
   * @return {TypesetterItem[]}
   * @private
   */
  static mergeItemWithNext(item, nextItem) {
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
      newItem.addMetadata(MetadataKey.SOURCE_ITEMS, [
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