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

import {CtDataCleaner} from './CtDataCleaner';
import * as TokenClass from '../../constants/CollationTableType';
import * as TranscriptionTokenType from '../../Witness/WitnessTokenType';
import {deepCopy} from '@/toolbox/Util';
import {CtDataInterface, WitnessTokenInterface} from "../CtDataInterface";

export class EditionWitnessReferencesCleaner extends CtDataCleaner {


  getCleanCtData(sourceCtData: CtDataInterface) {
    let ctData = deepCopy(sourceCtData);

    this.verbose && console.log(`Checking for -1 references in edition witness`);

    let editionWitnessIndex = ctData['editionWitnessIndex'];
    if (editionWitnessIndex === undefined) {
      // not an edition, nothing to do
      return ctData;
    }
    let editionWitnessTokens = ctData.witnesses[editionWitnessIndex]['tokens'];
    let ctEditionRow = ctData.collationMatrix[editionWitnessIndex];

    let foundNullRef = false;
    let newEditionWitnessTokens: WitnessTokenInterface[] = ctEditionRow.map((ref: number, i: number): WitnessTokenInterface => {
      if (ref === -1) {
        this.debug && console.log(`Adding empty token in edition witness at column ${i}`);
        foundNullRef = true;
        return {'tokenClass': TokenClass.EDITION, 'tokenType': TranscriptionTokenType.EMPTY, 'text': '', fmtText: []};
      }
      return editionWitnessTokens[ref];
    });

    if (foundNullRef) {
      let newCtEditionRow = ctEditionRow.map((_ref: number, i: number) => {
        return i;
      });
      ctData.witnesses[editionWitnessIndex]['tokens'] = newEditionWitnessTokens;
      ctData.collationMatrix[editionWitnessIndex] = newCtEditionRow;

    } else {
      this.verbose && console.log('...all good, none found');
    }
    return ctData;
  }
}