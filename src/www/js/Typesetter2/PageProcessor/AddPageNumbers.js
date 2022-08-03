import { PageProcessor } from './PageProcessor.mjs'

import * as MetadataKey from '../MetadataKey.mjs'
import { TextBoxFactory } from '../TextBoxFactory.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TextBoxMeasurer } from '../TextBoxMeasurer/TextBoxMeasurer.mjs'

export class AddPageNumbers extends PageProcessor {


  constructor (options) {
    super()

    let oc = new OptionsChecker({
      context: 'AddPageNumbers Page Processor',
      optionsDefinition: {
        fontFamily: { type: 'string', required: true},
        fontSize: { type: 'number', required: true},
        fontStyle: { type: 'string', default: ''},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        marginTop: { type: 'number', default: 20},
        marginLeft: { type: 'number', default: 20},
        lineWidth:  { type: 'number', default: 100},
        center: { type: 'boolean', default: true},
        debug: { type: 'boolean', default: true}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.debug = this.options.debug

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
        foliation = `${pageNumber}`
      }
      let pageNumberTextBox = TextBoxFactory.simpleText(foliation, {
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        fontStyle: this.options.fontStyle
      })


      pageNumberTextBox.setShiftY(this.options.marginTop)
        .addMetadata(MetadataKey.ITEM_TYPE, 'PageNumber')
      if (this.options.center) {
        let boxWidth = await this.options.textBoxMeasurer.getBoxWidth(pageNumberTextBox)
        pageNumberTextBox.setShiftX(this.options.marginLeft + this.options.lineWidth/2 - boxWidth/2)
      } else {
        pageNumberTextBox.setShiftX(this.options.marginLeft)
      }

      page.addItem( pageNumberTextBox)

      resolve(thePage)

    })
  }

}