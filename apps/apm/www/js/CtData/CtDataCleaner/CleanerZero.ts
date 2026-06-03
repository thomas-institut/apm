import {CtDataCleaner} from './CtDataCleaner.js';
import {CtDataInterface} from "../CtDataInterface.js";

export class CleanerZero extends CtDataCleaner {

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '0';
  }

  getCleanCtData(sourceCtData: CtDataInterface): CtDataInterface {
    this.debug && console.log(`Cleaning CtData for version 0, nothing to do, cleaner for 1.0 will do all the work`);
    return sourceCtData;
  }
}