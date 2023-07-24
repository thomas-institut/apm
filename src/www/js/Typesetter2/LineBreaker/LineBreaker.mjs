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
}