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
import { ApparatusCommon } from '../../EditionComposer/ApparatusCommon'
import { SiglaGroup } from '../SiglaGroup'
import { deepCopy } from '../../toolbox/Util.mjs'

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
    let theMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens.length, edition.mainText)
    console.log(`Generated critical apparatus`)
    console.log(generatedCriticalApparatus)
    console.log(`CtIndexToMainTextMap`)
    console.log(theMap)
    generatedCriticalApparatus = this._mergeCustomApparatusCriticusEntries(generatedCriticalApparatus, baseWitnessTokens, theMap, apparatusGenerator)
    edition.apparatuses = [
      generatedCriticalApparatus
    ]

    edition.apparatuses = edition.apparatuses.concat(this._getCustomApparatuses(theMap, baseWitnessTokens))
    edition.apparatuses.forEach( (a) => {
      a.sortEntries()
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

    this.debug && console.log(`Merging custom apparatus criticus entries`)
    let currentAppCriticus = deepCopy(generatedApparatusCriticus)
    this.debug && console.log(`Initial generated apparatus criticus`)
    this.debug && console.log(currentAppCriticus)
    customApparatusCriticus.entries.forEach( (customEntry, i) => {
      this.debug && console.log(`Processing custom entry ${i}`)
      if (ctIndexToMainTextMap[customEntry.from] === undefined) {
        // this is an entry to an empty token in the main text
        console.warn(`Custom apparatus criticus entry for an empty token, from ${customEntry.from} to ${customEntry.to}, lemmaText: '${customEntry.lemmaText}'`)
        console.log('ctIndexToMainTextMap')
        console.log(ctIndexToMainTextMap)
        return
      }
      let mainTextFrom = ctIndexToMainTextMap[customEntry.from]
      if (ctIndexToMainTextMap[customEntry.to] === undefined) {
        console.warn(`Oded's bug, 2021 Nov 04`)
        console.log(`Index ${customEntry.to} not defined in ctIndexToMainTextMap`)
        console.log(`Custom Entry`)
        console.log(customEntry)
        console.log(`ctIndexToMainTextMap`)
        console.log(ctIndexToMainTextMap)
      }
      let mainTextTo = ctIndexToMainTextMap[customEntry.to]
      if (mainTextTo === -1) {
         this.debug && console.log(`Custom entry with mainTextTo === -1`)
         this.debug && console.log(customEntry)
         mainTextTo = apparatusGenerator._findNonEmptyMainTextToken(customEntry.to, ctIndexToMainTextMap, baseWitnessTokens, false, this.ctData['lang'] )
         this.debug && console.log(`New mainTextTo = ${mainTextTo}`)
        if (customEntry.from === customEntry.to) {
          // hack to avoid a bug found by Corrado on 27 Jan 2022
          mainTextFrom = mainTextTo
        }
      }
      let currentEntryIndex = generatedApparatusCriticus.findEntryIndex( mainTextFrom, mainTextTo)
      let fullCustomSubEntries = customEntry['subEntries'].filter ( (e) => { return e.type === SubEntryType.FULL_CUSTOM})

      let customAutoSubEntries = customEntry['subEntries'].filter ( (e) => { return e.type === SubEntryType.AUTO})
      if (customAutoSubEntries.length !== 0) {
        this.verbose && console.log(`There are custom auto entries: ${mainTextFrom} -> ${mainTextTo}`)
        this.verbose && console.log(customAutoSubEntries)
      }
      if (currentEntryIndex === -1) {
        this.debug && console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        if (this.hasLemmaCustomizations(customEntry) || fullCustomSubEntries.length !== 0) {
          this.debug && console.log(`Adding new apparatus entry for lemma ${customEntry['lemma']}`)
          let newEntry = new ApparatusEntry()
          newEntry.from = mainTextFrom
          newEntry.to = mainTextTo
          newEntry.preLemma = customEntry['preLemma']
          newEntry.lemma = customEntry['lemma']
          newEntry.postLemma = customEntry['postLemma']
          newEntry.separator = customEntry['separator']
          newEntry.lemmaText = ApparatusCommon.getMainTextForGroup({ from: customEntry['from'], to: customEntry['to'] },
              baseWitnessTokens, false, this.ctData['lang'])

          newEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(fullCustomSubEntries)
          generatedApparatusCriticus.entries.push(newEntry)
        }
        else {
          this.debug && console.log(`The custom entry does not have lemma customizations or full custom sub-entries, nothing to add`)
        }
      } else {
        this.debug && console.log(`Entry belongs to automatic apparatus entry index ${currentEntryIndex}`)
        if (this.hasLemmaCustomizations(customEntry) || fullCustomSubEntries.length !== 0) {
          generatedApparatusCriticus.entries[currentEntryIndex].preLemma = customEntry['preLemma']
          generatedApparatusCriticus.entries[currentEntryIndex].lemma = customEntry['lemma']
          generatedApparatusCriticus.entries[currentEntryIndex].postLemma = customEntry['postLemma']
          generatedApparatusCriticus.entries[currentEntryIndex].separator = customEntry['separator']
          let subEntryArray = this._buildSubEntryArrayFromCustomSubEntries(fullCustomSubEntries)
          // pushArray(generatedApparatusCriticus.entries[currentEntryIndex].subEntries, subEntryArray)
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries = this.__mergeCustomSubEntries(
            generatedApparatusCriticus.entries[currentEntryIndex].subEntries, subEntryArray)
        }
        generatedApparatusCriticus.entries[currentEntryIndex].subEntries = this._applyCustomAutoSubEntriesToGeneratedSubEntries(
          generatedApparatusCriticus.entries[currentEntryIndex].subEntries,
          customAutoSubEntries
        )
      }
    })
    generatedApparatusCriticus.sortEntries()

    return generatedApparatusCriticus
  }

  /**
   * Merges custom sub entries
   * For now, this enforces a single custom sub entry per array, later on this restriction should be removed
   * @private
   * @param {ApparatusSubEntry[]}currentSubEntries
   * @param {ApparatusSubEntry[]}newSubEntries
   */
  __mergeCustomSubEntries(currentSubEntries, newSubEntries) {
    // 1. include all sub-entries that are not full custom
    let mergedArray = currentSubEntries.filter( (se) => { return se.type !== SubEntryType.FULL_CUSTOM })
    pushArray(mergedArray, newSubEntries.filter( (se) => { return se.type !== SubEntryType.FULL_CUSTOM }) )

    // 2. get all full custom sub entries
    let fullCustomSubEntries = currentSubEntries.filter( (se) => { return se.type === SubEntryType.FULL_CUSTOM })
    pushArray(fullCustomSubEntries, newSubEntries.filter( (se) => { return se.type === SubEntryType.FULL_CUSTOM }) )
    if (fullCustomSubEntries.length === 0) {
      return mergedArray
    }
    if (fullCustomSubEntries.length >= 1) {
      // just add the first one
      if (fullCustomSubEntries.length > 1) {
        console.warn(`There are ${fullCustomSubEntries.length} custom sub entries for this entry, adding only the first one`)
        console.log(fullCustomSubEntries[0])
      }
      mergedArray.push(fullCustomSubEntries[0])
      return mergedArray
    }
    // // there are more than one, just concat the FmtText of all sub-entries into the first one
    // let theFullCustomSubEntry = fullCustomSubEntries[0]
    // for (let i = 1; i < fullCustomSubEntries.length; i++) {
    //   theFullCustomSubEntry.fmtText.push( FmtTextTokenFactory.normalSpace())
    //   pushArray(theFullCustomSubEntry.fmtText, fullCustomSubEntries[i].fmtText)
    // }
    // mergedArray.push(theFullCustomSubEntry)
    // return mergedArray
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
    return generatedSubEntries.map ( (subEntry) => {
      let generatedSubEntryHash = subEntry.hashString()
      let isDisabled = false
      customAutoSubEntries.forEach( (customAutoSubEntry) => {
        if (customAutoSubEntry['hash'] === generatedSubEntryHash) {
          // match!
          isDisabled = !customAutoSubEntry['enabled']
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