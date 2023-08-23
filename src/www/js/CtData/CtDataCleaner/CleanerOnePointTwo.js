import { CleanerOnePointOne } from './CleanerOnePointOne'
import { SubEntryPositionsConsistencyCleaner } from './SubEntryPositionsConsistencyCleaner'
import { ApparatusEntryPositionCleaner } from './ApparatusEntryPositionCleaner'

export class CleanerOnePointTwo extends CleanerOnePointOne {

  sourceSchemaVersion () {
    return '1.2'
  }

  getCleanCtData (ctData) {
    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose})
    let apparatusEntryCleaner = new ApparatusEntryPositionCleaner({ verbose: this.verbose})

    let cleanData =  super.getCleanCtData(ctData)
    cleanData = subEntryPositionsCleaner.getCleanCtData(cleanData)
    return apparatusEntryCleaner.getCleanCtData(cleanData)
  }
}