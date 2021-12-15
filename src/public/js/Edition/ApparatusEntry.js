
import * as SubEntryType from '../Edition/SubEntryType'


export class ApparatusEntry {

  constructor () {
    this.from = -1
    this.to = -1
    this.preLemma = ''
    this.lemma = ''
    this.lemmaText = ''
    this.postLemma = ''
    this.separator = ''
    /**
     *
     * @type {ApparatusSubEntry[]}
     */
    this.subEntries = []
  }

  /**
   *
   * @return {boolean}
   */
  allSubEntriesAreOmissions() {
    for (let i = 0; i < this.subEntries.length; i++) {
      if (this.subEntries[i].type !== SubEntryType.OMISSION) {
        return false
      }
    }
    return true
  }

}