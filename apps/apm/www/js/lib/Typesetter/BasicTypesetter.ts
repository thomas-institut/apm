// noinspection ES6PreferShortImport

/*
 *  Copyright (C) 2022-23 Universität zu Köln
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

import {Typesetter} from './Typesetter.js';
import {ItemList} from './ItemList.js';
import * as TypesetterItemDirection from './TypesetterItemDirection.js';
import {Glue} from './Glue.js';
import {TextBox} from './TextBox.js';
import {TypesetterPage} from './TypesetterPage.js';
import {TextBoxMeasurer} from './TextBoxMeasurer/TextBoxMeasurer.js';
import {TypesetterDocument} from './TypesetterDocument.js';
import * as MetadataKey from './MetadataKey.js';
import {OriginalText, SplitInSyllablesItem} from './MetadataKey.js';
import * as ListType from './ListType.js';
import * as LineType from './LineType.js';
import * as GlueType from './GlueType.js';
import {toFixedPrecision} from '../../toolbox/Util.js';
import {FirstFitLineBreaker, ItemArrayWithBidiOrderInfo} from './LineBreaker/FirstFitLineBreaker.js';
import {AddPageNumbers, AddPageNumbersOptions} from './PageProcessor/AddPageNumbers.js';
import {AddLineNumbers, AddLineNumbersOptions} from './PageProcessor/AddLineNumbers.js';
import {StringCounter} from '../../toolbox/StringCounter.js';
import {trimPunctuation} from '../../defaults/Punctuation.js';
import {MaxLineCount} from '../../Edition/EditionTypesettingHelper.js';
import {LanguageDetector} from '../../toolbox/LanguageDetector.js';
import {BidiDisplayOrder, IntrinsicTextDirection} from './Bidi/BidiDisplayOrder.js';
import {AdjustmentRatio} from './AdjustmentRatio.js';
import {MinusInfinitePenalty, Penalty} from './Penalty.js';
import {AddMainTextLinePositionMetadata} from './PageProcessor/AddMainTextLinePositionMetadata.js';
import {AddMarginalia, AddMarginaliaOptions} from './PageProcessor/AddMarginalia.js';
import {TypesetterItem} from "./TypesetterItem.js";
import {PageProcessor} from "./PageProcessor/PageProcessor.js";
import {BidiOrderInfo} from "./Bidi/BidiOrderInfo.js";
import {ApparatusInterface} from "../../Edition/EditionInterface.js";
import {compactItemArray} from "./Compactor/CompactItemArray.js";
import {hyphenateTextBoxes} from "./Hyphenator/HyphenateTextBoxes.js";
import {HyphenationLanguage} from "./Hyphenator/Hyphenator.js";

const signature = 'BasicTypesetter 1.0';

// Typesetting defaults

// number of lines to look ahead when breaking lines into pages

const AcceptableOrphanCount = 3;
const AcceptableWidowCount = 3;
const OrphanPenalty = 3;
const WidowPenalty = 3;
const DefaultFontFamily = 'FreeSerif';
const DefaultFontSize = Typesetter.pt2px(12);
const MaxLinesToLookAhead = 30;
const InfiniteVerticalBadness = 100000000;


interface BestPage {
  firstLine: number,
  lastLine: number,
  badness: number
  list: ItemList | null
}

interface LineRangeData {
  orphans: number;
  items: TypesetterItem[];
  widows: number;
  penalty: number;
}

interface BasicTypesetterExtraData {
  apparatuses?: ApparatusInterface[];
}

export interface Marginalia {
  lineNumber: number;
  marginalSubEntries: TypesetterItem[][];
}

export interface BasicTypesetterOptions {
  pageWidth: number;
  pageHeight: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  lineSkip?: number;
  apparatusLineSkip?: number;
  minLineSkip?: number;
  defaultFontFamily?: string;
  defaultFontSize?: number;
  showPageNumbers?: boolean;
  pageNumbersOptions?: AddPageNumbersOptions;
  showLineNumbers?: boolean;
  lineNumbersOptions?: AddLineNumbersOptions;
  marginaliaOptions?: AddMarginaliaOptions;
  apparatusesAtEndOfDocument?: boolean;
  hyphenationLanguages?: HyphenationLanguage [];
  textBoxMeasurer: TextBoxMeasurer;
  /**
   * A function to typeset an apparatus for the given line range.
   * It must return a Promise to a horizontal ItemList that to typeset and add at the end of the page
   */
  getApparatusListToTypeset?: (mainTextVerticalList: ItemList, apparatus: ApparatusInterface, lineFrom: number, lineTo: number, resetFirstLine: boolean) => Promise<ItemList>;
  getMarginaliaForLineRange?: (lineFrom: number, lineTo: number) => Marginalia[];
  preTypesetApparatuses?: (apparatuses: ApparatusInterface[]) => Promise<boolean>;
  textToApparatusGlue?: {
    height: number, shrink: number, stretch: number
  };
  interApparatusGlue?: {
    height: number, shrink: number, stretch: number
  };
  justify?: boolean;
  debug?: boolean;
}

export class BasicTypesetter extends Typesetter {
  private options: Required<BasicTypesetterOptions>;
  private readonly lineWidth: number;
  private readonly textAreaHeight: number;
  private lineSkip: number;
  private readonly minLineSkip: number;
  private debug: boolean;
  private pageOutputProcessors: PageProcessor[] = [];

  constructor(options: BasicTypesetterOptions) {
    super();

    const defaults = {
      marginTop: 50,
      marginBottom: 50,
      marginLeft: 50,
      marginRight: 50,
      lineSkip: 24,
      apparatusLineSkip: 20,
      minLineSkip: 0,
      defaultFontFamily: DefaultFontFamily,
      defaultFontSize: DefaultFontSize,
      showPageNumbers: true,
      pageNumbersOptions: {
        textBoxMeasurer: options.textBoxMeasurer, fontFamily: DefaultFontFamily, fontSize: DefaultFontSize
      },
      showLineNumbers: true,
      lineNumbersOptions: {textBoxMeasurer: options.textBoxMeasurer},
      marginaliaOptions: {textBoxMeasurer: options.textBoxMeasurer},
      apparatusesAtEndOfDocument: false,
      getApparatusListToTypeset: async () => {
        return new ItemList();
      },
      getMarginaliaForLineRange: (_lineFrom: number, _lineTo: number): Marginalia[] => {
        return [];
      },
      preTypesetApparatuses: async (_apparatuses: ApparatusInterface[]) => {
        return true;
      },
      textToApparatusGlue: {height: DefaultFontSize, shrink: DefaultFontSize * 0.1, stretch: Typesetter.cm2px(50)},
      interApparatusGlue: {height: DefaultFontSize, shrink: 0, stretch: DefaultFontSize * 0.25},
      justify: true,
      debug: false,
      hyphenationLanguages: [],
    };

    this.options = {...defaults, ...options};

    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight;
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom;
    this.lineSkip = this.options.lineSkip;
    this.minLineSkip = this.options.minLineSkip;
    this.debug = this.options.debug;

    if (this.options.showPageNumbers) {
      const pageNumberOptionsDefaults = {
        align: 'center', fontFamily: DefaultFontFamily, fontSize: DefaultFontSize * 0.8, numberStyle: '',
      };
      const defaultMargin = Typesetter.cm2px(0.5);
      const defaultPosition = 'bottom';
      const pageNumberOptions = {...pageNumberOptionsDefaults, ...this.options.pageNumbersOptions};
      this.addPageOutputProcessor(this.constructAddPageNumberProcessor(pageNumberOptions, defaultMargin, defaultPosition));
    }

    this.addPageOutputProcessor(new AddMainTextLinePositionMetadata());

    if (this.options.showLineNumbers) {
      const lnOptionsDefaults = {
        xPosition: this.options.marginLeft + Typesetter.cm2px(0.5),
        align: 'right',
        fontFamily: DefaultFontFamily,
        fontSize: DefaultFontSize,
        numberStyle: '',
        showLineOne: false,
        lineNumberShift: 0,
        resetEachPage: true,
        frequency: 5,
      };
      let lnOptions = {...lnOptionsDefaults, ...this.options.lineNumbersOptions};
      if (lnOptions.resetEachPage) {
        lnOptions.showLineOne = false;
      }
      this.options.lineNumbersOptions = lnOptions;
      this.debug && console.log(`Line Number clean options`, lnOptions);
      this.addPageOutputProcessor(this.constructAddLineNumbersProcessor(lnOptions));
    }

    // Marginalia processor
    const AddMarginaliaDefaults: AddMarginaliaOptions = {
      xPosition: this.options.marginRight + Typesetter.cm2px(0.5),
      defaultTextDirection: 'ltr',
      align: 'left',
      textBoxMeasurer: this.options.textBoxMeasurer,
    };
    this.options.marginaliaOptions = {...AddMarginaliaDefaults, ...this.options.marginaliaOptions};
    this.addPageOutputProcessor(new AddMarginalia(this.options.marginaliaOptions));

  }

  /**
   *
   * @param {PageProcessor}pageOutputProcessor
   */
  addPageOutputProcessor(pageOutputProcessor: PageProcessor): void {
    this.pageOutputProcessors.push(pageOutputProcessor);
  }

  /**
   * Splits a horizontal list into lines: converts a horizontal list into a vertical list
   * consisting of a series of lines of a certain width (given previously
   * to the typesetter) and inter-line glue that gives the lines certain spacing between
   * them (the lineSkip parameter in the typesetter options).
   *
   * For the purposes of bidirectional text display, it is assumed that the given horizontal
   * list constitutes a paragraph.
   *
   * Adds metadata to each text with the line number within the horizontal list.
   */
  async typesetHorizontalList(list: ItemList): Promise<ItemList> {
    // Run the list through the Typesetter class checks
    let inputList = await super.typesetHorizontalList(list);

    let itemArray = inputList.getList();
    // Construct a vertical list to hold the lines
    let outputList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    if (itemArray.length === 0) {
      return outputList;
    }

    // Determine the bidirectional text item order for the whole list; this will be the basis for
    // potentially reordering items for each line
    let bidiOrderInfoArray = BidiDisplayOrder.getDisplayOrder(itemArray, inputList.getTextDirection(), (item: TypesetterItem) => {
      return this.getItemIntrinsicTextDirection(item);
    });

    const itemArrayWithBidiOrderInfo: ItemArrayWithBidiOrderInfo = {
      itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray
    };

    // console.log(`Horizontal list to typeset`, itemArrayWithBidiOrderInfo);
    // hyphenate compact the item array taking into account bidirectional text order
    let hyphenated = hyphenateTextBoxes({
      itemArrayWithBidiInfo: itemArrayWithBidiOrderInfo, hyphenationLanguages: this.options.hyphenationLanguages
    });
    // console.log(`Hyphenated`, hyphenated);

    let compacted = compactItemArray(hyphenated);
    // console.log(`Compacted`, compacted);

    let originalIndexToOrderMap: number[] = [];
    compacted.bidiOrderInfoArray.forEach((orderInfo: BidiOrderInfo) => {
      originalIndexToOrderMap[orderInfo.inputIndex] = orderInfo.displayOrder;
    });
    let originalIndexToTextDirectionMap: string[] = [];
    compacted.bidiOrderInfoArray.forEach((orderInfo) => {
      originalIndexToTextDirectionMap[orderInfo.inputIndex] = orderInfo.textDirection;
    });

    // Run the First Fit algorithm on the input list

    let lines = await FirstFitLineBreaker.breakIntoLines(compacted.itemArray, this.lineWidth, this.options.textBoxMeasurer, compacted.bidiOrderInfoArray);
    // console.log(`Lines`, deepCopy(lines));

    // Post-process lines
    let lineNumberInParagraph = 1;
    lines = lines.map((line) => {
      // inherit text direction from input list
      line.setTextDirection(inputList.getTextDirection());

      // add list type
      line.addMetadata(MetadataKey.ListType, ListType.LineList);

      // add line number in paragraph
      line.addMetadata(MetadataKey.LineNumberInParagraph, lineNumberInParagraph++);

      // set height
      line.setHeight(line.getHeight());

      // align item baselines
      let lineHeight = line.getHeight(); // lineHeight is now the height of the tallest item in the list
      line.setList(line.getList().map((item: TypesetterItem) => {
        if (item instanceof TextBox) {
          if (item.getHeight() < lineHeight) {
            let oldShiftY = item.getShiftY();
            let newShiftY = lineHeight - item.getHeight() + oldShiftY;
            item.setShiftY(newShiftY);
          }
        }
        return item;
      }));

      // adjust horizontal glue  (i.e., justify the text within the line)
      let adjRatio = AdjustmentRatio.calculateHorizontalAdjustmentRatio(line.getList(), this.lineWidth);
      line.addMetadata(MetadataKey.AdjustmentRatio, adjRatio);
      let unadjustedLineWidth = line.getWidth();
      line.addMetadata(MetadataKey.UnadjustedLineWidth, toFixedPrecision(unadjustedLineWidth, 3));
      if (adjRatio !== null) {
        line.setList(line.getList().map((item: TypesetterItem) => {
          if (item instanceof Glue) {
            if (adjRatio >= 0) {
              item.setWidth(item.getWidth() + adjRatio * item.getStretch());
            } else {
              item.setWidth(item.getWidth() + adjRatio * item.getShrink());
            }
          }
          return item;
        }));
      }
      line.addMetadata(MetadataKey.LineRatio, toFixedPrecision(line.getWidth() / unadjustedLineWidth, 3));
      // console.log(`Line ${lineNumberInParagraph - 1} has ratio ${toFixedPrecision(line.getWidth() / unadjustedLineWidth, 3)}`, deepCopy(line.getList()));

      // At this point the line contains a list of items in textual order, independently of their text direction
      // Renderers, however, need to the items in display order, so they can simply iterate on the list, display
      // an item, move the current position to the right (or left for RTL text) and process the next.
      line = this.arrangeItemsInDisplayOrderNew(line, originalIndexToOrderMap, originalIndexToTextDirectionMap);
      // console.log(`Arranged line ${lineNumberInParagraph - 1}`, deepCopy(line.getList()));
      return line;
    });

    // add total paragraph line count
    lines = lines.map(line => line.addMetadata(MetadataKey.ParagraphLineCount, lineNumberInParagraph - 1));

    if (lines.length === 0) {
      return outputList;
    }

    // add inter-line glue
    for (let i = 0; i < lines.length; i++) {
      outputList.pushItem(lines[i]);
      let interLineGlue = new Glue(TypesetterItemDirection.VerticalItemDirection);
      interLineGlue.addMetadata(MetadataKey.GlueType, GlueType.InterLineVerticalGlue);
      if (i !== lines.length - 1) {
        // For all but the last line, calculate and set glue height based on the height of the next line
        let nextLineHeight = lines[i + 1].getHeight();
        interLineGlue.setHeight(this.calcInterLineGlueHeight(nextLineHeight))
        .setWidth(this.lineWidth)
        .setStretch(0)
        .setShrink(0)
        .addMetadata(MetadataKey.InterLineGlueSet, true);
      } else {
        // After the last line, add unset glue.
        // This glue will be needed later if paragraphs need to be put together.
        interLineGlue.setHeight(0)
        .setWidth(this.lineWidth)
        .addMetadata(MetadataKey.InterLineGlueSet, false);
      }
      outputList.pushItem(interLineGlue);
    }
    // this.debug && console.log(`Paragraph has ${lineNumberInParagraph-1} lines`)
    return outputList;
  }

  async typesetVerticalList(list: ItemList): Promise<ItemList> {
    // TODO: add widow/orphan control here too!
    let inputList = await super.typesetVerticalList(list);
    let outputList = new ItemList(TypesetterItemDirection.HorizontalItemDirection);
    let currentY = 0;
    let currentVerticalList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    if (list.hasMetadata(MetadataKey.ListType)) {
      currentVerticalList.addMetadata(MetadataKey.ListType, list.getMetadata(MetadataKey.ListType));
    }
    inputList.getList().forEach((item, i) => {
      if (item instanceof Glue) {
        currentY += item.getHeight();
        currentVerticalList.pushItem(item);
        return;
      }
      if (item instanceof ItemList) {
        if (item.getDirection() === TypesetterItemDirection.VerticalItemDirection) {
          console.warn(`Ignoring vertical list while typesetting a vertical list, item index ${i}`);
          console.log(item);
          return;
        }
        currentY += item.getHeight();
        if (currentY > this.textAreaHeight) {
          // new page!
          currentVerticalList.trimEndGlue();
          outputList.pushItem(currentVerticalList);
          currentVerticalList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
          if (list.hasMetadata(MetadataKey.ListType)) {
            currentVerticalList.addMetadata(MetadataKey.ListType, list.getMetadata(MetadataKey.ListType));
          }
          currentVerticalList.pushItem(item);
          currentY = item.getHeight();
        } else {
          currentVerticalList.pushItem(item);
        }
        return;
      }
      console.warn(`Ignoring non-glue non-list item while typesetting vertical list, item index ${i}`);
      console.log(item);
    });
    if (currentVerticalList.getList().length !== 0) {
      currentVerticalList.trimEndGlue();
      outputList.pushItem(currentVerticalList);
    }
    return outputList;
  }

  /**
   * Typesets a list of paragraphs into a document.
   *
   * Each vertical item in the input list must be either a horizontal list
   * containing a paragraph, vertical glue or a penalty
   *
   * A paragraph is a single horizontal list containing text and
   * inter-word glue. The typesetter will convert each paragraph into
   * a vertical list with the paragraph properly split into lines
   * Then, all paragraph lines and vertical glue will be put together and
   * broken into pages.
   *
   * The optional extraData parameter may contain apparatuses, footnotes
   * and end notes that must be typeset together with the main text. The typesetter
   * will call the getApparatusListToTypeset given in the constructor options
   * when needed.
   *
   */
  async typeset(mainTextList: ItemList, extraData: BasicTypesetterExtraData = {}): Promise<TypesetterDocument> {
    if (mainTextList.getDirection() !== TypesetterItemDirection.VerticalItemDirection) {
      throw new Error(`Cannot typeset a non-vertical list`);
    }
    // 1. Create a vertical list to be typeset
    let mainTextVerticalList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    //
    // 2. Typeset the main text
    //
    let paragraphNumber = 0;
    for (const mainTextListItem of mainTextList.getList()) {
      if (mainTextListItem instanceof Glue) {
        if (mainTextListItem.getDirection() === TypesetterItemDirection.VerticalItemDirection) {
          // VERTICAL GLUE, just add it to the list to typeset
          mainTextVerticalList.pushItem(mainTextListItem);
        } else {
          console.warn(`${signature}: ignoring horizontal glue while building main text vertical list`);
        }
        continue;
      }
      if (mainTextListItem instanceof ItemList) {
        if (mainTextListItem.getDirection() === TypesetterItemDirection.HorizontalItemDirection) {
          // HORIZONTAL LIST, i.e., a paragraph
          paragraphNumber++;
          let typesetParagraph = await this.typesetHorizontalList(mainTextListItem);
          typesetParagraph.getList().forEach((typesetItem) => {
            if (typesetItem instanceof ItemList) {
              // add paragraph number info to each line in the paragraph
              typesetItem.addMetadata(MetadataKey.ParagraphNumber, paragraphNumber);
              typesetItem.addMetadata(MetadataKey.LineType, LineType.MainTextLine);
              // Count text token occurrences within the line
              this.addOccurrenceInLineMetadata(typesetItem);
            }
            mainTextVerticalList.pushItem(typesetItem);
          });
        }
        continue;
      }
      if (mainTextListItem instanceof Penalty) {
        mainTextVerticalList.pushItem(mainTextListItem);
        continue;
      }
      // any other item type is ignored
      console.warn(`Ignoring non-supported item while building main text vertical list`, mainTextListItem);
    }
    // set any inter line glue that still unset, normally, inter line glue between paragraphs
    mainTextVerticalList = this.setUnsetInterLineGlue(mainTextVerticalList);
    // add absolute line numbers metadata to text lines
    mainTextVerticalList = this.addAbsoluteLineNumberMetadata(mainTextVerticalList);
    mainTextVerticalList.addMetadata(MetadataKey.ListType, ListType.MainTextBlockList);


    //
    // 3. Break the main text into pages
    //
    let thePages = [];
    let doc = new TypesetterDocument();
    doc.addMetadata('typesetter', signature);
    let resetLineNumbersEachPage = this.options.lineNumbersOptions.resetEachPage;
    if (resetLineNumbersEachPage === undefined) {
      throw new Error(`Cannot determine whether to reset line numbers each page. Please set the 'resetEachPage' option.`);
    }
    if (extraData.apparatuses === undefined) {
      extraData.apparatuses = [];
    }
    if (extraData.apparatuses.length !== 0) {
      await this.options.preTypesetApparatuses(extraData.apparatuses);
    }
    if (extraData.apparatuses.length === 0 || this.options.apparatusesAtEndOfDocument) {
      // No apparatuses or apparatuses should go at the end of the document, just append
      // the apparatuses and typeset a normal document
      let apparatuses = await this.typesetApparatuses(mainTextVerticalList, extraData.apparatuses);
      this.debug && console.log(`Typeset apparatuses`);
      this.debug && console.log(apparatuses);
      if (apparatuses.length > 0) {
        mainTextVerticalList.pushItem((new Glue(TypesetterItemDirection.VerticalItemDirection))
        .setHeight(this.options.textToApparatusGlue.height)
        .setStretch(this.options.textToApparatusGlue.stretch)
        .setShrink(this.options.textToApparatusGlue.shrink)
        .addMetadata(MetadataKey.GlueType, GlueType.TextToApparatusVerticalGlue));

        for (let i = 0; i < apparatuses.length; i++) {
          mainTextVerticalList.pushItemArray(apparatuses[i].getList());
          if (i !== apparatuses.length - 1) {
            mainTextVerticalList.pushItem((new Glue(TypesetterItemDirection.VerticalItemDirection))
            .setHeight(this.options.interApparatusGlue.height)
            .setStretch(this.options.interApparatusGlue.stretch)
            .setShrink(this.options.interApparatusGlue.shrink)
            .addMetadata(MetadataKey.GlueType, GlueType.InterApparatusVerticalGlue));
          }
        }
      }
      // simple page breaks
      let pageList = await this.typesetVerticalList(mainTextVerticalList);
      thePages = pageList.getList().map((pageItemList) => {
        pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop);
        return new TypesetterPage(this.options.pageWidth, this.options.pageHeight, [pageItemList]);
      }).map((page, pageIndex) => {
        // add metadata
        page.addMetadata(MetadataKey.PageNumber, pageIndex + 1);
        // "normal" foliation, other processors may change it
        //page.addMetadata(MetadataKey.PAGE_FOLIATION, `${pageIndex+1}`)
        return page;
      });
    } else {
      // apparatuses should go at the foot of each page
      // go over the typeset text list determining the line ranges that fill up a page
      let [firstLine, lastLine] = this.getTotalLineNumberRange(mainTextVerticalList);
      this.debug && console.log(`Main text lines go from ${firstLine} to ${lastLine}`);

      // typeset the apparatus for the whole line range to fill up and cache apparatus data.
      await this.typesetApparatuses(mainTextVerticalList, extraData.apparatuses);

      // Break lines into pages

      let currentPage = {
        firstLine: firstLine, pageNumber: 1
      };
      let bestPage: BestPage = {
        firstLine: firstLine, lastLine: firstLine - 1, badness: InfiniteVerticalBadness, list: null
      };
      let lastLookedAheadList = null;
      let linesLookedAhead = 0;
      let maxLinesLookedAhead = 0;
      let pageTypesettingData = [];
      for (let currentLine = firstLine; currentLine <= lastLine; currentLine++) {
        this.debug && console.log(`Current line is ${currentLine}`);
        this.debug && console.log(`Testing line range ${currentPage.firstLine} to ${currentLine}`);
        let lineRangeData = this.getItemsAndInfoForLineRange(mainTextVerticalList, currentPage.firstLine, currentLine);
        this.debug && console.log(`   - Widows: ${lineRangeData.widows}, orphans: ${lineRangeData.orphans}, penalty: ${lineRangeData.penalty}`);
        let verticalListToTest = await this.prepareVerticalListToTest(mainTextVerticalList, lineRangeData.items, extraData.apparatuses, currentPage.firstLine, currentLine, resetLineNumbersEachPage);

        let badness = this.calculateVerticalListBadness(verticalListToTest, this.textAreaHeight, lineRangeData.widows, lineRangeData.orphans, lineRangeData.penalty);
        // assess the tested page
        if (lineRangeData.penalty === MinusInfinitePenalty) {
          // insert a page break!
          this.debug && console.log(`EJECTING Page ${currentPage.pageNumber} due to forced page break`);
          this.debug && console.log(`===================`);
          let ejectedPages = this.ejectPage(verticalListToTest, currentPage.pageNumber, currentPage.firstLine, currentLine);
          thePages.push(...ejectedPages);
          pageTypesettingData.push({
            firstLine: currentPage.firstLine,
            lastLine: currentLine,
            badness: badness,
            linesLookedAhead: linesLookedAhead
          });
          // update current page
          currentPage.pageNumber += ejectedPages.length;
          currentPage.firstLine = currentLine;
          // reset best page
          bestPage = {
            firstLine: currentLine + 1, lastLine: currentLine, badness: InfiniteVerticalBadness, list: null
          };
          // reset look ahead info
          lastLookedAheadList = null;
          linesLookedAhead = 0;
          continue;
        }

        this.debug && console.log(`   - Badness: ${badness}`);
        if (badness <= bestPage.badness) {
          this.debug && console.log(`   => new best badness ${linesLookedAhead !== 0 ? 'found after ' + linesLookedAhead + ' line(s) looked ahead' : ''}`);
          bestPage.badness = badness;
          bestPage.list = verticalListToTest;
          bestPage.lastLine = currentLine;
          // reset look ahead info
          linesLookedAhead = 0;
          lastLookedAheadList = null;
        } else {
          this.debug && console.log(`   Tested page is worse than current best ${bestPage.firstLine} to ${bestPage.lastLine}`);
          if (badness === InfiniteVerticalBadness || linesLookedAhead >= MaxLinesToLookAhead) {
            // we have either reached infinite badness (i.e., there's absolutely no more room for lines) or we have
            // looked enough ahead looking for a better page.
            if (bestPage.list === null) {
              console.warn(`Found null best current page!!`);
            } else {
              // Eject the best page we have found
              this.debug && console.log(`EJECTING Page ${currentPage.pageNumber}`);
              this.debug && console.log(`===================`);
              let ejectedPages = this.ejectPage(bestPage.list, currentPage.pageNumber, bestPage.firstLine, bestPage.lastLine);
              thePages.push(...ejectedPages);
              pageTypesettingData.push({
                firstLine: bestPage.firstLine,
                lastLine: bestPage.lastLine,
                badness: bestPage.badness,
                linesLookedAhead: linesLookedAhead
              });
              // backtrack the current line to the best page's last line
              // the for loop will increment it by 1, so the next line tested will be the one after
              currentLine = bestPage.lastLine;
              // update current page
              currentPage.firstLine = currentLine + 1;
              currentPage.pageNumber += ejectedPages.length;
              // reset best page
              bestPage = {
                firstLine: currentLine + 1, lastLine: currentLine, badness: InfiniteVerticalBadness, list: null
              };
              // reset look ahead info
              lastLookedAheadList = null;
              linesLookedAhead = 0;
            }
          } else {
            // just keep looking ahead
            linesLookedAhead++;
            maxLinesLookedAhead = Math.max(linesLookedAhead, maxLinesLookedAhead);
            this.debug && console.log(`   ...but we have only looked ${linesLookedAhead} line(s) ahead`);
            lastLookedAheadList = verticalListToTest;
          }
        }
      }

      // reached the end, if there's  best page, eject it
      this.debug && console.log(`Reached the end`);
      if (bestPage.list !== null) {
        this.debug && console.log(`EJECTING page ${currentPage.pageNumber}, lines ${currentPage.firstLine} to ${bestPage.lastLine}`);
        this.debug && console.log(`===================`);
        let ejectedPages = this.ejectPage(bestPage.list, currentPage.pageNumber, currentPage.firstLine, bestPage.lastLine);
        thePages.push(...ejectedPages);
        pageTypesettingData.push({
          firstLine: bestPage.firstLine,
          lastLine: bestPage.lastLine,
          badness: bestPage.badness,
          linesLookedAhead: linesLookedAhead
        });
        currentPage.pageNumber += ejectedPages.length;
      }
      if (lastLookedAheadList !== null) {
        // There are hanging lines!
        let lineRangeData = this.getItemsAndInfoForLineRange(mainTextVerticalList, bestPage.lastLine + 1, lastLine);
        let verticalListWithLastHangingLines = await this.prepareVerticalListToTest(mainTextVerticalList, lineRangeData.items, extraData.apparatuses, bestPage.lastLine + 1, lastLine, resetLineNumbersEachPage);
        this.debug && console.log(`EJECTING page ${currentPage.pageNumber}, hanging lines ${bestPage.lastLine + 1} to ${lastLine}`);
        this.debug && console.log(`===================`);
        thePages.push(...this.ejectPage(verticalListWithLastHangingLines, currentPage.pageNumber, bestPage.lastLine + 1, lastLine));
        pageTypesettingData.push({
          firstLine: bestPage.lastLine + 1, lastLine: lastLine, badness: -1, linesLookedAhead: 0
        });
      }
      this.debug && console.log(`Max lines looked ahead: ${maxLinesLookedAhead}`);
      this.debug && console.log(`Page Typesetting Data`);
      this.debug && console.log(pageTypesettingData);

    }


    // Apply page processors
    let processedPages = [];
    for (let pageIndex = 0; pageIndex < thePages.length; pageIndex++) {
      let processedPage = thePages[pageIndex];
      for (let processorIndex = 0; processorIndex < this.pageOutputProcessors.length; processorIndex++) {
        // this.debug && console.log(`Applying page output processor ${processorIndex}`)
        processedPage = await this.pageOutputProcessors[processorIndex].process(processedPage);
      }
      processedPages.push(processedPage);
    }
    doc.setPages(processedPages);
    doc.setDimensionsFromPages();
    return doc;

  }

  /**
   * Ejects a page.
   *
   * Returns an array of TypesetterPage object, which normally only contains one page.
   * It may return more than one when there's a text overflow.
   *
   */
  ejectPage(verticalList: ItemList, pageNumber: number, firstLine: number, lastLine: number): TypesetterPage[] {
    this.debug && console.log(`Ejecting page ${pageNumber}: lines ${firstLine} to ${lastLine}`);
    verticalList
    .setShiftX(this.options.marginLeft)
    .setShiftY(this.options.marginTop)
    .addMetadata(MetadataKey.ListType, ListType.MainTextBlockList);

    let adjRatio = AdjustmentRatio.calculateVerticalAdjustmentRatio(verticalList.getList(), this.textAreaHeight);
    if (adjRatio === null) {
      console.warn(`Null vertical adjRatio found while ejecting page ${pageNumber}`);
      // This will only occur when there's not enough room in the page to put all the text.
      // The interim solution is to eject the pages necessary to display all the text
      let itemList: TypesetterItem[] = [];
      let currentHeight = 0;
      let accGlue: Glue[] = [];
      let pages = [];
      verticalList.getList().forEach((item) => {
        if (item instanceof Glue) {
          accGlue.push(item);
        } else {
          if ((currentHeight + item.getHeight()) > this.textAreaHeight) {
            let vList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
            vList.setList(itemList).setShiftX(this.options.marginLeft)
            .setShiftY(this.options.marginTop)
            .addMetadata(MetadataKey.ListType, ListType.MainTextBlockList);
            // eject a page
            let page = new TypesetterPage(this.options.pageWidth, this.options.pageHeight, [vList]);
            page.addMetadata(MetadataKey.PageNumber, `${pageNumber + pages.length}`);
            pages.push(page);
            itemList = [item];
            currentHeight = item.getHeight();
            accGlue = [];
          } else {
            accGlue.forEach((glueItem) => {
              currentHeight += glueItem.getHeight();
            });
            currentHeight += item.getHeight();
            itemList.push(...accGlue, item);
            accGlue = [];
          }
        }
      });
      if (itemList.length > 0) {
        let vList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
        vList.setList(itemList).setShiftX(this.options.marginLeft)
        .setShiftY(this.options.marginTop)
        .addMetadata(MetadataKey.ListType, ListType.MainTextBlockList);
        // eject a page
        let page = new TypesetterPage(this.options.pageWidth, this.options.pageHeight, [vList]);
        page.addMetadata(MetadataKey.PageNumber, `${pageNumber + pages.length}`);
        pages.push(page);
      }
      return pages;
    }
    this.debug && console.log(`Page ${pageNumber}, adjRatio = ${adjRatio}`);
    let adjustedItems = verticalList.getList().map((item) => {
      if (item instanceof Glue) {
        if (adjRatio >= 0) {
          item.setHeight(item.getHeight() + adjRatio * item.getStretch());
        } else {
          item.setHeight(item.getHeight() + adjRatio * item.getShrink());
        }
      }
      return item;
    }).filter(item => !(item instanceof Penalty));
    verticalList.setList(adjustedItems);

    let page = new TypesetterPage(this.options.pageWidth, this.options.pageHeight, [verticalList]);
    page.addMetadata(MetadataKey.PageNumber, pageNumber);

    let marginalia = this.options.getMarginaliaForLineRange(firstLine, lastLine);
    // console.log(`Marginalia ${firstLine} to ${lastLine}: ${marginalia}`)
    page.addMetadata(MetadataKey.PageMarginalia, marginalia);
    return [page];
  }

  /**
   *
   * @param {ItemList}verticalList
   * @param {number}desiredHeight
   * @param {number}widows
   * @param {number}orphans
   * @param {number}penaltyValue
   */
  calculateVerticalListBadness(verticalList: ItemList, desiredHeight: number, widows: number, orphans: number, penaltyValue: number = 0) {
    let adjRatio = AdjustmentRatio.calculateVerticalAdjustmentRatio(verticalList.getList(), desiredHeight);

    if (adjRatio === null) {
      // no glue available to adjust the page. Terrible.
      return InfiniteVerticalBadness;
    }
    if (adjRatio < -1) {
      // No shrinking past the maximum, so any adjustment ratio of -1 or less is infinitely bad
      return InfiniteVerticalBadness;
    }
    let badness = 100 * Math.pow(Math.abs(adjRatio), 3);
    // TODO: what is the orphan penalty that would force the typesetter to produce a
    //  page break before a single line paragraph at the end of a document?
    if (orphans !== 0 && orphans < AcceptableOrphanCount) {
      badness += (OrphanPenalty / orphans);
    }
    if (widows !== 0 && widows < AcceptableWidowCount) {
      badness += (WidowPenalty / widows);
    }
    return badness > InfiniteVerticalBadness ? InfiniteVerticalBadness : badness + penaltyValue;
  }

  getTextTokenForCountingPurposes(text: string): string {
    return trimPunctuation(text.toLowerCase());
  }

  getItemIntrinsicTextDirection(item: TypesetterItem): IntrinsicTextDirection {
    if (item instanceof TextBox) {
      if (item.getTextDirection() === '') {
        // text direction not set, let's calculate it!
        let ld = new LanguageDetector('la');
        return ld.detectTextDirection(item.getText());
      } else {
        return item.getTextDirection() as IntrinsicTextDirection;
      }
    }
    // not a TextBox
    return item.getTextDirection() as IntrinsicTextDirection;
  }

  /**
   * Adds absolute line number metadata to each line in the given list
   * @param {ItemList}verticalList
   * @return {ItemList}
   * @private
   */
  addAbsoluteLineNumberMetadata(verticalList: ItemList): ItemList {
    let outputList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    let lineNumber = 0;
    verticalList.getList().forEach((item) => {
      if (item instanceof ItemList && item.hasMetadata(MetadataKey.ListType) && item.getMetadata(MetadataKey.ListType) === ListType.LineList) {
        lineNumber++;
        // this.debug && console.log(`Adding line number ${lineNumber} metadata`)
        item.addMetadata(MetadataKey.LineNumber, lineNumber);
      }
      outputList.pushItem(item);
    });
    return outputList;
  }

  /**
   * Sets any unset inter line glue in the vertical list.
   * Normally, this will be the inter line glue at the end of individually
   * set paragraphs.
   * @param verticalList
   * @return ItemList
   * @private
   */
  private setUnsetInterLineGlue(verticalList: ItemList): ItemList {
    let outputList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    let state = 0;
    let currentInterLineGlue: TypesetterItem | null = null;
    let tmpItems: TypesetterItem[] = [];
    verticalList.getList().forEach((item) => {
      switch (state) {
        case 0: // processing lines and set glue
          if (item.hasMetadata(MetadataKey.GlueType) && item.getMetadata(MetadataKey.GlueType) === GlueType.InterLineVerticalGlue && item.getMetadata(MetadataKey.InterLineGlueSet) === false) {
            // this.debug && console.log(`Item ${i} is interline glue that is not set`)
            currentInterLineGlue = item;
            state = 1;
          } else {
            outputList.pushItem(item);
          }
          break;

        case 1: // waiting for a line after receiving unset glue
          if (item instanceof ItemList && item.hasMetadata(MetadataKey.ListType) && item.getMetadata(MetadataKey.ListType) === ListType.LineList) {
            // this.debug && console.log(`Got a line in state 1, setting inter line glue`)
            let nextLineHeight = item.getHeight();
            if (currentInterLineGlue === null) {
              throw new Error(`Inter line glue not set in state 1`);
            }
            currentInterLineGlue.setHeight(this.calcInterLineGlueHeight(nextLineHeight))
            .addMetadata(MetadataKey.InterLineGlueSet, true);
            outputList.pushItem(currentInterLineGlue);
            // this.debug && console.log(`Pushing ${tmpItems.length} item(s) in temp stack to output list`)
            outputList.pushItemArray(tmpItems);
            outputList.pushItem(item);
            tmpItems = [];
            currentInterLineGlue = null;
            state = 0;
          } else {
            // not a line, just save it into a temporary stack
            // normally, this will never happen when the input list is the output
            // of typesetHorizontalList
            //this.debug && console.log(`Saving item ${i} in temp stack`)
            tmpItems.push(item);
          }
          break;
      }
    });
    outputList.pushItemArray(tmpItems);
    return outputList;
  }

  /**
   * Returns the height of the inter line glue so the space between lines
   * is always this.lineSkip
   */
  private calcInterLineGlueHeight(nextLineHeight: number): number {
    return Math.max(this.minLineSkip, this.lineSkip - nextLineHeight);
  }

  private async prepareVerticalListToTest(verticalListToTypeset: ItemList, items: any[], apparatusData: any, firstLine: number, lastLine: number, resetLineNumbersEachPage: boolean): Promise<ItemList> {
    let verticalListToTest = new ItemList(TypesetterItemDirection.VerticalItemDirection);
    verticalListToTest.setList(items);
    // typeset and add the apparatuses to the list to test
    let apparatuses: any[] = await this.typesetApparatuses(verticalListToTypeset, apparatusData, firstLine, lastLine, resetLineNumbersEachPage);
    apparatuses = apparatuses.filter((app) => {
      return app.getList().length !== 0;
    });
    if (apparatuses.length > 0) {
      verticalListToTest.pushItem((new Glue(TypesetterItemDirection.VerticalItemDirection))
      .setHeight(this.options.textToApparatusGlue.height)
      .setStretch(this.options.textToApparatusGlue.stretch)
      .setShrink(this.options.textToApparatusGlue.shrink)
      .addMetadata(MetadataKey.GlueType, GlueType.TextToApparatusVerticalGlue));
      for (let i = 0; i < apparatuses.length; i++) {
        verticalListToTest.pushItemArray(apparatuses[i].getList());
        if (i !== apparatuses.length - 1) {
          verticalListToTest.pushItem((new Glue(TypesetterItemDirection.VerticalItemDirection))
          .setHeight(this.options.interApparatusGlue.height)
          .setStretch(this.options.interApparatusGlue.stretch)
          .setShrink(this.options.interApparatusGlue.shrink)
          .addMetadata(MetadataKey.GlueType, GlueType.InterApparatusVerticalGlue));
        }
      }
    } else {
      // no apparatuses, add glue to fill up the page
      verticalListToTest.pushItem((new Glue(TypesetterItemDirection.VerticalItemDirection))
      .setHeight(0)
      .setStretch(this.options.textToApparatusGlue.stretch)
      .setShrink(0));
    }
    return verticalListToTest;
  }

  /**
   * Determines the first and last line in a vertical list from the
   * metadata attached to horizontal lists.
   */
  private getTotalLineNumberRange(mainTextVerticalList: ItemList): number[] {
    let minLine = MaxLineCount;
    let maxLine = -1;
    mainTextVerticalList.getList().forEach((item) => {
      if (item instanceof ItemList && item.hasMetadata(MetadataKey.ListType) && item.getMetadata(MetadataKey.ListType) === ListType.LineList) {
        let lineNumber = item.getMetadata(MetadataKey.LineNumber) as number;
        minLine = Math.min(minLine, lineNumber);
        maxLine = Math.max(maxLine, lineNumber);
      }
    });
    return [minLine, maxLine];
  }

  /**
   * Gets the items for a given line range and determines the number
   * of orphan lines in the given range and the number of widow lines in the range that follows.
   *
   * Widow lines are lines at the top of the page that belong to the paragraph that started the previous page.
   * To assess a page break, we are interested in the number of widows a potential break causes in the following
   * page.
   *
   * Orphan lines are lines at the bottom of the page that belong to a paragraph that continues in the next page.
   */
  private getItemsAndInfoForLineRange(mainTextVerticalList: ItemList, lineFrom: number, lineTo: number): LineRangeData {
    let itemsInRange = [];
    let addingItems = false;
    let widows = 0;
    let orphans = 0;
    let penalty = 0;
    let index;
    let itemList = mainTextVerticalList.getList();

    for (index = 0; index < itemList.length; index++) {
      let item = itemList[index];
      if (item instanceof ItemList && item.hasMetadata(MetadataKey.ListType) && item.getMetadata(MetadataKey.ListType) === ListType.LineList) {
        if (item.hasMetadata(MetadataKey.LineNumber)) {
          let lineNumber = item.getMetadata(MetadataKey.LineNumber) as number;
          if (!addingItems && lineNumber >= lineFrom) {
            addingItems = true;
          }
          if (lineNumber === lineTo) {
            let lastParagraphLineCount = item.getMetadata(MetadataKey.ParagraphLineCount) as number;
            let lastLineLineNumberInParagraph = item.getMetadata(MetadataKey.LineNumberInParagraph) as number;
            if (lastLineLineNumberInParagraph !== lastParagraphLineCount) {
              // there are orphans in this page and widows in the next
              orphans = lastLineLineNumberInParagraph;
              widows = lastParagraphLineCount - orphans;
            }
            itemsInRange.push(item);
            // the range's penalty is the penalty of the next penalty item after any glue
            let lookAheadItemIndex = index +1;
            while (itemList[lookAheadItemIndex] !== undefined && itemList[lookAheadItemIndex] instanceof Glue) {
              lookAheadItemIndex++;
            }
            if (itemList[lookAheadItemIndex] !== undefined) {
              let nextItem = itemList[lookAheadItemIndex];
              if (nextItem instanceof Penalty) {
                penalty = nextItem.getPenalty();
              }
            }
            break;
          }
        }
      }
      if (addingItems) {
        itemsInRange.push(item);
      }
    }


    return {
      items: itemsInRange, widows: widows, orphans: orphans, penalty: penalty
    };
  }

  /**
   * Returns a Promise that resolves into an array of typeset horizontal lists, one for each apparatus.
   * Only the apparatus entries corresponding to the main text lines lineFrom to lineTo are
   * typeset.
   *
   * If resetLineNumbersEachPage is true, lineFrom will be shown as 1 in the apparatuses,
   * lineFrom+1 will be shown as 2, and so on.
   *
   * Relies on the external function this.options.getApparatusListToTypeset that puts together the
   * actual items for each apparatus.
   *
   */
  private async typesetApparatuses(typesetMainTextVerticalList: ItemList, apparatuses: any[], lineFrom = 1, lineTo = MaxLineCount, resetLineNumbersEachPage = false): Promise<any[]> {

    let outputArray = [];
    for (let i = 0; i < apparatuses.length; i++) {
      let apparatusListToTypeset = await this.options.getApparatusListToTypeset(typesetMainTextVerticalList, apparatuses[i], lineFrom, lineTo, resetLineNumbersEachPage);
      if (apparatusListToTypeset.getDirection() === TypesetterItemDirection.HorizontalItemDirection) {
        let currentLineSkip = this.lineSkip;
        this.lineSkip = this.options.apparatusLineSkip;
        outputArray.push(await this.typesetHorizontalList(apparatusListToTypeset));
        this.lineSkip = currentLineSkip;
      } else {
        console.warn(`Apparatus ${i} list to typeset is vertical, this is not implemented yet`);
      }
    }
    return outputArray;
  }

  private addOccurrenceInLineMetadata(line: ItemList): ItemList {
    if (line.getDirection() !== TypesetterItemDirection.HorizontalItemDirection) {
      // not a horizontal list, i.e., not a line => do nothing
      return line;
    }
    // count occurrences
    let originalOrderItems = line.getList();
    if (line.hasMetadata(MetadataKey.HasReorderedItems) && line.getMetadata(MetadataKey.HasReorderedItems) === true) {
      if (line.hasMetadata(MetadataKey.OriginalItemOrder)) {
        let originalOrder: number[] = line.getMetadata(MetadataKey.OriginalItemOrder) as number[];
        originalOrderItems = [];
        let items = line.getList();
        originalOrder.forEach((index) => {
          originalOrderItems.push(items[index]);
        });
      }
    }
    let occurrencesCounter = new StringCounter();
    originalOrderItems.forEach((item) => {
      if (item instanceof TextBox) {
        let text: string | null = null;
        const splitInSyllables = item.getMetadata(SplitInSyllablesItem) as boolean ?? false;
        if (splitInSyllables) {
          const syllableIndex = item.getMetadata(SplitInSyllablesItem) as number;
          if (syllableIndex === 0) {
            if (!item.hasMetadata(OriginalText)) {
              throw new Error(`Original text not set for item ${syllableIndex} in line ${line.getMetadata(MetadataKey.LineNumber)}`);
            }
            // just get info for the first syllable
            text = item.getMetadata(OriginalText) as string;
          }
        } else {
          text = item.getText();
        }
        if (text !== null) {
          let token = this.getTextTokenForCountingPurposes(text);
          if (text !== token || splitInSyllables) {
            item.addMetadata(MetadataKey.TokenForCountingPurposes, token);
          }
          occurrencesCounter.addString(token);
          item.addMetadata(MetadataKey.TokenOccurrenceInLine, occurrencesCounter.getCount(token));
        }
      }
    });
    // tag total occurrences
    originalOrderItems.forEach((item) => {
      if (item instanceof TextBox) {
        let token = item.getText();
        if (item.hasMetadata(MetadataKey.TokenForCountingPurposes)) {
          token = item.getMetadata(MetadataKey.TokenForCountingPurposes) as string;
        }
        const splitInSyllables = item.getMetadata(SplitInSyllablesItem) as boolean ?? false;
        if (splitInSyllables) {
          const syllableIndex = item.getMetadata(SplitInSyllablesItem) as number;
          if (syllableIndex === 0) {
            item.addMetadata(MetadataKey.TokenOccurrenceInLine, occurrencesCounter.getCount(token));
          }
        } else {
          item.addMetadata(MetadataKey.TokenTotalOccurrencesInLine, occurrencesCounter.getCount(token));
        }
      }
    });
    return line;
  }

  private arrangeItemsInDisplayOrderNew(line: ItemList, originalIndexToOrderMap: number[], originalIndexToTextDirectionMap: string[]): ItemList {
    let originalLineItems = line.getList();
    let originalIndexes = originalLineItems.map((item) => {
      return item.getMetadata(MetadataKey.OriginalArrayIndex) as number;
    });
    let displayOrder = originalIndexes.map((originalIndex) => {
      return originalIndexToOrderMap[originalIndex];
    });

    let textDirections = originalIndexes.map((originalIndex) => {
      return originalIndexToTextDirectionMap[originalIndex];
    });

    // set text directions
    originalLineItems = originalLineItems.map((item, index) => {
      item.setTextDirection(textDirections[index]);
      return item;
    });

    // See if there are reordered items
    let hasReorderedItems = false;
    let previousOrder = -1;
    for (let i = 0; i < displayOrder.length; i++) {
      if (displayOrder[i] < previousOrder) {
        hasReorderedItems = true;
        break;
      }
      previousOrder = displayOrder[i];
    }
    if (!hasReorderedItems) {
      line.setList(originalLineItems);
      return line;
    }
    // need to reorder
    let sparseNewItems: TypesetterItem[] = [];
    originalLineItems.forEach((item, index) => {
      sparseNewItems[displayOrder[index]] = item;
    });
    let newItems: TypesetterItem[] = [];
    sparseNewItems.forEach((item) => {
      newItems.push(item);
    });
    line.setList(newItems);
    line.addMetadata(MetadataKey.HasReverseText, true);
    line.addMetadata(MetadataKey.HasReorderedItems, true);
    line.addMetadata(MetadataKey.OriginalItemOrder, originalIndexes);
    return line;
  }

  private constructAddPageNumberProcessor(options: AddPageNumbersOptions, margin: number, position: string): PageProcessor {
    let pageNumbersMarginTop = this.options.pageHeight - this.options.marginBottom + margin;
    let pageNumbersMarginLeft = this.options.marginLeft;
    let lineWidth = this.options.pageWidth - this.options.marginRight - this.options.marginLeft;

    if (position === 'top') {
      pageNumbersMarginTop = this.options.marginTop - margin - options.fontSize;
    }
    return new AddPageNumbers({
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      numeralSystem: options.numeralSystem,
      marginTop: pageNumbersMarginTop,
      marginLeft: pageNumbersMarginLeft,
      lineWidth: lineWidth,
      align: options.align,
      textBoxMeasurer: this.options.textBoxMeasurer
    });
  }

  private constructAddLineNumbersProcessor(options: AddLineNumbersOptions): PageProcessor {
    options.textBoxMeasurer = this.options.textBoxMeasurer;
    options.listTypeToNumber = ListType.MainTextBlockList;
    options.lineTypeToNumber = LineType.MainTextLine;
    return new AddLineNumbers(options);
  }

}