/*
 *  Copyright (C) 2023 Universität zu Köln
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

import {PageProcessor} from './PageProcessor.js';
import * as MetadataKey from '../MetadataKey.js';
import {ItemList} from '../ItemList.js';
import * as TypesetterItemDirection from '../TypesetterItemDirection.js';
import * as ListType from '../ListType.js';
import {TextBoxMeasurer} from '../TextBoxMeasurer/TextBoxMeasurer.js';
import {Glue} from '../Glue.js';
import {ItemArray} from '../ItemArray.js';
import {TypesetterPage} from "../TypesetterPage.js";
import {PageMarginalia} from "../PageMarginalia";
import {MainTextLineData} from "../MainTextLineData";
import {TypesetterItem} from "../TypesetterItem.js";


export type MarginaliaAlignDirection = 'right' | 'left';
export type MarginaliaTextDirection = 'rtl' | 'ltr';

export interface AddMarginaliaOptions {
  xPosition?: number,
  align?: MarginaliaAlignDirection,
  defaultTextDirection?: MarginaliaTextDirection,
  textBoxMeasurer: TextBoxMeasurer,
  glueWidth?: number,
  debug?: boolean
}

export class AddMarginalia extends PageProcessor {
  private readonly options: Required<AddMarginaliaOptions>;
  private debug: boolean;

  constructor(options: AddMarginaliaOptions) {
    super();
    const defaults = {
      xPosition: 20,
      align: 'right' as MarginaliaAlignDirection,
      defaultTextDirection: 'ltr' as MarginaliaTextDirection,
      glueWidth: 5,
      debug: false,
    }

    this.options = { ...defaults, ...options };
    this.debug = this.options.debug;

    this.debug && console.log(`AddMarginalia options`);
    this.debug && console.log(this.options);
  }

  process(page: TypesetterPage): Promise<TypesetterPage> {
    return new Promise(async (resolve) => {

      this.debug = false;
      if (!page.hasMetadata(MetadataKey.PageMarginalia)) {
        resolve(page);
        return;
      }
      let pageMarginalia: PageMarginalia[] = page.getMetadata(MetadataKey.PageMarginalia) as PageMarginalia[];
      // console.log(`Page marginalia`, pageMarginalia);
      if (pageMarginalia.length === 0) {
        resolve(page);
        return;
      }
      this.debug && console.log(`Page marginalia`, pageMarginalia);
      if (!page.hasMetadata(MetadataKey.MainTextLineData)) {
        console.warn(`No main text line data available, marginalia not added`);
        resolve(page);
        return;
      }
      this.debug && console.log(`Processing marginalia for page ${page.getMetadata(MetadataKey.PageNumber)}`);
      let mainTextLineData: MainTextLineData = page.getMetadata(MetadataKey.MainTextLineData) as MainTextLineData;
      let mainTextIndex = mainTextLineData.mainTextListIndex;
      if (mainTextIndex === -1) {
        // no main text block, nothing to do
        this.debug && console.log(`No main text block, nothing to do`);
        resolve(page);
        return;
      }
      let mainTextList = page.getItems()[mainTextIndex] as ItemList;
      let mainTextListItems = mainTextList.getList();
      let lineNumbers = mainTextLineData.lineData.map(ld => ld.lineNumber);

      pageMarginalia = pageMarginalia.map((marginaliaEntry) => {
        let lineDataIndex = lineNumbers.indexOf(marginaliaEntry.lineNumber);
        marginaliaEntry.lineData = mainTextLineData.lineData[lineDataIndex];
        return marginaliaEntry;
      });
      let marginaliaList = new ItemList(TypesetterItemDirection.VerticalItemDirection);
      marginaliaList
      .setShiftX(this.options.xPosition)
      .setShiftY(mainTextList.getShiftY())
      .addMetadata(MetadataKey.ListType, ListType.MarginaliaList);
      let previousShiftYAdjustment = 0;
      let previousLineHeight = 0;
      let previousY = 0;

      for (let i = 0; i < pageMarginalia.length; i++) {
        // this.debug && console.log(`Processing marginalia entry ${i}`)
        let lineNumberData = pageMarginalia[i].lineData;
        this.debug && console.log(`Previous Y: ${previousY}, line height: ${previousLineHeight}, shiftY: ${previousShiftYAdjustment}`);

        // add inter marginalia glue
        let glueHeight = lineNumberData.y - previousY - previousLineHeight + previousShiftYAdjustment;
        if (glueHeight !== 0) {
          let glue = new Glue(TypesetterItemDirection.VerticalItemDirection);
          glue.setHeight(glueHeight);
          marginaliaList.pushItem(glue);
          this.debug && console.log(`Adding inter marginalia glue ${glueHeight}`);
        }

        let marginalItemArray: TypesetterItem[] = [];
        for (let j = 0; j < pageMarginalia[i].marginalSubEntries.length; j++) {
          marginalItemArray.push(...pageMarginalia[i].marginalSubEntries[j]);
          if (j !== pageMarginalia[i].marginalSubEntries.length - 1) {
            let interMarginGlue = new Glue();
            // TODO: make this glue size an option
            interMarginGlue.setWidth(5);
            marginalItemArray.push(interMarginGlue);
          }
        }

        marginalItemArray = marginalItemArray.map((item) => {
          item.setTextDirection(this.options.defaultTextDirection);
          return item;
        });

        await ItemArray.measureTextBoxes(marginalItemArray, this.options.textBoxMeasurer);
        let entryList = new ItemList(TypesetterItemDirection.HorizontalItemDirection);
        entryList.setList(marginalItemArray)
        .setTextDirection(this.options.defaultTextDirection);
        if (this.options.align === 'right') {
          entryList.setShiftX(-entryList.getWidth());
        }
        let listHeight = entryList.getHeight();
        entryList.setHeight(listHeight);
        let lineHeight = mainTextListItems[lineNumberData.listIndex].getHeight();
        this.debug && console.log(`List height: ${listHeight}, Line height: ${lineHeight}, shiftY: ${previousShiftYAdjustment}`);
        if (listHeight !== lineHeight) {
          entryList.setShiftY(lineHeight - listHeight);
          previousShiftYAdjustment = lineHeight - listHeight;
        }
        previousLineHeight = lineHeight;
        previousY = lineNumberData.y;
        marginaliaList.pushItem(entryList);
      }
      page.addItem(marginaliaList);
      resolve(page);

    });


  }

}