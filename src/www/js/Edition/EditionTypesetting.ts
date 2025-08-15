// noinspection ES6PreferShortImport

/*
 *  Copyright (C) 2021-23 Universität zu Köln
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

import {MainText} from './MainText.js';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {TextBoxMeasurer} from '../lib/Typesetter2/TextBoxMeasurer/TextBoxMeasurer.js';
import {Box} from '../lib/Typesetter2/Box.js';
import {ItemList} from '../lib/Typesetter2/ItemList.js';
import * as TypesetterItemDirection from '../lib/Typesetter2/TypesetterItemDirection.js';
import * as MetadataKey from '../lib/Typesetter2/MetadataKey.js';
import * as ListType from '../lib/Typesetter2/ListType.js';
import {Glue} from '../lib/Typesetter2/Glue.js';
import * as MainTextTokenType from './MainTextTokenType.js';
import {TextBox} from '../lib/Typesetter2/TextBox.js';
import {
  GOOD_POINT_FOR_A_BREAK, INFINITE_PENALTY, Penalty, REALLY_GOOD_POINT_FOR_A_BREAK
} from '../lib/Typesetter2/Penalty.js';
import {LanguageDetector} from '../toolbox/LanguageDetector.js';
import {getTextDirectionForLang, isRtl, removeExtraWhiteSpace} from '../toolbox/Util.mjs';
import {FmtTextFactory} from '../lib/FmtText/FmtTextFactory.js';
import {ObjectFactory} from '../lib/Typesetter2/ObjectFactory.js';
import {uniq} from '../lib/ToolBox/ArrayUtil.js';
import {Typesetter2StyleSheetTokenRenderer} from '../lib/FmtText/Renderer/Typesetter2StyleSheetTokenRenderer.js';
import {ApparatusUtil} from './ApparatusUtil.js';
import {NumeralStyles} from '../toolbox/NumeralStyles.mjs';
import {TextBoxFactory} from '../lib/Typesetter2/TextBoxFactory.js';
import {SiglaGroup} from './SiglaGroup.js';
import {FmtTextUtil} from '../lib/FmtText/FmtTextUtil.js';
import {ParagraphStyleDef, StyleSheet} from '../lib/Typesetter2/Style/StyleSheet.js';
import {FontConversions} from '../lib/Typesetter2/FontConversions.js';
import {ItemLineInfo} from './ItemLineInfo.js';
import {TypesetterItem} from '../lib/Typesetter2/TypesetterItem.js';
import {MARGINALIA} from '../constants/ApparatusType.js';
import {AUTO_FOLIATION} from './SubEntryType.js';
import {ApparatusSubEntry} from "./ApparatusSubEntry.js";
import {ApparatusEntry} from './ApparatusEntry.js';
import {ApparatusInterface} from "./EditionInterface.js";
import {Dimension} from "../lib/Typesetter2/Dimension.js";
import {Edition} from './Edition.js';
import {Apparatus} from "./Apparatus.js";

export const MAX_LINE_COUNT = 10000;
const enDash = '\u2013';

const marginaliaApparatusType = 'marginalia';

interface Marginalia {
  lineNumber: number;
  marginalSubEntries: any[];
}

interface LineRange {
  key: string,
  lineFrom: number,
  lineTo: number,
  entries: ApparatusEntry[],
  marginalSubEntries?: TypesetterItem[][];
  itemsToTypeset?: any[],
  tsItemsExportObjects?: any[]
}

export class EditionTypesetting {
  private options: any;
  private readonly debug: boolean;
  private edition: any;
  private readonly sigla: string[];
  private readonly siglaGroups: SiglaGroup[];
  private readonly textDirection: string;
  private readonly textBoxMeasurer: TextBoxMeasurer;
  private ss: any;
  private readonly editionStyle: any;
  private readonly fontConversionDefinitions: any;
  private tokenRenderer: Typesetter2StyleSheetTokenRenderer;
  private isSetup: boolean;
  private languageDetector: LanguageDetector;
  private lineRanges: { [app: string]: { [key: string]: LineRange } } = {};
  private consolidatedMarginalia: Marginalia[] | null = null;
  private extractedItemLineInfoArray!: undefined | any[];
  private mainTextIndices!: any[];
  private appEntries: { [app: string]: ApparatusEntry[] } = {};

  constructor(options: any) {
    let oc = new OptionsChecker({
      context: 'EditionTypesetting', optionsDefinition: {
        edition: {type: 'object', objectClass: Edition},
        editionStyleSheet: {type: 'object', objectClass: StyleSheet},
        textBoxMeasurer: {type: 'object', objectClass: TextBoxMeasurer},
        debug: {type: 'boolean', default: false}
      }
    });
    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;

    this.edition = this.options.edition;
    this.sigla = this.edition.witnesses.map((w: any) => {
      return w.siglum;
    });
    if (this.options.editionStyleName === '') {
      this.options.editionStyleName = this.edition.lang;
    }

    this.siglaGroups = this.edition.siglaGroups.map((sg: any) => {
      return SiglaGroup.fromObject(sg);
    });

    this.textDirection = getTextDirectionForLang(this.edition.lang);
    this.textBoxMeasurer = this.options.textBoxMeasurer;

    /** @var {StyleSheet} */
    this.ss = this.options.editionStyleSheet;
    this.editionStyle = this.ss.getStyleDefinitions();
    this.fontConversionDefinitions = this.ss.getFontConversionDefinitions();
    this.tokenRenderer = new Typesetter2StyleSheetTokenRenderer({
      styleSheet: this.editionStyle, defaultTextDirection: this.textDirection, textBoxMeasurer: this.textBoxMeasurer
    });
    this.isSetup = true;
    this.languageDetector = new LanguageDetector(this.options.edition.lang);
  }

  setup() {
    this.isSetup = true;
    return Promise.resolve(true);
  }

  /**
   *
   * @param lineFrom
   * @param lineTo
   */
  getMarginaliaForLineRange(lineFrom: number, lineTo: number) {
    if (this.lineRanges === undefined) {
      return [];
    }
    if (this.lineRanges[marginaliaApparatusType] === undefined) {
      return [];
    }

    return this.getConsolidatedMarginalia().filter((m) => {
      return m.lineNumber >= lineFrom && m.lineNumber <= lineTo;
    });
  }

  getConsolidatedMarginalia(): Marginalia[] {
    if (this.consolidatedMarginalia === null) {
      if (this.lineRanges[marginaliaApparatusType] === undefined) {
        this.consolidatedMarginalia = [];
        return [];
      }
      let lineRangeKeys = Object.keys(this.lineRanges[marginaliaApparatusType]);
      let marginalia: Marginalia[] = [];
      lineRangeKeys.forEach((lineRangeKey) => {
        let lineRange = this.lineRanges[marginaliaApparatusType][lineRangeKey];
        marginalia.push({
          lineNumber: lineRange.lineFrom, marginalSubEntries: lineRange.marginalSubEntries ?? []
        });
      });

      let marginaliaMap: Marginalia[] = [];
      marginalia.forEach((marginaliaEntry) => {
        if (marginaliaMap[marginaliaEntry.lineNumber] === undefined) {
          marginaliaMap[marginaliaEntry.lineNumber] = marginaliaEntry;
        } else {
          marginaliaMap[marginaliaEntry.lineNumber].marginalSubEntries.push(...marginaliaEntry.marginalSubEntries);
        }
      });
      this.consolidatedMarginalia = [];
      marginaliaMap.forEach((marginaliaElement) => {
        if (this.consolidatedMarginalia === null) {
          throw new Error(`Consolidated marginalia is null after consolidation`);
        }
        this.consolidatedMarginalia.push(marginaliaElement);
      });
      this.consolidatedMarginalia.sort((a: Marginalia, b: Marginalia) => {
        return a.lineNumber - b.lineNumber;
      });
    }
    return this.consolidatedMarginalia;
  }

  /**
   *
   * @return {Promise<ItemList>}
   */
  generateListToTypesetFromMainText(): Promise<ItemList> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSetup) {
        reject('EditionTypesetting not set up yet');
      }
      let edition = this.options.edition;
      let textDirection = this.textDirection;
      // this.debug && console.log(`Edition language is '${this.edition.lang}',  ${textDirection}`)

      let verticalItems = [];
      let mainTextParagraphs = MainText.getParagraphs(edition.mainText);
      for (let mainTextParagraphIndex = 0; mainTextParagraphIndex < mainTextParagraphs.length; mainTextParagraphIndex++) {
        let mainTextParagraph = mainTextParagraphs[mainTextParagraphIndex];
        let paragraphToTypeset = new ItemList(TypesetterItemDirection.HORIZONTAL);
        paragraphToTypeset.setTextDirection(textDirection);
        let paragraphStyle: string = mainTextParagraph.type;
        // this.debug && console.log(`Main text paragraph style: '${paragraphStyle}'`)
        if (!this.ss.styleExists(paragraphStyle)) {
          this.debug && console.log(`Paragraph style is not defined, defaulting to 'normal'`);
          paragraphStyle = 'normal';
        }
        let paragraphStyleDef: ParagraphStyleDef = await this.ss.getParagraphStyle(paragraphStyle);
        // this.debug && console.log(`Paragraph style ${paragraphStyle}`)
        // this.debug && console.log(paragraphStyleDef)
        const spaceBefore = Dimension.getPixelValue(paragraphStyleDef.spaceBefore, 12);
        if (spaceBefore != 0) {
          verticalItems.push((new Glue(TypesetterItemDirection.VERTICAL)).setHeight(spaceBefore));
        }
        const indent = Dimension.getPixelValue(paragraphStyleDef.indent, 12);
        if (indent !== 0) {
          paragraphToTypeset.pushItem(this.createIndentBox(indent, textDirection));
        }
        if (paragraphStyleDef.align === 'center') {
          paragraphToTypeset.pushItem((new Box().setWidth(0)));
          paragraphToTypeset.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection));
        }
        for (let tokenIndex = 0; tokenIndex < mainTextParagraph.tokens.length; tokenIndex++) {
          let mainTextToken = mainTextParagraph.tokens[tokenIndex];
          let textItems;
          switch (mainTextToken.type) {
            case MainTextTokenType.GLUE:
              if (paragraphStyle === 'normal' && tokenIndex > mainTextParagraph.tokens.length - 4) {
                // do not leave words hanging!
                paragraphToTypeset.pushItem(this.createPenalty(INFINITE_PENALTY));
              }
              let glue = await this.createGlue(paragraphStyle);
              glue.addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex);
              paragraphToTypeset.pushItem(glue);
              break;

            case MainTextTokenType.NUMBERING_LABEL:
              textItems = await this.tokenRenderer.renderWithStyle(mainTextToken.fmtText, paragraphStyle);
              textItems.map((item) => {
                if (isRtl(this.edition.lang)) {
                  return item.setRightToLeft();
                } else {
                  return item.setLeftToRight();
                }
              });
              paragraphToTypeset.pushItemArray(textItems);
              break;

            case MainTextTokenType.TEXT:
              textItems = [];

              // Add foliation change markers if needed
              let witnessIndices = this.getWitnessIndicesWithFoliationChanges(mainTextToken.originalIndex);
              if (witnessIndices.length > 0) {
                textItems.push(...await this.tokenRenderer.renderWithStyle(FmtTextFactory.fromString('|'), paragraphStyle));
                textItems.push(this.createPenalty(INFINITE_PENALTY));
                textItems.push(await this.createGlue(paragraphStyle));

              }
              const firstActualTextTokenIndex = textItems.length;

              // Add the text
              textItems.push(...await this.tokenRenderer.renderWithStyle(mainTextToken.fmtText, paragraphStyle));
              if (textItems.length > 0) {
                // tag the first item with the original index
                textItems[firstActualTextTokenIndex].addMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX, mainTextToken.originalIndex);
                // detect text direction for text boxes
                textItems = textItems.map((item) => {
                  if (item instanceof TextBox) {
                    return this.__detectAndSetTextBoxTextDirection(item);
                  }
                  return item;
                });
                paragraphToTypeset.pushItemArray(textItems);
              }
              // if (firstActualTextTokenIndex > 0) {
              //   console.log(`After adding foliation change markers`, paragraphToTypeset);
              // }
              break;

          }
        }

        paragraphToTypeset.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection));
        paragraphToTypeset.pushItem(Penalty.createForcedBreakPenalty());
        verticalItems.push(paragraphToTypeset);
        const spaceAfter = Dimension.getPixelValue(paragraphStyleDef.spaceAfter, 12);
        if (spaceAfter !== 0) {
          verticalItems.push((new Glue(TypesetterItemDirection.VERTICAL)).setHeight(spaceAfter));
        }
      }
      let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL);
      verticalListToTypeset.setList(verticalItems);
      resolve(FontConversions.applyFontConversions(verticalListToTypeset, this.fontConversionDefinitions, this.edition.lang));
    });
  }


  resetExtractedMetadataInfo() {
    this.extractedItemLineInfoArray = undefined;
  }


  getWitnessIndicesWithFoliationChanges(mainTextTokenIndex: number | undefined): number[] {
    if (mainTextTokenIndex === undefined) {
      return [];
    }
    const edition: Edition = this.options.edition;
    const marginaliaApparatuses: Apparatus[] = edition.apparatuses.filter((apparatus: ApparatusInterface) => {
      return apparatus.type === MARGINALIA;
    });
    if (marginaliaApparatuses.length === 0) {
      return [];
    }
    const apparatus = marginaliaApparatuses[0];
    const entries = apparatus.entries.filter((entry) => {
      return entry.from === mainTextTokenIndex && entry.to === mainTextTokenIndex;
    });
    if (entries.length === 0) {
      return [];
    }

    const subEntries: ApparatusSubEntry[] = [];
    entries.forEach((entry) => {
      subEntries.push(...entry.subEntries.filter((subEntry) => {
        return subEntry.type === AUTO_FOLIATION;
      }));
    });

    // console.log(`There are ${entries.length} entries with ${subEntries.length} auto foliation subEntries for main text token ${mainTextTokenIndex}`)
    const indices: number[] = [];
    subEntries.forEach((subEntry) => {
      subEntry.witnessData.forEach((witnessData) => {
        if (witnessData.realFoliationChange === true) {
          indices.push(witnessData.witnessIndex);
        }
      });
    });
    return uniq(indices);
  }


  /**
   *
   * @param {ItemList}typesetMainTextVerticalList
   * @param apparatus
   * @param {number}firstLine
   * @param {number}lastLine
   * @param {boolean}resetFirstLineNumber if true, line numbers will be shown as starting from 1
   * @return {Promise<ItemList>}
   */
  generateApparatusVerticalListToTypeset(typesetMainTextVerticalList: ItemList, apparatus: Apparatus, firstLine: number = 1, lastLine: number = MAX_LINE_COUNT, resetFirstLineNumber: boolean = false): Promise<ItemList> {
    return new Promise(async (resolve) => {
      //console.log(`generateApparatusVerticalListToTypeset: ${apparatus.type}, from ${firstLine} to ${lastLine}, reset = ${resetFirstLineNumber}`)
      let textDirection = getTextDirectionForLang(this.edition.lang);
      let outputList = new ItemList(TypesetterItemDirection.HORIZONTAL);
      outputList.setTextDirection(textDirection);

      if (apparatus.entries.length === 0) {
        resolve(outputList);
        return;
      }

      if (this.extractedItemLineInfoArray === undefined) {
        // Generate apparatus information for this and future apparatus typesetting requests
        this.extractedItemLineInfoArray = this.extractLineInfoFromMetadata(typesetMainTextVerticalList);
        this.mainTextIndices = this.extractedItemLineInfoArray.map((info) => {
          return info.mainTextIndex;
        });
        // reset apparatus data
        this.appEntries = {};
      }

      if (this.extractedItemLineInfoArray.length === 0) {
        this.debug && console.log(`No line info in metadata, nothing to typeset for apparatus ${apparatus.type}`);
        resolve(outputList);
        return;
      }

      let strings = this.ss.getStrings();
      let lineRangeSeparatorCharacter = strings['lineRangeSeparator'];
      let entrySeparatorCharacter = strings['entrySeparator'];


      if (this.appEntries[apparatus.type] === undefined) {
        // no cached data for the current apparatus, let's build it
        let minMainTextIndex = this.extractedItemLineInfoArray[0].mainTextIndex;
        let maxMainTextIndex = this.extractedItemLineInfoArray[this.extractedItemLineInfoArray.length - 1].mainTextIndex;
        // get the entries
        this.appEntries[apparatus.type] = apparatus.entries.filter((entry) => {
          return (entry.from >= minMainTextIndex && entry.from <= maxMainTextIndex);
        }).filter((entry) => {
          let subEntries = entry.subEntries;
          let thereAreEnabledSubEntries = false;
          for (let subEntryIndex = 0; !thereAreEnabledSubEntries && subEntryIndex < subEntries.length; subEntryIndex++) {
            if (subEntries[subEntryIndex].enabled) {
              thereAreEnabledSubEntries = true;
            }
          }
          return thereAreEnabledSubEntries;
        });
        // get line info to each entry
        let entriesWithLineInfo = this.appEntries[apparatus.type].map((entry) => {
          let lineFrom = this.getLineNumberForMainTextIndex(entry.from);
          let lineTo = this.getLineNumberForMainTextIndex(entry.to);
          return {
            key: this.getRangeKey(lineFrom.toString(), lineTo.toString()),
            lineFrom: lineFrom,
            lineTo: lineTo,
            entry: entry
          };
        });
        // save a list of line ranges and their entries for the apparatus
        this.lineRanges[apparatus.type] = {};
        entriesWithLineInfo.forEach((entryWithLineInfo) => {
          if (this.lineRanges[apparatus.type][entryWithLineInfo.key] === undefined) {
            this.lineRanges[apparatus.type][entryWithLineInfo.key] = {
              key: entryWithLineInfo.key,
              lineFrom: entryWithLineInfo.lineFrom,
              lineTo: entryWithLineInfo.lineTo,
              entries: [],
              itemsToTypeset: [],
              tsItemsExportObjects: []
            };
          }
          this.lineRanges[apparatus.type][entryWithLineInfo.key].entries.push(entryWithLineInfo.entry);
        });

        let lineRangesKeys = Object.keys(this.lineRanges[apparatus.type]);

        if (apparatus.type === marginaliaApparatusType) {
          // for every line range, typeset and save each sub-entry
          for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeys.length; lineRangeKeyIndex++) {
            let lineRange = this.lineRanges[apparatus.type][lineRangesKeys[lineRangeKeyIndex]];
            lineRange.marginalSubEntries = [];
            for (let entryIndex = 0; entryIndex < lineRange.entries.length; entryIndex++) {
              let entry = lineRange.entries[entryIndex];
              for (let subEntryIndex = 0; subEntryIndex < entry.subEntries.length; subEntryIndex++) {
                let subEntry = entry.subEntries[subEntryIndex];
                if (!subEntry.enabled) {
                  continue;
                }
                let subEntryItems = await this.getSubEntryTsItems(subEntry, 'marginalia', 'marginalia marginaliaKeyword');
                lineRange.marginalSubEntries.push([...subEntryItems]);
              }
            }
          }
        } else {
          // build itemsToTypeset array for every line range
          for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeys.length; lineRangeKeyIndex++) {
            let lineRange = this.lineRanges[apparatus.type][lineRangesKeys[lineRangeKeyIndex]];
            let typesetterItems: TypesetterItem[] = [];
            // include everything except the initial line number string for the range, since this will change
            // depending on lineFrom, lineTo and the resetLineNumbers flag, so it should not be cached
            for (let entryIndex = 0; entryIndex < lineRange.entries.length; entryIndex++) {
              let entry = lineRange.entries[entryIndex];

              // pre-lemma
              typesetterItems.push(...await this.getTsItemsForPreLemma(entry));
              // lemma text
              typesetterItems.push(...await this.getTsItemsForLemma(entry));
              // post lemma
              typesetterItems.push(...await this.getTsItemsForPostLemma(entry));
              // separator
              typesetterItems.push(...await this.getTsItemsForSeparator(entry));

              // typeset sub entries
              for (let subEntryIndex = 0; subEntryIndex < entry.subEntries.length; subEntryIndex++) {
                let subEntry = entry.subEntries[subEntryIndex];
                if (!subEntry.enabled) {
                  continue;
                }
                typesetterItems.push(...await this.getSubEntryTsItems(subEntry));
                if (subEntryIndex < entry.subEntries.length - 1) {
                  typesetterItems.push(this.createPenalty(GOOD_POINT_FOR_A_BREAK));
                  typesetterItems.push((await this.createGlue('apparatus emGlue')).setTextDirection(textDirection));
                }
              }
              if (entryIndex < lineRange.entries.length - 1) {
                typesetterItems.push(this.createPenalty(INFINITE_PENALTY));  // do not break just before the entry separator
                typesetterItems.push((await this.createGlue('apparatus preEntrySeparator')).setTextDirection(textDirection));
                typesetterItems.push(...await this.getTsItemsForString(entrySeparatorCharacter, 'apparatus entrySeparator', textDirection));
                typesetterItems.push(this.createPenalty(GOOD_POINT_FOR_A_BREAK));
                typesetterItems.push((await this.createGlue('apparatus postEntrySeparator')).setTextDirection(textDirection));
              }
            }

            lineRange.itemsToTypeset = typesetterItems;
            // save the export objects, which will be used to create copies of the typesetter items when adding
            // them to the output horizontal list
            lineRange.tsItemsExportObjects = this.getItemExportObjectsArray(typesetterItems);
          }
        }
        // if (apparatus.type === marginaliaApparatusType) {
        //    console.log(`Marginalia line ranges cache built`)
        //    console.log(this.lineRanges[apparatus.type])
        //  }
      }

      // At this point all the line ranges in the apparatus should be completely built, we just need
      // to assemble them for the desired line range and resetLineNumbers flag
      // ... but not for marginalia
      if (apparatus.type === marginaliaApparatusType) {
        resolve(outputList);
        return;
      }
      let lineRangesKeysToTypeset = Object.keys(this.lineRanges[apparatus.type]).filter((lineRangeKey) => {
        return this.lineRanges[apparatus.type][lineRangeKey].lineFrom >= firstLine && this.lineRanges[apparatus.type][lineRangeKey].lineFrom <= lastLine;
      });
      lineRangesKeysToTypeset.sort();
      for (let lineRangeKeyIndex = 0; lineRangeKeyIndex < lineRangesKeysToTypeset.length; lineRangeKeyIndex++) {
        let lineRange = this.lineRanges[apparatus.type][lineRangesKeysToTypeset[lineRangeKeyIndex]];
        let lineNumberItems: TypesetterItem[] = [];
        // line number items
        lineNumberItems.push(...await this.getTsItemsForString(this.getLineStringFromRange(lineRange.lineFrom, lineRange.lineTo, resetFirstLineNumber, firstLine, lastLine), 'apparatus apparatusLineNumbers', textDirection));
        lineNumberItems.push(this.createPenalty(INFINITE_PENALTY));
        lineNumberItems.push(await this.createGlue('apparatus'));
        outputList.pushItemArray(this.getTsItemsFromExportObjectsArray(this.getItemExportObjectsArray(lineNumberItems)));
        outputList.pushItemArray(this.getTsItemsFromExportObjectsArray(lineRange.tsItemsExportObjects ?? []));
        if (lineRangeKeyIndex !== lineRangesKeysToTypeset.length - 1) {
          let separatorItems = [];
          // add line range separator to all but the last line range
          separatorItems.push(this.createPenalty(INFINITE_PENALTY));  // do not break just before the lineRange separator
          separatorItems.push((await this.createGlue('apparatus')).setTextDirection(textDirection));
          separatorItems.push(...await this.getTsItemsForString(lineRangeSeparatorCharacter, 'apparatus lineRangeSeparator', textDirection));
          separatorItems.push(this.createPenalty(REALLY_GOOD_POINT_FOR_A_BREAK));
          separatorItems.push((await this.createGlue('apparatus postLineRangeSeparator')).setTextDirection(textDirection));
          outputList.pushItemArray(this.getTsItemsFromExportObjectsArray(this.getItemExportObjectsArray(separatorItems)));
        }
      }
      if (outputList.getList().length !== 0) {
        outputList.pushItem(Glue.createLineFillerGlue().setTextDirection(textDirection));
        outputList.pushItem(Penalty.createForcedBreakPenalty());
      }

      resolve(FontConversions.applyFontConversions(outputList, this.fontConversionDefinitions, this.edition.lang));
    });
  }

  /**
   *
   * @param entry
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  getTsItemsForPostLemma(entry: ApparatusEntry): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let items = [];
      switch (entry.postLemma) {
        case '':
          //do nothing
          break;

        // LEAVE this in case there are standard post-lemma strings
        //
        // case 'ante':
        // case 'post':
        //   let keyword = this.editionStyle.strings[entry.preLemma]
        //   let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), 'apparatus apparatusKeyword')
        //   items.push(keywordTextBox)
        //   items.push((await this.createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
        //   break

        default:
          // a custom post lemma
          items.push((await this.createGlue('apparatus')).setTextDirection(this.textDirection));
          // TODO: check formatting here
          let customPostLemmaBox = await this.ss.apply((new TextBox()).setText(FmtTextUtil.getPlainText(entry.postLemma)).setTextDirection(this.textDirection), 'apparatus apparatusKeyword');
          items.push(customPostLemmaBox);
        // items.push((await this.createNormalSpaceGlue('apparatus')).setTextDirection(this.textDirection))
      }
      resolve(items);
    });
  }

  /**
   *
   * @param entry
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  getTsItemsForPreLemma(entry: ApparatusEntry): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let items = [];
      switch (entry.preLemma) {
        case '':
          //do nothing
          break;

        case 'ante':
        case 'post':
          let keyword = this.ss.getStrings()[entry.preLemma];
          let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), 'apparatus apparatusKeyword');
          items.push(keywordTextBox);
          items.push((await this.createGlue('apparatus')).setTextDirection(this.textDirection));
          break;

        default:
          // a custom pre-lemma
          let customPreLemmaText = FmtTextUtil.getPlainText(entry.preLemma);
          this.debug && console.log(`Custom pre-lemma: '${customPreLemmaText}'`);
          let customPreLemmaBox = await this.ss.apply((new TextBox())
          .setText(customPreLemmaText)
          .setTextDirection(this.textDirection), 'apparatus apparatusKeyword');
          items.push(customPreLemmaBox);
          items.push((await this.createGlue('apparatus')).setTextDirection(this.textDirection));
      }

      resolve(items);
    });
  }

  /**
   *
   * @param subEntry
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  getTsItemsForSigla(subEntry: ApparatusSubEntry): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let items = [];
      let siglaData = ApparatusUtil.getSiglaData(subEntry.witnessData, this.sigla, this.siglaGroups);
      for (let i = 0; i < siglaData.length; i++) {
        let siglumData = siglaData[i];
        // the siglum
        let siglumItem = await this.ss.apply(TextBoxFactory.simpleText(siglumData.siglum), 'apparatus sigla');
        siglumItem.setTextDirection(this.textDirection);
        items.push(siglumItem);
        // the hand
        if (siglumData.hand !== 0 || siglumData.forceHandDisplay) {
          let handItem = await this.ss.apply(TextBoxFactory.simpleText(this.getNumberString(siglumData.hand + 1, this.edition.lang)), 'apparatus hand');
          handItem.setTextDirection(this.textDirection);
          //this.__detectAndSetTextBoxTextDirection(handItem)
          items.push(handItem);
        }
      }
      resolve(items);
    });
  }

  /**
   *
   * @param entry
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  getTsItemsForLemma(entry: ApparatusEntry): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let tsItems = [];
      let lemmaComponents = ApparatusUtil.getLemmaComponents(entry.lemma, entry.lemmaText);

      switch (lemmaComponents.type) {
        case 'custom':
          // custom lemma
          tsItems = await this.getTsItemsForString(lemmaComponents.text, 'apparatus', 'detect');
          resolve(tsItems);
          return;

        case 'full':
          // e.g., word1 word2 word3]
          tsItems.push(...await this.getTsItemsForString(entry.lemmaText, 'apparatus', 'detect'));
          tsItems.push(...await this.getTsItemsForLemmaOccurrenceNumber(entry.from, entry.to));
          resolve(tsItems);
          return;

        case 'shortened':
          // e.g. word1...wordN]
          tsItems.push(...await this.getTsItemsForString(lemmaComponents.from ?? '', 'apparatus', 'detect'));
          tsItems.push(...await this.getTsItemsForLemmaOccurrenceNumber(entry.from));
          tsItems.push(...await this.getTsItemsForString(lemmaComponents.separator ?? '', 'apparatus', 'detect'));
          tsItems.push(...await this.getTsItemsForString(lemmaComponents.to ?? '', 'apparatus', 'detect'));
          tsItems.push(...await this.getTsItemsForLemmaOccurrenceNumber(entry.to));
          resolve(tsItems);
          return;

        default:
          console.warn(`Unknown lemma component type '${lemmaComponents.type}'`);
          resolve(await this.getTsItemsForString('Lemma???', 'apparatus', 'detect'));
          return;
      }
    });

  }

  /**
   * Returns an array of ts items with the superscript number that
   * represents the occurrence number in the line for the given sequence
   * of main text tokens.
   *
   * If there's only one occurrence in the line, returns an empty array
   *
   * @param {number}indexFrom
   * @param {number}indexTo
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  async getTsItemsForLemmaOccurrenceNumber(indexFrom: number, indexTo: number = -1): Promise<TypesetterItem[]> {
    if (indexTo === -1) {
      indexTo = indexFrom;
    }
    let tsItems = [];
    let lemmaNumberString = '';
    let [occurrenceInLine, numberOfOccurrencesInLine] = this.getOccurrenceInLineInfo(indexFrom);
    if (numberOfOccurrencesInLine > 1) {
      // if the first token only occurs once in the line, obviously the whole series of tokens only
      // occurs once. Otherwise, we need to check the other tokens, if any.
      // As soon as one of them only appears once in the line, we know that the whole series
      // only appears once. Also, the lowest occurrenceInLine number is the occurrenceInLine number
      // for the whole series, and the lowest numberOfOccurrencesInLine is the numberOfOccurrencesInLine
      // for the whole series.
      let seriesOccurrenceInLine = occurrenceInLine;
      let seriesNumberOfOccurrencesInLine = numberOfOccurrencesInLine;
      for (let tokenIndex = indexFrom + 1; tokenIndex <= indexTo; tokenIndex++) {
        let [tokenOccurrenceInLine, tokenNumberOfOccurrencesInLine] = this.getOccurrenceInLineInfo(tokenIndex);
        seriesOccurrenceInLine = Math.min(seriesOccurrenceInLine, tokenOccurrenceInLine);
        seriesNumberOfOccurrencesInLine = Math.min(seriesNumberOfOccurrencesInLine, tokenNumberOfOccurrencesInLine);
        if (tokenNumberOfOccurrencesInLine === 1) {
          // no need to look any further
          break;
        }
      }
      if (seriesNumberOfOccurrencesInLine > 1) {
        lemmaNumberString = this.getNumberString(seriesOccurrenceInLine, this.edition.lang);
      }
    }
    if (lemmaNumberString !== '') {
      let lemmaNumberTextBox = TextBoxFactory.simpleText(lemmaNumberString);
      await this.ss.apply(lemmaNumberTextBox, ['apparatus superscript']);
      this.__detectAndSetTextBoxTextDirection(lemmaNumberTextBox);
      tsItems.push(lemmaNumberTextBox);
    }
    return tsItems;
  }

  /**
   *
   * @param {number}n
   * @param {string}lang
   * @return {string}
   * @private
   */
  getNumberString(n: number, lang: string): string {
    if (lang === 'ar') {
      return NumeralStyles.toDecimalArabic(n);
    }
    return NumeralStyles.toDecimalWestern(n);
  }

  /**
   * Returns the typesetter items for the given apparatus subEntry
   * @param subEntry
   * @param {string}apparatusStyle  styles to apply to text
   * @param {string}keywordStyle styles to apply to keywords
   * @return {Promise<TypesetterItem[]>}
   * @private
   */
  getSubEntryTsItems(subEntry: ApparatusSubEntry, apparatusStyle: string = 'apparatus', keywordStyle: string = 'apparatus apparatusKeyword'): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let items = [];
      switch (subEntry.type) {
        case 'variant':
          items.push(...this.setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, apparatusStyle), 'detect'));
          items.push(this.createPenalty(INFINITE_PENALTY));
          items.push((await this.createGlue(apparatusStyle)).setTextDirection(this.textDirection));
          items.push(...await this.getTsItemsForSigla(subEntry));
          break;

        case 'omission':
        case 'addition':
          let keyword = this.ss.getStrings()[subEntry.type];
          let keywordTextBox = await this.ss.apply((new TextBox()).setText(keyword).setTextDirection(this.textDirection), keywordStyle);
          items.push(keywordTextBox);
          if (subEntry.type === 'omission') {
            items.push(this.createPenalty(INFINITE_PENALTY));
          }
          items.push((await this.createGlue(apparatusStyle)).setTextDirection(this.textDirection));
          if (subEntry.type === 'addition') {
            items.push(...this.setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, apparatusStyle), 'detect'));
            items.push(this.createPenalty(INFINITE_PENALTY));
            items.push((await this.createGlue(apparatusStyle)).setTextDirection(this.textDirection));
          }
          items.push(...await this.getTsItemsForSigla(subEntry));
          break;

        case 'fullCustom':
        case 'autoFoliation': {
          let keyword = subEntry['keyword'];
          let keywordString = '';
          // console.log(`Full custom entry; keyword: '${keyword}'`)
          if (keyword !== '') {
            keywordString = this.ss.getStrings()[keyword];
            let keywordTextBox = await this.ss.apply((new TextBox()).setText(keywordString).setTextDirection(this.textDirection), keywordStyle);
            items.push(keywordTextBox);
            if (keyword !== 'omission') {
              items.push((await this.createGlue(apparatusStyle)).setTextDirection(this.textDirection));
            }
          }
          if (keyword !== 'omission') {
            items.push(...this.setTextDirection(await this.tokenRenderer.renderWithStyle(subEntry.fmtText, apparatusStyle), 'detect'));
          }
          if (subEntry.type !== 'autoFoliation' && subEntry.witnessData.length !== 0) {
            items.push(this.createPenalty(INFINITE_PENALTY));
            items.push((await this.createGlue(apparatusStyle)).setTextDirection(this.textDirection));
            items.push(...await this.getTsItemsForSigla(subEntry));
          }
          // console.log(`TS item for full custom entry:`)
          // console.log(items)
          break;
        }
      }
      resolve(items);
    });
  }

  /**
   * Returns a string representing a given line range
   * @param {number}from
   * @param {number}to
   * @param resetFirstLine
   * @param firstLine
   * @param lastLine
   * @return {string}
   */
  getLineStringFromRange(from: number, to: number, resetFirstLine = false, firstLine = 1, lastLine = MAX_LINE_COUNT): string {
    //console.log(`getLineStringFromRange: ${from}-${to}, resetFirstLine ${resetFirstLine},  firstLine ${firstLine}, lastLine ${lastLine}`)
    let pageLineNumberFrom = from;
    let pageLineNumberTo = to;
    let toAndFromInSamePage = true;
    if (resetFirstLine) {
      pageLineNumberFrom = from - firstLine + 1;
      pageLineNumberTo = to - firstLine + 1;
      //console.log(`Adjusting line numbers: ${from} => ${pageLineNumberFrom}, ${to} => ${pageLineNumberTo}`)
      if (pageLineNumberTo > lastLine) {
        toAndFromInSamePage = false;
        pageLineNumberTo -= lastLine;
      }
    }
    if (toAndFromInSamePage && pageLineNumberFrom === pageLineNumberTo) {
      return this.getNumberString(pageLineNumberFrom, this.edition.lang);
    }
    // TODO: deal with the case where pageLineNumberFrom and pageLineNumberFrom are equal, but on
    //  different pages; in this version the number is just repeated.
    return `${this.getNumberString(pageLineNumberFrom, this.edition.lang)}${enDash}${this.getNumberString(pageLineNumberTo, this.edition.lang)}`;
  }

  /**
   * Returns a string that identifies the given range so that it can
   * be used as a key in the apparatus line range array
   * @param {string}from
   * @param {string}to
   * @return {string}
   * @private
   */
  getRangeKey(from: string, to: string): string {
    return `R_${String(from).padStart(4, '0')}_${String(to).padStart(4, '0')}`;
  }

  /**
   * Return the typeset line number for the main text token with the
   * given mainTextIndex using the previously extracted lineInfo array
   * @param {number}mainTextIndex
   * @private
   */
  getLineNumberForMainTextIndex(mainTextIndex: number) {
    if (this.extractedItemLineInfoArray === undefined) {
      return -1;
    }
    let infoIndex = this.mainTextIndices.indexOf(mainTextIndex);
    if (infoIndex !== -1) {
      return this.extractedItemLineInfoArray[infoIndex].lineNumber;
    }
    // it maybe a merged item, let's look for it
    for (let i = 0; i < this.extractedItemLineInfoArray.length; i++) {
      if (this.extractedItemLineInfoArray[i].isMerged) {
        if (this.extractedItemLineInfoArray[i].mergedMainTextIndices.indexOf(mainTextIndex) !== -1) {
          infoIndex = i;
          break;
        }
      }
    }

    if (infoIndex === -1) {
      // not found!
      console.warn(`Could not find line number for mainTextIndex ${mainTextIndex}`);
      return -1;
    }

    return this.extractedItemLineInfoArray[infoIndex].lineNumber;


  }

  /**
   * Returns an array of objects containing line information for each main text token
   * that appears in the given typeset main text
   * @param {ItemList}typesetMainTextVerticalList
   * @return {ItemLineInfo[]}
   * @private
   */
  extractLineInfoFromMetadata(typesetMainTextVerticalList: ItemList): ItemLineInfo[] {

    let lineInfoArray: ItemLineInfo[] = [];
    // this.debug && console.log(`Extracting line info from metadata in typeset vertical list`)
    // this.debug && console.log(typesetMainTextVerticalList)
    typesetMainTextVerticalList.getList().forEach((horizontalList) => {
      if (!horizontalList.hasMetadata(MetadataKey.LIST_TYPE)) {
        return;
      }
      if (horizontalList.getMetadata(MetadataKey.LIST_TYPE) !== ListType.LINE) {
        return;
      }
      if (!horizontalList.hasMetadata(MetadataKey.LINE_NUMBER)) {
        this.debug && console.log(`Found line without line number info`);
        return;
      }
      let lineNumber = horizontalList.getMetadata(MetadataKey.LINE_NUMBER);
      if (horizontalList instanceof ItemList) {
        horizontalList.getList().forEach((item) => {
          let itemInfoArray = this.getLineInfoArrayFromItem(item, lineNumber);
          lineInfoArray.push(...itemInfoArray);
        });
      }
    });
    // sort the array by mainTextIndex
    lineInfoArray.sort((a, b) => {
      return a.mainTextIndex - b.mainTextIndex;
    });

    // for debugging purposes, show the main text indices in merged Items
    // lineInfoArray.forEach( (lineInfo) => {
    //   if (lineInfo.isMerged) {
    //     console.log(`Item ${lineInfo.mainTextIndex} is merged: ${lineInfo.mergedMainTextIndices.join(', ')}`)
    //   }
    // })

    return lineInfoArray;
  }

  /**
   * Returns an array ItemLineInfo objects
   * for main text tokens stored in a TypesetterItem's metadata
   * Recursively extracts info from merged items
   * @param {TypesetterItem}item
   * @param {number}lineNumber
   * @return {ItemLineInfo[]}
   * @private
   */
  getLineInfoArrayFromItem(item: TypesetterItem, lineNumber: number): ItemLineInfo[] {
    if (!item.hasMetadata(MetadataKey.MERGED_ITEM || item.getMetadata(MetadataKey.MERGED_ITEM) === false)) {
      // normal, single item, just get the info if it exists and return
      let infoObject = this.constructLineInfoObjectFromItem(item, lineNumber, false);
      if (infoObject === undefined) {
        return [];
      }
      return [infoObject];
    }

    // merged item
    if (item.hasMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE)) {
      // no need to go down the tree, all info is right here!
      this.debug && console.log(`Item is merged but has info in it`, item.metadata);
      let infoObject = this.constructLineInfoObjectFromItem(item, lineNumber, true);
      if (infoObject === undefined) {
        return [];
      }
      return [infoObject];
    }


    if (!item.hasMetadata(MetadataKey.SOURCE_ITEMS)) {
      // no data from source items, warn and return an empty array
      console.warn(`Found merged item without source items info`);
      console.warn(item);
      return [];
    }
    let outputInfoArray: ItemLineInfo[] = [];
    // get the data from each item
    item.getMetadata(MetadataKey.SOURCE_ITEMS).forEach((sourceItemExport: any) => {
      let sourceItem = ObjectFactory.fromObject(sourceItemExport) as unknown as TypesetterItem;
      let itemInfoArray = this.getLineInfoArrayFromItem(sourceItem, lineNumber);
      outputInfoArray.push(...itemInfoArray);
    });
    return outputInfoArray;
  }

  /**
   * Returns an object with line information stored in a Typesetter's item metadata:
   *    {
   *      lineNumber:  number,
   *      occurrenceInLine: number,
   *      totalOccurrencesInLine: number,
   *      text: string,
   *      mainTextIndex: number
   *    }
   * @param {TypesetterItem}item
   * @param {number}lineNumber
   * @param isMerged
   * @return {ItemLineInfo}
   * @private
   */
  constructLineInfoObjectFromItem(item: TypesetterItem, lineNumber: number, isMerged = false): ItemLineInfo | undefined {
    if (!item.hasMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX)) {
      // the item does not correspond to a main text token
      return undefined;
    }
    let info = new ItemLineInfo();
    info.lineNumber = lineNumber;
    info.occurrenceInLine = 1;
    info.totalOccurrencesInLine = 1;
    info.text = '';
    info.mainTextIndex = item.getMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX);

    if (!isMerged && item instanceof TextBox) {
      info.text = item.getText();
    }

    if (isMerged) {
      info.text = item.getMetadata(MetadataKey.TOKEN_FOR_COUNTING_PURPOSES);
      info.isMerged = true;
      info.mergedMainTextIndices = this.getMainTextIndicesFromItem(item);
    }

    if (item.hasMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE)) {
      info.occurrenceInLine = item.getMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE);
    }

    if (item.hasMetadata(MetadataKey.TOKEN_TOTAL_OCCURRENCES_IN_LINE)) {
      info.totalOccurrencesInLine = item.getMetadata(MetadataKey.TOKEN_TOTAL_OCCURRENCES_IN_LINE);
    }
    // some sanity checks
    if (info.occurrenceInLine > info.totalOccurrencesInLine) {
      console.warn(`Inconsistent information found in metadata`);
      console.warn(info);
      return undefined;
    }
    return info;
  }

  /**
   *
   * @param {TypesetterItem}item
   * @return {number[]}
   */
  getMainTextIndicesFromItem(item: TypesetterItem | any): number[] {
    if (!(item instanceof TypesetterItem)) {
      item = ObjectFactory.fromObject(item);
    }


    const isMerged = item.getMetadata(MetadataKey.MERGED_ITEM) ?? false;
    const index = item.getMetadata(MetadataKey.MAIN_TEXT_ORIGINAL_INDEX) ?? null;
    if (index === null) {
      return [];
    }

    if (!isMerged) {
      return [index];
    }

    let indices: number[] = [];

    item.getMetadata(MetadataKey.SOURCE_ITEMS).forEach((mergedItem: any) => {
      indices.push(...this.getMainTextIndicesFromItem(mergedItem));
    });

    return [...new Set(indices)].sort((a, b) => a - b);

  }

  /**
   *
   * @return {Box}
   * @private
   */
  createIndentBox(width: number, textDirection: string): Box {
    return (new Box()).setWidth(width).setTextDirection(textDirection);
  }

  /**
   * Creates a Penalty Item of the given value
   * @param value
   * @return {Penalty}
   * @private
   */
  createPenalty(value: number): Penalty {
    return (new Penalty()).setPenalty(value);
  }

  /**
   * Creates a glue item with the given style and
   * scales with by the given factor
   *
   * @param {string} style
   * @param {number}factor
   * @return {Promise<Glue>}
   * @private
   */
  async createGlue(style: string, factor: number = 1): Promise<Glue> {
    /** @var {Glue} glue */
    let glue = await this.ss.apply(new Glue(), style);
    glue.setWidth(glue.getWidth() * factor);
    glue.setStretch(glue.getStretch() * factor);
    glue.setShrink(glue.getShrink() * factor);
    return glue;
  }

  /**
   *
   * @param {TextBox}textBox
   * @private
   */
  __detectAndSetTextBoxTextDirection(textBox: TextBox) {
    if (textBox.getTextDirection() !== '') {
      // do not change if text direction is already set
      this.debug && console.log(`Text box '${textBox.getText()}' direction is already set: '${textBox.getTextDirection()}'`);
      return textBox;
    }
    let detectedLang;
    // take care of common neutral punctuation right away
    const neutralPunctuationCharacters = ['[', ']', '<', '>', '(', ')', '{', '}', '«', '»', '.', ',', ';', '...', '"'];
    if (neutralPunctuationCharacters.indexOf(textBox.getText()) !== -1) {
      detectedLang = this.edition.lang;
    } else {
      detectedLang = this.languageDetector.detectLang(textBox.getText());
      if (detectedLang === '') {
        detectedLang = this.edition.lang;
      }
    }
    if (detectedLang !== this.edition.lang) {
      this.debug && console.log(`Text box with non '${this.edition.lang}' text: '${textBox.getText()}' ('${detectedLang}' detected)`);
    }
    if (isRtl(detectedLang)) {
      return textBox.setRightToLeft();
    } else {
      return textBox.setLeftToRight();
    }
  }

  /**
   * Sets the text direction for every item in the given array
   * @param {TypesetterItem[]}items
   * @param {string}textDirection
   * @private
   */
  setTextDirection(items: TypesetterItem[], textDirection: string) {
    switch (textDirection) {
      case 'rtl':
      case 'ltr':
        items.forEach((item) => {
          item.setTextDirection(textDirection);
        });
        break;

      case 'detect':
        items.forEach((item) => {
          item.setTextDirection('');  // the typesetter will set the right text direction later
          return item;
        });
        break;
    }
    return items;
  }

  private getTsItemsFromExportObjectsArray(exportObjects: any[]): TypesetterItem[] {
    return exportObjects.map((exportObject) => {
      return ObjectFactory.fromObject(exportObject) as unknown as TypesetterItem;
    });
  }

  private getItemExportObjectsArray(items: TypesetterItem[]) {
    return items.map((item) => {
      return item.getExportObject();
    });
  }

  private getTsItemsForSeparator(entry: ApparatusEntry): Promise<TypesetterItem[]> {
    let defaultLemmaSeparator = this.ss.getStrings()['defaultLemmaSeparator'];
    return new Promise(async (resolve) => {
      let items = [];
      switch (entry.separator) {
        case '':
          // default separator
          if (!ApparatusEntry.allSubEntriesInEntryObjectAreOmissions(entry)) {
            items.push(...await this.getTsItemsForString(defaultLemmaSeparator, 'apparatus', this.textDirection));
          }
          break;

        case 'off':
          // no separator
          break;

        case 'colon':
          items.push(...await this.getTsItemsForString(':', 'apparatus', this.textDirection));
          break;

        default:
          // custom separator
          items.push(...await this.getTsItemsForString(removeExtraWhiteSpace(FmtTextUtil.getPlainText(entry.separator)), 'apparatus', this.textDirection));
          break;
      }
      items.push((await this.createGlue('apparatus')).setTextDirection(this.textDirection));
      resolve(items);
    });
  }

  private getOccurrenceInLineInfo(mainTextIndex: number): number[] {
    if (this.extractedItemLineInfoArray === undefined) {
      console.warn(`Attempting to get occurrence in line values before extracting info from typeset metadata`);
      return [1, 1];
    }

    let infoIndex = this.mainTextIndices.indexOf(mainTextIndex);
    if (infoIndex === -1) {
      // This is actually not a problem. It will happen for punctuation only text boxes.
      // however, it might be good to check that it's happening only on those instances.
      //console.warn(`No occurrence in line info found for main text index ${mainTextIndex}`)
      return [1, 1];
    }
    return [this.extractedItemLineInfoArray[infoIndex].occurrenceInLine, this.extractedItemLineInfoArray[infoIndex].totalOccurrencesInLine];
  }

  private getTsItemsForString(someString: string, style = 'normal', textDirection = 'detect'): Promise<TypesetterItem[]> {

    return new Promise(async (resolve) => {
      let fmtText = FmtTextFactory.fromString(someString);
      let items = await this.tokenRenderer.renderWithStyle(fmtText, style);
      items = this.setTextDirection(items, textDirection);
      resolve(items);
    });
  }
}