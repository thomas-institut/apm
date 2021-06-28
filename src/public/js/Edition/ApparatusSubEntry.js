
import * as SubEntryType from './SubEntryType'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'

export class ApparatusSubEntry {

  constructor () {
      this.type = SubEntryType.EMPTY
      this.fmtText = FmtTextFactory.empty()
    /**
     *
     * @member {SubEntryWitnessInfo[]}
     */
      this.witnessData = []
  }
}