import {ItemList} from '../ItemList.js';
import {TypesetterItem} from "../TypesetterItem.js";
import {TextBoxMeasurer} from "../TextBoxMeasurer/TextBoxMeasurer.js";
import {BidiOrderInfo} from "../Bidi/BidiOrderInfo.js";

export class LineBreaker {
  constructor() {
    if (this.constructor === LineBreaker) {
      throw new Error("Abstract classes cannot be instantiated");
    }
  }

  /**
   *
   * @param {TypesetterItem[]}itemArray
   * @param _lineWidth
   * @param _textBoxMeasurer
   * @param _bidiOrderInfoArray
   * @return {Promise<ItemList[]>}
   */
  static breakIntoLines(itemArray: TypesetterItem[], _lineWidth: number, _textBoxMeasurer: TextBoxMeasurer, _bidiOrderInfoArray: BidiOrderInfo[]): Promise<ItemList[]> {
    // do nothing
    let theList = new ItemList();
    theList.setList(itemArray);
    return Promise.resolve([theList]);
  }
}