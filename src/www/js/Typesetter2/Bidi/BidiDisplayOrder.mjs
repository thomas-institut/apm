/*
 *  Copyright (C) 2023 Universität zu Köln
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

import { BidiOrderInfo} from './BidiOrderInfo.mjs'
import { LevelInfo} from './LevelInfo.mjs'

export class BidiDisplayOrder {

  /**
   * Returns an array that represents the display order and text direction of the given items:
   *
   *   [
   *    { inputIndex: xx, textDirection:  'rtl' | 'ltr' },
   *    { inputIndex: yy, textDirection: 'rtl'| 'ltr },
   *    ...
   *   ]
   *
   *
   * An item is meant to represent a string that can be displayed in either RTL or LTR direction.
   * The algorithm needs a function that determines the item's intrinsic text direction, which can be
   * neutral (for example, for whitespace, some punctuation and numbers).
   *
   * getItemIntrinsicTextDirection(item[i]) must return one of:
   *   'en' : European numbers  (also for numerical strings such as '1.9' or '1,923,234.25')
   *   'rtl' :  right to left text
   *   'ltr' :  left to right text
   *   '' : neutral text (e.g., whitespace and punctuation)
   *
   * The algorithm returns the text direction that must be used to display the item assuming
   * that the display mechanism will follow standard rules for display of bidirectional text within the item.
   * For example, the string '123,'  should be displayed as LTR 123, or RTL ,123 depending on the text surrounding
   * it.  If the algorithm returns 'rtl' as its text direction, it's up to the display
   * mechanism to determine that '123,' should look ",123" which is not a simple inversion of the string's characters.
   * However, in cases like this, where there is punctuation mixed with numbers, it is more accurate overall to pass
   * the numbers and the punctuation as separate items.
   *
   * @param items
   * @param {string}defaultTextDirection 'ltr' or 'rtl'
   * @param { function}getItemIntrinsicTextDirection  a function that returns 'ltr', 'rtl' or '' (neutral direction) for the g
   * @return {BidiOrderInfo[]}
   */
  static getDisplayOrder (items, defaultTextDirection, getItemIntrinsicTextDirection) {

    if (items.length === 0) {
      return []
    }
    if (defaultTextDirection !== 'ltr' && defaultTextDirection !== 'rtl') {
      console.warn(`Wrong defaultTextDirection '${defaultTextDirection}'`)
      console.warn(`Detecting default text direction`)
      let detectedTextDirection = ''
      for (let i = 0; i < items.length; i++) {
        let itd = getItemIntrinsicTextDirection(items[i])
        if (itd === 'ltr' || itd === 'rtl') {
          detectedTextDirection = itd
          break
        }
      }
      if (detectedTextDirection === '') {
        console.warn(`Cannot detect text direction`)
        return []
      }
      console.warn(`Setting text direction to ${detectedTextDirection}`)
      defaultTextDirection = detectedTextDirection
    }
    // Loosely based on the Unicode Bidirectional Algorithm
    // 1. Determine embedding levels
    let bidiOrderInfoArray = []
    let defaultLevel = defaultTextDirection === 'ltr' ? 0 : 1
    let currentLevel = defaultLevel
    let currentTextDirection = defaultTextDirection

    items.forEach((item, index) => {
      let bidiOrderInfo = new BidiOrderInfo()
      bidiOrderInfo.inputIndex = index
      bidiOrderInfo.intrinsicTextDirection = getItemIntrinsicTextDirection(item)
      let levelChange = false
      if (bidiOrderInfo.intrinsicTextDirection === 'rtl' && currentTextDirection === 'ltr') {
        currentLevel = 1
        currentTextDirection = 'rtl'
      } else {
        if (bidiOrderInfo.intrinsicTextDirection === 'ltr' && currentTextDirection === 'rtl') {
          currentLevel = 0
          currentTextDirection = 'ltr'
        }
      }
      bidiOrderInfo.embeddingLevel = currentLevel
      bidiOrderInfoArray.push(bidiOrderInfo)
    })
    let levelInfoArray = this.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray)
    // Move all neutrals at the end of non-default levels to the default
    // I.e, non-default levels should only contain strong directional text and numbers
    levelInfoArray.forEach((levelInfo) => {
      if (levelInfo.level !== defaultLevel) {
        for (let i = levelInfo.end; i >= levelInfo.start; i--) {
          if (bidiOrderInfoArray[i].intrinsicTextDirection === '') {
            bidiOrderInfoArray[i].embeddingLevel = defaultLevel
          } else {
            break
          }
        }
      }
    })
    // set final text direction
    levelInfoArray = this.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray)
    levelInfoArray.forEach( (levelInfo) => {
      for (let i = levelInfo.start; i <= levelInfo.end; i++) {
        // TODO: all even levels are ltr, right?
        bidiOrderInfoArray[i].textDirection = levelInfo.level === 0 ? 'ltr' : 'rtl'
      }
    })
    // get the items per level, reversing the ones in the reverse direction of the defaultTextDirection
    let levelRuns = []
    levelInfoArray.forEach( (levelInfo) => {
      let levelRun = []
      if ((defaultTextDirection === 'ltr' && levelInfo.level === 0) || (defaultTextDirection === 'rtl' && levelInfo.level === 1)) {
        for (let i = levelInfo.start; i <= levelInfo.end; i++) {
          levelRun.push(bidiOrderInfoArray[i])
        }
      } else {
        for (let i = levelInfo.end; i >= levelInfo.start; i--) {
          levelRun.push(bidiOrderInfoArray[i])
        }
      }
      levelRuns.push(levelRun)
    })

    // build return array
    let returnArray = []
    levelRuns.forEach( (levelRun) => {
      returnArray.push(...levelRun)
    })
    returnArray = returnArray.map( (itemInfo, index) => {
      itemInfo.displayOrder = index
      return itemInfo
    })
    return returnArray
  }

  /**
   * Returns an array with information about the starting and ending indexes for
   * the different embedding levels in the given itemDataArray
   * @param {BidiOrderInfo[]}itemDataArray
   * @return {LevelInfo[]}
   * @private
   */
  static getLevelInfoFromBidiOrderInfoArray(itemDataArray) {
    let levelInfoArray = []
    if (itemDataArray.length === 0) {
      return []
    }
    let currentLevel = itemDataArray[0].embeddingLevel
    let levelInfo = new LevelInfo(currentLevel, 0, -1)
    itemDataArray.forEach((itemData, index) => {
      if (itemData.embeddingLevel !== currentLevel) {
        levelInfo.end = index-1
        levelInfoArray.push(levelInfo)
        currentLevel = itemData.embeddingLevel
        levelInfo = new LevelInfo(currentLevel, index, -1)
      }
    })
    levelInfo.end = itemDataArray.length -1
    levelInfoArray.push(levelInfo)
    return levelInfoArray
  }
}





