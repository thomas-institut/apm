import {CtDataCleaner} from './CtDataCleaner';
import {SubEntryPositionsConsistencyCleaner} from './SubEntryPositionsConsistencyCleaner';
import {ApparatusEntryPositionCleaner} from './ApparatusEntryPositionCleaner';
import {DefaultApparatusesCleaner} from './DefaultApparatusesCleaner';
import {CtDataInterface} from "../CtDataInterface";

/**
 *
 */
export class CleanerOnePointThree extends CtDataCleaner {

  sourceSchemaVersion() {
    return '1.3';
  }

  getCleanCtData(ctData: CtDataInterface): CtDataInterface {

    // make sure all custom apparatuses are there
    let defaultApparatusesCleaner = new DefaultApparatusesCleaner({verbose: this.verbose});
    ctData = defaultApparatusesCleaner.getCleanCtData(ctData);
    // just run the 1.2 cleaner
    let subEntryPositionsCleaner = new SubEntryPositionsConsistencyCleaner({verbose: this.verbose});
    let apparatusEntryCleaner = new ApparatusEntryPositionCleaner({verbose: this.verbose});

    let cleanData = super.getCleanCtData(ctData);
    cleanData = subEntryPositionsCleaner.getCleanCtData(cleanData);
    return apparatusEntryCleaner.getCleanCtData(cleanData);
  }
}