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


import { EditionGenerator } from './EditionGenerator'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { EditionMainTextGenerator } from './EditionMainTextGenerator.mjs'
import { CtData } from '../../CtData/CtData'
import { CriticalApparatusGenerator } from '../CriticalApparatusGenerator'
import { EditionWitnessInfo } from '../EditionWitnessInfo'
import { Apparatus } from '../Apparatus'
import { ApparatusEntry } from '../ApparatusEntry'
import { ApparatusSubEntry } from '../ApparatusSubEntry'
import * as ApparatusType from '../ApparatusType'
import * as SubEntryType from '../SubEntryType'
import * as SubEntrySource from '../SubEntrySource'
import { pushArray } from '../../toolbox/ArrayUtil'

export class CtDataEditionGenerator extends EditionGenerator{
  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'CtDataEditionGenerator'})

    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
  }

  generateEdition () {
    // console.log(`Generating edition from ctData`)
    // CtData.reportCustomEntries(this.ctData)
    let edition = super.generateEdition()
    let baseWitnessIndex = this.ctData['editionWitnessIndex'] !== undefined ? this.ctData['editionWitnessIndex'] : this.ctData['witnessOrder'][0]
    edition.setLang(this.ctData['lang'])
    edition.infoText = `Edition from ctData, chunkId ${this.ctData['chunkId']}, baseWitnessIndex: ${baseWitnessIndex}`
    edition.info = {
      source: 'ctData',
      singleChunk: true,
      chunkId: this.ctData['chunkId'],
      baseWitnessIndex: baseWitnessIndex
    }
    edition.witnesses = this.ctData['sigla'].map( (s, i) => {
      return new EditionWitnessInfo().setSiglum(s).setTitle(this.ctData['witnessTitles'][i])
    })
    let baseWitnessTokens = CtData.getCtWitnessTokens(this.ctData, baseWitnessIndex)
    edition.setMainText(EditionMainTextGenerator.generateMainText(baseWitnessTokens, false, [], edition.getLang()))
    edition.mainTextSections[0].id = this.ctData['chunkId']
    let apparatusGenerator = new CriticalApparatusGenerator()
    let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatusFromCtData(this.ctData, baseWitnessIndex, edition.mainTextSections)
    let theMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens, edition.mainTextSections)
    generatedCriticalApparatus = this._mergeCustomApparatusCriticusEntries(generatedCriticalApparatus, theMap)
    edition.apparatuses = [
      generatedCriticalApparatus
    ]

    edition.apparatuses = edition.apparatuses.concat(this._getCustomApparatuses(theMap))
    edition.apparatuses.forEach( (a, i) => {
      a.sortEntries()
    })
    return edition
  }

  /**
   *
   * @param {Apparatus} generatedApparatusCriticus
   * @param {*[]}ctIndexToMainTextMap
   * @return {*}
   * @private
   */
  _mergeCustomApparatusCriticusEntries(generatedApparatusCriticus, ctIndexToMainTextMap) {
    if (this.ctData['customApparatuses'] === undefined) {
      // a simple collation table
      return generatedApparatusCriticus
    }
    let filteredCustomApparatusArray = this.ctData['customApparatuses'].filter( (apparatus) => {
      // filter out custom entries from apparatus criticus
      return apparatus.type === ApparatusType.CRITICUS
    })
    if (filteredCustomApparatusArray.length === 0) {
      // no custom entries
      console.log(`No custom apparatus criticus entries found`)
      return  generatedApparatusCriticus
    }
    let customApparatusCriticus = filteredCustomApparatusArray[0]

    // console.log(`Merging custom apparatus criticus entries`)
    customApparatusCriticus.entries.forEach( (customEntry) => {
      // console.log(`Custom Entry`)
      // console.log(customEntry)
      if (ctIndexToMainTextMap[customEntry.from] === undefined) {
        // this is an entry to an empty token in the main text
        console.warn(`Custom apparatus criticus entry for an empty token, from ${customEntry.from} to ${customEntry.to}, lemma: '${customEntry.lemma}'`)
        console.log('ctIndexToMainTextMap')
        console.log(ctIndexToMainTextMap)
        return
      }
      let mainTextFrom = ctIndexToMainTextMap[customEntry.from].textIndex
      let mainTextTo = ctIndexToMainTextMap[customEntry.to].textIndex
      let currentEntryIndex = generatedApparatusCriticus.findEntryIndex( [0], mainTextFrom, mainTextTo)
      let realCustomSubEntries = customEntry['subEntries'].filter ( (e) => { return e.type !== SubEntryType.DISABLE})
      // console.log(`There are ${realCustomSubEntries.length} custom sub entries`)
      // console.log(realCustomSubEntries)
      // realCustomSubEntries.forEach( (se, i) => { console.log(`Sub entry ${i}`); FmtText.check(se.fmtText)})
      let customDisableEntriesArray = customEntry['subEntries'].filter ( (e) => { return e.type === SubEntryType.DISABLE})
      if (customDisableEntriesArray.length !== 0) {
        this.verbose && console.log(`There are disabled entries: ${mainTextFrom} -> ${mainTextTo}`)
        this.verbose && console.log(customDisableEntriesArray)
      }
      if (currentEntryIndex === -1) {
        // console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        if (realCustomSubEntries.length !== 0) {
          // console.log(`Adding new apparatus entry for lemma ${customEntry['lemma']}`)
          let newEntry = new ApparatusEntry()
          newEntry.from = mainTextFrom
          newEntry.to = mainTextTo
          newEntry.lemma = customEntry['lemma']
          newEntry.section = customEntry['section']
          newEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(realCustomSubEntries)
          generatedApparatusCriticus.entries.push(newEntry)
        }
      } else {
        // console.log(`Found entry for index ${currentEntryIndex}`)
        if (realCustomSubEntries.length !== 0) {
          let subEntryArray = this._buildSubEntryArrayFromCustomSubEntries(realCustomSubEntries)
          // console.log(subEntryArray)
          pushArray(generatedApparatusCriticus.entries[currentEntryIndex].subEntries, subEntryArray)
          // generatedApparatusCriticus.entries[currentEntryIndex].subEntries =
          //   generatedApparatusCriticus.entries[currentEntryIndex].subEntries.concat(this._buildSubEntryArrayFromCustomSubEntries(realCustomSubEntries))
        }
        generatedApparatusCriticus.entries[currentEntryIndex].subEntries = this._applyDisableEntriesArrayToSubEntries(
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries,
          customDisableEntriesArray
        )
      }
    })
    generatedApparatusCriticus.sortEntries()

    return generatedApparatusCriticus
  }

  _applyDisableEntriesArrayToSubEntries(subEntries, disableEntriesArray) {
    return subEntries.map ( (subEntry, i) => {
      // console.log(`Applying sub entry ${i}`)
      // console.log(subEntry)
      let subEntryHash = subEntry.hashString()
      let isDisabled = false
      disableEntriesArray.forEach( (da) => {
        if (da['hash'] === subEntryHash) {
          isDisabled = true
        }
      })
      subEntry.enabled = !isDisabled
      return subEntry
    })

  }

  _buildSubEntryArrayFromCustomSubEntries(customSubEntries) {
    // console.log(`The custom sub entries`)
    // console.log(customSubEntries)
    return customSubEntries.map ( (subEntry) => {
      // console.log(`The sub entry`)
      // console.log(subEntry)
      let theSubEntry = new ApparatusSubEntry()
      theSubEntry.type = subEntry['type']
      theSubEntry.fmtText = subEntry['fmtText']
      // console.log(`Assigned fmtText`)
      // console.log(theSubEntry.fmtText)
      theSubEntry.source = SubEntrySource.USER
      // TODO: support other sub entry types
      return theSubEntry
    })
  }
  _getCustomApparatuses(ctIndexToMainTextMap) {
    if (this.ctData['customApparatuses'] === undefined) {
      return []
    }
    return this.ctData['customApparatuses'].filter( (apparatus) => {
      // filter out custom entries from apparatus criticus
      return apparatus.type !== ApparatusType.CRITICUS
    }).map ( (apparatus) => {
      let theApparatus = new Apparatus()
      theApparatus.type = apparatus['type']
      theApparatus.entries = apparatus['entries'].map ( (entry) => {
        let theEntry = new ApparatusEntry()
        theEntry.lemma = entry['lemma']
        theEntry.section = entry['section']
        theEntry.from = ctIndexToMainTextMap[entry['from']].textIndex
        theEntry.to = ctIndexToMainTextMap[entry['to']].textIndex
        theEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(entry['subEntries'])
        return theEntry
      })
      theApparatus.sortEntries()
      return theApparatus
    })
  }
}