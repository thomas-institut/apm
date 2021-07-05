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
import { EditionMainTextGenerator } from '../../EditionMainTextGenerator.mjs'
import { CtData } from '../../CtData/CtData'
import { CriticalApparatusGenerator } from '../../CriticalApparatusGenerator'
import { EditionWitnessInfo } from '../EditionWitnessInfo'
import { Apparatus } from '../Apparatus'
import { ApparatusEntry } from '../ApparatusEntry'
import { ApparatusSubEntry } from '../ApparatusSubEntry'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory'
import * as ApparatusType from '../ApparatusType'

export class CtDataEditionGenerator extends EditionGenerator{
  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker(optionsSpec, 'CtDataEditionGenerator')

    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
  }

  generateEdition () {
    console.log(`Generating edition from ctData`)
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
    let baseWitnessTokens = CtData.getCtWitnessTokens(this.ctData, this.ctData['editionWitnessIndex'])
    edition.setMainText(EditionMainTextGenerator.generateMainTextNew(baseWitnessTokens))
    edition.mainTextSections[0].id = this.ctData['chunkId']
    let apparatusGenerator = new CriticalApparatusGenerator()
    let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatusFromCtData(this.ctData, baseWitnessIndex, edition.mainTextSections)
    let theMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens, edition.mainTextSections)
    generatedCriticalApparatus = this._mergeCustomApparatusCriticusEntries(generatedCriticalApparatus, theMap)
    edition.apparatuses = [
      generatedCriticalApparatus
    ]

    edition.apparatuses = edition.apparatuses.concat(this._getCustomApparatuses(theMap))
    return edition
  }

  _mergeCustomApparatusCriticusEntries(generatedApparatusCriticus, ctIndexToMainTextMap) {
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

    console.log(`Merging custom apparatus criticus entries`)
    customApparatusCriticus.entries.forEach( (customEntry) => {
      let mainTextFrom = ctIndexToMainTextMap[customEntry.from].textIndex
      let mainTextTo = ctIndexToMainTextMap[customEntry.to].textIndex
      let currentEntryIndex = generatedApparatusCriticus.findEntryIndex( [0], mainTextFrom, mainTextTo)
      if (currentEntryIndex === -1) {
        console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        let newEntry = new ApparatusEntry()
        newEntry.from = mainTextFrom
        newEntry.to = mainTextTo
        newEntry.lemma = customEntry['lemma']
        newEntry.section = customEntry['section']
        newEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(customEntry['subEntries'])
        generatedApparatusCriticus.entries.push(newEntry)
      } else {
        console.log(`Found entry for index ${currentEntryIndex}`)
        generatedApparatusCriticus.entries[currentEntryIndex].subEntries =
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries.concat(this._buildSubEntryArrayFromCustomSubEntries(customEntry['subEntries']))
      }
    })
    generatedApparatusCriticus.sortEntries()

    return generatedApparatusCriticus
  }

  _buildSubEntryArrayFromCustomSubEntries(customSubEntries) {
    return customSubEntries.map ( (subEntry) => {
      let theSubEntry = new ApparatusSubEntry()
      theSubEntry.type = subEntry['type']
      // TODO: use fmtText field
      theSubEntry.fmtText = FmtTextFactory.fromAnything(subEntry['plainText'])
      // TODO: support other sub entry types
      return theSubEntry
    })
  }
  _getCustomApparatuses(ctIndexToMainTextMap) {
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
      return theApparatus
    })
  }
}