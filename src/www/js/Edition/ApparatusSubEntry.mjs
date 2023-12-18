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

import * as SubEntryType from './SubEntryType.mjs'
import * as SubEntrySource from './SubEntrySource.mjs'
import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'
import { hashCodeInt32 } from '../toolbox/Util.mjs'
import { WitnessDataItem } from './WitnessDataItem.mjs'


export class ApparatusSubEntry {

  constructor () {

    /**
     *
     * @member {string}
     */
    this.type = SubEntryType.EMPTY

    /**
     *
     * @member {boolean}
     */
    this.enabled = true

    /**
     *
     * @type {string}
     */
    this.source = SubEntrySource.UNKNOWN

    /**
     *
     * @member {FmtTextToken[]}
     */
    this.fmtText = FmtTextFactory.empty()

    /**
     *
     * @member {SubEntryPart[]}
     */
    // this.parts = []
    /**
     *
     * @member {WitnessDataItem[]}
     */
    this.witnessData = []


    this.keyword = ''

    /**
     *
     * @member {number}
     */
    this.position = -1;

    this.tags = [];
  }

  /**
   *
   * @param {ApparatusSubEntry}subEntry
   * @return {ApparatusSubEntry}
   */
  static clone(subEntry) {
    let copy = new ApparatusSubEntry()
    copy.type = subEntry.type;
    copy.enabled = subEntry.enabled;
    copy.source = subEntry.source;
    copy.fmtText = FmtTextFactory.fromAnything(subEntry.fmtText);
    copy.position = subEntry.position;
    copy.keyword = subEntry.keyword;
    copy.tags = [...subEntry.tags];
    copy.witnessData = subEntry.witnessData.map( (dataItem) => {
      return WitnessDataItem.clone(dataItem);
    })
    return copy;
  }


  /**
   * Returns an Int32 hash code for the sub entry
   * @return {string}
   */
  hashString() {
    let witnessDataStringRep = this.witnessData.map( (w) => {
      return `${w.witnessIndex}:h${w.hand}`
      }).join('_')
    // FmtText.check(this.fmtText)
    let stringRep = `${this.type}-${FmtText.getPlainText(this.fmtText)}-${witnessDataStringRep}`
    if (stringRep.length > 64) {
      let theHash = hashCodeInt32(stringRep)
      stringRep = stringRep.substring(0,48) + '..#' + theHash
    }
    return stringRep
  }
}