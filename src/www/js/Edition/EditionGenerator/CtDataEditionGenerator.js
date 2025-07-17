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
import { CriticalApparatusGenerator } from './CriticalApparatusGenerator'
import { EditionWitnessInfo } from '../EditionWitnessInfo'
import { Apparatus } from '../Apparatus'
import { ApparatusEntry } from '../ApparatusEntry.mjs'
import { ApparatusSubEntry } from '../ApparatusSubEntry.mjs'
import * as ApparatusType from '../../constants/ApparatusType'
import * as SubEntrySource from '../SubEntrySource.mjs'
import * as SubEntryType from '../SubEntryType.mjs'
import { pushArray } from '../../toolbox/ArrayUtil.mjs'
import { ApparatusCommon } from '../../EditionComposer/ApparatusCommon.js'
import { SiglaGroup } from '../SiglaGroup.mjs'
import { WitnessDataItem } from '../WitnessDataItem.mjs'
import { MarginalFoliationGenerator } from './MarginalFoliationGenerator'

export class CtDataEditionGenerator extends EditionGenerator{
  constructor (options) {
    super(options)
    let optionsSpec = {
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker(
      {optionsDefinition: optionsSpec, context: 'CtDataEditionGenerator'}
    );

    this.options = oc.getCleanOptions(options);

    /** @member {CtDataInterface} ctData */
    this.ctData = this.options.ctData
    /** @member {boolean} debug */
    this.debug = false
  }

  generateEdition () {
    let edition = super.generateEdition();

    let baseWitnessIndex = this.ctData.editionWitnessIndex ?? this.ctData.witnessOrder[0]
    edition.setLang(this.ctData.lang);
    edition.siglaGroups = this.ctData.siglaGroups.map ( (sg) => { return SiglaGroup.fromObject(sg)});
    edition.infoText = `Edition from ctData, chunkId ${this.ctData.chunkId}, baseWitnessIndex: ${baseWitnessIndex}`;
    edition.info = {
      source: 'ctData',
      tableId: this.ctData.tableId,
      singleChunk: true,
      chunkId: this.ctData.chunkId,
      baseWitnessIndex: baseWitnessIndex
    }
    edition.witnesses = this.ctData.sigla.map( (s, i) => {
      return new EditionWitnessInfo().setSiglum(s).setTitle(this.ctData.witnessTitles[i])
    });





    let baseWitnessTokens = CtData.getCtWitnessTokens(
      this.ctData,
      baseWitnessIndex
    );
    edition.setMainText(
      EditionMainTextGenerator.generateMainText(
        baseWitnessTokens,
        false,
        [],
        edition.getLang()
      )
    );
    // Automatic apparatus criticus
    let apparatusGenerator = new CriticalApparatusGenerator();
    let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatusFromCtData(
      this.ctData,
      baseWitnessIndex,
      edition.mainText
    );

    let theMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(
      baseWitnessTokens.length,
      edition.mainText
    );
    generatedCriticalApparatus = this._mergeCustomApparatusEntries(
      ApparatusType.CRITICUS,
      generatedCriticalApparatus,
      baseWitnessTokens,
      theMap
    );

    // Automatic marginalia
    const marginalFoliationGenerator = new MarginalFoliationGenerator(this.ctData);
    const autoMarginaliaApparatus = marginalFoliationGenerator.generateMarginaliaApparatus(edition.mainText);
    console.log('autoMarginaliaApparatus', autoMarginaliaApparatus);

    let mergedMarginaliaApparatus = this._mergeCustomApparatusEntries(
      ApparatusType.MARGINALIA,
      autoMarginaliaApparatus,
      baseWitnessTokens,
      theMap
    );
    edition.apparatuses = [
      generatedCriticalApparatus,
      mergedMarginaliaApparatus
    ];

    // Now add vertical bars for foliation changes in the main text


    edition.apparatuses = edition.apparatuses.concat(
      this._getCustomApparatuses(theMap, baseWitnessTokens)
    );
    edition.apparatuses.forEach( (a) => {
      a.sortEntries();
      a.entries.forEach( (entry) => {
        entry.orderSubEntries()
      })
    });
    return edition
  }

  /**
   *
   * @param apparatusType
   * @return {Apparatus|null}
   * @private
   */
  _getCustomEntriesForApparatusType(apparatusType){
    if (this.ctData.customApparatuses === undefined) {
      return null;
    }
    let filteredCustomApparatusArray = this.ctData.customApparatuses.filter(
      (apparatus) => {
        // filter out custom entries from apparatus criticus
        return apparatus.type === apparatusType
      }
    );
    if (filteredCustomApparatusArray.length === 0) {
      // no custom entries
      this.debug && console.log(`No custom apparatus criticus entries found`)
      return null;
    }
    return filteredCustomApparatusArray[0]
  }
  /**
   *
   * @param {string}apparatusType
   * @param {Apparatus} generatedApparatus
   * @param {WitnessTokenInterface[]}baseWitnessTokens
   * @param {*[]}ctIndexToMainTextMap
   * @return {Apparatus}
   * @private
   */
  _mergeCustomApparatusEntries(apparatusType, generatedApparatus,
          baseWitnessTokens, ctIndexToMainTextMap) {

    console.log(`Merging custom apparatus entries for apparatus type ${apparatusType}`)

    let customApparatus = this._getCustomEntriesForApparatusType(apparatusType);
    if (customApparatus === null) {
      return generatedApparatus;
    }

    customApparatus.entries.forEach( (ctDataCustomEntry) => {
      if (ctIndexToMainTextMap[ctDataCustomEntry.from] === undefined) {
        // this is an entry to an empty token in the main text
        console.warn(`Custom apparatus criticus entry for an empty token, from` +
          `${ctDataCustomEntry.from} to ${ctDataCustomEntry.to}, lemmaText: '${ctDataCustomEntry.lemmaText}'`)
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
         mainTextTo = CtData.findNonEmptyMainTextToken(
           ctDataCustomEntry.to,
           ctIndexToMainTextMap,
           baseWitnessTokens,
           false,
           this.ctData['lang']
         );
         this.debug && console.log(`New mainTextTo = ${mainTextTo}`)
        if (ctDataCustomEntry.from === ctDataCustomEntry.to) {
          // hack to avoid a bug found by Corrado on 27 Jan 2022
          mainTextFrom = mainTextTo
        }
      }

      const autoSubEntryTypes = [ SubEntryType.AUTO, SubEntryType.AUTO_FOLIATION];

      let customSubEntries = ctDataCustomEntry.subEntries.filter (
        (se) => { return autoSubEntryTypes.indexOf(se.type) === -1}
      );
      let customAutoSubEntries = ctDataCustomEntry.subEntries.filter (
        (se) => { return autoSubEntryTypes.indexOf(se.type) !== -1}
      );
      if (customAutoSubEntries.length !== 0) {
        this.verbose && console.log(`There are custom auto entries: ${mainTextFrom} -> ${mainTextTo}`)
        this.verbose && console.log(customAutoSubEntries)
      }

      let currentEntryIndex = generatedApparatus.findEntryIndex(
        mainTextFrom,
        mainTextTo
      );
      if (currentEntryIndex === -1) {
        // this.debug && console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        if (this.hasEntryCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          this.debug && console.log(`Adding new apparatus entry for lemma ${ctDataCustomEntry.lemma}`)
          let newEntry = new ApparatusEntry();
          newEntry.from = mainTextFrom;
          newEntry.to = mainTextTo;
          newEntry.preLemma = ctDataCustomEntry.preLemma;
          newEntry.lemma = ctDataCustomEntry.lemma;
          newEntry.postLemma = ctDataCustomEntry.postLemma;
          newEntry.separator = ctDataCustomEntry.separator;
          newEntry.tags = [...ctDataCustomEntry.tags]
          newEntry.lemmaText = ApparatusCommon.getMainTextForGroup(
            { from: ctDataCustomEntry.from, to: ctDataCustomEntry.to },
              baseWitnessTokens,
            false,
            this.ctData.lang
          );
          newEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(customSubEntries);
          generatedApparatus.entries.push(newEntry);
        }
        else {
          this.debug &&
          console.log(`The custom entry does not have lemma customizations or full custom sub-entries, nothing to add`);
        }
      } else {
        // this.debug && console.log(`Entry belongs to automatic apparatus entry index ${currentEntryIndex}`)
        if (this.hasEntryCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          generatedApparatus.entries[currentEntryIndex].preLemma = ctDataCustomEntry.preLemma;
          generatedApparatus.entries[currentEntryIndex].lemma = ctDataCustomEntry.lemma;
          generatedApparatus.entries[currentEntryIndex].postLemma = ctDataCustomEntry.postLemma;
          generatedApparatus.entries[currentEntryIndex].separator = ctDataCustomEntry.separator;
          generatedApparatus.entries[currentEntryIndex].tags = [...ctDataCustomEntry.tags];
          let subEntryArray =
            this._buildSubEntryArrayFromCustomSubEntries(customSubEntries);
          generatedApparatus.entries[currentEntryIndex].subEntries = this.__mergeCustomSubEntries(
            generatedApparatus.entries[currentEntryIndex].subEntries,
            subEntryArray
          );
        }
        generatedApparatus.entries[currentEntryIndex].subEntries =
          this._applyCustomAutoSubEntriesToGeneratedSubEntries(
          generatedApparatus.entries[currentEntryIndex].subEntries,
          customAutoSubEntries
        );
      }
    });
    generatedApparatus.sortEntries();
    return generatedApparatus;
  }


  /**
   * Merges custom sub entries
   * @private
   * @param {ApparatusSubEntry[]}currentSubEntries
   * @param {ApparatusSubEntry[]}newSubEntries
   */
  __mergeCustomSubEntries(currentSubEntries, newSubEntries) {
    // 1. include all automatic subentries
    let mergedArray = currentSubEntries.filter(
      (se) => { return se.source === SubEntrySource.AUTO }
    );
    pushArray(
      mergedArray,
      newSubEntries.filter( (se) => { return se.source === SubEntrySource.AUTO })
    );

    // 2. get all custom sub entries
    let fullCustomSubEntries = currentSubEntries.filter(
      (se) => { return se.source !== SubEntrySource.AUTO }
    );
    pushArray(
      fullCustomSubEntries,
      newSubEntries.filter( (se) => {  return se.source !== SubEntrySource.AUTO })
    );
    pushArray(mergedArray, fullCustomSubEntries);
    return mergedArray;
  }


  hasEntryCustomizations(customEntry) {
    if (customEntry['tags'].length !==0) {
      return true
    }
    let vars = ['preLemma', 'lemma', 'postLemma', 'separator']
    for (let i=0; i < vars.length; i++) {
      if (customEntry[vars[i]] !== '') {
        return true
      }
    }
    return false
  }

  /**
   *
   * @param {ApparatusSubEntry[]}generatedSubEntries
   * @param {ApparatusSubEntry[]}customAutoSubEntries
   * @return {ApparatusSubEntry[]}
   * @private
   */
  _applyCustomAutoSubEntriesToGeneratedSubEntries(generatedSubEntries,
    customAutoSubEntries) {

    return generatedSubEntries.map ( (subEntry) => {
      let generatedSubEntryHash = subEntry.hashString();
      let enabled = subEntry.enabled
      let position = subEntry.position
      for (let i = 0; i < customAutoSubEntries.length; i++) {
        let customAutoSubEntry = customAutoSubEntries[i]
        if (customAutoSubEntry['hash'] === generatedSubEntryHash) {
          enabled = customAutoSubEntry.enabled
          if (customAutoSubEntry.position !== undefined) {
            position = customAutoSubEntry.position
          }
          break
        }
      }
      subEntry.enabled = enabled
      subEntry.position = position
      return subEntry
    })
  }

  /**
   *
   * @param {ApparatusSubEntry[]}customSubEntries
   * @return {ApparatusSubEntry[]}
   * @private
   */
  _buildSubEntryArrayFromCustomSubEntries(customSubEntries) {
    // this.debug && console.log(`Building subEntry array from custom subEntries:`)
    // this.debug && console.log(customSubEntries)
    return customSubEntries.map ( (subEntry) => {
      let theSubEntry = new ApparatusSubEntry()
      theSubEntry.type = subEntry.type;
      theSubEntry.fmtText = subEntry.fmtText;
      theSubEntry.source = SubEntrySource.USER;
      theSubEntry.enabled = subEntry.enabled;
      theSubEntry.position = subEntry.position;
      theSubEntry.keyword = subEntry.keyword;
      theSubEntry.tags = [...subEntry.tags];
      if (subEntry['witnessData'] === undefined) {
        theSubEntry.witnessData = []
      } else {
        theSubEntry.witnessData = subEntry.witnessData.map( (ctDataWitnessDataItem) => {
          let dataItem = new WitnessDataItem()
          dataItem.witnessIndex = ctDataWitnessDataItem.witnessIndex;
          dataItem.hand = ctDataWitnessDataItem.hand ?? 0
          dataItem.location = ctDataWitnessDataItem.location ?? ''
          dataItem.forceHandDisplay = ctDataWitnessDataItem.forceHandDisplay ?? false
          return dataItem
        })
      }
      return theSubEntry
    })
  }

  /**
   *
   * @param {number[]}ctIndexToMainTextMap
   * @param {WitnessTokenInterface[]}baseWitnessTokens
   * @return {Apparatus[]|*[]}
   * @private
   */
  _getCustomApparatuses(ctIndexToMainTextMap, baseWitnessTokens) {
    if (this.ctData.customApparatuses === undefined) {
      return []
    }
    return this.ctData.customApparatuses.filter( (apparatus) => {
      // filter out custom entries from apparatus criticus and marginalia
      return [ ApparatusType.CRITICUS, ApparatusType.MARGINALIA ].indexOf(apparatus.type) === -1
    }).map ( (apparatus) => {
      let theApparatus = new Apparatus()
      theApparatus.type = apparatus.type
      theApparatus.entries = apparatus.entries.map ( (customEntry) => {
        let theEntry = new ApparatusEntry()
        theEntry.lemma = customEntry.lemma;
        theEntry.preLemma = customEntry.preLemma;
        theEntry.postLemma = customEntry.postLemma;
        theEntry.separator = customEntry.separator
        theEntry.tags = [...customEntry.tags];
        theEntry.lemmaText = ApparatusCommon.getMainTextForGroup({ from: customEntry.from, to: customEntry.to },
            baseWitnessTokens, false, this.ctData.lang)

        theEntry.from = ctIndexToMainTextMap[customEntry.from]
        theEntry.to = ctIndexToMainTextMap[customEntry.to]
        theEntry.subEntries = this._buildSubEntryArrayFromCustomSubEntries(customEntry.subEntries)
        return theEntry
      })
      theApparatus.sortEntries()
      return theApparatus
    })
  }
}