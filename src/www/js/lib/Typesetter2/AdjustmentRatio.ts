import { Glue } from './Glue.js'
import {TypesetterItem} from "./TypesetterItem.js";

export class AdjustmentRatio {

  /**
   * Calculates the adjustment ratio for the given item array and
   * desired size in either horizontal or vertical mode.
   *
   * The absolute value of the adjustment ratio is the factor by
   * which the total shrink or stretch in the item array's glue items
   * needs to be multiplied in order to get the desired size
   *
   * If the item array needs to be stretched, the adjustment ratio will be
   * positive. If the item array needs to be shrunk, the adjustment ratio
   * will be negative.
   *
   * If there's not enough glue in the item array to do the required stretching
   * or shrinking, the adjustment ratio will be null.
   *
   */
  static calculateAdjustmentRatio(itemArray: TypesetterItem[], desiredSize: number, horizontal: boolean): number | null {
    let totalSize
    if (horizontal) {
      totalSize = itemArray.map( (item) => {
        return item.getWidth()
      }).reduce( (total, x) => { return total+x}, 0)
    } else {
      totalSize = itemArray.map( (item) => {
        return item.getHeight()
      }).reduce( (total, x) => { return total+x}, 0)
    }
    if (desiredSize === totalSize) {
      // right on the money!
      return 0
    }
    if (totalSize < desiredSize) {
      // short item array
      let totalGlueStretch = itemArray.map( (item) => {
        if (item instanceof Glue) {
          return item.getStretch()
        }
        return 0
      }).reduce( (total, x) => { return total+x}, 0);
      if (totalGlueStretch <=0) {
        return null
      }
      // stretching can be extreme if necessary, so it does not really matter if adjRatio > 1
      return (desiredSize - totalSize) / totalGlueStretch;
    }
    // long item array
    let totalGlueShrink = itemArray.map ( (item) => {
      if (item instanceof Glue) {
        return item.getShrink()
      }
      return 0
    }).reduce( (total, x) => { return total+x}, 0)
    if (totalGlueShrink <=0) {
      return null
    }
    let r = (desiredSize - totalSize) / totalGlueShrink;
    // if adjRatio < -1, there's not enough shrink to fit the items, so, return null;
    return r < -1 ? null : r;
  }



  static calculateHorizontalAdjustmentRatio(itemArray: TypesetterItem[], desiredWidth: number): number | null {
    return this.calculateAdjustmentRatio(itemArray, desiredWidth, true)
  }

  static calculateVerticalAdjustmentRatio(itemArray: TypesetterItem[], desiredHeight: number): number | null {
    return this.calculateAdjustmentRatio(itemArray, desiredHeight, false)
  }
}