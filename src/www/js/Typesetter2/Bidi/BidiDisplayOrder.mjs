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
import { BidiOrderInfoArray } from './BidiOrderInfoArray.mjs'

export class BidiDisplayOrder {

  /**
   * Returns an array of BidiOrderInfo objects with information each input item's display order taking
   * into account bidirectional text.
   *
   * This is a partial implementation of the Unicode Bidirectional Algorithm. It does not recognize
   * explicit embedding and direction-change characters.
   *
   * The input to the algorithm is an array of textual items that are meant to represent a single paragraph of text
   * in logical order. The type of the items is irrelevant because the algorithm does not use their actual content.
   * The algorithm only cares about each item's intrinsic text direction. So, it needs a function
   * getItemIntrinsicTextDirection(item[i]) that determines that information. When called on a single item, the
   * function must return one of:
   *   'en' : European numbers  (also for numerical strings such as '1.9' or '1,923,234.25')
   *   'rtl' :  right to left text
   *   'ltr' :  left to right text
   *   '' : neutral text (e.g., whitespace and punctuation)
   *
   * The algorithm also needs a default text direction for the paragraph ('ltr' or 'rtl'). If none is given
   * it will the direction of the non-neutral, non-numeric item in the array.
   *
   * The algorithm returns the text direction that must be used to display the item assuming
   * that the display mechanism will follow standard rules for display of bidirectional text within the item.
   * However, the algorithm will be accurate only if each input item has only one intrinsic text direction.
   * For example, input items with numbers and punctuation (e.g., '123.') may cause the algorithm to incorrectly
   * place the period.
   *
   * @param {[]}items
   * @param {string}defaultTextDirection
   * @param { function}getItemIntrinsicTextDirection
   * @return {BidiOrderInfo[]}
   */
  static getDisplayOrder (items, defaultTextDirection, getItemIntrinsicTextDirection) {

    if (items.length === 0) {
      return []
    }
    if (defaultTextDirection !== 'ltr' && defaultTextDirection !== 'rtl') {
      // console.warn(`Wrong defaultTextDirection '${defaultTextDirection}'`)
      // console.warn(`Detecting default text direction`)
      let detectedTextDirection = ''
      for (let i = 0; i < items.length; i++) {
        let itd = getItemIntrinsicTextDirection(items[i])
        if (itd === 'ltr' || itd === 'rtl') {
          detectedTextDirection = itd
          break
        }
      }
      if (detectedTextDirection === '') {
        // console.warn(`Cannot detect text direction`)
        return []
      }
      // console.warn(`Setting text direction to ${detectedTextDirection}`)
      defaultTextDirection = detectedTextDirection
    }

    // 1. Determine embedding levels
    let bidiOrderInfoArray = []
    let defaultLevel = defaultTextDirection === 'ltr' ? 0 : 1
    let currentLevel = defaultLevel
    let currentTextDirection = defaultTextDirection

    items.forEach((item, index) => {
      let bidiOrderInfo = new BidiOrderInfo()
      bidiOrderInfo.inputIndex = index
      bidiOrderInfo.intrinsicTextDirection = getItemIntrinsicTextDirection(item)
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
    let levelInfoArray = BidiOrderInfoArray.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray)
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
    levelInfoArray = BidiOrderInfoArray.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray)
    levelInfoArray.forEach( (levelInfo) => {
      for (let i = levelInfo.start; i <= levelInfo.end; i++) {
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

}





