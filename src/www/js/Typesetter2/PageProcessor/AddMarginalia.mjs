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

import { PageProcessor } from './PageProcessor.mjs'
import * as MetadataKey from '../MetadataKey.mjs'
import { deepCopy } from '../../toolbox/Util.mjs'
import { ItemList } from '../ItemList.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import * as ListType from '../ListType.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TextBoxMeasurer } from '../TextBoxMeasurer/TextBoxMeasurer.mjs'
import { Glue } from '../Glue.mjs'
import { TextBoxFactory } from '../TextBoxFactory.mjs'
import { ItemArray } from '../ItemArray.mjs'
export class AddMarginalia extends PageProcessor {

  constructor (options) {
    super()
    let oc = new OptionsChecker({
      context: "AddMarginalia Page Processor",
      optionsDefinition: {
        xPosition: { type: 'number', default: 20},
        align: { type: 'string', default: 'right'},
        defaultTextDirection: { type: 'string', default: 'ltr'},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)

    this.debug = this.options.debug

    this.debug && console.log(`AddMarginalia options`)
    this.debug && console.log(this.options)
  }

  process (page) {
    return new Promise ( async (resolve) => {

      if (!page.hasMetadata(MetadataKey.PAGE_MARGINALIA)) {
        resolve(page)
        return
      }

      let pageMarginalia = page.getMetadata(MetadataKey.PAGE_MARGINALIA)
      if (pageMarginalia.length === 0) {
        resolve(page)
        return
      }
      if (!page.hasMetadata(MetadataKey.MAIN_TEXT_LINE_DATA)) {
        console.warn(`No main text line data available, marginalia not added`)
        resolve(page)
        return
      }
      this.debug && console.log(`Processing marginalia for page ${page.getMetadata(MetadataKey.PAGE_NUMBER)}`);
      let mainTextLineData = page.getMetadata(MetadataKey.MAIN_TEXT_LINE_DATA);
      this.debug && console.log(`MainTextLineData`);
      this.debug && console.log(mainTextLineData);
      let mainTextIndex = mainTextLineData.mainTextListIndex
      if (mainTextIndex === -1) {
        // no main text block, nothing to do
        this.debug && console.log(`No main text block, nothing to do`)
        resolve(page)
        return
      }
      let mainTextList = page.getItems()[mainTextIndex]
      let mainTextListItems = mainTextList.getList()
      let lineNumbers = mainTextLineData.lineData.map( ld => ld.lineNumber)

      pageMarginalia = pageMarginalia.map( (marginaliaEntry) => {
        let lineDataIndex = lineNumbers.indexOf(marginaliaEntry.lineNumber)
        marginaliaEntry.lineData = mainTextLineData.lineData[lineDataIndex]
        return marginaliaEntry
      })
      console.log(`pageMarginalia`)
      console.log(pageMarginalia)
      let marginaliaList = new ItemList(TypesetterItemDirection.VERTICAL)
      marginaliaList
        .setShiftX(this.options.xPosition)
        .setShiftY(mainTextList.getShiftY())
        .addMetadata(MetadataKey.LIST_TYPE, ListType.MARGINALIA)
      let previousShiftYAdjustment = 0
      let previousLineHeight = 0
      let previousY = 0

      for (let i = 0; i < pageMarginalia.length; i++) {
        let dataItem = pageMarginalia[i].lineData

        // add inter number glue
        let glueHeight = dataItem.y - previousY - previousLineHeight + previousShiftYAdjustment
        if (glueHeight !== 0) {
          let glue = new Glue(TypesetterItemDirection.VERTICAL)
          glue.setHeight(glueHeight)
          marginaliaList.pushItem(glue)
        }

        // for now, just display the first sub entry
        let marginalItemArray = pageMarginalia[i].marginalSubEntries[0]
        // TODO: deal with bidirectional text
        marginalItemArray.forEach( (item) => {
          item.setTextDirection(this.options.defaultTextDirection)
        })


        await ItemArray.measureTextBoxes(marginalItemArray, this.options.textBoxMeasurer)
        let entryList = new ItemList(TypesetterItemDirection.HORIZONTAL)
        // TODO: check this, maybe it should be LTR always,like in the line numbers
        entryList.setList(marginalItemArray)
          .setTextDirection(this.options.defaultTextDirection)
        let listWidth = entryList.getWidth()
        if (this.options.align === 'right') {
          let listWidth = entryList.getWidth()
          entryList.setShiftX(-listWidth)
        }
        let listHeight = entryList.getHeight()
        console.log(`List height: ${listHeight}`)
        let lineHeight = mainTextListItems[dataItem.listIndex].getHeight()
        if (listHeight !== lineHeight) {
          entryList.setShiftY(lineHeight - listHeight)
          previousShiftYAdjustment = lineHeight - listHeight
        }
        previousLineHeight = lineHeight
        previousY = dataItem.y
        marginaliaList.pushItem(entryList)
      }
      page.addItem(marginaliaList)
      resolve(page)

    })


  }

}