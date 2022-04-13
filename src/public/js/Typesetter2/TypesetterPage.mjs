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
 * A typesetter page is a 2D surface of a certain width and height, an array of ItemList with
 * the typesetter items to be rendered in the page, and some metadata
 *
 * Renderers reset their current position to (0, 0) before processing each list,
 * so each list and each item on them must have proper values for width, height,
 * shiftX and shiftY so that they are rendered in the right places.

 */
export class TypesetterPage {

  /**
   *
   * @param {number}pageWidth
   * @param {number}pageHeight
   * @param {ItemList[]}lists
   */
  constructor (pageWidth, pageHeight, lists = []) {
    this.width = pageWidth
    this.height = pageHeight
    this.lists = lists
    this.metadata = new Map()
  }

  /**
   *
   * @param {ItemList}list
   */
  addList(list) {
    this.lists.push(list)
  }


  getLists() {
    return this.lists
  }

}