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
import * as CollationTableType from '../../Witness/WitnessTokenClass'
import { CollationTableConsistencyCleaner } from './CollationTableConsistencyCleaner'
import { EditionWitnessReferencesCleaner } from './EditionWitnessReferencesCleaner'
import { EDITION } from '../../constants/CollationTableType'


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

    // fix -1 references in edition witness
    if (this.ctData['type'] === CollationTableType.EDITION) {
      let referencesCleaner = new EditionWitnessReferencesCleaner({verbose: this.verbose})
      this.ctData = referencesCleaner.getCleanCtData(this.ctData)
    }

    // consistency check
    let consistencyCleaner = new CollationTableConsistencyCleaner({verbose: this.verbose})
    this.ctData = consistencyCleaner.getCleanCtData(this.ctData)


    if (this.ctData['type'] === CollationTableType.EDITION) {
      this.ctData = this.cleanCustomApparatusesOnePointOne(this.ctData)
      // this may not be necessary
      this.ctData = CtData.fixFmtText(this.ctData)
    }

    return this.ctData
  }

  cleanCustomApparatusesOnePointOne(ctDataToClean) {
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

    // FILTER OUT entries associated with empty edition witness tokens
    // Apparatus entries can only be attached to actual main text, that is
    // to edition witness tokens containing some text. The possibly
    // confusing case is addition entries, which are generated based on the
    // fact that in a given collation table column there is no text in
    // the edition witness but there is some in the other witnesses. Addition
    // entries, however, are ultimately associated with the first word in the
    // main text before the addition.
    // There could be entries associated with empty edition witness tokens
    // simply because the user deleted main text.

    let editionWitnessTokens = ctData['witnesses'][ctData['editionWitnessIndex']].tokens
    let ctTableRow = ctData['collationMatrix'][ctData['editionWitnessIndex']]
    for (let ai = 0; ai < ctData['customApparatuses'].length; ai++) {
      let appType = ctData['customApparatuses'][ai].type
      ctData['customApparatuses'][ai].entries =
        ctData['customApparatuses'][ai].entries.filter( (entry, ei) => {
          let fromTokenIndex = ctTableRow[entry.from]
          let toTokenIndex = ctTableRow[entry.to]
          let allEmpty = true
          for (let i = fromTokenIndex; i <=toTokenIndex; i++) {
            if (editionWitnessTokens[i].tokenType !== 'empty') {
              allEmpty = false
              break
            }
          }
          if (allEmpty) {
            console.warn(`Filtering out custom apparatus entry associated with empty edition witness tokens app '${appType}' entry ${ei}: ${fromTokenIndex} to ${toTokenIndex}`)
            console.log(entry)
            return false
          }
          return true
        })
    }
    return ctData
  }
}