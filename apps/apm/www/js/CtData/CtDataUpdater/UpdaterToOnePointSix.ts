import {CtDataUpdater} from './CtDataUpdater.js';
import {CtDataInterface} from "../CtDataInterface.js";
import {EDITION} from "@/constants/CollationTableType";
import * as ApparatusType from "@/constants/ApparatusType";

/**
 * Schema 1.4 adds tags to apparatus entries and custom apparatus subentries
 */
export class UpdaterToOnePointSix extends CtDataUpdater {

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '1.5';
  }

  targetSchemaVersion() {
    return '1.6';
  }

  update(sourceCtData: CtDataInterface): CtDataInterface {
    let ctData = super.update(sourceCtData);
    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`);
    if (sourceCtData['type'] === EDITION) {
      const currentMarginaliaApparatusIndex = ctData['customApparatuses'].map(app => app.type).indexOf(ApparatusType.END_NOTES);
      if (currentMarginaliaApparatusIndex === -1) {
        ctData.customApparatuses.push({type: ApparatusType.END_NOTES, entries: []});
      } else {
        // this is not an error,
        console.log(`Found an endnotes apparatus already in CtData version ${this.sourceSchemaVersion()}`);
      }
    }
    // done!
    ctData.schemaVersion = this.targetSchemaVersion();
    return ctData;
  }
}