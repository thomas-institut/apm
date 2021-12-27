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

import * as CollationTableType from '../../constants/CollationTableType'
import { CtData } from '../CtData'
import { CtDataCleaner } from './CtDataCleaner'
import { deepCopy } from '../../toolbox/Util.mjs'
import { DEFAULT_GLUE_SPACE } from '../../FmtText/FmtTextToken'
import { CollationTableConsistencyCleaner } from './CollationTableConsistencyCleaner'
import { EditionWitnessReferencesCleaner } from './EditionWitnessReferencesCleaner'
import { EDITION } from '../../constants/CollationTableType'

export class CleanerOnePointZero extends CtDataCleaner{

  constructor(options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '1.0'
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

    // fix -1 references in edition witness
    if (this.ctData['type'] === CollationTableType.EDITION) {
      let referencesCleaner = new EditionWitnessReferencesCleaner()
      this.ctData = referencesCleaner.getCleanCtData(this.ctData)
    }

    // consistency check
    let consistencyCleaner = new CollationTableConsistencyCleaner()
    this.ctData = consistencyCleaner.getCleanCtData(this.ctData)

    if (this.ctData['type'] === EDITION) {
      // this may not be necessary
      this.ctData = CtData.fixFmtText(this.ctData)
      // fix glue normal value in fmtText
      this.ctData = this.fixNormalGlueValueInFmtText(this.ctData)
      this.ctData = this.fixCustomApparatuses(this.ctData)
    }

    return this.ctData
  }

  /**
   * Fixes custom apparatuses from inconsistencies caused in development before release
   * @param ctDataToFix
   * @return {any}
   */
  fixCustomApparatuses(ctDataToFix) {
    let ctData = deepCopy(ctDataToFix)

    ctData['customApparatuses'] = ctData['customApparatuses'].map( (app) => {
      app.entries = app.entries.map( (entry, entryIndex) => {
        // make sure there's no section in the entry
        if (entry['section'] !== undefined) {
          this.verbose && console.log(`Deleting 'section' from apparatus '${app['type']}', entry ${entryIndex}`)
          delete entry['section']
        }


        return entry
      })
      return app
    })
    return ctData
  }

  fixNormalGlueValueInFmtText(ctDataToFix) {
    let ctData = deepCopy(ctDataToFix)
    for (let i = 0; i < ctData['customApparatuses'].length; i++) {
      // console.log(`Custom apparatus ${i}`)
      for (let entryN = 0; entryN < ctData['customApparatuses'][i]['entries'].length; entryN++) {
        // console.log(`Entry ${entryN}`)
        for (let subEntryN = 0; subEntryN < ctData['customApparatuses'][i]['entries'][entryN]['subEntries'].length ; subEntryN++) {
          // console.log(`Sub entry ${subEntryN}`)
          if (ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText !== undefined) {
            // this is a custom entry, other types do not have a fmtText
            ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText =
              ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText.map( (token) => {
                if (token.type === 'glue' && token.space === -1) {
                  token.space = DEFAULT_GLUE_SPACE
                }
                return token
              })
          }
        }
      }
    }
    return ctData
  }

}