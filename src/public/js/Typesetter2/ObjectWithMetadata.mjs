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


export class ObjectWithMetadata {

  constructor () {
    /**
     * Data associated with the object.
     *
     * @type {{}}
     */
    this.metadata = {}
  }

  /**
   *
   * @return {Object}
   */
  getExportObject() {
    return {
      class: 'Object',
      metadata: this.metadata
    }
  }

  /**
   *
   * @param {string}key
   * @param {object}someObject
   */
  addMetadata(key, someObject) {
    this.metadata[key] = someObject
    return this
  }

  /**
   *
   * @param {string}key
   * @return {object}
   */
  getMetadata(key) {
    return this.metadata[key]
  }

  /**
   *
   * @param {string}key
   * @return {boolean}
   */
  deleteMetadata(key) {
    delete this.metadata[key]
  }

  /**
   *
   * @param {string}key
   * @return {boolean}
   */
  hasMetadata(key) {
    return this.metadata.hasOwnProperty(key)
  }

}