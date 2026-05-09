/*
 *  Copyright (C) 2022 Universität zu Köln
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

import * as ApparatusType from '../../constants/ApparatusType';
import {CtDataCleaner} from './CtDataCleaner';
import {deepCopy} from '@/toolbox/Util';
import * as CollationTableType from '@/Witness/WitnessTokenClass';
import {CtDataInterface} from "../CtDataInterface";

const defaultApparatus = [ApparatusType.CRITICUS, ApparatusType.FONTIUM, ApparatusType.COMPARATIVUS, ApparatusType.MARGINALIA];

export class DefaultApparatusesCleaner extends CtDataCleaner {

  getCleanCtData(sourceCtData: CtDataInterface): CtDataInterface {
    if (sourceCtData.type !== CollationTableType.EDITION) {
      return sourceCtData;
    }

    let ctData: CtDataInterface = deepCopy(sourceCtData);
    // add default apparatuses for editions
    if (ctData.customApparatuses === undefined) {
      this.verbose && console.log(`Adding custom apparatuses to edition`);
      ctData.customApparatuses = [];
    }
    defaultApparatus.forEach((appType) => {
      let appIndex = ctData.customApparatuses.map((customApp) => {
        return customApp.type;
      }).indexOf(appType);
      if (appIndex === -1) {
        this.verbose && console.log(`Adding empty apparatus '${appType}'`);
        ctData.customApparatuses.push({
          entries: [], type: appType
        });
      }
    });

    return ctData;

  }

}
