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

/**
 * An ItemList is a list of typesetter items
 * that normally have a given direction (horizontal or vertical)
 *
 */

import { TypesetterItem } from './TypesetterItem.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { Glue } from './Glue.mjs'
import { ObjectFactory } from './ObjectFactory.mjs'
import { TextBox } from './TextBox.mjs'
import { Box } from './Box.mjs'
import { Penalty } from './Penalty.mjs'
import * as MetadataKey from './MetadataKey.mjs'

export class ItemList extends TypesetterItem {

  constructor (direction = TypesetterItemDirection.HORIZONTAL) {
    super(direction)
    this.list = []
  }

  /**
   *
   * @return {TypesetterItem[]}
   */
  getList() {
    return this.list
  }

  /**
   *
   * @param {TypesetterItem[]}newList
   * @returns {ItemList}
   */
  setList(newList) {
    this.list = newList
    return this
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

  /**
   *
   * @param {TypesetterItem[]}itemArray
   */
  pushItemArray(itemArray) {
    itemArray.forEach( (item) => {
      this.pushItem(item)
    })
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
    return this.list.reduce( (acc, item) => { return Math.max(acc, item.getWidth())}, -1)
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

  getText() {

    let textArray = this.getList().map( (item) => {
      if (item instanceof  Glue) {
        return ' '
      }
      if (item instanceof TextBox) {
        return item.getText()
      }
      if (item instanceof Box) {
        return `{B:${item.getWidth()}x${item.getHeight()}}`
      }
      if (item instanceof Penalty) {
        return `{P:${item.getPenalty()}}`
      }
      return ''
    })
    if (this.hasMetadata(MetadataKey.HAS_REVERSE_TEXT) && this.getMetadata(MetadataKey.HAS_REVERSE_TEXT) === true) {
      // TODO: properly implement this!!!
      let originalIndexes = this.getList().map( (item) => {
        return item.getMetadata(MetadataKey.ORIGINAL_ARRAY_INDEX)
      })

    }

    return textArray.join('')
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'ItemList'
    obj.list = this.list.map( (item) => { return item.getExportObject()})
    return obj
  }

  setFromObject (object, mergeValues) {
    super.setFromObject(object, mergeValues)
    if (object['list'] !== undefined && Array.isArray(object['list'])) {
      this.list = []
      object['list'].forEach( (itemObject, i) => {
        let newItem = ObjectFactory.fromObject(itemObject)
        if (newItem instanceof TypesetterItem) {
          this.pushItem(newItem)
        } else {
          console.error(`Non typesetter item found at index ${i} in input object's list field`)
          console.log(itemObject)
          throw new Error('Non typesetter item found trying to set from Object')
        }
      })
    }
    return this
  }

}