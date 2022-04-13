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
   */
  renderPage(page) {
    page.getLists().forEach( (list) => {
      if (list.getDirection() === HORIZONTAL) {
        this.renderHorizontalList(list)
      } else {
        this.renderVerticalList(list)
      }
    })
  }

  /**
   *
   * @param {TypesetterPage[]}pageArray
   */
  renderDocument(pageArray) {
    pageArray.forEach( (page, pageIndex) => {
      this._preRenderPage(page, pageIndex)
      this.renderPage(page)
      this._postRenderPage(pageIndex)
    })
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

}