import {CtDataCleaner} from './CtDataCleaner';
import {numericSort} from '@/lib/ToolBox/ArrayUtil';
import {CtDataInterface} from "../CtDataInterface";

export class SubEntryPositionsConsistencyCleaner extends CtDataCleaner {


  getCleanCtData(ctData: CtDataInterface): CtDataInterface {
    if (ctData.customApparatuses === undefined) {
      // not apparatuses to fix!
      return ctData;
    }
    this.verbose && console.log(`Checking consistency in sub entry positions`);
    let errorsFound = false;
    ctData.customApparatuses = ctData.customApparatuses.map((app) => {
      app.entries = app.entries.map((entry, entryIndex) => {
        let nonDefaultPositions = numericSort(entry.subEntries
        .map((subEntry) => {
          return subEntry.position;
        })
        .filter((pos) => {
          return pos !== -1;
        }), true);

        // for now just reporting problems!
        if (nonDefaultPositions.length !== 0) {
          let shift = 0;
          if (nonDefaultPositions[0] !== 0) {
            console.error(`Apparatus '${app.type}' entry ${entryIndex}: sub-entries' positions do not start at 0 but at ${nonDefaultPositions[0]}`);
            shift = nonDefaultPositions[0];
            errorsFound = true;
          }
          for (let i = 0; i < nonDefaultPositions.length; i++) {
            if (i !== (nonDefaultPositions[i] - shift)) {
              console.error(`Apparatus '${app.type}' entry ${entryIndex}: sub-entries' position sequence error, expected ${i + shift}, got ${nonDefaultPositions[i]}`);
              errorsFound = true;
            }
          }
        }
        return entry;
      });
      return app;
    });
    if (errorsFound) {
      // fix them!!
    } else {
      this.verbose && console.log(`...all good`);
    }
    return ctData;
  }

}