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


import { HORIZONTAL } from './TypesetterItemDirection.mjs'
import { Glue } from './Glue.mjs'
import { Box } from './Box.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { ItemList } from './ItemList.mjs'
import { Penalty } from './Penalty.mjs'
import { TextBox } from './TextBox.mjs'
import { list } from 'quill/ui/icons.js'

export class TypesetterRenderer {

  /**
   * Renders a horizontal list at the renderer's
   * current x,y position plus the given shifts
   * @param {ItemList} list
   * @param {number}shiftX
   * @param {number}shiftY
   */
  renderHorizontalList(list, shiftX=0, shiftY=0) {
    // do nothing, the actual work should be done by
    // one descendant of this class
  }

  /**
   * Renders a horizontal list at the renderer's
   * current x,y position plus the given shifts
   * @param {ItemList}list
   * @param {number}shiftX
   * @param {number}shiftY
   */
  renderVerticalList(list, shiftX=0, shiftY=0) {
    // do nothing, the actual work should be done by
    // one descendant of this class
  }

  /**
   *
   * @param {TypesetterPage}page
   * @param {number}pageIndex
   */
  renderPage(page, pageIndex = 0) {
    page.getLists().forEach( (item) => {
      let [shiftX, shiftY] = this.getShiftForPageIndex(pageIndex)
      this.renderItem(item, shiftX, shiftY)
    })
  }

  getShiftForPageIndex(pageIndex) {
    return [0, 0]
  }

  /**
   *
   * @param {TypesetterDocument}doc
   */
  renderDocument(doc) {
    this._preRenderDocument(doc)
    doc.getPages().forEach( (page, pageIndex) => {
      this._preRenderPage(page, pageIndex)
      this.renderPage(page, pageIndex)
      this._postRenderPage(pageIndex)
    })
    this._postRenderDocument(doc)
  }

  _preRenderDocument(doc) {
    // do nothing
  }

  _postRenderDocument(doc) {

  }

  /**
   * Do something before rendering a page
   *
   * @param page
   * @param pageIndex
   */
  _preRenderPage(page, pageIndex) {
    // do nothing, the actual work should be done by
    // one descendant of this class
  }

  /**
   * Do something after rendering a page
   * @param page
   * @param pageIndex
   * @private
   */
  _postRenderPage(page, pageIndex) {
    // do nothing, the actual work should be done by
    // one descendant of this class
  }

  /**
   * Renders an item at the given position
   * The position is given in rendering device units
   * @param {TypesetterItem}item
   * @param {number}x
   * @param {number}y
   */
  renderItem(item, x, y) {
    if (item instanceof TextBox) {
      this.renderTextBox(item, x, y)
    } else if (item instanceof ItemList) {
      this.renderList(item, x, y)
    } else if (item instanceof Glue) {
      this.renderGlue(item, x, y)
    } else if (item instanceof Box) {
      this.renderBox(item, x, y)
    }  else if (item instanceof Penalty) {
      this.renderPenalty(item, x, y)
    }
  }

  /**
   *
   * @param {ItemList}listItem
   * @param {number}x
   * @param {number}y
   */
  renderList(listItem, x, y) {
    let [shiftX, shiftY] = this.getDeviceCoordinates(listItem.getShiftX(), listItem.getShiftY())
    let currentX = x + shiftX
    let currentY = y + shiftY
    listItem.getList().forEach( (item) => {
      this.renderItem(item, currentX, currentY)
      let [itemWidth, itemHeight] = this.getDeviceCoordinates(item.getWidth(), item.getHeight())
      switch(listItem.getDirection()) {
        case TypesetterItemDirection.HORIZONTAL:
          currentX += itemWidth
          break

        case TypesetterItemDirection.VERTICAL:
          currentY += itemHeight
          break
      }
    })
  }

  /**
   *
   * @param {Glue}glueItem
   * @param {number}x
   * @param {number}y
   */
  renderGlue(glueItem, x, y) {
    // normally nothing to do, but who knows what
    // specific renderers may come up with!
  }

  /**
   *
   * @param {Penalty}penaltyItem
   * @param {number}x
   * @param {number}y
   */
  renderPenalty(penaltyItem, x, y) {
    // normally nothing to do, but who knows what
    // specific renderers may come up with!
  }

  /**
   *
   * @param {Box}boxItem
   * @param {number}x
   * @param {number}y
   */
  renderBox(boxItem, x, y) {
    //do nothing
  }

  /**
   *
   * @param {TextBox}textBoxItem
   * @param {number}x
   * @param {number}y
   */
  renderTextBox(textBoxItem, x, y) {
    //do nothing
  }

  /**
   * Returns the devices coordinates for the given x,y (in pixels)
   * @param {number}x
   * @param {number}y
   * @return {*[]}
   */
  getDeviceCoordinates(x, y) {
    return [x, y]
  }

}