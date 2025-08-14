// noinspection ES6PreferShortImport

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

import * as SubEntryType from './SubEntryType.js'
import * as SubEntrySource from './SubEntrySource.js'
import { FmtTextToken} from "../lib/FmtText/FmtTextToken";
import { FmtTextFactory } from '../lib/FmtText/FmtTextFactory.js'
import { FmtTextUtil } from '../lib/FmtText/FmtTextUtil.js'
import { hashCodeInt32 } from '../toolbox/Util.mjs'
import { WitnessDataItem } from './WitnessDataItem.js'
export class ApparatusSubEntry {

  plainText!: string;
  type: string;
  enabled: boolean;
  source: string;
  fmtText: FmtTextToken[];
  witnessData: WitnessDataItem[];
  keyword: string;
  position: number;
  tags: string[];
  hash!: string;

  constructor () {
    this.type = SubEntryType.EMPTY
    this.enabled = true
    this.source = SubEntrySource.UNKNOWN
    this.fmtText = FmtTextFactory.empty()
    this.witnessData = []
    this.keyword = ''
    this.position = -1;
    this.tags = [];
  }

  static clone(subEntry: ApparatusSubEntry): ApparatusSubEntry {
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
   */
  hashString(): string {
    let witnessDataStringRep = this.witnessData.map( (w) => {
      return `${w.witnessIndex}:h${w.hand}`
      }).join('_')
    // FmtText.check(this.fmtText)
    let stringRep = `${this.type}-${FmtTextUtil.getPlainText(this.fmtText)}-${witnessDataStringRep}`
    if (stringRep.length > 64) {
      let theHash = hashCodeInt32(stringRep)
      stringRep = stringRep.substring(0,48) + '..#' + theHash
    }
    return stringRep
  }
}