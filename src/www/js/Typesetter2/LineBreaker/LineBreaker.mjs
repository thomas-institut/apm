import { resolvedPromise } from '../../toolbox/FunctionUtil.mjs'
import { Glue } from '../Glue.mjs'
import { ItemList } from '../ItemList.mjs'

export class LineBreaker {
  constructor () {
    if (this.constructor === LineBreaker) {
      throw new Error("Abstract classes cannot be instantiated")
    }
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {number} lineWidth
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @return {Promise<ItemList[]>}
   */
  static breakIntoLines(itemArray, lineWidth, textBoxMeasurer) {
    // do nothing
    let theList = new ItemList()
    theList.setList(itemArray)
    return resolvedPromise([ theList])
  }


  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param {number}desiredLineWidth
   */
  static calculateAdjustmentRatio(itemArray, desiredLineWidth) {
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


}