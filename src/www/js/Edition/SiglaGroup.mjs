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


import { deepCopy, trimWhiteSpace } from '../toolbox/Util.mjs'
import { arraysAreEqual, numericSort, uniq } from '../toolbox/ArrayUtil.mjs'

export class SiglaGroup {

  constructor () {
    this.siglum = ''
    this.witnesses = []
  }

  static fromObject(obj) {
    let sg = new SiglaGroup()
    if (obj.siglum !== undefined) {
      sg.siglum = obj.siglum
    }

    if (obj.witnesses !== undefined && Array.isArray(obj.witnesses)) {
      sg.witnesses = deepCopy(obj.witnesses)
    }
    return sg
  }

  /**
   *
   * @param {string}siglum
   * @return {SiglaGroup}
   */
  withSiglum(siglum) {
    this.siglum = siglum
    return this
  }

  /**
   *
   * @param witnesses
   * @return {SiglaGroup}
   */
  withWitnesses(witnesses) {
    this.witnesses = witnesses
    return this
  }


  /**
   * Returns an array with the matched witnesses in the given array
   * if and only if all sigla group witness are matched
   * (in other words, if the sigla group does not match the
   * given witness list, it returns an empty array)
   *
   * @param {number[]}witnessesToMatch
   * @return {number[]}
   */
  matchWitnesses(witnessesToMatch) {
    let matchedWitnesses = []
    witnessesToMatch.forEach( (w) => {
      if (this.witnesses.indexOf(w) !== -1) {
        matchedWitnesses.push(w)
      }
    })
    matchedWitnesses = numericSort(uniq(matchedWitnesses))
    if (arraysAreEqual(matchedWitnesses, this.witnesses)) {
      return matchedWitnesses
    }
    return []
  }


  _normalizeInternalData() {
    this.siglum = trimWhiteSpace(this.siglum)
    this.witnesses = numericSort(this.witnesses)
  }




}