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

export class TypesetterObject {

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
    let obj = {  class: 'TypesetterObject'}
    if (Object.keys(this.metadata).length !== 0) {
      obj.metadata = this.metadata
    }
    return obj
  }

  /**
   * Sets the object's values from an object
   * if mergeValues is true, current values not given in the input object
   * are preserved, otherwise default values will be used
   * @param {object}object
   * @param {boolean}mergeValues
   */
  setFromObject(object, mergeValues ) {
    if (!mergeValues) {
      this.metadata = {}
    }
    if (object['metadata'] !== undefined && typeof object === 'object' && !Array.isArray(object)) {
      Object.keys(object).forEach( (key) => {
        this.addMetadata(key, object[key])
      })
    }
    return this
  }

  /**
   *
   * @param {string}key
   * @param {object|string|number}someThing
   */
  addMetadata(key, someThing) {
    this.metadata[key] = someThing
    return this
  }

  /**
   *
   * @param {string}key
   * @return {any}
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

  /**
   * Utility function to copy scalar values from an object
   * @param {object}template
   * @param {object}inputObject
   * @param {boolean} mergeValues
   * @protected
   */
  _copyValues(template, inputObject, mergeValues) {
    Object.keys(template).forEach( (key) => {
      let defaultValue = mergeValues ? this[key] : template[key]
      this[key] = inputObject[key] !== undefined ? inputObject[key] : defaultValue
    })
  }




}