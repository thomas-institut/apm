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

import { Glue } from '../Glue.mjs'
import { Box } from '../Box.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import { ItemList } from '../ItemList.mjs'
import { Penalty } from '../Penalty.mjs'
import { TextBox } from '../TextBox.mjs'

export class TypesetterRenderer {

  /**
   * Renders a horizontal list at the given x,y position
   * @param horizontalList
   * @param x
   * @param y
   */
  renderHorizontalList(horizontalList, x=0, y=0) {
    let [shiftX, shiftY] = this.getDeviceCoordinates(horizontalList.getShiftX(), horizontalList.getShiftY())
    let currentX = x + shiftX
    let currentY = y + shiftY
    let textDirection = horizontalList.getTextDirection()
    if (textDirection === 'rtl') {
      let [listWidth, ] = this.getDeviceCoordinates(horizontalList.getWidth(), horizontalList.getHeight())
      currentX += listWidth
    }
    horizontalList.getList().forEach( (item) => {
      let [itemWidth, ] = this.getDeviceCoordinates(item.getWidth(), item.getHeight())
      if (item.getTextDirection() === textDirection || item.getTextDirection() === '') {
        this.renderItem(item, currentX, currentY)
      } else {
        // a reverse item
        if (textDirection==='ltr') {
            // need to render the RTL item to right of its position
            this.renderItem(item, currentX+itemWidth, currentY)
        } else {
          // need to render the RTL item to left of its position
          this.renderItem(item, currentX-itemWidth, currentY)
        }
      }

      if (textDirection === 'ltr') {
        currentX += itemWidth
      } else {
        currentX -= itemWidth
      }
    })
  }

  /**
   * Renders a vertical list at the given x,y position
   * @param verticalList
   * @param x
   * @param y
   */
  renderVerticalList(verticalList, x=0, y=0) {
    let [shiftX, shiftY] = this.getDeviceCoordinates(verticalList.getShiftX(), verticalList.getShiftY())
    let currentX = x + shiftX
    let currentY = y + shiftY
    verticalList.getList().forEach( (item) => {
      this.renderItem(item, currentX, currentY)
      let [, itemHeight] = this.getDeviceCoordinates(item.getWidth(), item.getHeight())
      currentY += itemHeight
    })
  }

  /**
   *
   * @param {TypesetterPage}page
   * @param {number}pageIndex
   */
  renderPage(page, pageIndex = 0) {
    page.getItems().forEach( (item) => {
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
    switch(listItem.getDirection()) {
      case TypesetterItemDirection.HORIZONTAL:
        this.renderHorizontalList(listItem,x,y)
        break

      case TypesetterItemDirection.VERTICAL:
        this.renderVerticalList(listItem,x, y)
        break
    }
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