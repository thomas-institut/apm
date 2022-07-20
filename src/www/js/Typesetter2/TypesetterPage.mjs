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

import { TypesetterObject } from './TypesetterObject.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { ObjectFactory } from './ObjectFactory.mjs'
import { TypesetterItem } from './TypesetterItem.mjs'

/**
 * A typesetter page is a 2D surface of a certain width and height, an array of TypesetterItem to be rendered in the page, and some metadata
 *
 * Renderers reset their current position to (0, 0) before processing each item,
 * so each must have proper values for width, height,
 * shiftX and shiftY so that they are rendered in the right places.
 *
 * TODO: consider turning TypesetterPage into an extension of ItemList since it
  * is essentially just a list of items with width and height
 */
export class TypesetterPage extends TypesetterObject {

  /**
   *
   * @param {number}pageWidth
   * @param {number}pageHeight
   * @param {TypesetterItem[]}items
   */
  constructor (pageWidth=0, pageHeight=0, items = []) {
    super()
    this.width = pageWidth
    this.height = pageHeight
    this.items = items
  }

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  getItems() {
    return this.items
  }

  getExportObject () {
    let obj = super.getExportObject()
    obj.class = 'TypesetterPage'
    obj.width = this.width
    obj.height = this.height
    obj.items = this.items.map( (item) => { return item.getExportObject()})
    return obj
  }

  setFromObject (object, mergeValues) {
    super.setFromObject(object, mergeValues)
    const template = {  width: 0, height: 0}
    this._copyValues(template, object, mergeValues)
    if (object['items'] !== undefined && Array.isArray(object['items'])) {
      this.items = []
      object['items'].forEach( (itemObject, i) => {
        let newItem = ObjectFactory.fromObject(itemObject)
        if (newItem instanceof TypesetterItem) {
          this.items.push(newItem)
        } else {
          console.error(`Non typesetter item found at index ${i} in input object's items field`)
          console.log(itemObject)
          throw new Error('Non typesetter item found trying to set from Object')
        }
      })
    }
    return this
  }
}