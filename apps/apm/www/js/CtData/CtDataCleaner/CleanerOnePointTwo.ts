import {CleanerOnePointOne} from './CleanerOnePointOne.js';
import {SubEntryPositionsConsistencyCleaner} from './SubEntryPositionsConsistencyCleaner.js';
import {ApparatusEntryPositionCleaner} from './ApparatusEntryPositionCleaner.js';
import {CtDataInterface} from "../CtDataInterface.js";

export class CleanerOnePointTwo extends CleanerOnePointOne {

  sourceSchemaVersion() {
    return '1.2';
  }

  getCleanCtData(ctData: CtDataInterface): CtDataInterface {
    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose});
    let apparatusEntryCleaner = new ApparatusEntryPositionCleaner({verbose: this.verbose});

    let cleanData = super.getCleanCtData(ctData);
    cleanData = subEntryPositionsCleaner.getCleanCtData(cleanData);
    return apparatusEntryCleaner.getCleanCtData(cleanData);
  }
}