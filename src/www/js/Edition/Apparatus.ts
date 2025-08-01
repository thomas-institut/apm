
import * as ApparatusType from '../constants/ApparatusType'
import {ApparatusEntry} from "./ApparatusEntry";

export interface Apparatus {
  type: string;
  entries: ApparatusEntry[];
  rawEntries?: ApparatusEntry[];
}



export class ApparatusTools {

  static createEmpty() : Apparatus {
    return {
      type: ApparatusType.CRITICUS,
      entries: []
    }
  }

  /**
   * Returns -1 if there's no entry for the given main text location
   * @param app
   * @param mainTextFrom
   * @param mainTextTo
   * @return {number}
   */
  static findEntryIndex(app: Apparatus, mainTextFrom: number, mainTextTo:number): number {
    let index = -1
    let found = false
    app.entries.forEach( (entry, i) => {
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
  static sortEntries(app: Apparatus): Apparatus {
    const newEntries = app.entries.sort ( (entryA, entryB) => {
      return compareEntryLocations(entryA.from, entryB.from, entryA.to, entryB.to)
    });
    return {
      type: app.type,
      entries: newEntries
    }
  }
}

function compareEntryLocations( fromA: number, fromB: number, toA: number, toB: number) {
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
