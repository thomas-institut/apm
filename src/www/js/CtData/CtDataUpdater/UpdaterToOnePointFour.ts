import {CtDataUpdater} from './CtDataUpdater';
import {EDITION} from '@/constants/CollationTableType';
import {CtDataInterface} from "../CtDataInterface";

/**
 * Schema 1.4 adds tags to apparatus entries and custom apparatus subentries
 */
export class UpdaterToOnePointFour extends CtDataUpdater {

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '1.3';
  }

  targetSchemaVersion() {
    return '1.4';
  }

  update(sourceCtData: CtDataInterface): CtDataInterface {
    let ctData = super.update(sourceCtData);
    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`);
    if (sourceCtData['type'] === EDITION) {
      ctData.customApparatuses = ctData.customApparatuses.map((app) => {
        app.entries = app.entries.map((entry) => {
          entry.tags = [];
          entry.subEntries = entry.subEntries.map((subEntry) => {
            subEntry.tags = [];
            return subEntry;
          });
          return entry;
        });
        return app;
      });
    }

    // done!
    ctData.schemaVersion = this.targetSchemaVersion();
    return ctData;
  }
}