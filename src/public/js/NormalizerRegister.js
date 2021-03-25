/*
 *  Copyright (C) 2021 Universität zu Köln
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


export class NormalizerRegister {

  constructor () {
    this.normalizerArray = []
  }

  /**
   *
   * @param name {string}
   * @param normalizerObject {object}
   * @param metadata {object}
   */
  registerNormalizer(name, normalizerObject, metadata = {}) {
    if (this.normalizerIsDefined(name)) {
      console.error(`Normalizer '${name}' already defined trying to register normalizer`)
    } else {
      this.normalizerArray.push({
        name: name,
        normalizerObject: normalizerObject,
        metadata: metadata
      })
    }
  }

  /**
   *
   * @returns {string[]}
   */
  getRegisteredNormalizers() {
    return this.normalizerArray.map( (n) => { return n.name})
  }

  /**
   *
   * @param name {string}
   * @param str {string}
   * @returns {string}
   */
  applyNormalizer(name, str) {
    if (this.normalizerIsDefined(name)) {
      return this.getNormalizerByName(name).normalizerObject.normalizeString(str)
    }
  }

  /**
   *
   * @param names {string[]}
   * @param str {string}
   * @returns {string}
   */
  applyNormalizerList(names, str) {
    let resultingString = str
    let thisObject = this
    names.forEach( (name) => {
      resultingString = thisObject.applyNormalizer(name, resultingString)
    })
    return resultingString
  }

  /**
   *
   * @param str {string}
   * @returns {string}
   */
  applyAllNormalizers(str) {
    return this.applyNormalizerList( this.getRegisteredNormalizers(), str)
  }

  /**
   *
   * @param name {string}
   * @param data {object}
   */
  setNormalizerMetadata(name, data) {
    let index = this.getNormalizerIndex(name)
    if (index !== -1) {
      this.normalizerArray[index].metadata = data
    }
  }

  /**
   *
   * @param name {string}
   * @returns {object}
   */
  getNormalizerMetadata(name) {
    return this.getNormalizerByName(name).metadata
  }

  /**
   *
   * @param name {string}
   * @returns {boolean}
   */
  normalizerIsDefined(name) {
     return this.getNormalizerIndex(name) !== -1
  }

  /**
   *
   * @param name {string}
   * @returns {object}
   */
  getNormalizerByName(name) {
    return this.normalizerArray[this.getNormalizerIndex(name)]
  }

  /**
   *
   * @param name {string}
   * @returns {number}
   */
  getNormalizerIndex(name) {
    return this.normalizerArray.map( (n) => { return n.name}).indexOf(name)
  }



}