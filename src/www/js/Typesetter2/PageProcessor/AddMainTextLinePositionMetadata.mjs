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


import { PageProcessor } from './PageProcessor.mjs'
import * as MetadataKey from '../MetadataKey.mjs'
import * as ListType from '../ListType.mjs'
import { ItemList } from '../ItemList.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'

export class AddMainTextLinePositionMetadata extends PageProcessor {


  constructor(options) {
    super()
    let oc = new OptionsChecker({
      context: "AddLineNumbers Page Processor",
      optionsDefinition: {
        listTypeToNumber: { type: 'string', default: ListType.MAIN_TEXT_BLOCK},
        lineTypeToNumber: { type: 'string', default: ''},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)

    this.debug = this.options.debug

    this.debug && console.log(`AddMainTextLinePositionMetadata options`)
    this.debug && console.log(this.options)
  }

  /**
   * Adds a metadata entry to the page with the vertical positions of every
   * main text line
   * @param page
   * @return {Promise<TypesetterPage>}
   */
  process (page) {
    return new Promise( async (resolve) => {
      let pageItems = page.getItems()
      let mainTextIndex = pageItems.map( (item) => {
        return item.hasMetadata(MetadataKey.LIST_TYPE) ? item.getMetadata(MetadataKey.LIST_TYPE) : 'undefined'
      }).indexOf(ListType.MAIN_TEXT_BLOCK)
      if (mainTextIndex === -1) {
        // no main text block, nothing to do
        page.addMetadata(MetadataKey.MAIN_TEXT_LINE_DATA, { mainTextListIndex: -1, lineData: {}})
        resolve(page)
        return
      }

      this.debug && console.log(`MainTextBlock at index ${mainTextIndex}`)
      let mainTextList = pageItems[mainTextIndex]
      if (mainTextList instanceof ItemList) {
        let linesWithNumberIndices = []
        let mainTextListItems = mainTextList.getList()
        mainTextListItems.forEach((item, itemIndex) => {
          if (!item.hasMetadata(MetadataKey.LIST_TYPE)) {
            // no list type =>  do nothing
            return
          }
          if (item.getMetadata(MetadataKey.LIST_TYPE) !== ListType.LINE) {
            // not a line => do nothing
            return
          }

          if (this.options.lineTypeToNumber !== '' && item.getMetadata(MetadataKey.LINE_TYPE) !== this.options.lineTypeToNumber) {
            // not the right line type => do nothing
            return
          }
          // a line of the right type
          let lineNumber = item.getMetadata(MetadataKey.LINE_NUMBER)
          if (lineNumber !== undefined) {
            linesWithNumberIndices.push(itemIndex)
          }
        })

        this.debug && console.log(`linesWithNumberIndices`)
        this.debug && console.log(linesWithNumberIndices)

        let yPositions = this._getYPositions(mainTextListItems)

        let data = []
        linesWithNumberIndices.forEach((index) => {
          let lineNumber = mainTextListItems[index].getMetadata(MetadataKey.LINE_NUMBER)
          data.push({
            listIndex: index,
            lineNumber: lineNumber,
            y: yPositions[index]
          })
        })
        page.addMetadata(MetadataKey.MAIN_TEXT_LINE_DATA, { mainTextListIndex: mainTextIndex, lineData: data})
      }
      resolve(page)
    })
  }

  _getYPositions(items) {
      let yPositions = []
      let currentY = 0
      items.forEach( (item) => {
        yPositions.push(currentY)
        currentY += item.getHeight()
      })

      this.debug && console.log(`Y Positions`)
      this.debug && console.log(yPositions)

      return yPositions
  }
}