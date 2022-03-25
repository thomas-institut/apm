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

import * as TypesetterItemDirection from './TypesetterItemDirection'

/**
 * The base class for all typesetter items
 */

export class TypesetterItem {

  constructor (direction = TypesetterItemDirection.HORIZONTAL) {
    if (this.constructor === TypesetterItem) {
      throw new Error("Abstract classes cannot be instantiated")
    }
    this.direction = direction
    this.width = -1  // not set
    this.height = -1 // not set

    this.metadata = new Map()
    this.shiftX = 0
    this.shiftY = 0
  }

  getDirection() {
    return this.direction
  }

  getWidth() {
    return this.width
  }

  setWidth(width) {
    this.width = width
    return this
  }

  getHeight() {
    return this.height
  }

  setHeight(height) {
    this.height = height
    return this
  }

  getShiftX() {
    return this.shiftX
  }

  /**
   *
   * @param {number} x
   * @return {TypesetterItem}
   */
  setShiftX(x) {
    this.shiftX = x
    return this
  }

  getShiftY() {
    return this.shiftY
  }

  /**
   *
   * @param {number}y
   * @return {TypesetterItem}
   */
  setShiftY(y) {
    this.shiftY = y
    return this
  }

  // Metadata methods

  /**
   *
   * @param {string}key
   * @param {object}someObject
   * @return {TypesetterItem}
   */
  addMetadata(key, someObject) {
    this.metadata.set(key, someObject)
    return this
  }

  /**
   *
   * @param {string}key
   * @return {object}
   */
  getMetadata(key) {
    return this.metadata.get(key)
  }

  /**
   *
   * @param {string}key
   * @return {boolean}
   */
  deleteMetadata(key) {
    return this.metadata.delete(key)
  }

  /**
   *
   * @param {string}key
   * @return {boolean}
   */
  hasMetadata(key) {
    return this.metadata.has(key)
  }



}