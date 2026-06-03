import {CtDataUpdater} from './CtDataUpdater.js';
import {CtDataInterface} from "../CtDataInterface.js";

/**
 * Schema 1.4 adds tags to apparatus entries and custom apparatus subentries
 */
export class UpdaterToOnePointFive extends CtDataUpdater {

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '1.4';
  }

  targetSchemaVersion() {
    return '1.5';
  }

  update(sourceCtData: CtDataInterface): CtDataInterface {
    let ctData = super.update(sourceCtData);
    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`);
    ctData.excludeFromAutoCriticalApparatus = [];
    ctData.includeInAutoMarginalFoliation = [];
    // done!
    ctData.schemaVersion = this.targetSchemaVersion();
    return ctData;
  }
}