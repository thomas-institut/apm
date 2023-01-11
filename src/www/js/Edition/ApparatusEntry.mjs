
import * as SubEntryType from './SubEntryType.mjs'
import { numericFieldSort, pushArray } from '../toolbox/ArrayUtil.mjs'


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
   * Order the entry's sub-entries according to their current position
   * values and update those to reflect the new order
   */
  orderSubEntries() {

    let nonPositionedAutoSubEntries = this.subEntries
      .filter( (subEntry) => { return subEntry.type === SubEntryType.AUTO && subEntry.position === -1})
    let positionedEntries = numericFieldSort(this.subEntries
      .filter( (subEntry) => { return subEntry.position !== -1}), 'position', true)
    let nonPositionedCustomSubEntries = this.subEntries
      .filter( (subEntry) => { return subEntry.type !== SubEntryType.AUTO && subEntry.position === -1})

    let orderedSubEntries = nonPositionedAutoSubEntries
    pushArray(orderedSubEntries, positionedEntries)
    pushArray(orderedSubEntries, nonPositionedCustomSubEntries)
    this.subEntries = orderedSubEntries.map ( (subEntry,
      index) => {
        subEntry.position = index
        return subEntry
    })
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