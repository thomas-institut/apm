/*
 *  Copyright (C) 2022 Universität zu Köln
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

import { Typesetter2 } from './Typesetter2.mjs'
import { ItemList } from './ItemList.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { Glue } from './Glue.mjs'
import { TextBox } from './TextBox.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer/TextBoxMeasurer.mjs'
import { TypesetterDocument } from './TypesetterDocument.mjs'
import * as MetadataKey from './MetadataKey.mjs'
import * as ListType from './ListType.mjs'
import * as LineType from './LineType.mjs'
import * as GlueType from './GlueType.mjs'
import { toFixedPrecision } from '../toolbox/Util.mjs'
import { FirstFitLineBreaker } from './LineBreaker/FirstFitLineBreaker.mjs'
import { LineBreaker } from './LineBreaker/LineBreaker.mjs'
import { AddPageNumbers } from './PageProcessor/AddPageNumbers.mjs'
import { AddLineNumbers } from './PageProcessor/AddLineNumbers.mjs'
import { StringCounter } from '../toolbox/StringCounter.mjs'
import { trimPunctuation } from '../defaults/Punctuation.mjs'
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { MAX_LINE_COUNT } from '../Edition/EditionTypesetting.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'
import { BidiDisplayOrder } from './BidiDisplayOrder.mjs'

const signature = 'BasicTypesetter 0.1'


const INFINITE_VERTICAL_BADNESS = 100000000

// number of lines to look ahead when breaking lines into pages
const MAX_LINES_TO_LOOK_AHEAD = 4
const ACCEPTABLE_ORPHAN_COUNT = 3
const ACCEPTABLE_WIDOW_COUNT = 3
const ORPHAN_PENALTY = 3
const WIDOW_PENALTY = 3

const defaultFontFamily = 'FreeSerif'
const defaultFontSize = Typesetter2.pt2px(12)

export class BasicTypesetter extends Typesetter2 {
  constructor (options) {
    super()
    let oc = new OptionsChecker({
      context: signature,
      optionsDefinition: {
        pageWidth: { type: 'number', required: true},
        pageHeight: { type: 'number', required: true},
        marginTop: { type: 'number', default: 50},
        marginBottom: { type: 'number', default: 50},
        marginLeft: { type: 'number', default: 50},
        marginRight: { type: 'number', default: 50},
        lineSkip: { type: 'number', default: 24},
        apparatusLineSkip: { type: 'number', default: 20},
        minLineSkip: { type: 'number', default: 0},
        defaultFontFamily: { type: 'string', default: defaultFontFamily},
        defaultFontSize: { type: 'number', default: defaultFontSize},
        showPageNumbers: { type: 'boolean', default: true},
        pageNumbersOptions: { type: 'object', default: {}},
        showLineNumbers: { type: 'boolean', default: true},
        lineNumbersOptions: { type: 'object', default: {}},
        apparatusesAtEndOfDocument: { type: 'boolean', default: false},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        // A function to typeset an apparatus for the given line range must return a Promise
        // for a horizontal ItemList that will then be typeset and added to the document/page
        getApparatusListToTypeset: { type: 'function', default: (mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine) => {
          console.log(`Default typeset apparatus called `)
          return resolvedPromise(new ItemList())
        }},
        // A function that will be called before typesetting the apparatuses.
        // This gives the apparatus typesetting engine an opportunity to reset or initialize
        // its state if needed. The function should return a promise to a boolean indicating
        // with true that the process can continue.
        preTypesetApparatuses: { type: 'function', default: () => {
          return resolvedPromise(true)
          }},
        textToApparatusGlue: {
          type: 'object',
          default: {
            height: defaultFontSize*1,
            shrink: defaultFontSize*0.1,
            stretch: Typesetter2.cm2px(50)  // basically infinite stretch!
          }
        },
        interApparatusGlue: {
          type: 'object',
          default: {
            height: defaultFontSize*1,
            shrink: 0,
            stretch: defaultFontSize*0.25
          }
        },
        justify: { type: 'boolean', default: true},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)

    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
    this.minLineSkip = this.options.minLineSkip
    this.debug = this.options.debug
    // this.debug && console.log(`Options`)
    // this.debug && console.log(this.options)
    this.pageOutputProcessors = []
    if (this.options.showPageNumbers) {
      let pnOc = new OptionsChecker({
        context: `${signature} - Page Numbers`,
        optionsDefinition: {
          position: { type: 'string', default: 'bottom'},
          align: {type: 'string', default: 'center'},
          margin: { type: 'number', default: Typesetter2.cm2px(0.5) },
          fontFamily: { type: 'string', default: defaultFontFamily},
          fontSize: { type: 'number', default: defaultFontSize*0.8},
          numberStyle: { type: 'string', default: ''},
        }
      })
      let pnOptions = pnOc.getCleanOptions(this.options.pageNumbersOptions)
      this.addPageOutputProcessor( this.constructAddPageNumberProcessor(pnOptions))
    }
    if (this.options.showLineNumbers) {
      let lnOc = new OptionsChecker({
        context: `${signature} - Line Numbers`,
        optionsDefinition: {
          xPosition: { type: 'number', default: this.options.marginLeft - Typesetter2.cm2px(0.5)},
          align: {type: 'string', default: 'right'},
          fontFamily: { type: 'string', default: defaultFontFamily},
          fontSize: { type: 'number', default: defaultFontSize},
          numberStyle: { type: 'string', default: ''},
          showLineOne: {type: 'boolean', default: false},
          lineNumberShift: { type: 'number', default: 0},
          resetEachPage: { type: 'boolean', default: true},
          frequency: { type: 'number', default: 5},
        }
      })
      let lnOptions = lnOc.getCleanOptions(this.options.lineNumbersOptions)
      if (lnOptions.resetEachPage) {
        lnOptions.showLineOne = false
      }
      this.options.lineNumbersOptions = lnOptions
      console.log(`Line Number clean options`)
      console.log(lnOptions)
      this.addPageOutputProcessor(this.constructAddLineNumbersProcessor(lnOptions))
    }
    console.log('Basic typesetter clean options')
    console.log(this.options)

  }

  /**
   *
   * @param {PageProcessor}pageOutputProcessor
   */
  addPageOutputProcessor(pageOutputProcessor) {
    this.pageOutputProcessors.push(pageOutputProcessor)
  }

  /**
   * Splits a horizontal list into lines: converts a horizontal list into a vertical list
   * consisting of a series of lines of a certain width (given previously
   * to the typesetter) and inter-line glue that gives the lines certain spacing between
   * them (the lineSkip parameter in the typesetter options).
   *
   * Adds metadata to each text with the line number within the horizontal list.
   * @param {ItemList}list
   * @return {Promise<unknown>}
   */
  typesetHorizontalList (list) {
    return new Promise( async (resolve) => {
      // Run the list through the Typesetter2 class checks
      let inputList = await super.typesetHorizontalList(list)

      // Construct a vertical list to hold the lines
      let outputList = new ItemList(TypesetterItemDirection.VERTICAL)

      // Run the First Fit algorithm on the input list
      let itemArray = inputList.getList()
      if (itemArray.length === 0) {
        resolve(outputList)
        return
      }
      let lines = await FirstFitLineBreaker.breakIntoLines(itemArray, this.lineWidth, this.options.textBoxMeasurer)

      // Post-process lines
      let lineNumberInParagraph = 1
      lines = lines.map((line) => {
        // inherit text direction from input list
        line.setTextDirection(inputList.getTextDirection())

        // add list type
        line.addMetadata(MetadataKey.LIST_TYPE, ListType.LINE)

        // add line number in paragraph
        line.addMetadata(MetadataKey.LINE_NUMBER_IN_PARAGRAPH, lineNumberInParagraph++)

        // set height
        line.setHeight(line.getHeight())

        // align item baselines
        let lineHeight = line.getHeight()
        line.setList( line.getList().map( (item) => {
          if (item instanceof TextBox) {
            if (item.getHeight() < lineHeight) {
              let oldShiftY = item.getShiftY()
              let newShiftY = lineHeight - item.getHeight() + oldShiftY
              // this.debug && console.log(`Adjusting shiftY to align baselines. Text: '${item.getText()}', lineHeight: ${lineHeight}, item's Height: ${item.getHeight()}, new shiftY: ${newShiftY}`)
              item.setShiftY(newShiftY)
            }
          }
          return item
        }))

        // adjust glue  (i.e., justify the text within the line
        let adjRatio = LineBreaker.calculateAdjustmentRatio(line.getList(), this.lineWidth)
        line.addMetadata(MetadataKey.ADJUSTMENT_RATIO, adjRatio)
        let unadjustedLineWidth = line.getWidth()
        line.addMetadata(MetadataKey.UNADJUSTED_LINE_WIDTH, toFixedPrecision(unadjustedLineWidth, 3))
        if (adjRatio !== null) {
          line.setList( line.getList().map( (item) => {
            if (item instanceof Glue) {
              if (adjRatio>=0) {
                item.setWidth(item.getWidth() + adjRatio*item.getStretch())
              } else {
                item.setWidth(item.getWidth() + adjRatio*item.getShrink())
              }
            }
            return item
          }))
        }
        line.addMetadata(MetadataKey.LINE_RATIO, toFixedPrecision(line.getWidth() / unadjustedLineWidth, 3))

        // At this point the line contains a list of items in textual order, independently of their text direction
        // Renderers, however, need to the items in display order, so they can simply iterate on the list, display
        // an item, move the current position to the right (or left for RTL text) and process the next.
        line = this.arrangeItemsInDisplayOrderNew(line)
        return line
      })

      // add total paragraph line count
      lines = lines.map( line => line.addMetadata(MetadataKey.PARAGRAPH_LINE_COUNT, lineNumberInParagraph-1))

      if (lines.length === 0) {
        resolve(outputList)
        return
      }

      // add inter-line glue
      for (let i = 0; i < lines.length; i++) {
        outputList.pushItem(lines[i])
        let interLineGlue = new Glue(TypesetterItemDirection.VERTICAL)
        interLineGlue.addMetadata(MetadataKey.GLUE_TYPE, GlueType.INTER_LINE)
        if (i !== lines.length -1) {
          // For all but the last line, calculate and set glue height based on the height of the next line
          let nextLineHeight = lines[i+1].getHeight()
          interLineGlue.setHeight(this.calcInterLineGlueHeight(nextLineHeight))
            .setWidth(this.lineWidth)
            .setStretch(0)
            .setShrink(0)
            .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, true)
        } else {
          // After the last line, add unset glue.
          // This glue will be needed later if paragraphs need to be put together.
          interLineGlue.setHeight(0)
            .setWidth(this.lineWidth)
            .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, false)
        }
        outputList.pushItem(interLineGlue)
      }
      // this.debug && console.log(`Paragraph has ${lineNumberInParagraph-1} lines`)
      resolve(outputList)
    })
  }

  /**
   *
   * @param {ItemList}list
   * @return {Promise}
   */
  typesetVerticalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetVerticalList(list)
      let outputList = new ItemList(TypesetterItemDirection.HORIZONTAL)
      let currentY = 0
      let currentVerticalList = new ItemList(TypesetterItemDirection.VERTICAL)
      if (list.hasMetadata(MetadataKey.LIST_TYPE)) {
        currentVerticalList.addMetadata(MetadataKey.LIST_TYPE, list.getMetadata(MetadataKey.LIST_TYPE))
      }
      inputList.getList().forEach((item, i) => {
        if (item instanceof Glue) {
          currentY += item.getHeight()
          currentVerticalList.pushItem(item)
          return
        }
        if (item instanceof ItemList) {
          if (item.getDirection() === TypesetterItemDirection.VERTICAL) {
            console.warn(`Ignoring vertical list while typesetting a vertical list, item index ${i}`)
            console.log(item)
            return
          }
          currentY += item.getHeight()
          if (currentY > this.textAreaHeight) {
            // new page!
            currentVerticalList.trimEndGlue()
            outputList.pushItem(currentVerticalList)
            currentVerticalList = new ItemList(TypesetterItemDirection.VERTICAL)
            if (list.hasMetadata(MetadataKey.LIST_TYPE)) {
              currentVerticalList.addMetadata(MetadataKey.LIST_TYPE, list.getMetadata(MetadataKey.LIST_TYPE))
            }
            currentVerticalList.pushItem(item)
            currentY = item.getHeight()
          } else {
            currentVerticalList.pushItem(item)
          }
          return
        }
        console.warn(`Ignoring non-glue non-list item while typesetting vertical list, item index ${i}`)
        console.log(item)
      })
      if (currentVerticalList.getList().length !== 0) {
        currentVerticalList.trimEndGlue()
        outputList.pushItem(currentVerticalList)
      }
      resolve(outputList)
    })
  }

  /**
   *
   * @param verticalListToTypeset
   * @param items
   * @param apparatusData
   * @param {number}firstLine
   * @param {number}lastLine
   * @param {boolean}resetLineNumbersEachPage
   * @return {Promise<ItemList>}
   * @private
   */
  prepareVerticalListToTest(verticalListToTypeset, items, apparatusData, firstLine, lastLine, resetLineNumbersEachPage) {
    return new Promise( async (resolve) => {
      let verticalListToTest = new ItemList(TypesetterItemDirection.VERTICAL)
      verticalListToTest.setList(items)
      // typeset and add the apparatuses to the list to test
      let apparatuses = await this.__typesetApparatuses(verticalListToTypeset, apparatusData, firstLine,lastLine, resetLineNumbersEachPage)
      apparatuses = apparatuses.filter ( (app) => {
        return app.getList().length !== 0
      })
      if (apparatuses.length > 0) {
        verticalListToTest.pushItem( (new Glue(TypesetterItemDirection.VERTICAL))
          .setHeight(this.options.textToApparatusGlue.height)
          .setStretch(this.options.textToApparatusGlue.stretch)
          .setShrink(this.options.textToApparatusGlue.shrink)
          .addMetadata(MetadataKey.GLUE_TYPE, GlueType.TEXT_TO_APPARATUS)
        )
        for (let i = 0; i < apparatuses.length; i++) {
          verticalListToTest.pushItemArray(apparatuses[i].getList())
          if (i !== apparatuses.length-1) {
            verticalListToTest.pushItem( (new Glue(TypesetterItemDirection.VERTICAL))
              .setHeight(this.options.interApparatusGlue.height)
              .setStretch(this.options.interApparatusGlue.stretch)
              .setShrink(this.options.interApparatusGlue.shrink)
              .addMetadata(MetadataKey.GLUE_TYPE, GlueType.INTER_APPARATUS)
            )
          }
        }
      } else {
        // no apparatuses, add glue to fill up the page
        verticalListToTest.pushItem( (new Glue(TypesetterItemDirection.VERTICAL))
          .setHeight(0)
          .setStretch(Typesetter2.cm2px(10))
          .setShrink(0)
        )
      }
      resolve(verticalListToTest)
    })
  }



  /**
   * Typesets a list of paragraphs into document
   *
   * Each vertical item in the input list must be either a horizontal list
   * containing a paragraph or vertical glue.
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
   * @param mainTextList
   * @param extraData
   * @return {Promise<TypesetterDocument>}
   */
  typeset (mainTextList, extraData = {  }) {
    if (mainTextList.getDirection() !== TypesetterItemDirection.VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    return new Promise ( async (resolve) => {
      // 1. Create a vertical list to be typeset
      let verticalListToTypeset = new ItemList(TypesetterItemDirection.VERTICAL)
      //
      // 2. Typeset the main text
      //
      let paragraphNumber = 0
      for (const verticalItem of mainTextList.getList()) {
        if (verticalItem instanceof Glue) {
          if (verticalItem.getDirection() === TypesetterItemDirection.VERTICAL) {
            // VERTICAL GLUE, just add it to the list to typeset
            verticalListToTypeset.pushItem(verticalItem)
          } else {
            console.warn(`${signature}: ignoring horizontal glue while building main text vertical list`)
          }
          continue
        }
        if (verticalItem instanceof ItemList) {
          if (verticalItem.getDirection() === TypesetterItemDirection.HORIZONTAL) {
            // HORIZONTAL LIST, i.e., a paragraph
            // this.debug && console.log(`Processing horizontal list, i.e., a paragraph`)
            paragraphNumber++
            let typesetParagraph = await this.typesetHorizontalList(verticalItem)
            typesetParagraph.getList().forEach((typesetItem) => {
              if (typesetItem instanceof ItemList) {
                // add paragraph number info to each line in the paragraph
                typesetItem.addMetadata(MetadataKey.PARAGRAPH_NUMBER, paragraphNumber)
                typesetItem.addMetadata(MetadataKey.LINE_TYPE, LineType.MAIN_TEXT_LINE)

                // Count text token occurrences within the line
                this.__addOccurrenceInLineMetadata(typesetItem)

              }
              verticalListToTypeset.pushItem(typesetItem)
            })
          }
        }
        // any other item type is ignored
      }
      // set any inter line glue that still unset, normally, inter line glue between paragraphs
      verticalListToTypeset = this.setUnsetInterLineGlue(verticalListToTypeset)
      // add absolute line numbers metadata to text lines
      verticalListToTypeset = this.addAbsoluteLineNumberMetadata(verticalListToTypeset)
      verticalListToTypeset.addMetadata(MetadataKey.LIST_TYPE, ListType.MAIN_TEXT_BLOCK)


      //
      // 3. Break the main text into pages
      //
      let thePages = []
      let doc = new TypesetterDocument()
      doc.addMetadata('typesetter', signature)
      let resetLineNumbersEachPage = this.options.lineNumbersOptions.resetEachPage

        // typeset apparatuses if present
      if (extraData.apparatuses !== undefined) {

        await this.options.preTypesetApparatuses()
        if (this.options.apparatusesAtEndOfDocument) {
          // Apparatuses at the end of document, the easiest but rarest case
          let apparatuses = await this.__typesetApparatuses(verticalListToTypeset, extraData.apparatuses)
          this.debug && console.log(`Typeset apparatuses`)
          this.debug && console.log(apparatuses)
          if (apparatuses.length > 0) {
            verticalListToTypeset.pushItem( (new Glue(TypesetterItemDirection.VERTICAL))
              .setHeight(this.options.textToApparatusGlue.height)
              .setStretch(this.options.textToApparatusGlue.stretch)
              .setShrink(this.options.textToApparatusGlue.shrink)
              .addMetadata(MetadataKey.GLUE_TYPE, GlueType.TEXT_TO_APPARATUS)
            )

            for (let i = 0; i < apparatuses.length; i++) {
              verticalListToTypeset.pushItemArray(apparatuses[i].getList())
              if (i !== apparatuses.length-1) {
                verticalListToTypeset.pushItem( (new Glue(TypesetterItemDirection.VERTICAL))
                  .setHeight(this.options.interApparatusGlue.height)
                  .setStretch(this.options.interApparatusGlue.stretch)
                  .setShrink(this.options.interApparatusGlue.shrink)
                  .addMetadata(MetadataKey.GLUE_TYPE, GlueType.INTER_APPARATUS)
                )
              }
            }
          }
          // simple page breaks
          // TODO: implement line numbers starting from 1 each page
          let pageList = await this.typesetVerticalList(verticalListToTypeset)
          thePages = pageList.getList().map((pageItemList) => {
            pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop)
            return new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
              [pageItemList])
          }).map( (page, pageIndex) => {
            // add metadata
            page.addMetadata(MetadataKey.PAGE_NUMBER, pageIndex+1)
            // "normal" foliation, other processors may change it
            //page.addMetadata(MetadataKey.PAGE_FOLIATION, `${pageIndex+1}`)
            return page
          })

        } else {
          // apparatuses should go at the foot of each page
          // go over the typeset text list determining the line ranges that fill up a page
          let [firstLine, lastLine ] = this.__getTotalLineNumberRange(verticalListToTypeset)
          this.debug && console.log(`Main text lines go from ${firstLine} to ${lastLine}`)

          // typeset the apparatus for the whole line range to fill up and cache apparatus data.
          await this.__typesetApparatuses(verticalListToTypeset, extraData.apparatuses)

          // break lines into pages
          let currentPageFirstLine = firstLine
          let bestCurrentPageLastLine = firstLine-1
          let bestCurrentPageBadness = INFINITE_VERTICAL_BADNESS
          let bestCurrentPageList = null
          let currentPageNumber = 1
          let lastLookedAheadList = null

          let linesLookedAhead = 0
          let lastLineTested = 0
          while(lastLineTested < lastLine) {
            this.debug && console.log(`Testing line range ${currentPageFirstLine} to ${lastLineTested+1}`)
            let lineRangeData = this.getItemsAndInfoForLineRange(verticalListToTypeset, currentPageFirstLine, lastLineTested+1)
            this.debug && console.log(`   - Widows: ${lineRangeData.widows}, orphans: ${lineRangeData.orphans}`)
            let verticalListToTest = await
              this.prepareVerticalListToTest(verticalListToTypeset, lineRangeData.items, extraData.apparatuses,
                currentPageFirstLine, bestCurrentPageLastLine+1, resetLineNumbersEachPage)

            // assess the tested page
            let badness = this.calculateVerticalListBadness(verticalListToTest, this.textAreaHeight, lineRangeData.widows, lineRangeData.orphans)
            this.debug && console.log(`   - Badness: ${badness}`)
            if (badness <= bestCurrentPageBadness) {
              this.debug && console.log(`   => new best badness ${linesLookedAhead !== 0 ?  'found after ' + linesLookedAhead + ' line(s) looked ahead' : ''}`)
              bestCurrentPageBadness = badness
              bestCurrentPageList = verticalListToTest
              lastLineTested++
              bestCurrentPageLastLine = lastLineTested
              linesLookedAhead = 0
              lastLookedAheadList = null
            }
            if (badness > bestCurrentPageBadness) {
              this.debug && console.log(`   Tested page is worse than current best ${currentPageFirstLine} to ${bestCurrentPageLastLine}`)
              if (badness === INFINITE_VERTICAL_BADNESS || linesLookedAhead >= MAX_LINES_TO_LOOK_AHEAD) {
                // we have either reached infinite badness (i.e., there's absolutely no more room for lines) or we have
                // look enough ahead looking for a better page.
                if (bestCurrentPageList === null) {
                  console.warn(`Found null best current page!!`)
                } else {
                  this.debug && console.log(`EJECTING Page ${currentPageNumber}`)
                  this.debug && console.log(`===================`)
                  thePages.push (this.ejectPage(bestCurrentPageList, currentPageNumber))
                  currentPageNumber++
                  // reset last line tested to the last line in the page we're ejecting
                  lastLineTested = bestCurrentPageLastLine
                  currentPageFirstLine = bestCurrentPageLastLine + 1
                  bestCurrentPageLastLine = currentPageFirstLine -1 // so that the next cycle tests from currentPageFirstLine
                  bestCurrentPageBadness = INFINITE_VERTICAL_BADNESS
                  bestCurrentPageList = null
                  lastLookedAheadList = null
                  linesLookedAhead = 0
                }
              } else {
                // just keep looking ahead
                lastLineTested++
                linesLookedAhead++
                this.debug && console.log(`   ...but we have only looked ${linesLookedAhead} line(s) ahead`)
                lastLookedAheadList = verticalListToTest
              }
            }
         }
          // reached the end, if there's  best page, eject it
          this.debug && console.log(`Reached the end`)
          if(bestCurrentPageList !== null) {
            this.debug && console.log(`EJECTING page ${currentPageNumber}, lines ${currentPageFirstLine} to ${bestCurrentPageLastLine}`)
            this.debug && console.log(`===================`)
            thePages.push ( this.ejectPage(bestCurrentPageList, currentPageNumber))
          }
          if (lastLookedAheadList !== null) {
            // There are hanging lines!
            currentPageNumber++
            let lineRangeData = this.getItemsAndInfoForLineRange(verticalListToTypeset, bestCurrentPageLastLine+1, lastLine)
            let verticalListWithLastHangingLines = await
              this.prepareVerticalListToTest(verticalListToTypeset, lineRangeData.items, extraData.apparatuses,
                bestCurrentPageLastLine+1, lastLine, resetLineNumbersEachPage)
            this.debug && console.log(`EJECTING page ${currentPageNumber}, lines ${bestCurrentPageLastLine+1} to ${lastLine}`)
            this.debug && console.log(`===================`)
            thePages.push(this.ejectPage(verticalListWithLastHangingLines, currentPageNumber))
          }
        }
      }

      // Apply page processors
      let processedPages = []
      for (let pageIndex = 0; pageIndex < thePages.length; pageIndex++){
        let processedPage = thePages[pageIndex]
        for (let processorIndex = 0; processorIndex < this.pageOutputProcessors.length; processorIndex++) {
          // this.debug && console.log(`Applying page output processor ${processorIndex}`)
          processedPage = await this.pageOutputProcessors[processorIndex].process(processedPage)
        }
        processedPages.push(processedPage)
      }
      doc.setPages(processedPages)
      doc.setDimensionsFromPages()
      resolve(doc)
    })
  }

  ejectPage(verticalList, pageNumber) {
    verticalList
      .setShiftX(this.options.marginLeft)
      .setShiftY(this.options.marginTop)
      .addMetadata(MetadataKey.LIST_TYPE, ListType.MAIN_TEXT_BLOCK)

    let adjRatio = this.calculateVerticalAdjustmentRatio(verticalList.getList(), this.textAreaHeight)
    if (adjRatio !== null) {
      let adjustedItems = verticalList.getList().map( (item) => {
        if (item instanceof Glue) {
          if (adjRatio>=0) {
            item.setHeight(item.getHeight() + adjRatio*item.getStretch())
          } else {
            item.setHeight(item.getHeight() + adjRatio*item.getShrink())
          }
        }
        return item
      })
      verticalList.setList(adjustedItems)
    }

    let page = new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
      [verticalList])
    page.addMetadata(MetadataKey.PAGE_NUMBER, pageNumber)
    return page
  }

  /**
   *
   * @param {ItemList}verticalList
   * @param {number}desiredHeight
   * @param {number}widows
   * @param {number}orphans
   */
  calculateVerticalListBadness(verticalList, desiredHeight, widows, orphans) {
    // TODO: take penalties into account
    let adjRatio = this.calculateVerticalAdjustmentRatio(verticalList.getList(), desiredHeight)
    if (adjRatio === null || adjRatio < -1) {
      return INFINITE_VERTICAL_BADNESS
    }
    let badness = 100*Math.pow( Math.abs(adjRatio), 3)
    if (badness < 0.1 && orphans !==0 && orphans < ACCEPTABLE_ORPHAN_COUNT) {
      badness += (ORPHAN_PENALTY / orphans)
    }
    if (badness < 0.1 && widows!==0 && widows < ACCEPTABLE_WIDOW_COUNT) {
      badness += (WIDOW_PENALTY / widows)
    }

    return badness > INFINITE_VERTICAL_BADNESS ? INFINITE_VERTICAL_BADNESS : badness
  }


  calculateVerticalAdjustmentRatio(itemArray, desiredHeight) {
    // this.debug && console.log(`Calculation adj ratio, desired height = ${desiredHeight}`)
    // this.debug && console.log( `on ${itemArray.length} items`)
    let totalHeightWithoutAdjustments = itemArray.map( (item) => {
      return item.getHeight()
    }).reduce( (total, x) => { return total+x}, 0)
    // this.debug && console.log(`Total height: ${totalHeight}`)
    if (desiredHeight === totalHeightWithoutAdjustments) {
      // right on target!
      return 0
    }
    if (totalHeightWithoutAdjustments < desiredHeight) {
      // A short list, get glue stretch
      let totalGlueStretch = itemArray.map( (item) => {
        if (item instanceof Glue) {
          return item.getStretch()
        }
        return 0
      }).reduce( (total, x) => { return total+x}, 0)
      // this.debug && console.log(`total glue stretch = ${totalGlueStretch}`)
      if (totalGlueStretch <=0) {
        return null
      }
      return (desiredHeight - totalHeightWithoutAdjustments)/totalGlueStretch
    }
    // A tall list, get glue shrink
    let totalGlueShrink = itemArray.map ( (item) => {
      if (item instanceof Glue) {
        return item.getShrink()
      }
      return 0
    }).reduce( (total, x) => { return total+x}, 0)
    // this.debug && console.log(`total glue shrink = ${totalGlueShrink}`)
    if (totalGlueShrink <=0) {
      return null
    }
    return (desiredHeight - totalHeightWithoutAdjustments)/totalGlueShrink
  }


  __getTotalLineNumberRange(mainTextVerticalList) {
    let minLine = MAX_LINE_COUNT
    let maxLine = -1
    mainTextVerticalList.getList().forEach( (item) => {
      if (item instanceof ItemList
        && item.hasMetadata(MetadataKey.LIST_TYPE)
        && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
        let lineNumber =  item.getMetadata(MetadataKey.LINE_NUMBER)
        minLine = Math.min(minLine, lineNumber)
        maxLine = Math.max(maxLine, lineNumber)
      }
    })

    return [minLine, maxLine]
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
   * @param {ItemList}mainTextVerticalList
   * @param {number}lineFrom
   * @param {number}lineTo
   * @return {{orphans: number, items: *[], widows: number}}}
   * @private
   */
  getItemsAndInfoForLineRange(mainTextVerticalList, lineFrom, lineTo) {
    // this.debug && console.log(`Getting  vertical list for line range ${lineFrom} to ${lineTo}`)
    let itemsInRange = []
    let addingItems = false
    let widows = 0
    let orphans = 0

    for (let i = 0; i < mainTextVerticalList.getList().length; i++) {
      let item = mainTextVerticalList.getList()[i]
      if (item instanceof ItemList && item.hasMetadata(MetadataKey.LIST_TYPE) && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
        if (item.hasMetadata(MetadataKey.LINE_NUMBER)) {
          let lineNumber = item.getMetadata(MetadataKey.LINE_NUMBER)
          if (!addingItems && lineNumber >= lineFrom) {
            // // this.debug && console.log(`Line number is greater or equal than first line to include (line ${lineFrom}, starting add items`)
            // let firstLineLineNumberInParagraph = item.getMetadata(MetadataKey.LINE_NUMBER_IN_PARAGRAPH)
            // if (firstLineLineNumberInParagraph !== 1) {
            //   // there are widows!
            //   widows = item.getMetadata(MetadataKey.PARAGRAPH_LINE_COUNT) - firstLineLineNumberInParagraph  + 1
            // }
            addingItems = true
          }
          if (lineNumber === lineTo) {
            let lastParagraphLineCount  = item.getMetadata(MetadataKey.PARAGRAPH_LINE_COUNT)
            let lastLineLineNumberInParagraph = item.getMetadata(MetadataKey.LINE_NUMBER_IN_PARAGRAPH)
            if (lastLineLineNumberInParagraph !== lastParagraphLineCount) {
              // there are orphans in this page and widows in the next
              orphans = lastLineLineNumberInParagraph
              widows = lastParagraphLineCount - orphans
            }
            itemsInRange.push(item)
            break
          }
        }
      }
      if (addingItems) {
        itemsInRange.push(item)
      }
    }

    return {
      items: itemsInRange,
      widows: widows,
      orphans: orphans
    }
  }

  /**
   * Returns the number of lines in the paragraph to which the item at the given index belongs
   * @param {TypesetterItem}itemList
   * @param {number}index
   */
  getParagraphLineCountForIndex(itemList, index) {
    // the number we're looking for is the highest line number
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
   * @param {ItemList}typesetMainTextVerticalList
   * @param {Object[]}apparatuses The apparatus objects passed to the typesetter in the extraData parameter
   * @param {number}lineFrom
   * @param {number}lineTo
   * @param {boolean}resetLineNumbersEachPage
   * @return {Promise<ItemList[]>}
   * @private
   */
  __typesetApparatuses(typesetMainTextVerticalList, apparatuses, lineFrom = 1,
        lineTo = MAX_LINE_COUNT, resetLineNumbersEachPage = false) {
    return new Promise( async (resolve) => {
      // this.debug && console.log(`Typesetting ${apparatuses.length} apparatuses from lines ${lineFrom} to ${lineTo === MAX_LINE_COUNT ? 'end' : lineTo}, resetLineNumbers = ${resetLineNumbersEachPage}`)
      let outputArray = []
      for (let i = 0; i < apparatuses.length; i++) {
        // this.debug && console.log(`Typesetting apparatus ${i}`)
        let apparatusListToTypeset = await this.options.getApparatusListToTypeset(typesetMainTextVerticalList, apparatuses[i], lineFrom, lineTo, resetLineNumbersEachPage)
        if (apparatusListToTypeset.getDirection() === TypesetterItemDirection.HORIZONTAL) {
          // this.debug && console.log(`Typesetting apparatus ${i}`)
          let currentLineSkip = this.lineSkip
          this.lineSkip = this.options.apparatusLineSkip
          outputArray.push(await this.typesetHorizontalList(apparatusListToTypeset))
          this.lineSkip = currentLineSkip
          // this.debug && console.log(`Finished typesetting apparatus ${i}`)
        } else {
          console.warn(`Apparatus ${i} list to typeset is vertical, this is not implemented yet`)
        }
      }
      // this.debug && console.log(`Finished typesetting all apparatuses`)
      // this.debug && console.log(outputArray)
      resolve(outputArray)
    })
  }

  /**
   *
   * @param {ItemList}line
   * @return {ItemList}
   * @private
   */
  __addOccurrenceInLineMetadata(line) {
    // TODO: fix this counter
    //  The current version does not take into account the fact that some text tokens might be
    //  merged with punctuation
    if (line.getDirection() !== TypesetterItemDirection.HORIZONTAL) {
      // not a horizontal list, i.e., not a line => do nothing
      return line
    }
    // count occurrences
    let originalOrderItems = line.getList()
    if (line.hasMetadata(MetadataKey.HAS_REORDERED_ITEMS) && line.getMetadata(MetadataKey.HAS_REORDERED_ITEMS) === true) {
      if (line.hasMetadata(MetadataKey.ORIGINAL_ITEM_ORDER)) {
        let originalOrder = line.getMetadata(MetadataKey.ORIGINAL_ITEM_ORDER)
        originalOrderItems = []
        let items = line.getList()
        originalOrder.forEach( (index) => {
          originalOrderItems.push(items[index])
        })
      }
    }
    let occurrencesCounter = new StringCounter()
    originalOrderItems.forEach( (item)=> {
      if (item instanceof TextBox) {
        let text = item.getText()
        let token = this.__getTextTokenForCountingPurposes(text)
        if (text !== token) {
          item.addMetadata(MetadataKey.TOKEN_FOR_COUNTING_PURPOSES, token)
        }
        occurrencesCounter.addString(token)
        item.addMetadata(MetadataKey.TOKEN_OCCURRENCE_IN_LINE, occurrencesCounter.getCount(token))
      }
    })
    // tag total occurrences
    originalOrderItems.forEach( (item)=> {
      if (item instanceof TextBox) {
        let token = item.getText()
        if (item.hasMetadata(MetadataKey.TOKEN_FOR_COUNTING_PURPOSES)) {
          token = item.getMetadata(MetadataKey.TOKEN_FOR_COUNTING_PURPOSES)
        }
        item.addMetadata(MetadataKey.TOKEN_TOTAL_OCCURRENCES_IN_LINE, occurrencesCounter.getCount(token))
      }
    })

    // this.debug && console.log(`Tagged original items`)
    // this.debug && console.log(originalOrderItems)
    return line
  }

  __getTextTokenForCountingPurposes(text) {
     return trimPunctuation(text.toLowerCase())
  }


  getItemIntrinsicTextDirection(item) {
    if (item instanceof TextBox) {
      if (item.getTextDirection() === '') {
        // text direction not set, let's calculate it!
        let ld = new LanguageDetector()
        return ld.detectTextDirection(item.getText())
      } else {
        return  item.getTextDirection
      }
    }
    // not a TextBox
    return item.getTextDirection()
  }

  arrangeItemsInDisplayOrderNew(line) {
    let originalLineItems = line.getList()
    let lineTextDirection = line.getTextDirection()
    let newOrderInfoArray = BidiDisplayOrder.getDisplayOrder(originalLineItems, lineTextDirection, (item) => {
      return this.getItemIntrinsicTextDirection(item)
    })
    let hasReorderedItems = false
    let newItems = []
    let originalOrder = newOrderInfoArray.map( () => { return -1})
    for (let i = 0; i < newOrderInfoArray.length; i++ ) {
      let newOrderInfo = newOrderInfoArray[i]
      if (newOrderInfo.inputIndex !== i) {
        hasReorderedItems = true
      }
      let item = originalLineItems[newOrderInfo.inputIndex]
      item.setTextDirection(newOrderInfo.textDirection)
      if (hasReorderedItems) {
        item.addMetadata(MetadataKey.ORIGINAL_ARRAY_INDEX, i)
      }
      originalOrder[i] = newOrderInfo.inputIndex
      newItems.push(item)
    }
    line.setList(newItems)
    if (hasReorderedItems) {
      line.addMetadata(MetadataKey.HAS_REVERSE_TEXT, true)
      line.addMetadata(MetadataKey.HAS_REORDERED_ITEMS, true)
      line.addMetadata(MetadataKey.ORIGINAL_ITEM_ORDER, originalOrder)
    }
    return line
  }

  /**
   * Adds absolute line number metadata to each line in the given list
   * @param {ItemList}verticalList
   * @return {ItemList}
   * @private
   */
  addAbsoluteLineNumberMetadata(verticalList) {
    let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
    let lineNumber = 0
    verticalList.getList().forEach( (item) => {
      if (item instanceof ItemList
        && item.hasMetadata(MetadataKey.LIST_TYPE)
        && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
        lineNumber++
        // this.debug && console.log(`Adding line number ${lineNumber} metadata`)
        item.addMetadata(MetadataKey.LINE_NUMBER, lineNumber)
      }
      outputList.pushItem(item)
    })
    return outputList
  }

  /**
   * Sets any unset inter line glue in the vertical list.
   * Normally, this will be the inter line glue at the end of individually
   * set paragraphs.
   * @param verticalList
   * @return ItemList
   * @private
   */
  setUnsetInterLineGlue(verticalList) {
    let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
    let state = 0
    let currentInterLineGlue = null
    let tmpItems = []
    verticalList.getList().forEach((item, i) => {
      switch (state) {
        case 0: // processing lines and set glue
          if (item.hasMetadata(MetadataKey.GLUE_TYPE)
            && item.getMetadata(MetadataKey.GLUE_TYPE) === GlueType.INTER_LINE
            && item.getMetadata(MetadataKey.INTER_LINE_GLUE_SET) === false
          ) {
            // this.debug && console.log(`Item ${i} is interline glue that is not set`)
            currentInterLineGlue = item
            state = 1
          } else {
            outputList.pushItem(item)
          }
          break

        case 1: // waiting for a line after receiving unset glue
          if (item instanceof ItemList
            && item.hasMetadata(MetadataKey.LIST_TYPE)
            && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
            // this.debug && console.log(`Got a line in state 1, setting inter line glue`)
            let nextLineHeight = item.getHeight()
            currentInterLineGlue.setHeight(this.calcInterLineGlueHeight(nextLineHeight))
              .addMetadata(MetadataKey.INTER_LINE_GLUE_SET, true)
            outputList.pushItem(currentInterLineGlue)
            // this.debug && console.log(`Pushing ${tmpItems.length} item(s) in temp stack to output list`)
            outputList.pushItemArray(tmpItems)
            outputList.pushItem(item)
            tmpItems = []
            currentInterLineGlue = null
            state = 0
          } else {
            // not a line, just save it into a temporary stack
            // normally, this will never happen when the input list is the output
            // of typesetHorizontalList
            //this.debug && console.log(`Saving item ${i} in temp stack`)
            tmpItems.push(item)
          }
          break
      }
    })
    outputList.pushItemArray(tmpItems)
    return outputList
  }

  /**
   *
   * @param {number}nextLineHeight
   * @return {number}
   * @private
   */
  calcInterLineGlueHeight(nextLineHeight) {
      return Math.max(this.minLineSkip, this.lineSkip - nextLineHeight)
  }

  /**
   * @param {Object} options
   * @return AddPageNumbers
   * @private
   */
  constructAddPageNumberProcessor(options) {
    let pageNumbersMarginTop = this.options.pageHeight - this.options.marginBottom + options.margin
    let pageNumbersMarginLeft = this.options.marginLeft
    let lineWidth = this.options.pageWidth - this.options.marginRight - this.options.marginLeft

    if (options.position === 'top') {
      pageNumbersMarginTop = this.options.marginTop - options.margin - options.fontSize
    }
    return new AddPageNumbers({
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      numberStyle: options.numberStyle,
      marginTop: pageNumbersMarginTop,
      marginLeft: pageNumbersMarginLeft,
      lineWidth: lineWidth,
      align: options.align,
      textBoxMeasurer: this.options.textBoxMeasurer
    })
  }

  /**
   * @param {Object} options
   * @return {AddLineNumbers}
   * @private
   */
  constructAddLineNumbersProcessor(options) {
    // options.debug = this.debug
    options.textBoxMeasurer = this.options.textBoxMeasurer
    options.listTypeToNumber = ListType.MAIN_TEXT_BLOCK
    options.lineTypeToNumber = LineType.MAIN_TEXT_LINE
    return new AddLineNumbers(options)
  }
}