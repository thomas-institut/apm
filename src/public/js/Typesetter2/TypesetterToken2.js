/*
 *  Copyright (C) 2012 Universität zu Köln
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


export class TypesetterToken2 {

  constructor () {
    if (this.constructor === TypesetterToken2) {
      throw new Error("Abstract classes cannot be instantiated")
    }
    this._markAsNotSet()
    this.x = -1
    this.y = -1
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

  /**
   *
   * @param {number} x
   * @return {TypesetterToken2}
   */
  setX(x) {
    this.x = x
    return this
  }

  /**
   *
   * @param {number}y
   * @return {TypesetterToken2}
   */
  setY(y) {
    this.y = y
    return this
  }

  // ABSTRACT METHODS

  getWidth() {
    throw new Error("Method 'getSetWidth() must be implemented")
  }

  getSetWidth() {
    throw new Error("Method 'getSetWidth() must be implemented")
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