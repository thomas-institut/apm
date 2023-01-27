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
import { ApparatusEntry } from '../ApparatusEntry.mjs'
import { ApparatusSubEntry } from '../ApparatusSubEntry.mjs'
import * as ApparatusType from '../ApparatusType'
import * as SubEntryType from '../SubEntryType.mjs'
import * as SubEntrySource from '../SubEntrySource.mjs'
import { pushArray } from '../../toolbox/ArrayUtil.mjs'
import { ApparatusCommon } from '../../EditionComposer/ApparatusCommon.js'
import { SiglaGroup } from '../SiglaGroup.mjs'
import { deepCopy } from '../../toolbox/Util.mjs'
import { WitnessDataItem } from '../WitnessDataItem.mjs'

export class CtDataEditionGenerator extends EditionGenerator{
  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'CtDataEditionGenerator'})

    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
    this.debug = true
  }

  generateEdition () {
    // console.log(`Generating edition from ctData`)
    // CtData.reportCustomEntries(this.ctData)
    let edition = super.generateEdition()
    let baseWitnessIndex = this.ctData['editionWitnessIndex'] !== undefined ? this.ctData['editionWitnessIndex'] : this.ctData['witnessOrder'][0]
    // console.log(`Base witness index is ${baseWitnessIndex}`)
    edition.setLang(this.ctData['lang'])
    edition.siglaGroups = this.ctData['siglaGroups'].map ( (sg) => { return SiglaGroup.fromObject(sg)})
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
    let apparatusGenerator = new CriticalApparatusGenerator()
    let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatusFromCtData(this.ctData, baseWitnessIndex, edition.mainText)
    // console.log(`Generated critical apparatus before merging custom apparatus entries`)
    // console.log(deepCopy(generatedCriticalApparatus))
    let theMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens.length, edition.mainText)
    generatedCriticalApparatus = this._mergeCustomApparatusCriticusEntries(generatedCriticalApparatus, baseWitnessTokens, theMap, apparatusGenerator)
    // console.log(`Generated critical apparatus before sorting`)
    // console.log(deepCopy(generatedCriticalApparatus))

    edition.apparatuses = [
      generatedCriticalApparatus
    ]

    // this.debug && console.log(`Ordering entries and sub entries`)
    edition.apparatuses = edition.apparatuses.concat(this._getCustomApparatuses(theMap, baseWitnessTokens))
    edition.apparatuses.forEach( (a) => {
      a.sortEntries()
      a.entries.forEach( (entry) => {
        // this.debug && console.log(`Ordering sub entries`)
        // this.debug && console.log(deepCopy(entry.subEntries))
        entry.orderSubEntries()
      })
    })
    return edition
  }

  /**
   *
   * @param {Apparatus} generatedApparatusCriticus
   * @param baseWitnessTokens
   * @param {*[]}ctIndexToMainTextMap
   * @param apparatusGenerator
   * @return {*}
   * @private
   */
  _mergeCustomApparatusCriticusEntries(generatedApparatusCriticus, baseWitnessTokens, ctIndexToMainTextMap, apparatusGenerator) {
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
      this.debug && console.log(`No custom apparatus criticus entries found`)
      return  generatedApparatusCriticus
    }
    let customApparatusCriticus = filteredCustomApparatusArray[0]

    // this.debug && console.log(`Merging custom apparatus criticus entries`)
    // let generatedApparatusCriticusCopy = deepCopy(generatedApparatusCriticus)
    // this.debug && console.log(`Initial generated apparatus criticus`)
    // this.debug && console.log(generatedApparatusCriticusCopy)
    customApparatusCriticus.entries.forEach( (ctDataCustomEntry, i) => {
      // this.debug && console.log(`Processing custom entry ${i}`)
      if (ctIndexToMainTextMap[ctDataCustomEntry.from] === undefined) {
        // this is an entry to an empty token in the main text
        console.warn(`Custom apparatus criticus entry for an empty token, from ${ctDataCustomEntry.from} to ${ctDataCustomEntry.to}, lemmaText: '${ctDataCustomEntry.lemmaText}'`)
        console.log('ctIndexToMainTextMap')
        console.log(ctIndexToMainTextMap)
        return
      }
      let mainTextFrom = ctIndexToMainTextMap[ctDataCustomEntry.from]
      if (ctIndexToMainTextMap[ctDataCustomEntry.to] === undefined) {
        // this should not happen anymore!
        console.warn(`Oded's bug, 2021 Nov 04`)
        console.log(`Index ${ctDataCustomEntry.to} not defined in ctIndexToMainTextMap`)
        console.log(`Custom Entry`)
        console.log(ctDataCustomEntry)
        console.log(`ctIndexToMainTextMap`)
        console.log(ctIndexToMainTextMap)
      }
      let mainTextTo = ctIndexToMainTextMap[ctDataCustomEntry.to]
      if (mainTextTo === -1) {
         this.debug && console.log(`Custom entry with mainTextTo === -1`)
         this.debug && console.log(ctDataCustomEntry)
         mainTextTo = apparatusGenerator._findNonEmptyMainTextToken(ctDataCustomEntry.to, ctIndexToMainTextMap, baseWitnessTokens, false, this.ctData['lang'] )
         this.debug && console.log(`New mainTextTo = ${mainTextTo}`)
        if (ctDataCustomEntry.from === ctDataCustomEntry.to) {
          // hack to avoid a bug found by Corrado on 27 Jan 2022
          mainTextFrom = mainTextTo
        }
      }

      let customSubEntries = ctDataCustomEntry['subEntries'].filter ( (e) => { return e.type !== 'auto'})
      let customAutoSubEntries = ctDataCustomEntry['subEntries'].filter ( (e) => { return e.type === 'auto'})
      if (customAutoSubEntries.length !== 0) {
        this.verbose && console.log(`There are custom auto entries: ${mainTextFrom} -> ${mainTextTo}`)
        this.verbose && console.log(customAutoSubEntries)
      }

      let currentEntryIndex = generatedApparatusCriticus.findEntryIndex( mainTextFrom, mainTextTo)
      if (currentEntryIndex === -1) {
        // this.debug && console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        if (this.hasLemmaCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          this.debug && console.log(`Adding new apparatus entry for lemma ${ctDataCustomEntry['lemma']}`)
          let newEntry = new ApparatusEntry()
          newEntry.from = mainTextFrom
          newEntry.to = mainTextTo
          newEntry.preLemma = ctDataCustomEntry['preLemma']
          newEntry.lemma = ctDataCustomEntry['lemma']
          newEntry.postLemma = ctDataCustomEntry['postLemma']
          newEntry.separator = ctDataCustomEntry['separator']
          newEntry.lemmaText = ApparatusCommon.getMainTextForGroup({ from: ctDataCustomEntry['from'], to: ctDataCustomEntry['to'] },
              baseWitnessTokens, false, this.ctData['lang'])

          newEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(customSubEntries)
          generatedApparatusCriticus.entries.push(newEntry)
        }
        else {
          this.debug && console.log(`The custom entry does not have lemma customizations or full custom sub-entries, nothing to add`)
        }
      } else {
        // this.debug && console.log(`Entry belongs to automatic apparatus entry index ${currentEntryIndex}`)
        if (this.hasLemmaCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          generatedApparatusCriticus.entries[currentEntryIndex].preLemma = ctDataCustomEntry['preLemma']
          generatedApparatusCriticus.entries[currentEntryIndex].lemma = ctDataCustomEntry['lemma']
          generatedApparatusCriticus.entries[currentEntryIndex].postLemma = ctDataCustomEntry['postLemma']
          generatedApparatusCriticus.entries[currentEntryIndex].separator = ctDataCustomEntry['separator']
          let subEntryArray = this._buildSubEntryArrayFromCustomSubEntries(customSubEntries)
          // this.debug && console.log(`Full custom sub entries`)
          // this.debug && console.log(deepCopy(subEntryArray))
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries = this.__mergeCustomSubEntries(
            generatedApparatusCriticus.entries[currentEntryIndex].subEntries, subEntryArray)
          // this.debug && console.log(`Sub entries after merging full custom sub entries`)
          // this.debug && console.log(deepCopy(generatedApparatusCriticus.entries[currentEntryIndex].subEntries))
        }
        generatedApparatusCriticus.entries[currentEntryIndex].subEntries = this._applyCustomAutoSubEntriesToGeneratedSubEntries(
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries,
          customAutoSubEntries
        )
        // this.debug && console.log(`Sub entries after applying custom auto sub entries`)
        // this.debug && console.log(deepCopy(generatedApparatusCriticus.entries[currentEntryIndex].subEntries))
        // no ordering of sub-entries here, it will be done by generateEdition as the last step
      }
    })
    generatedApparatusCriticus.sortEntries()

    return generatedApparatusCriticus
  }


  /**
   * Merges custom sub entries
   * @private
   * @param {ApparatusSubEntry[]}currentSubEntries
   * @param {ApparatusSubEntry[]}newSubEntries
   */
  __mergeCustomSubEntries(currentSubEntries, newSubEntries) {
    // 1. include all automatic subentries
    let mergedArray = currentSubEntries.filter( (se) => { return se.source === 'auto' })
    pushArray(mergedArray, newSubEntries.filter( (se) => { return se.source === 'auto' }) )

    // 2. get all custom sub entries
    let fullCustomSubEntries = currentSubEntries.filter( (se) => { return se.source !== 'auto' })
    pushArray(fullCustomSubEntries, newSubEntries.filter( (se) => {  return se.source !== 'auto' }) )
    pushArray(mergedArray, fullCustomSubEntries)
    return mergedArray
  }

  hasLemmaCustomizations(customEntry) {
    let vars = ['preLemma', 'lemma', 'postLemma', 'separator']
    for (let i=0; i < vars.length; i++) {
      if (customEntry[vars[i]] !== '') {
        return true
      }
    }
    return false
  }

  _applyCustomAutoSubEntriesToGeneratedSubEntries(generatedSubEntries, customAutoSubEntries) {
    // this.debug && console.log(`Applying custom auto sub entries`)
    return generatedSubEntries.map ( (subEntry) => {
      // this.debug && console.log(`subEntry`)
      // this.debug && console.log(subEntry)
      let generatedSubEntryHash = subEntry.hashString()
      let enabled = subEntry.enabled
      let position = subEntry.position
      for (let i = 0; i < customAutoSubEntries.length; i++) {
        let customAutoSubEntry = customAutoSubEntries[i]
        if (customAutoSubEntry['hash'] === generatedSubEntryHash) {
          // match!
          // this.debug && console.log(`Found matching custom auto sub entry with hash ${generatedSubEntryHash}`)
          // this.debug && console.log(customAutoSubEntry)
          enabled = customAutoSubEntry['enabled']
          if (customAutoSubEntry['position'] !== undefined) {
            position = customAutoSubEntry['position']
            // this.debug && console.log(`Position is ${position}`)
          }
          break
        }
      }
      subEntry.enabled = enabled
      subEntry.position = position
      return subEntry
    })
  }

  _buildSubEntryArrayFromCustomSubEntries(customSubEntries) {
    // this.debug && console.log(`Building subEntry array from custom subEntries:`)
    // this.debug && console.log(customSubEntries)
    return customSubEntries.map ( (subEntry) => {
      // this.debug && console.log(`The sub entry`)
      // this.debug && console.log(subEntry)
      let theSubEntry = new ApparatusSubEntry()
      theSubEntry.type = subEntry['type']
      theSubEntry.fmtText = subEntry['fmtText']
      // console.log(`Assigned fmtText`)
      // console.log(theSubEntry.fmtText)
      theSubEntry.source = SubEntrySource.USER
      theSubEntry.enabled = subEntry['enabled']
      theSubEntry.position = subEntry['position']
      if (subEntry['witnessData'] === undefined) {
        theSubEntry.witnessData = []
      } else {
        theSubEntry.witnessData = subEntry['witnessData'].map( (ctDataWitnessDataItem) => {
          let dataItem = new WitnessDataItem()
          dataItem.witnessIndex = ctDataWitnessDataItem['witnessIndex']
          dataItem.hand = ctDataWitnessDataItem['hand'] ?? 0
          dataItem.location = ctDataWitnessDataItem['location'] ?? ''
          dataItem.forceHandDisplay = ctDataWitnessDataItem['forceHandDisplay'] ?? false
          return dataItem
        })
      }

      return theSubEntry
    })
  }

  _getCustomApparatuses(ctIndexToMainTextMap, baseWitnessTokens) {
    if (this.ctData['customApparatuses'] === undefined) {
      return []
    }
    return this.ctData['customApparatuses'].filter( (apparatus) => {
      // filter out custom entries from apparatus criticus
      return apparatus.type !== ApparatusType.CRITICUS
    }).map ( (apparatus) => {
      let theApparatus = new Apparatus()
      theApparatus.type = apparatus['type']
      theApparatus.entries = apparatus['entries'].map ( (customEntry) => {
        let theEntry = new ApparatusEntry()
        theEntry.lemma = customEntry['lemma']
        theEntry.preLemma = customEntry['preLemma']
        theEntry.postLemma = customEntry['postLemma']
        theEntry.separator = customEntry['separator']
        theEntry.lemmaText = ApparatusCommon.getMainTextForGroup({ from: customEntry['from'], to: customEntry['to'] },
            baseWitnessTokens, false, this.ctData['lang'])

        theEntry.from = ctIndexToMainTextMap[customEntry['from']]
        theEntry.to = ctIndexToMainTextMap[customEntry['to']]
        theEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(customEntry['subEntries'])
        return theEntry
      })
      theApparatus.sortEntries()
      return theApparatus
    })
  }
}