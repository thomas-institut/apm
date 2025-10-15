/*
 *  Copyright (C) 2021 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import {CtData} from '../CtData';
import {CtDataCleaner} from './CtDataCleaner';
//import {FmtTextFactory} from '@/lib/FmtText/FmtTextFactory';
import {deepCopy} from '@/toolbox/Util';
import * as CollationTableType from '../../Witness/WitnessTokenClass';
import {CollationTableConsistencyCleaner} from './CollationTableConsistencyCleaner';
import {EditionWitnessReferencesCleaner} from './EditionWitnessReferencesCleaner';
import {DefaultApparatusesCleaner} from './DefaultApparatusesCleaner';
import {CtDataInterface} from "../CtDataInterface";
import {fmtTextFromString} from "@/lib/FmtText/FmtText";

export class CleanerOnePointOne extends CtDataCleaner {
  private ctData!: CtDataInterface;

  constructor(options = {}) {
    super(options);
  }

  sourceSchemaVersion() {
    return '1.1';
  }

  /**
   * Normalizes a ctData object fixing minor inconsistencies and creating empty data for all required
   * object members.
   *
   * This function basically makes any ctData object in the system conform to the latest version.
   *
   *
   * @param ctData
   * @return {*}
   */
  getCleanCtData(ctData: CtDataInterface): CtDataInterface {
    this.ctData = super.getCleanCtData(ctData);

    // fix -1 references in edition witness
    if (this.ctData['type'] === CollationTableType.EDITION) {
      let referencesCleaner = new EditionWitnessReferencesCleaner({verbose: this.verbose});
      this.ctData = referencesCleaner.getCleanCtData(this.ctData);
    }

    // consistency check
    let consistencyCleaner = new CollationTableConsistencyCleaner({verbose: this.verbose});
    this.ctData = consistencyCleaner.getCleanCtData(this.ctData);


    if (this.ctData['type'] === CollationTableType.EDITION) {
      let defaultApparatusesCleaner = new DefaultApparatusesCleaner({verbose: this.verbose});
      this.ctData = defaultApparatusesCleaner.getCleanCtData(this.ctData);

      this.ctData = this.cleanCustomApparatusesOnePointOne(this.ctData);
      // this may not be necessary
      this.ctData = CtData.fixFmtText(this.ctData);
    }

    return this.ctData;
  }

  cleanCustomApparatusesOnePointOne(ctDataToClean: CtDataInterface): CtDataInterface {
    let ctData: CtDataInterface = deepCopy(ctDataToClean);
    ctData['customApparatuses'] = ctData['customApparatuses'].map((app) => {
      app.entries = app.entries.map((entry, entryIndex) => {
        // fix bad lemma values
        if (entry.lemma !== '' && typeof entry.lemma === 'string') {
          let validLemmaStrings = ['', 'dash', 'ellipsis'];
          if (validLemmaStrings.indexOf(entry.lemma) === -1) {
            //invalid lemma string, convert to FmtText
            this.verbose && console.log(`Fixed invalid lemma string '${entry['lemma']}' in apparatus '${app['type']}', entry ${entryIndex}`);
            entry.lemma = fmtTextFromString(entry.lemma);
          }
        }
        return entry;
      });
      return app;
    });

    ctData = CtData.fixReferencesToEmptyTokensInEditionWitness(ctData);
    ctData = CtData.fixDuplicatedEntriesInCustomApparatuses(ctData);

    return ctData;
  }
}