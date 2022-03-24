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

    this.metaData = []
    this._markAsNotSet()
    this.x = -1
    this.y = -1
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

  /**
   *
   * @return {bool}
   */
  isSet() {
    return this._set
  }


  getX() {
    return this.isSet() ? this.x : -1
  }

  getY() {
    return this.isSet() ? this.y : -1
  }

  addMetaData(someObject) {
    this.metaData.push(someObject)
    return this
  }

  getMetaData() {
    return this.metaData
  }

  /**
   *
   * @param {number} x
   * @return {TypesetterItem}
   */
  setX(x) {
    this.x = x
    return this
  }

  /**
   *
   * @param {number}y
   * @return {TypesetterItem}
   */
  setY(y) {
    this.y = y
    return this
  }

  // PROTECTED METHODS

  _markAsSet() {
    this._set = true
    return this
  }

  _markAsNotSet() {
    this._set = false
    return this
  }


}