import { PageProcessor } from './PageProcessor.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import * as MetadataKey from '../MetadataKey.mjs'
import * as ListType from '../ListType.mjs'
import { ItemList } from '../ItemList.mjs'
import * as TypesetterItemDirection from '../TypesetterItemDirection.mjs'
import { TextBoxFactory } from '../TextBoxFactory.mjs'
import { Glue } from '../Glue.mjs'
import { TextBoxMeasurer } from '../TextBoxMeasurer/TextBoxMeasurer.mjs'
import { Typesetter2 } from '../Typesetter2.mjs'
import { NumeralStyles } from '../../toolbox/NumeralStyles.mjs'

export class AddLineNumbers extends PageProcessor {

 constructor(options) {
   super()
   let oc = new OptionsChecker({
     context: "AddLineNumbers Page Processor",
     optionsDefinition: {

       numberStyle: { type: 'string', default: 'arabic'},
       showLineOne: {type: 'boolean', default: true},
       lineNumberShift: { type: 'number', default: 0},
       frequency: { type: 'number', default: 5},
       xPosition: { type: 'number', default: 20},
       align: { type: 'string', default: 'right'},
       fontFamily: { type: 'string', default: 'FreeSerif'},
       fontSize: { type: 'number', default: Typesetter2.pt2px(10) },
       textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
       debug: { type: 'boolean', default: true}
     }
   })
   this.options = oc.getCleanOptions(options)

   this.debug = this.options.debug

   this.debug && console.log(`AddPageNumbers options`)
   this.debug && console.log(this.options)
 }

  /**
   * Adds line numbers for the main text in a TypesetterPage
   * The main text is the vertical list identified with the 'type' metadata key set to 'MainText'
   * Each horizontal list that has the 'type' metadata set with 'line' and has
   * a 'lineNumber' metadata key set will be considered. A line number may be added so that it will print at
   * the same Y position of the line. Line numbers will be added at frequency given in the options.
   * @param page
   * @return {Promise<TypesetterPage>}
   */
 process (page) {
   return new Promise( async (resolve) => {
     let pageItems = page.getItems()
     let mainTextIndex = pageItems.map( (item) => {
       return item.hasMetadata(MetadataKey.LIST_TYPE) ? item.getMetadata(MetadataKey.LIST_TYPE) : 'undefined'
     }).indexOf(ListType.MAIN_TEXT)
     if (mainTextIndex === -1) {
       resolve(page)
       return
     }
     this.debug && console.log(`MainTextList at index ${mainTextIndex}`)
     let mainTextList = pageItems[mainTextIndex]
     if (mainTextList instanceof ItemList) {
       let linesWithNumberIndices = []
       let mainTextListItems = mainTextList.getList()
       mainTextListItems.forEach( (item, itemIndex) => {
         if (item.hasMetadata(MetadataKey.LIST_TYPE) && item.getMetadata(MetadataKey.LIST_TYPE) === ListType.LINE) {
           let lineNumber = item.getMetadata(MetadataKey.LINE_NUMBER)
           if (lineNumber !== undefined) {
             if (lineNumber === 1 && this.options.showLineOne) {
               linesWithNumberIndices.push(itemIndex)
             } else {
               if ((lineNumber % this.options.frequency)=== 0){
                 linesWithNumberIndices.push(itemIndex)
               }
             }
           }
         }
       })

       this.debug && console.log(`linesWithNumberIndices`)
       this.debug && console.log(linesWithNumberIndices)

       let yPositions = this._getYPositions(mainTextListItems)

       let data = []
       linesWithNumberIndices.forEach( (index) => {
         data.push({
           listIndex: index,
           lineNumber: mainTextListItems[index].getMetadata(MetadataKey.LINE_NUMBER),
           y: yPositions[index]
         })
       })

       this.debug && console.log(`Line Number data`)
       this.debug && console.log(data)

       if (data.length ===0 ) {
         resolve(page)
         return
       }

       let lineNumberList = new ItemList(TypesetterItemDirection.VERTICAL)
       lineNumberList
         .setShiftX(this.options.xPosition)
         .setShiftY(mainTextList.getShiftY())
         .addMetadata(MetadataKey.LIST_TYPE, ListType.LINE_NUMBERS)
       let previousShiftYAdjustment = 0
       let previousLineHeight = 0
       let previousY = 0
       for (let i = 0; i < data.length; i++) {
         let dataItem = data[i]

         // add inter number glue
         let glueHeight = dataItem.y - previousY - previousLineHeight + previousShiftYAdjustment
         if (glueHeight !== 0) {
           let glue = new Glue(TypesetterItemDirection.VERTICAL)
           glue.setHeight(glueHeight)
           lineNumberList.pushItem(glue)
         }


         let lineNumberTextBox = TextBoxFactory.simpleText(this._getLineNumberString(dataItem.lineNumber), {
           fontFamily: this.options.fontFamily,
           fontSize: this.options.fontSize
         })
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