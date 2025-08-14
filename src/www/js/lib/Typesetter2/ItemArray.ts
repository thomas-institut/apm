/*
 *  Copyright (C) 2022-23 Universität zu Köln
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

import {TextBox} from './TextBox.js';
import {Penalty} from './Penalty.js';
import {TypesetterItem} from "./TypesetterItem.js";
import {TextBoxMeasurer} from "./TextBoxMeasurer/TextBoxMeasurer.js";

/**
 * Utility functions operating TypesetterItem arrays
 */
export class ItemArray {
  /**
   * Measures the text boxes in the given item array that are not
   * already measured.
   * @param {TypesetterItem[]}itemArray
   * @param {TextBoxMeasurer}textBoxMeasurer
   * @return {Promise<void>}
   */
  static measureTextBoxes(itemArray: TypesetterItem[], textBoxMeasurer: TextBoxMeasurer): Promise<void> {
    return new Promise(async (resolve) => {
      for (let i = 0; i < itemArray.length; i++) {
        let item = itemArray[i];
        if (item instanceof TextBox) {
          if (item.getWidth() === -1) {
            //debug && console.log(`Getting text box width`)
            let measuredWidth = await textBoxMeasurer.getBoxWidth(item);
            item.setWidth(measuredWidth);
          }
          if (item.getHeight() === -1) {
            let measuredHeight = await textBoxMeasurer.getBoxHeight(item);
            item.setHeight(measuredHeight);
          }
        }
        if (item instanceof Penalty) {
          let itemToInsert = item.getItemToInsert();
          if (itemToInsert instanceof TextBox) {
            if (itemToInsert.getWidth() === -1) {
              let measuredWidth = await textBoxMeasurer.getBoxWidth(itemToInsert);
              itemToInsert.setWidth(measuredWidth);
            }
            if (itemToInsert.getHeight() === -1) {
              let measureHeight = await textBoxMeasurer.getBoxHeight(itemToInsert);
              itemToInsert.setHeight(measureHeight);
            }
          }
        }
      }
      resolve();
    });
  }

}