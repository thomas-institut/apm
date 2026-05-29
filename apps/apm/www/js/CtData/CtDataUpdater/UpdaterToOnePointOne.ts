import {CtDataUpdater} from './CtDataUpdater';
import {EDITION} from '@/constants/CollationTableType';
import {CtDataInterface} from "../CtDataInterface";

export class UpdaterToOnePointOne extends CtDataUpdater {

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '1.0';
  }

  targetSchemaVersion() {
    return '1.1';
  }

  update(sourceCtData: CtDataInterface): CtDataInterface {
    let ctData = super.update(sourceCtData);

    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`);


    if (sourceCtData['type'] === EDITION) {
      // update custom apparatuses
      ctData['customApparatuses'] = ctData['customApparatuses'].map((app) => {
        app['entries'] = app['entries'].map((entry, entryIndex) => {
          entry['subEntries'] = entry['subEntries'].map((subEntry, subEntryIndex) => {
            switch (subEntry['type']) {
              // @ts-expect-error converting to new type
              case 'disableAuto':
                subEntry['type'] = 'auto';
                subEntry['enabled'] = false;
                break;

              // @ts-expect-error converting to new type
              case 'custom':
                this.verbose && console.log(`Updating custom entry for apparatus '${app.type}', entry ${entryIndex}, subEntry ${subEntryIndex}`);
                subEntry['type'] = 'fullCustom';
                subEntry['enabled'] = true;
                // @ts-expect-error removing property once used by mistake
                delete subEntry['plainText'];
                // @ts-expect-error removing property once used by mistake
                delete subEntry['source'];
                // @ts-expect-error removing property once used by mistake
                delete subEntry['WitnessData'];
                break;
            }
            return subEntry;
          });
          return entry;
        });
        return app;
      });
    }

    // done!
    ctData['schemaVersion'] = this.targetSchemaVersion();
    return ctData;
  }
}