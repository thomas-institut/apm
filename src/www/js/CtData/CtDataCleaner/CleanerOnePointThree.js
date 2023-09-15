import { CleanerOnePointTwo } from './CleanerOnePointTwo'
import { CtDataCleaner } from './CtDataCleaner'
import { SubEntryPositionsConsistencyCleaner } from './SubEntryPositionsConsistencyCleaner'
import { ApparatusEntryPositionCleaner } from './ApparatusEntryPositionCleaner'

/**
 *
 */
export class CleanerOnePointThree extends CtDataCleaner {

  sourceSchemaVersion () {
    return '1.3'
  }

  getCleanCtData (ctData) {
    // just run the 1.2 cleaner
    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose})
    let apparatusEntryCleaner = new ApparatusEntryPositionCleaner({ verbose: this.verbose})

    let cleanData =  super.getCleanCtData(ctData)
    cleanData = subEntryPositionsCleaner.getCleanCtData(cleanData)
    return apparatusEntryCleaner.getCleanCtData(cleanData)
  }
}