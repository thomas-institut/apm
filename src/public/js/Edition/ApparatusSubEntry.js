
import * as SubEntryType from './SubEntryType'
import * as SubEntrySource from './SubEntrySource'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'
import { FmtText } from '../FmtText/FmtText'
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
  }


  /**
   * Returns an Int32 hash code for the sub entry
   * @return {string}
   */
  hashString() {
    let witnessDataStringRep = this.witnessData.map( (w) => {
      return `${w.witnessIndex}:h${w.hand}`
      }).join('_')
    let stringRep = `${this.type}-${FmtText.getPlainText(this.fmtText)}-${witnessDataStringRep}`
    if (stringRep.length > 64) {
      let theHash = hashCodeInt32(stringRep)
      stringRep = stringRep.substr(0,48) + '..#' + theHash
    }
    return stringRep
  }
}