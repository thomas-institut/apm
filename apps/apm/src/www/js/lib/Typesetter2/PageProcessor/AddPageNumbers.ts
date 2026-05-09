// noinspection ES6PreferShortImport

import {PageProcessor} from './PageProcessor.js';
import * as MetadataKey from '../MetadataKey.js';
import {TextBoxFactory} from '../TextBoxFactory.js';
import {TextBoxMeasurer} from '../TextBoxMeasurer/TextBoxMeasurer.js';
import {NumeralSystem, NumeralSystems} from '../../../toolbox/NumeralSystems.js';
import {TypesetterPage} from "../TypesetterPage.js";


export interface AddPageNumbersOptions {
  fontFamily: string,
  fontSize: number,
  fontStyle?: string,
  numeralSystem?: NumeralSystem,
  textBoxMeasurer: TextBoxMeasurer,
  marginTop?: number,
  marginLeft?: number,
  lineWidth?: number,
  align?: string,
  debug?: boolean,
}
export class AddPageNumbers extends PageProcessor {
  private readonly options: Required<AddPageNumbersOptions>;
  private readonly debug: boolean;


  constructor(options: AddPageNumbersOptions) {
    super();
    const defaults = {
      fontStyle: '',
      numeralSystem: 'WesternArabic' as NumeralSystem,
      textBoxMeasurer: new TextBoxMeasurer(),
      marginTop: 20,
      marginLeft: 20,
      lineWidth: 100,
      align: 'center',
      debug: false,
    }
    this.options = {...defaults, ...options};
    this.debug = this.options.debug;
    this.debug && console.log(`AddPageNumbers options`);
    this.debug && console.log(this.options);
  }

  process(page: TypesetterPage): Promise<TypesetterPage> {
    let thePage = super.process(page);
    return new Promise(async (resolve) => {
      let pageNumber = page.getMetadata(MetadataKey.PageNumber) as number;
      if (pageNumber === undefined) {
        // no page number, can't do anything
        resolve(thePage);
      }

      this.debug && console.log(`Adding page numbers to page ${pageNumber}`);
      let foliation = page.getMetadata(MetadataKey.PageFoliation) as string;
      if (foliation === undefined) {
        foliation = `${this._getPageNumberString(pageNumber)}`;
      }
      let pageNumberTextBox = TextBoxFactory.simpleText(foliation, {
        fontFamily: this.options.fontFamily, fontSize: this.options.fontSize, fontStyle: this.options.fontStyle
      });
      let textHeight = await this.options.textBoxMeasurer.getBoxHeight(pageNumberTextBox);
      pageNumberTextBox.setShiftY(this.options.marginTop)
      .setHeight(textHeight)
      .addMetadata(MetadataKey.ItemType, 'PageNumber');

      switch (this.options.align) {
        case 'center':
          let boxWidth = await this.options.textBoxMeasurer.getBoxWidth(pageNumberTextBox);
          pageNumberTextBox.setShiftX(this.options.marginLeft + this.options.lineWidth / 2 - boxWidth / 2);
          break;

        case 'left':
          pageNumberTextBox.setShiftX(this.options.marginLeft);
          break;

        case 'right':
          let textWidth = await this.options.textBoxMeasurer.getBoxWidth(pageNumberTextBox);
          pageNumberTextBox.setShiftX(this.options.marginLeft + this.options.lineWidth - textWidth);
      }

      page.addItem(pageNumberTextBox);
      resolve(thePage);
    });
  }

  /**
   *
   * @param {number}pageNumber
   * @return {string}
   * @private
   */
  _getPageNumberString(pageNumber: number): string {
    switch (this.options.numeralSystem) {
      case 'EasternArabic':
        return NumeralSystems.toEasternArabic(pageNumber);

      default:
        return `${pageNumber}`;

    }
  }

}