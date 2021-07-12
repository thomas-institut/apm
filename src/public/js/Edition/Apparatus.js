
import * as ApparatusType from './ApparatusType'
import { arraysAreEqual } from '../toolbox/ArrayUtil'

export class Apparatus {


  constructor () {
    this.type = ApparatusType.CRITICUS
    /**
     *
     * @member { ApparatusEntry[]}
     */
    this.entries = []
  }

  /**
   * Returns -1 if there's no entry for the given section and main text location
   * @param section
   * @param mainTextFrom
   * @param mainTextTo
   * @return {number}
   */
  findEntryIndex(section, mainTextFrom, mainTextTo) {
    let index = -1
    let found = false
    this.entries.forEach( (entry, i) => {
        if (found) {
          return
        }
        if (compareEntryLocations(section, entry.section, mainTextFrom, entry.from, mainTextTo, entry.to) === 0) {
          index = i
          found = true
        }
      }
    )
    return index
  }

  /**
   * Sorts the entries in ascending order according to their main text indices
   * TODO: support multiple sections, for now assumes that there's only one section [ 0 ]
   */
  sortEntries() {
    this.entries.sort ( (entryA, entryB) => {
      return compareEntryLocations(entryA.section, entryB.section, entryA.from, entryB.from, entryA.to, entryB.to)
    })
  }
}

function compareEntryLocations(sectionA, sectionB, fromA, fromB, toA, toB) {
  if (arraysAreEqual(sectionA, sectionB)) {
   if (fromA === fromB) {
     if (toA === toB) {
       return 0
     }
     if (toA > toB) {
       return 1
     }
     return -1
   }
   if (fromA > fromB) {
     return 1
   }
   return -1
  } else {
    // TODO: compare sections properly
    if (sectionA[0] > sectionB[0]) {
      return 1
    }
    return -1
  }

}

