import { LevelInfo } from './LevelInfo.js'
import {BidiOrderInfo} from "./BidiOrderInfo.js";

export class BidiOrderInfoArray {

  /**
   * Returns true if all the items represented
   * in the given array have the same direction
   * If the array is empty, returns false.
   * @param {BidiOrderInfo[]}boiArray
   * @return {boolean}
   */
  static isSingleDirection(boiArray: BidiOrderInfo[]): boolean {
    if (boiArray.length === 0) {
      return false
    }
    if (boiArray.length === 1) {
      return true
    }
    let lastDirection = boiArray[0].textDirection
    for (let i = 1; i < boiArray.length; i++) {
      if (boiArray[i].textDirection !== lastDirection) {
        return false
      }
    }
    return true
  }

  /**
   * Returns an array with information about the starting and ending indexes for
   * the different embedding levels in the given itemDataArray
   * @param {BidiOrderInfo[]}itemDataArray
   * @return {LevelInfo[]}
   */
  static getLevelInfoFromBidiOrderInfoArray(itemDataArray: BidiOrderInfo[]): LevelInfo[] {
    let levelInfoArray = []
    if (itemDataArray.length === 0) {
      return []
    }
    let currentLevel = itemDataArray[0].embeddingLevel

    let levelInfo: LevelInfo = {
      level: currentLevel,
      start: 0,
      end: -1,
      textDirection: itemDataArray[0].textDirection,
    }

    itemDataArray.forEach((itemData, index) => {
      if (itemData.embeddingLevel !== currentLevel) {
        levelInfo.end = index-1
        levelInfoArray.push(levelInfo)
        currentLevel = itemData.embeddingLevel
        levelInfo = {
          level: currentLevel,
          start: index,
          end: -1,
          textDirection: itemData.textDirection,
        }
      }
    })
    levelInfo.end = itemDataArray.length -1
    levelInfoArray.push(levelInfo)
    return levelInfoArray
  }

  /**
   * Detects the default text direction in the given array.
   * If the array is empty, returns '', otherwise
   * returns 'ltr' or 'rtl'
   * @param {BidiOrderInfo[]}boiArray
   * @return {string}
   */
  static detectDefaultTextDirection(boiArray: BidiOrderInfo[]): string {
    if (boiArray.length === 0) {
      return ''
    }
    if (boiArray.length === 1) {
      return boiArray[0].textDirection
    }
    // TODO: optimize this. Right now I'm using the "logical" way
    //  but it can be done much faster by traversing the boiArray directly, without
    //  calculating the levelInfoArray first
    let levelInfoArray = this.getLevelInfoFromBidiOrderInfoArray(boiArray)
    return this.detectDefaultTextDirectionFromLevelInfoArray(levelInfoArray, boiArray)
  }

  /**
   *
   * @param {LevelInfo[]}levelInfoArray
   * @param {BidiOrderInfo[]}boiArray
   */
  static detectDefaultTextDirectionFromLevelInfoArray(levelInfoArray: LevelInfo[], boiArray: BidiOrderInfo[]) {
    if (boiArray.length === 0) {
      return ''
    }
    if (boiArray.length === 1) {
      return boiArray[0].textDirection
    }
    // find a level with two or more items
    let levelWithTwoOrMoreItems = null
    for (let i = 0; i < levelInfoArray.length; i++) {
      let levelInfo = levelInfoArray[i]
      if (levelInfo.start !== levelInfo.end) {
        levelWithTwoOrMoreItems = levelInfo
        break
      }
    }
    if (levelWithTwoOrMoreItems === null) {
      // all levels only have 1 item!
      // default to the text direction of the first item
      return boiArray[0].textDirection
    }

    let startItem = levelWithTwoOrMoreItems.start
    let endItem = levelWithTwoOrMoreItems.end

    if (boiArray[startItem].displayOrder < boiArray[endItem].displayOrder) {
      // the level has the default text order
      return levelWithTwoOrMoreItems.textDirection
    }
    // the level has the non-default text order
    return levelWithTwoOrMoreItems.textDirection === 'ltr' ? 'rtl' : 'ltr'
  }
}