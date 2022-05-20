
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
   * Returns -1 if there's no entry for the given main text location
   * @param mainTextFrom
   * @param mainTextTo
   * @return {number}
   */
  findEntryIndex(mainTextFrom, mainTextTo) {
    let index = -1
    let found = false
    this.entries.forEach( (entry, i) => {
        if (found) {
          return
        }
        if (compareEntryLocations(mainTextFrom, entry.from, mainTextTo, entry.to) === 0) {
          index = i
          found = true
        }
      }
    )
    return index
  }

  /**
   * Sorts the entries in ascending order according to their main text indices
   */
  sortEntries() {
    this.entries.sort ( (entryA, entryB) => {
      return compareEntryLocations(entryA.from, entryB.from, entryA.to, entryB.to)
    })
  }
}

function compareEntryLocations( fromA, fromB, toA, toB) {
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
}

