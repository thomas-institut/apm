// noinspection ES6PreferShortImport

import {LineBreaker} from './LineBreaker.js';
import {InfinitePenalty, MinusInfinitePenalty, Penalty} from '../Penalty.js';
import {Box} from '../Box.js';
import {ItemList} from '../ItemList.js';
import * as TypesetterItemDirection from '../TypesetterItemDirection.js';
import * as MetadataKey from '../MetadataKey.js';
import {Glue} from '../Glue.js';
import {AdjustmentRatio} from '../AdjustmentRatio.js';
import {ItemArray} from '../ItemArray.js';
import {TypesetterItem} from "../TypesetterItem.js";
import {TextBoxMeasurer} from "../TextBoxMeasurer/TextBoxMeasurer.js";
import {BidiOrderInfo} from "../Bidi/BidiOrderInfo.js";

const InfiniteBadness = 100000000;
const FlagPenalty = 500;

const debug = false;

export interface ItemArrayWithBidiOrderInfo {
  itemArray: TypesetterItem[];
  bidiOrderInfoArray: BidiOrderInfo[];
}

export class FirstFitLineBreaker extends LineBreaker {

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {number} lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {BidiOrderInfo[]}bidiOrderInfoArray
   * @return {Promise<ItemList[]>}
   */
  static breakIntoLines(itemArray: TypesetterItem[], lineWidth: number, textBoxMeasurer: TextBoxMeasurer, bidiOrderInfoArray: BidiOrderInfo[]): Promise<ItemList[]> {
    return new Promise(async (resolve) => {
      if (itemArray.length !== bidiOrderInfoArray.length) {
        console.error(`itemArray is not the same length as bidiOrderInfoArray`);
        resolve([]);
        return;
      }
      // save the original array indexes into the items
      itemArray = itemArray.map((item, index) => {
        item.addMetadata(MetadataKey.OriginalArrayIndex, index);
        return item;
      });

      // hyphenate the text boxes


      let lineBreaks = await this.getBreakPoints(itemArray, lineWidth, textBoxMeasurer, bidiOrderInfoArray);
      // add a break at the end if there isn't one
      if (lineBreaks[lineBreaks.length - 1] !== itemArray.length - 1) {
        lineBreaks.push(itemArray.length - 1);
      }
      debug && console.log(`Break points:`);
      debug && console.log(lineBreaks);
      let lines = this.getLinesFromBreakpoints(itemArray, lineBreaks);
      debug && console.log(`Lines:`);
      debug && console.log(lines.map((line) => {
        return {text: line.getText(), data: line.metadata};
      }));
      // final line measurement
      // should be very quick since all possible merged combinations have been measured before
      for (let i = 0; i < lines.length; i++) {
        await ItemArray.measureTextBoxes(lines[i].getList(), textBoxMeasurer);
      }
      resolve(lines);
    });
  }

  /**
   * Determines line break points in an item array using the best-fit algorithm
   * @param {TypesetterItem[]}itemArray
   * @param {number}lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @param {BidiOrderInfo[]}_bidiOrderInfoArray
   * @return {Promise<number[]>}
   * @private
   */
  static getBreakPoints(itemArray: TypesetterItem[], lineWidth: number, textBoxMeasurer: TextBoxMeasurer, _bidiOrderInfoArray: BidiOrderInfo[]): Promise<number[]> {
    return new Promise(async (resolve) => {
      debug && console.log(`Getting break points of a paragraph with ${itemArray.length} items`);
      let breaks = [];
      let currentBadness = InfiniteBadness;
      let currentLine: TypesetterItem[] = [];
      let currentBestBreakPoint = -1;
      let flagsInARow = 0;
      for (let i = 0; i < itemArray.length; i++) {
        let item = itemArray[i];
        if (item instanceof Box) {
          // item is a BOX
          // just add it to current line
          currentLine.push(item);
          continue;
        }
        if (item instanceof Penalty) {
          // item is a PENALTY
          let penaltyValue = item.getPenalty();
          if (penaltyValue === MinusInfinitePenalty) {
            // minus infinite penalty, add a break
            breaks.push(i);
            flagsInARow = 0;
            currentLine = [];
            continue;
          }
          if (currentLine.length !== 0 && penaltyValue < InfinitePenalty) {
            // tentative breaking point
            let breakBadness = await this.calculateHorizontalBadness(currentLine, lineWidth, textBoxMeasurer, item, flagsInARow);
            debug && console.log(`Badness breaking at ${i} is ${breakBadness}`);
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `);
              breaks.push(currentBestBreakPoint);
              flagsInARow = this.getUpdatedFlagsInARow(itemArray[currentBestBreakPoint], flagsInARow);
              currentLine = this.initializeLine(currentBestBreakPoint, i, itemArray);
              currentBadness = InfiniteBadness;
              currentBestBreakPoint = -1;
            } else {
              currentBestBreakPoint = i;
              currentBadness = breakBadness;
            }
          }
          continue;
        }
        if (item instanceof Glue) {
          if (i > 0 && itemArray[i - 1] instanceof Box) {
            // Since the previous item was a box, this is tentative break point
            let breakBadness = await this.calculateHorizontalBadness(currentLine, lineWidth, textBoxMeasurer);
            if (breakBadness > currentBadness) {
              // we found a minimum, eject line
              debug && console.log(`...which is more than current badness (${currentBadness}), so insert a break at ${currentBestBreakPoint} `);
              breaks.push(currentBestBreakPoint);
              flagsInARow = this.getUpdatedFlagsInARow(itemArray[currentBestBreakPoint], flagsInARow);
              currentLine = this.initializeLine(currentBestBreakPoint, i, itemArray);
              currentBadness = InfiniteBadness;
              currentBestBreakPoint = -1;
            } else {
              // debug && console.log(`...which is less or equal than current badness (${currentBadness}), so ${i} is the current best break point `)
              currentBadness = breakBadness;
              currentBestBreakPoint = i;
              currentLine.push(item);
            }
          } else {
            if (currentLine.length !== 0) {
              // add the glue item only if the current is not empty
              currentLine.push(item);
            }
          }
          continue;
        }
        console.warn(`Unknown TypesetterItem, we should NEVER get here!`);
      }
      resolve(breaks);
    });
  }

  /**
   * Increases or reset the given flagsInARow based on the item at a break
   * @param {TypesetterItem}itemAtBreak
   * @param {number}flagsInARow
   * @return {number}
   * @private
   */
  static getUpdatedFlagsInARow(itemAtBreak: TypesetterItem, flagsInARow: number): number {
    if (itemAtBreak instanceof Penalty) {
      if (itemAtBreak.isFlagged()) {
        flagsInARow++;
        debug && console.log(`Break point is a flagged penalty, flags in a row = ${flagsInARow}`);
      }
    } else {
      debug && console.log(`Break point is not a flagged penalty, flag in a row is now 0`);
      flagsInARow = 0;
    }
    return flagsInARow;
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
  static initializeLine(breakPoint: number, currentItemIndex: number, itemArray: TypesetterItem[]): TypesetterItem[] {
    let line = [];

    // Skip initial non-box items
    let j = breakPoint;
    while (j <= currentItemIndex && !(itemArray[j] instanceof Box)) {
      j++;
    }
    // Add the rest
    while (j <= currentItemIndex) {
      line.push(itemArray[j]);
      j++;
    }
    return line;
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
  static calculateHorizontalBadness(itemArray: TypesetterItem[], lineWidth: number, textBoxMeasurer: TextBoxMeasurer, penalty: Penalty | null = null, flagsInARow: number = 0): Promise<number> {
    return new Promise(async (resolve) => {
      let lineItemArray = [...itemArray];
      let penaltyValue = 0;
      if (penalty !== null) {
        penaltyValue = penalty.getPenalty();
        const itemToInsert = penalty.getItemToInsert();
        if (itemToInsert !== null) {
          lineItemArray.push(itemToInsert);
        }
        if (penalty.isFlagged()) {
          penaltyValue += (flagsInARow + 1) * FlagPenalty;
        }
      }
      await ItemArray.measureTextBoxes(lineItemArray, textBoxMeasurer);
      let adjRatio = AdjustmentRatio.calculateHorizontalAdjustmentRatio(lineItemArray, lineWidth);
      if (adjRatio === null) {
        // no glue available to adjust the line. Terrible.
        resolve(InfiniteBadness);
        return;
      }
      if (adjRatio < -1) {
        // No shrinking past the maximum, so any adjustment ratio of -1 or less is infinitely bad
        resolve(InfiniteBadness);
      }
      let badness = 100 * Math.pow(Math.abs(adjRatio), 3);
      resolve(badness > InfiniteBadness ? InfiniteBadness : badness + penaltyValue);
    });
  }

  /**
   * Gets an array of ItemList corresponding to each line from
   * an item array and an array of break points.
   * @param {TypesetterItem[]}itemArray
   * @param {number[]}breakpoints
   * @return {ItemList[]}
   * @private
   */
  static getLinesFromBreakpoints(itemArray: TypesetterItem[], breakpoints: number[]): ItemList[] {
    let lines: ItemList[] = [];
    let lineStartIndex = 0;
    breakpoints.forEach((breakIndex) => {
      let newLine = new ItemList(TypesetterItemDirection.HorizontalItemDirection);
      while (!(itemArray[lineStartIndex] instanceof Box) && lineStartIndex < breakIndex) {
        lineStartIndex++;
      }
      for (let i = lineStartIndex; i < breakIndex; i++) {
        newLine.pushItem(itemArray[i]);
      }
      let breakItem = itemArray[breakIndex];
      if (breakItem instanceof Penalty) {
        const itemToInsert = breakItem.getItemToInsert();
        if (itemToInsert !== null) {
          newLine.pushItem(itemToInsert);
        }
      }
      // filter out penalties
      newLine.setList(newLine.getList().filter((item) => {
        return !(item instanceof Penalty);
      }));
      lines.push(newLine);
      lineStartIndex = breakIndex;
    });
    return lines;
  }
}