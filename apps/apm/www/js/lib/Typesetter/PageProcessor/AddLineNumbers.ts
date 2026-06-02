// noinspection ES6PreferShortImport

import {PageProcessor} from './PageProcessor.js';
import * as MetadataKey from '../MetadataKey.js';
import * as ListType from '../ListType.js';
import {ItemList} from '../ItemList.js';
import * as TypesetterItemDirection from '../TypesetterItemDirection.js';
import {TextBoxFactory} from '../TextBoxFactory.js';
import {Glue} from '../Glue.js';
import {TextBoxMeasurer} from '../TextBoxMeasurer/TextBoxMeasurer.js';
import {Typesetter} from '../Typesetter.js';
import {deepCopy} from '../../../toolbox/Util.js';
import {TypesetterPage} from "../TypesetterPage.js";
import {LineNumberData, MainTextLineData} from "../MainTextLineData.js";
import {NumeralSystem, NumeralSystems} from "../../../toolbox/NumeralSystems.js";

export interface AddLineNumbersOptions {
  listTypeToNumber?: string,
  lineTypeToNumber?: string,
  numeralSystem?: NumeralSystem,
  showLineOne?: boolean,
  lineNumberShift?: number,
  resetEachPage?: boolean,
  frequency?: number,
  xPosition?: number,
  align?: string,
  fontFamily?: string,
  fontSize?: number,
  textBoxMeasurer: TextBoxMeasurer,
  debug?: boolean
}

export class AddLineNumbers extends PageProcessor {
  private readonly options: Required<AddLineNumbersOptions>;
  private readonly debug: boolean;

  constructor(options: AddLineNumbersOptions) {
    super();
    const defaults = {
      listTypeToNumber: ListType.MainTextBlockList,
      lineTypeToNumber: '',
      numberStyle: 'WesternArabic',
      showLineOne: true,
      lineNumberShift: 0,
      resetEachPage: true,
      frequency: 5,
      xPosition: 20,
      align: 'right',
      fontFamily: 'FreeSerif',
      fontSize: Typesetter.pt2px(10),
      numeralSystem: 'WesternArabic' as NumeralSystem,
      debug: false,
    };
    this.options = {...defaults, ...options};
    this.debug = this.options.debug;

    this.debug && console.log(`AddPageNumbers options`);
    this.debug && console.log(this.options);
  }

  /**
   * Adds line numbers for the main text in a TypesetterPage.
   *
   * The main text is the vertical list identified with the 'type' metadata key set to 'MainText'
   * Each horizontal list that has the 'type' metadata set with 'line' and has
   * a 'lineNumber' metadata key set will be considered. A line number may be added so that it will print at
   * the same Y position of the line. Line numbers will be added at frequency given in the options.
   * @param {TypesetterPage} page
   * @return {Promise<TypesetterPage>}
   */
  process(page: TypesetterPage): Promise<TypesetterPage> {
    return new Promise(async (resolve) => {
      if (!page.hasMetadata(MetadataKey.MainTextLineData)) {
        console.warn(`No main text line data available, line numbers not added`);
        resolve(page);
      }

      /** @var {MainTextLineData}mainTextLineData */
      let mainTextLineData = page.getMetadata(MetadataKey.MainTextLineData) as MainTextLineData;
      let mainTextIndex = mainTextLineData.mainTextListIndex;
      if (mainTextIndex === -1) {
        // no main text block, nothing to do
        resolve(page);
        return;
      }


      let lineNumberData: LineNumberData[] = deepCopy(mainTextLineData.lineData);
      // determine lineNumberShift, a number that will be ADDED to
      // the line number to determine the actual line number to show
      let lineNumberShift = this.options.lineNumberShift;
      if (this.options.resetEachPage) {
        lineNumberShift -= (lineNumberData[0].lineNumber - 1);
      }
      lineNumberData = lineNumberData.map((dataItem) => {
        dataItem.lineNumberToShow = dataItem.lineNumber + lineNumberShift;
        return dataItem;
      }).filter((dataItem) => {
        if (this.options.showLineOne && dataItem.lineNumberToShow === 1) {
          return true;
        }
        return (dataItem.lineNumberToShow % this.options.frequency) === 0;
      });
      this.debug && console.log(`Updated line Number data`);
      this.debug && console.log(lineNumberData);
      if (lineNumberData.length === 0) {
        // no lines with line number metadata, nothing to do
        resolve(page);
        return;
      }

      this.debug && console.log(`MainTextBlock at index ${mainTextIndex}`);
      let mainTextList = page.getItems()[mainTextIndex];
      // console.log(`mainTextList  (index ${mainTextIndex}`)
      // console.log(mainTextList)
      if (!(mainTextList instanceof ItemList)) {
        throw new Error(`Main text block at index ${mainTextIndex} is not an ItemList`);
      }
      let mainTextListItems = mainTextList.getList();
      let lineNumberList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
      lineNumberList
      .setShiftX(this.options.xPosition)
      .setShiftY(mainTextList.getShiftY())
      .addMetadata(MetadataKey.ListType, ListType.LineNumbersList);
      let previousShiftYAdjustment = 0;
      let previousLineHeight = 0;
      let previousY = 0;
      for (let i = 0; i < lineNumberData.length; i++) {
        let dataItem = lineNumberData[i];

        // add inter number glue
        let glueHeight = dataItem.y - previousY - previousLineHeight + previousShiftYAdjustment;
        if (glueHeight !== 0) {
          let glue = new Glue(TypesetterItemDirection.VerticalItemDirection);
          glue.setHeight(glueHeight);
          lineNumberList.pushItem(glue);
        }

        let lineNumberTextBox = TextBoxFactory.simpleText(this.getLineNumberString(dataItem.lineNumberToShow), {
          fontFamily: this.options.fontFamily, fontSize: this.options.fontSize
        });
        // the number may be RTL, but alignments are calculated assuming LTR box placement
        lineNumberTextBox.setTextDirection('ltr');

        if (this.options.align === 'right') {
          let boxWidth = await this.options.textBoxMeasurer.getBoxWidth(lineNumberTextBox);
          lineNumberTextBox.setShiftX(-boxWidth);
        }

        let boxHeight = await this.options.textBoxMeasurer.getBoxHeight(lineNumberTextBox);
        lineNumberTextBox.setHeight(boxHeight);
        let lineHeight = mainTextListItems[dataItem.listIndex].getHeight();
        if (boxHeight !== lineHeight) {
          lineNumberTextBox.setShiftY(lineHeight - boxHeight);
          previousShiftYAdjustment = lineHeight - boxHeight;
        }
        previousLineHeight = lineHeight;
        previousY = dataItem.y;
        lineNumberList.pushItem(lineNumberTextBox);
      }
      page.addItem(lineNumberList);

      resolve(page);
    });
  }


  private getLineNumberString(lineNumber: number): string {
    switch (this.options.numeralSystem) {
      case 'EasternArabic':
        return NumeralSystems.toEasternArabic(lineNumber);

      default:
        return `${lineNumber}`;

    }
  }

}