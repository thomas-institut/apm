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

import {OptionsChecker} from '@thomas-inst/optionschecker';
import {CtData} from '@/CtData/CtData';
import {CtDataInterface, WitnessTokenInterface} from "@/CtData/CtDataInterface";
import * as ApparatusType from '@/constants/ApparatusType';

import {EditionGenerator} from './EditionGenerator';
import {CriticalApparatusGenerator} from './CriticalApparatusGenerator';
import {EditionWitnessInfo} from '../EditionWitnessInfo';
import {Apparatus} from '../Apparatus';
import {ApparatusTools} from '../ApparatusTools';
import {ApparatusEntry} from '../ApparatusEntry';
import {ApparatusSubEntry} from '../ApparatusSubEntry';
import * as SubEntrySource from '../SubEntrySource';
import * as SubEntryType from '../SubEntryType';
import {SiglaGroup} from '../SiglaGroup';
import {WitnessDataItem} from '../WitnessDataItem';
import {MarginalFoliationGenerator} from './MarginalFoliationGenerator';
import {FoliationChangeInfoInterface} from "../FoliationChangeInfoInterface";
import {MainTextToken} from "@/Edition/MainTextToken";
import * as WitnessTokenType from "@/Witness/WitnessTokenType";
import {MainTextTokenFactory} from "@/Edition/MainTextTokenFactory";
import * as MainTextTokenType from "@/Edition/MainTextTokenType";
import {Punctuation} from "@/defaults/Punctuation";

export class CtDataEditionGenerator extends EditionGenerator {
  private options: any;
  private readonly ctData: CtDataInterface;
  private readonly lastFoliationChanges: FoliationChangeInfoInterface[];

  constructor(options: any) {
    super(options);
    let optionsSpec = {
      ctData: {type: 'object', required: true}, lastFoliationChanges: {type: 'array', default: []},
    };

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'CtDataEditionGenerator'});

    this.options = oc.getCleanOptions(options);
    this.lastFoliationChanges = this.options.lastFoliationChanges;
    this.ctData = this.options.ctData;
    this.debug = false;
  }


  generateEdition() {
    let edition = super.generateEdition();

    let baseWitnessIndex = this.ctData.editionWitnessIndex ?? this.ctData.witnessOrder[0];
    edition.setLang(this.ctData.lang);
    edition.siglaGroups = this.ctData.siglaGroups.map((sg) => {
      return SiglaGroup.fromObject(sg);
    });
    edition.infoText = `Edition from ctData, chunkId ${this.ctData.chunkId}, baseWitnessIndex: ${baseWitnessIndex}`;
    edition.info = {
      editionId: -1,
      source: 'ctData',
      tableId: this.ctData.tableId,
      singleChunk: true,
      chunkId: this.ctData.chunkId,
      baseWitnessIndex: baseWitnessIndex
    };
    edition.witnesses = this.ctData.sigla.map((s, i) => {
      return new EditionWitnessInfo().setSiglum(s).setTitle(this.ctData.witnessTitles[i]);
    });

    let baseWitnessTokens = CtData.getCtWitnessTokens(this.ctData, baseWitnessIndex);

    // const foliationChanges = marginalFoliationGenerator.getCurrentFoliationChanges();

    edition.setMainText(this.generateMainText(baseWitnessTokens));
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
    generatedCriticalApparatus = this.mergeCustomApparatusEntries(
      ApparatusType.CRITICUS,
      generatedCriticalApparatus,
      baseWitnessTokens,
      theMap
    );

    // Automatic marginalia
    const marginalFoliationGenerator = new MarginalFoliationGenerator(this.ctData, this.lastFoliationChanges);
    const autoMarginaliaApparatus = marginalFoliationGenerator.generateMarginaliaApparatus(edition.mainText);

    let mergedMarginaliaApparatus = this.mergeCustomApparatusEntries(
      ApparatusType.MARGINALIA,
      autoMarginaliaApparatus, baseWitnessTokens,
      theMap
    );
    edition.apparatuses = [generatedCriticalApparatus, mergedMarginaliaApparatus];
    edition.foliationChanges = marginalFoliationGenerator.getCurrentFoliationChanges();

    edition.apparatuses = edition.apparatuses.concat(this.getCustomApparatuses(theMap, baseWitnessTokens));
    edition.apparatuses = edition.apparatuses.map((a) => {
      let appWithSortedEntries = ApparatusTools.sortEntries(a);
      appWithSortedEntries.entries = appWithSortedEntries.entries.map((entry) => {
        return ApparatusEntry.orderSubEntries(entry);
      });
      return appWithSortedEntries;
    });
    return edition;
  }


  /**
   * Returns the custom apparatus of the given type or null if no such apparatus
   * exists.
   *
   * @param apparatusType
   * @private
   */
  private getCustomApparatus(apparatusType: string): Apparatus | null {
    if (this.ctData.customApparatuses === undefined) {
      return null;
    }
    let filteredCustomApparatusArray = this.ctData.customApparatuses.filter((apparatus) => {
      // filter out custom entries from apparatus criticus
      return apparatus.type === apparatusType;
    });
    if (filteredCustomApparatusArray.length === 0) {
      // no custom entries
      this.debug && console.log(`No custom apparatus criticus entries found`);
      return null;
    }
    return filteredCustomApparatusArray[0];
  }

  /**
   *
   * @param apparatusType
   * @param generatedApparatus
   * @param baseWitnessTokens
   * @param ctIndexToMainTextMap
   * @private
   */
  private mergeCustomApparatusEntries(apparatusType: string,
                                      generatedApparatus: Apparatus,
                                      baseWitnessTokens: WitnessTokenInterface[],
                                      ctIndexToMainTextMap: any[]): Apparatus {

    let customApparatus = this.getCustomApparatus(apparatusType);
    if (customApparatus === null) {
      return generatedApparatus;
    }

    customApparatus.entries.forEach((ctDataCustomEntry) => {
      if (ctIndexToMainTextMap[ctDataCustomEntry.from] === undefined) {
        // this is an entry to an empty token in the main text
        console.warn(`Custom apparatus criticus entry for an empty token, from` +
          `${ctDataCustomEntry.from} to ${ctDataCustomEntry.to}, lemmaText: '${ctDataCustomEntry.lemmaText}'`);
        console.log('ctIndexToMainTextMap');
        console.log(ctIndexToMainTextMap);
        return;
      }
      let mainTextFrom = ctIndexToMainTextMap[ctDataCustomEntry.from];
      if (ctIndexToMainTextMap[ctDataCustomEntry.to] === undefined) {
        // this should not happen anymore!
        console.warn(`Oded's bug, 2021 Nov 04`);
        console.log(`Index ${ctDataCustomEntry.to} not defined in ctIndexToMainTextMap`);
        console.log(`Custom Entry`);
        console.log(ctDataCustomEntry);
        console.log(`ctIndexToMainTextMap`);
        console.log(ctIndexToMainTextMap);
      }
      let mainTextTo = ctIndexToMainTextMap[ctDataCustomEntry.to];
      if (mainTextTo === -1) {
        this.debug && console.log(`Custom entry with mainTextTo === -1`);
        this.debug && console.log(ctDataCustomEntry);
        mainTextTo = CtData.findNonEmptyMainTextToken(
          ctDataCustomEntry.to,
          ctIndexToMainTextMap,
          baseWitnessTokens,
          false,
          this.ctData.lang
        );
        this.debug && console.log(`New mainTextTo = ${mainTextTo}`);
        if (ctDataCustomEntry.from === ctDataCustomEntry.to) {
          // hack to avoid a bug found by Corrado on 27 Jan 2022
          mainTextFrom = mainTextTo;
        }
      }

      const autoSubEntryTypes = [SubEntryType.AUTO, SubEntryType.AUTO_FOLIATION];

      let customSubEntries = ctDataCustomEntry.subEntries.filter((se) => {
        return autoSubEntryTypes.indexOf(se.type) === -1;
      });
      let customAutoSubEntries = ctDataCustomEntry.subEntries.filter((se) => {
        return autoSubEntryTypes.indexOf(se.type) !== -1;
      });
      if (customAutoSubEntries.length !== 0) {
        this.verbose && console.log(`There are custom auto entries: ${mainTextFrom} -> ${mainTextTo}`);
        this.verbose && console.log(customAutoSubEntries);
      }

      let currentEntryIndex = ApparatusTools.findEntryIndex(generatedApparatus, mainTextFrom, mainTextTo);
      if (currentEntryIndex === -1) {
        // this.debug && console.log(`Found custom entry not belonging to any automatic apparatus entry`)
        if (this.hasEntryCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          this.debug && console.log(`Adding new apparatus entry for lemma ${ctDataCustomEntry.lemma}`);
          let newEntry = new ApparatusEntry();
          newEntry.from = mainTextFrom;
          newEntry.to = mainTextTo;
          newEntry.preLemma = ctDataCustomEntry.preLemma;
          newEntry.lemma = ctDataCustomEntry.lemma;
          newEntry.postLemma = ctDataCustomEntry.postLemma;
          newEntry.separator = ctDataCustomEntry.separator;
          newEntry.tags = [...ctDataCustomEntry.tags];
          newEntry.lemmaText = ApparatusTools.getMainTextForGroup({
            from: ctDataCustomEntry.from, to: ctDataCustomEntry.to
          }, baseWitnessTokens, false, this.ctData.lang);
          newEntry.subEntries = this.buildSubEntryArrayFromCustomSubEntries(customSubEntries);
          generatedApparatus.entries.push(newEntry);
        } else {
          this.debug && console.log(`The custom entry does not have lemma customizations or full custom sub-entries, nothing to add`);
        }
      } else {
        // this.debug && console.log(`Entry belongs to automatic apparatus entry index ${currentEntryIndex}`)
        if (this.hasEntryCustomizations(ctDataCustomEntry) || customSubEntries.length !== 0) {
          generatedApparatus.entries[currentEntryIndex].preLemma = ctDataCustomEntry.preLemma;
          generatedApparatus.entries[currentEntryIndex].lemma = ctDataCustomEntry.lemma;
          generatedApparatus.entries[currentEntryIndex].postLemma = ctDataCustomEntry.postLemma;
          generatedApparatus.entries[currentEntryIndex].separator = ctDataCustomEntry.separator;
          generatedApparatus.entries[currentEntryIndex].tags = [...ctDataCustomEntry.tags];
          let subEntryArray = this.buildSubEntryArrayFromCustomSubEntries(customSubEntries);
          generatedApparatus.entries[currentEntryIndex].subEntries = this.mergeCustomSubEntries(
            generatedApparatus.entries[currentEntryIndex].subEntries,
            subEntryArray
          );
        }
        generatedApparatus.entries[currentEntryIndex].subEntries =
          this.applyCustomAutoSubEntriesToGeneratedSubEntries(
            generatedApparatus.entries[currentEntryIndex].subEntries,
            customAutoSubEntries
          );
      }
    });

    return ApparatusTools.sortEntries(generatedApparatus);
  }


  /**
   * Merges custom sub entries
   * @private
   * @param {ApparatusSubEntry[]}currentSubEntries
   * @param {ApparatusSubEntry[]}newSubEntries
   */
  private mergeCustomSubEntries(currentSubEntries: ApparatusSubEntry[], newSubEntries: ApparatusSubEntry[]) {
    // 1. include all automatic subentries
    let mergedArray = currentSubEntries.filter((se) => {
      return se.source === SubEntrySource.AUTO;
    });
    mergedArray.push(...newSubEntries.filter((se) => { return se.source === SubEntrySource.AUTO;}))

    // 2. get all custom sub entries
    let fullCustomSubEntries = currentSubEntries.filter((se) => {
      return se.source !== SubEntrySource.AUTO;
    });
    fullCustomSubEntries.push(...newSubEntries.filter((se) => { return se.source !== SubEntrySource.AUTO;}))
    mergedArray.push(...fullCustomSubEntries);
    return mergedArray;
  }


  private hasEntryCustomizations(customEntry: ApparatusEntry) {
    if (customEntry['tags'].length !== 0) {
      return true;
    }
    let vars = ['preLemma', 'lemma', 'postLemma', 'separator'];
    for (let i = 0; i < vars.length; i++) {
      // @ts-ignore
      if (customEntry[vars[i]] !== '') {
        return true;
      }
    }
    return false;
  }

  private applyCustomAutoSubEntriesToGeneratedSubEntries(
    generatedSubEntries: ApparatusSubEntry[], customAutoSubEntries: ApparatusSubEntry[]): ApparatusSubEntry[] {

    return generatedSubEntries.map((subEntry) => {
      let generatedSubEntryHash = subEntry.hashString();
      let enabled = subEntry.enabled;
      let position = subEntry.position;
      for (let i = 0; i < customAutoSubEntries.length; i++) {
        let customAutoSubEntry = customAutoSubEntries[i];
        if (customAutoSubEntry.hash === generatedSubEntryHash) {
          enabled = customAutoSubEntry.enabled;
          if (customAutoSubEntry.position !== undefined) {
            position = customAutoSubEntry.position;
          }
          break;
        }
      }
      subEntry.enabled = enabled;
      subEntry.position = position;
      return subEntry;
    });
  }

  private buildSubEntryArrayFromCustomSubEntries(customSubEntries: ApparatusSubEntry[]): ApparatusSubEntry[] {
    // this.debug && console.log(`Building subEntry array from custom subEntries:`)
    // this.debug && console.log(customSubEntries)
    return customSubEntries.map((subEntry) => {
      let theSubEntry = new ApparatusSubEntry();
      theSubEntry.type = subEntry.type;
      theSubEntry.fmtText = subEntry.fmtText;
      theSubEntry.source = SubEntrySource.USER;
      theSubEntry.enabled = subEntry.enabled;
      theSubEntry.position = subEntry.position;
      theSubEntry.keyword = subEntry.keyword;
      theSubEntry.tags = [...subEntry.tags];
      if (subEntry['witnessData'] === undefined) {
        theSubEntry.witnessData = [];
      } else {
        theSubEntry.witnessData = subEntry.witnessData.map((ctDataWitnessDataItem) => {
          let dataItem = new WitnessDataItem();
          dataItem.witnessIndex = ctDataWitnessDataItem.witnessIndex;
          dataItem.hand = ctDataWitnessDataItem.hand ?? 0;
          dataItem.location = ctDataWitnessDataItem.location ?? '';
          dataItem.forceHandDisplay = ctDataWitnessDataItem.forceHandDisplay ?? false;
          return dataItem;
        });
      }
      return theSubEntry;
    });
  }

    private getCustomApparatuses(ctIndexToMainTextMap: number[],
                       baseWitnessTokens: WitnessTokenInterface[]): Apparatus[] | any[] {
    if (this.ctData.customApparatuses === undefined) {
      return [];
    }
    return this.ctData.customApparatuses.filter((apparatus) => {
      // filter out custom entries from apparatus criticus and marginalia
      return [ApparatusType.CRITICUS, ApparatusType.MARGINALIA].indexOf(apparatus.type) === -1;
    }).map((apparatus) => {
      let theApparatus = ApparatusTools.createEmpty();
      theApparatus.type = apparatus.type;
      theApparatus.entries = apparatus.entries.map((customEntry) => {
        let theEntry = new ApparatusEntry();
        theEntry.lemma = customEntry.lemma;
        theEntry.preLemma = customEntry.preLemma;
        theEntry.postLemma = customEntry.postLemma;
        theEntry.separator = customEntry.separator;
        theEntry.tags = [...customEntry.tags];
        theEntry.lemmaText = ApparatusTools.getMainTextForGroup({
          from: customEntry.from, to: customEntry.to
        }, baseWitnessTokens, false, this.ctData.lang);

        theEntry.from = ctIndexToMainTextMap[customEntry.from];
        theEntry.to = ctIndexToMainTextMap[customEntry.to];
        theEntry.subEntries = this.buildSubEntryArrayFromCustomSubEntries(customEntry.subEntries);
        return theEntry;
      });
      return ApparatusTools.sortEntries(theApparatus);
    });
  }

  private generateMainText(witnessTokens: WitnessTokenInterface[]): MainTextToken[]{

    // TODO: find out if we need to care about normalizations here
    const normalized = false;
    const normalizationsToIgnore: string[] = [];

    let mainTextTokens: MainTextToken[] = [];
    let lang = this.ctData.lang;
    // let collationTableRowForWitness = this.ctData.collationMatrix[this.ctData.editionWitnessIndex];

    for(let witnessTokenIndex = 0; witnessTokenIndex < witnessTokens.length; witnessTokenIndex++) {
      let witnessToken = witnessTokens[witnessTokenIndex]
      if (witnessToken === undefined) {
        console.warn(`Witness token ${witnessTokenIndex} is undefined`)
        continue
      }
      let tokenType = witnessToken.tokenType;
      if (tokenType === WitnessTokenType.EMPTY){
        continue;
      }
      if (tokenType === WitnessTokenType.WHITESPACE) {
        // normally, there won't be whitespace in the collation table
        // but just in case, make sure that no raw whitespace appears in the main text
        continue;
      }

      if (tokenType === WitnessTokenType.FORMAT_MARK) {
        mainTextTokens.push(MainTextTokenFactory.createParagraphEnd(witnessToken.style))
        continue;
      }

      if (tokenType === WitnessTokenType.NUMBERING_LABEL) {
        // console.log(`Generating main text token for numbering label '${witnessToken.text}'`)
        mainTextTokens.push(
          MainTextTokenFactory.createSimpleText(
            MainTextTokenType.NUMBERING_LABEL,
            witnessToken.text,
            witnessTokenIndex,
            lang)
        );
        continue
      }

      if (witnessToken.fmtText === undefined) {
        mainTextTokens.push(
          MainTextTokenFactory.createSimpleText(
            MainTextTokenType.TEXT,
            getTextFromWitnessToken(
              witnessToken,
              normalized,
              normalizationsToIgnore
            ),
            witnessTokenIndex,
            lang
          )
        )

      } else {
        mainTextTokens.push(
          MainTextTokenFactory.createWithFmtText(
            MainTextTokenType.TEXT,
            witnessToken.fmtText,
            witnessTokenIndex,
            lang
          )
        )
      }
    }


    // Add glue tokens
    let mainTextTokensWithGlue = []
    let firstWordAdded = false
    let nextTokenMustStickToPrevious: boolean = false
    for(let i = 0; i < mainTextTokens.length; i++) {
      let mainTextToken = mainTextTokens[i]
      if (mainTextToken.type === MainTextTokenType.PARAGRAPH_END) {
        mainTextTokensWithGlue.push(mainTextToken)
        firstWordAdded = false
        continue
      }
      if (mainTextToken.type === MainTextTokenType.NUMBERING_LABEL) {
        if (firstWordAdded) {
          mainTextTokensWithGlue.push(MainTextTokenFactory.createNormalGlue())
        }
        mainTextTokensWithGlue.push(mainTextToken)
        nextTokenMustStickToPrevious = false
        firstWordAdded = true
        continue
      }

      if (mainTextToken.type !== MainTextTokenType.TEXT && mainTextToken.type !== MainTextTokenType.FOLIATION_CHANGE_MARKER){
        continue
      }
      let tokenPlainText = mainTextToken.getPlainText()
      if (tokenPlainText === undefined) {
        console.warn(`Found main text token with no text at index ${i}`)
        continue
      }

      let addGlue = true
      if (!firstWordAdded) {
        addGlue = false
      }
      if (Punctuation.characterIsPunctuation(tokenPlainText, lang, false) && Punctuation.sticksToPrevious(tokenPlainText, lang) ) {
        addGlue = false
      }
      if (nextTokenMustStickToPrevious) {
        addGlue = false
      }
      if (addGlue) {
        mainTextTokensWithGlue.push(MainTextTokenFactory.createNormalGlue())
      }
      mainTextTokensWithGlue.push(mainTextToken)
      firstWordAdded = true
      nextTokenMustStickToPrevious = Punctuation.characterIsPunctuation(tokenPlainText, lang, false) &&
        Punctuation.sticksToNext(tokenPlainText, lang);
    }
    return mainTextTokensWithGlue
  }
}


/**
 *  Gets the text for the given token, the normal text or
 *  the normalized text if there is one
 * @param {WitnessTokenInterface}witnessToken
 * @param {boolean} normalized
 * @param {string[]} normalizationSourcesToIgnore
 * @returns {string}
 */
function getTextFromWitnessToken(witnessToken: WitnessTokenInterface, normalized: boolean, normalizationSourcesToIgnore: string[] = []): string{
  let text = witnessToken.text;
  if (!normalized) {
    return text;
  }
  if (witnessToken.normalizedText !== undefined && witnessToken.normalizedText !== '') {
    let norm = witnessToken.normalizedText
    let source = witnessToken.normalizationSource !== undefined ? witnessToken.normalizationSource : ''
    if (source === '' || normalizationSourcesToIgnore.indexOf(source) === -1) {
      // if source === '', this is  a normalization from the transcription
      text = norm
    }
  }
  return text
}