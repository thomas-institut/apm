import { CleanerOnePointOne } from './CleanerOnePointOne'
import { SubEntryPositionsConsistencyCleaner } from './SubEntryPositionsConsistencyCleaner'

export class CleanerOnePointTwo extends CleanerOnePointOne {

  sourceSchemaVersion () {
    return '1.2'
  }

  getCleanCtData (ctData) {
    let cleanData =  super.getCleanCtData(ctData)

    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose})
    return subEntryPositionsCleaner.getCleanCtData(cleanData)

  }
}