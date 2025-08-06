import { PageProcessor } from './PageProcessor.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import * as MetadataKey from '../MetadataKey.mjs'
import * as ListType from '../ListType.mjs'
import { ItemList } from '../ItemList.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import { TextBoxFactory } from '../TextBoxFactory.mjs'
import { Glue } from '../Glue.mjs'
import { TextBoxMeasurer } from '../TextBoxMeasurer/TextBoxMeasurer.js'
import { Typesetter2 } from '../Typesetter2.mjs'
import { NumeralStyles } from '../../toolbox/NumeralStyles.mjs'
import { deepCopy } from '../../toolbox/Util.mjs'

export class AddLineNumbers extends PageProcessor {

 constructor(options) {
   super()
   let oc = new OptionsChecker({
     context: "AddLineNumbers Page Processor",
     optionsDefinition: {
       listTypeToNumber: { type: 'string', default: ListType.MAIN_TEXT_BLOCK},
       lineTypeToNumber: { type: 'string', default: ''},
       numberStyle: { type: 'string', default: ''},
       showLineOne: {type: 'boolean', default: true},
       lineNumberShift: { type: 'number', default: 0},
       resetEachPage: { type: 'boolean', default: true},
       frequency: { type: 'number', default: 5},
       xPosition: { type: 'number', default: 20},
       align: { type: 'string', default: 'right'},
       fontFamily: { type: 'string', default: 'FreeSerif'},
       fontSize: { type: 'number', default: Typesetter2.pt2px(10) },
       textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
       debug: { type: 'boolean', default: false}
     }
   })
   this.options = oc.getCleanOptions(options)

   this.debug = this.options.debug

   this.debug && console.log(`AddPageNumbers options`)
   this.debug && console.log(this.options)
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
 process (page) {
   return new Promise( async (resolve) => {
     if (!page.hasMetadata(MetadataKey.MAIN_TEXT_LINE_DATA)) {
       console.warn(`No main text line data available, line numbers not added`);
       resolve(page);
     }

     /** @var {MainTextLineData}mainTextLineData */
     let mainTextLineData = page.getMetadata(MetadataKey.MAIN_TEXT_LINE_DATA)
     let mainTextIndex = mainTextLineData.mainTextListIndex
     if (mainTextIndex === -1) {
       // no main text block, nothing to do
       resolve(page)
       return
     }


     /** @var {LineNumberData[]}lineNumberData*/
     let lineNumberData = deepCopy(mainTextLineData.lineData)
     // determine lineNumberShift, a number that will be ADDED to
     // the line number to determine the actual line number to show
     let lineNumberShift = this.options.lineNumberShift;
     if (this.options.resetEachPage) {
       lineNumberShift -= (lineNumberData[0].lineNumber -1)
     }
     lineNumberData = lineNumberData.map( (dataItem) => {
       dataItem.lineNumberToShow = dataItem.lineNumber + lineNumberShift
       return dataItem
     }).filter( (dataItem) => {
       if (this.options.showLineOne && dataItem.lineNumberToShow === 1) {
         return true
       }
       return (dataItem.lineNumberToShow % this.options.frequency) === 0;
     })
     this.debug && console.log(`Updated line Number data`)
     this.debug && console.log(lineNumberData)
     if (lineNumberData.length ===0 ) {
       // no lines with line number metadata, nothing to do
       resolve(page)
       return
     }

     this.debug && console.log(`MainTextBlock at index ${mainTextIndex}`)
     let mainTextList = page.getItems()[mainTextIndex]
     // console.log(`mainTextList  (index ${mainTextIndex}`)
     // console.log(mainTextList)
     let mainTextListItems = mainTextList.getList()
     let lineNumberList = new ItemList(TypesetterItemDirection.VERTICAL)
     lineNumberList
       .setShiftX(this.options.xPosition)
       .setShiftY(mainTextList.getShiftY())
       .addMetadata(MetadataKey.LIST_TYPE, ListType.LINE_NUMBERS)
     let previousShiftYAdjustment = 0
     let previousLineHeight = 0
     let previousY = 0
     for (let i = 0; i < lineNumberData.length; i++) {
       let dataItem = lineNumberData[i]

       // add inter number glue
       let glueHeight = dataItem.y - previousY - previousLineHeight + previousShiftYAdjustment
       if (glueHeight !== 0) {
         let glue = new Glue(TypesetterItemDirection.VERTICAL)
         glue.setHeight(glueHeight)
         lineNumberList.pushItem(glue)
       }

       let lineNumberTextBox = TextBoxFactory.simpleText(this._getLineNumberString(dataItem.lineNumberToShow), {
         fontFamily: this.options.fontFamily,
         fontSize: this.options.fontSize
       })
       // the number may be RTL, but alignments are calculated assuming LTR box placement
       lineNumberTextBox.setTextDirection('ltr')

       if (this.options.align === 'right') {
         let boxWidth = await this.options.textBoxMeasurer.getBoxWidth(lineNumberTextBox)
         lineNumberTextBox.setShiftX(-boxWidth)
       }

       let boxHeight = await this.options.textBoxMeasurer.getBoxHeight(lineNumberTextBox)
       lineNumberTextBox.setHeight(boxHeight)
       let lineHeight = mainTextListItems[dataItem.listIndex].getHeight()
       if (boxHeight !== lineHeight) {
         lineNumberTextBox.setShiftY(lineHeight - boxHeight)
         previousShiftYAdjustment = lineHeight - boxHeight
       }
       previousLineHeight = lineHeight
       previousY = dataItem.y
       lineNumberList.pushItem(lineNumberTextBox)
     }
     page.addItem(lineNumberList)

     resolve(page)
   })
 }

  /**
   *
   * @param {number}lineNumber
   * @return {string}
   * @private
   */
 _getLineNumberString(lineNumber) {
   switch(this.options.numberStyle) {
     case 'arabic':
     case 'ara':
     case 'ar':
       return NumeralStyles.toDecimalArabic(lineNumber)

     default:
       return `${lineNumber}`

   }
 }

}