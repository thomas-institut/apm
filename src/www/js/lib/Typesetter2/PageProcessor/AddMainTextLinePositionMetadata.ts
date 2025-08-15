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


import {PageProcessor} from './PageProcessor.js';
import * as MetadataKey from '../MetadataKey.js';
import * as ListType from '../ListType.js';
import {ItemList} from '../ItemList.js';
import {OptionsChecker} from '@thomas-inst/optionschecker';

import {TypesetterPage} from "../TypesetterPage.js";
import {TypesetterItem} from "../TypesetterItem.js";


export interface LinePositionData {
  listIndex: number,
  lineNumber: number,
  y: number
}

export class AddMainTextLinePositionMetadata extends PageProcessor {
  private readonly options: any;
  private readonly debug: boolean;


  constructor(options: any) {
    super();
    let oc = new OptionsChecker({
      context: "AddLineNumbers Page Processor", optionsDefinition: {
        listTypeToNumber: {type: 'string', default: ListType.MAIN_TEXT_BLOCK},
        lineTypeToNumber: {type: 'string', default: ''},
        debug: {type: 'boolean', default: false}
      }
    });
    this.options = oc.getCleanOptions(options);

    this.debug = this.options.debug;

    this.debug && console.log(`AddMainTextLinePositionMetadata options`);
    this.debug && console.log(this.options);
  }

  /**
   * Adds a metadata entry to the page with the vertical positions of every
   * main text line
   * @param page
   * @return {Promise<TypesetterPage>}
   */
  process(page: TypesetterPage): Promise<TypesetterPage> {
    return new Promise(async (resolve) => {
      let pageItems = page.getItems();
      let mainTextIndex = pageItems.map((item) => {
        return item.hasMetadata(MetadataKey.LIST_TYPE) ? item.getMetadata(MetadataKey.LIST_TYPE) : 'undefined';
      }).indexOf(ListType.MAIN_TEXT_BLOCK);
      if (mainTextIndex === -1) {
        // no main text block, nothing to do
        page.addMetadata(MetadataKey.MAIN_TEXT_LINE_DATA, {mainTextListIndex: -1, lineData: {}});
        resolve(page);
        return;
      }

      this.debug && console.log(`Adding line position metadata for page ${page.getMetadata(MetadataKey.PAGE_NUMBER)}`);
      this.debug && console.log(`MainTextBlock at index ${mainTextIndex}`);

      let mainTextList = pageItems[mainTextIndex];
      this.debug && console.log(mainTextList);
      if (mainTextList instanceof ItemList) {
        let linesWithNumberIndices: number[] = [];
        let mainTextListItems = mainTextList.getList();
        mainTextListItems.forEach((item, itemIndex) => {
          if (!item.hasMetadata(MetadataKey.LIST_TYPE)) {
            this.debug && console.log(`Main text item ${itemIndex} not a list`);
            // no list type =>  do nothing
            return;
          }
          if (item.getMetadata(MetadataKey.LIST_TYPE) !== ListType.LINE) {
            // not a line => do nothing
            this.debug && console.log(`Main text item ${itemIndex} is list but not a line: ${item.getMetadata(MetadataKey.LIST_TYPE)}`);
            return;
          }

          if (this.options.lineTypeToNumber !== '' && item.getMetadata(MetadataKey.LINE_TYPE) !== this.options.lineTypeToNumber) {
            // not the right line type => do nothing
            this.debug && console.log(`Main text item ${itemIndex} is a line but of the right type: ${item.getMetadata(MetadataKey.LIST_TYPE)}`);
            return;
          }
          // a line of the right type
          let lineNumber = item.getMetadata(MetadataKey.LINE_NUMBER);
          this.debug && console.log(`MAIN TEXT item ${itemIndex} is line ${lineNumber}`);
          if (lineNumber !== undefined) {
            linesWithNumberIndices.push(itemIndex);
          }
        });

        this.debug && console.log(`linesWithNumberIndices`);
        this.debug && console.log(linesWithNumberIndices);

        let yPositions = this._getYPositions(mainTextListItems);

        let data: LinePositionData[] = [];
        linesWithNumberIndices.forEach((index) => {
          let lineNumber = mainTextListItems[index].getMetadata(MetadataKey.LINE_NUMBER);
          data.push({
            listIndex: index, lineNumber: lineNumber, y: yPositions[index]
          });
        });
        page.addMetadata(MetadataKey.MAIN_TEXT_LINE_DATA, {mainTextListIndex: mainTextIndex, lineData: data});
      }
      resolve(page);
    });
  }

  _getYPositions(items: TypesetterItem[]): number[] {
    let yPositions: number[] = [];
    let currentY = 0;
    items.forEach((item) => {
      yPositions.push(currentY);
      currentY += item.getHeight();
    });

    this.debug && console.log(`Y Positions`);
    this.debug && console.log(yPositions);

    return yPositions;
  }
}