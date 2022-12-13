
import * as SubEntryType from './SubEntryType.mjs'


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
    return ApparatusEntry.allSubEntriesInEntryObjectAreOmissions(this)
  }

  static allSubEntriesInEntryObjectAreOmissions(entry) {
    for (let i = 0; i < entry.subEntries.length; i++) {
      if (entry.subEntries[i].type !== SubEntryType.OMISSION) {
        return false
      }
    }
    return true
  }


}