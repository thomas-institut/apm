/*
 *  Copyright (C) 2022 Universität zu Köln
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

import { TypesetterItem } from './TypesetterItem'
import * as TypesetterItemDirection from './TypesetterItemDirection'
import { Glue } from './Glue'

export class ItemList extends TypesetterItem {

  constructor (direction = TypesetterItemDirection.HORIZONTAL) {
    super(direction)
    this.list = []
  }

  getList() {
    return this.list
  }

  getItemCount() {
    return this.list.length
  }

  /**
   *
   * @param {TypesetterItem} item
   */
  pushItem(item) {
    this.list.push(item)
  }

  popItem() {
    return this.list.pop()
  }

  getHeight () {
    if (this.height !== -1) {
      return this.height
    }
    if (this.direction === TypesetterItemDirection.VERTICAL) {
      // the sum of the height of all items in the list
      return this.list.reduce( (acc, item) => { return acc + item.getHeight()}, 0)
    }
    // HORIZONTAL list: return the max height
    return this.list.reduce( (acc, item, i) => {
      return Math.max(acc, item.getHeight())
    }, -1)
  }

  getWidth () {
    if (this.width !== -1) {
      return this.width
    }
    if (this.direction === TypesetterItemDirection.HORIZONTAL) {
      // the sum of the width of all items in the list
      return this.list.reduce( (acc, item) => { return acc + item.getWidth()}, 0)
    }
    // VERTICAL list: return the max width
    return this.height.reduce( (acc, item) => { return Math.max(acc, item.getWidth())}, -1)
  }

  setHeight (height) {
    return super.setHeight(height)
  }

  /**
   * Removes glue items from the end of the list
   * returns the number of glue items removed
   */
  trimEndGlue() {
    let numItemsTrimmed = 0
    while (this.list.length > 0 && this.list[this.list.length-1] instanceof Glue) {
      numItemsTrimmed++
      this.list.pop()
    }
    return numItemsTrimmed
  }

}