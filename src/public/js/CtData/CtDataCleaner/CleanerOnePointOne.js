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

import { CtData } from '../CtData'
import { CtDataCleaner } from './CtDataCleaner'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory'
import { deepCopy } from '../../toolbox/Util.mjs'


export class CleanerOnePointOne extends CtDataCleaner{

  constructor(options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '1.1'
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
  getCleanCtData(ctData) {
    this.ctData = super.getCleanCtData(ctData)

    this.ctData = this.cleanCustomApparatuses(this.ctData)

    // this may not be necessary
    this.ctData = CtData.fixFmtText(this.ctData)

    return this.ctData
  }

  cleanCustomApparatuses(ctDataToClean) {
    let ctData = deepCopy(ctDataToClean)
    ctData['customApparatuses'] = ctData['customApparatuses'].map( (app) => {
      app.entries = app.entries.map((entry, entryIndex) => {
        // fix bad lemma values
        if (entry['lemma'] !== '' && typeof entry['lemma'] === 'string') {
          let validLemmaStrings = ['', 'dash', 'ellipsis']
          if (validLemmaStrings.indexOf(entry['lemma']) === -1) {
            //invalid lemma string, convert to FmtText
            this.verbose && console.log(`Fixed invalid lemma string '${entry['lemma']}' in apparatus '${app['type']}', entry ${entryIndex}`)
            entry['lemma'] = FmtTextFactory.fromString(entry['lemma'])
          }
        }
        return entry
      })
      return app
    })

    return ctData
  }



}