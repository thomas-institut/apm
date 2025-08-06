import { PageProcessor } from './PageProcessor.mjs'

import * as MetadataKey from '../MetadataKey.mjs'
import { TextBoxFactory } from '../TextBoxFactory.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TextBoxMeasurer } from '../TextBoxMeasurer/TextBoxMeasurer.js'
import { NumeralStyles } from '../../toolbox/NumeralStyles.mjs'

export class AddPageNumbers extends PageProcessor {


  constructor (options) {
    super()

    let oc = new OptionsChecker({
      context: 'AddPageNumbers Page Processor',
      optionsDefinition: {
        fontFamily: { type: 'string', required: true},
        fontSize: { type: 'number', required: true},
        fontStyle: { type: 'string', default: ''},
        numberStyle: { type: 'string', default: ''},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        marginTop: { type: 'number', default: 20},
        marginLeft: { type: 'number', default: 20},
        lineWidth:  { type: 'number', default: 100},
        align: { type: 'string', default: 'center'},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.debug = this.options.debug

    this.debug && console.log(`AddPageNumbers options`)
    this.debug && console.log(this.options)

  }

  process (page) {
    let thePage =  super.process(page)
    return new Promise( async (resolve) => {
      let pageNumber = page.getMetadata(MetadataKey.PAGE_NUMBER)
      if (pageNumber=== undefined) {
        // no page number, can't do anything
        resolve(thePage)
      }

      this.debug && console.log(`Adding page numbers to page ${pageNumber}`)
      let foliation = page.getMetadata(MetadataKey.PAGE_FOLIATION)
      if (foliation=== undefined) {
        foliation = `${this._getPageNumberString(pageNumber)}`
      }
      let pageNumberTextBox = TextBoxFactory.simpleText(foliation, {
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        fontStyle: this.options.fontStyle
      })
      let textHeight = await this.options.textBoxMeasurer.getBoxHeight(pageNumberTextBox)
      pageNumberTextBox.setShiftY(this.options.marginTop)
        .setHeight(textHeight)
        .addMetadata(MetadataKey.ITEM_TYPE, 'PageNumber')

      switch(this.options.align) {
        case 'center':
          let boxWidth = await this.options.textBoxMeasurer.getBoxWidth(pageNumberTextBox)
          pageNumberTextBox.setShiftX(this.options.marginLeft + this.options.lineWidth/2 - boxWidth/2)
          break

        case 'left':
          pageNumberTextBox.setShiftX(this.options.marginLeft)
          break

        case 'right':
          let textWidth = await this.options.textBoxMeasurer.getBoxWidth(pageNumberTextBox)
          pageNumberTextBox.setShiftX(this.options.marginLeft + this.options.lineWidth - textWidth)
      }

      page.addItem( pageNumberTextBox)
      resolve(thePage)
    })
  }

  /**
   *
   * @param {number}pageNumber
   * @return {string}
   * @private
   */
  _getPageNumberString(pageNumber) {
    switch(this.options.numberStyle) {
      case 'arabic':
      case 'ara':
      case 'ar':
        return NumeralStyles.toDecimalArabic(pageNumber)

      default:
        return `${pageNumber}`

    }
  }

}