
import * as SubEntryType from './SubEntryType.mjs'
import * as SubEntrySource from './SubEntrySource'
import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'
import { hashCodeInt32 } from '../toolbox/Util.mjs'


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
     * @member {SubEntryWitnessInfo[]}
     */
    this.witnessData = []

    /**
     *
     * @member {number}
     */
    this.position = -1
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
      stringRep = stringRep.substr(0,48) + '..#' + theHash
    }
    return stringRep
  }
}