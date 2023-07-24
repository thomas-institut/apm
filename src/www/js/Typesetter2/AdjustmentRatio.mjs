import { Glue } from './Glue.mjs'

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
   * @param {TypesetterItem[]}itemArray
   * @param {number}desiredSize
   * @param {boolean}horizontal
   */
  static calculateAdjustmentRatio(itemArray, desiredSize, horizontal) {
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
      // short array
      let totalGlueStretch = itemArray.map( (item) => {
        if (item instanceof Glue) {
          return item.getStretch()
        }
        return 0
      }).reduce( (total, x) => { return total+x}, 0)
      if (totalGlueStretch <=0) {
        return null
      }
      return (desiredSize - totalSize)/totalGlueStretch
    }
    // long array
    let totalGlueShrink = itemArray.map ( (item) => {
      if (item instanceof Glue) {
        return item.getShrink()
      }
      return 0
    }).reduce( (total, x) => { return total+x}, 0)
    if (totalGlueShrink <=0) {
      return null
    }
    return (desiredSize - totalSize)/totalGlueShrink
  }


  static calculateHorizontalAdjustmentRatio(itemArray, desiredWidth) {
    return this.calculateAdjustmentRatio(itemArray, desiredWidth, true)
  }

  static calculateVerticalAdjustmentRatio(itemArray, desiredHeight) {
    return this.calculateAdjustmentRatio(itemArray, desiredHeight, false)
  }
}