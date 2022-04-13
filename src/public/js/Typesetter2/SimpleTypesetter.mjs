import { Typesetter2 } from './Typesetter2.mjs'
import { ItemList } from './ItemList.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { HORIZONTAL, VERTICAL } from './TypesetterItemDirection.mjs'
import { Glue } from './Glue.mjs'
import { TextBox } from './TextBox.mjs'
import { MINUS_INFINITE, Penalty } from './Penalty.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage.mjs'
import { TextBoxMeasurer } from './TextBoxMeasurer.mjs'

export const lineMetadataKey = 'SimpleTypesetterLine'

export class SimpleTypesetter extends Typesetter2 {
  constructor (options) {
    super()
    let oc = new OptionsChecker({
      context: 'SimpleTypesetter',
      optionsDefinition: {
        pageWidth: { type: 'number', required: true},
        pageHeight: { type: 'number', required: true},
        marginTop: { type: 'number', default: 50},
        marginBottom: { type: 'number', default: 50},
        marginLeft: { type: 'number', default: 50},
        marginRight: { type: 'number', default: 50},
        lineSkip: { type: 'number', default: 24},
        textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
        debug: { type: 'boolean', default: false}
      }
    })
    this.options = oc.getCleanOptions(options)
    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
    this.debug = this.options.debug

  }


  typesetHorizontalList (list) {
    return new Promise( async (resolve) => {
      let inputList = await super.typesetHorizontalList(list)
      this.debug && console.log(`Typesetting horizontal list, lineWidth = ${this.lineWidth}`)
      let lines = []
      let currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
      let currentX = 0
      for (const item of inputList.getList()) {
        if (item instanceof Glue) {
          this.debug && console.log(`Processing glue at currentX = ${currentX}`)
          currentX += item.getWidth()
          this.debug && console.log(`New currentX = ${currentX}`)
          currentLine.pushItem(item)
          continue
        }
        if (item instanceof TextBox) {
          this.debug && console.log(`Processing text box at currentX = ${currentX}, text = '${item.getText()}'`)
          // Measure the text box before proceeding
          if (item.getWidth() === -1) {
            this.debug && console.log(`Getting text box width`)
            let measuredWidth = await this.options.textBoxMeasurer.getBoxWidth(item)
            item.setWidth(measuredWidth)
          }
          if (item.getHeight() === -1) {
            let measuredHeight = await this.options.textBoxMeasurer.getBoxHeight(item)
            item.setHeight(measuredHeight)
          }

          currentX += item.getWidth()
          this.debug && console.log(`New currentX = ${currentX}`)
          if (currentX > this.lineWidth) {
            // new line
            this.debug && console.log(`New line`)
            currentLine.trimEndGlue()
            lines.push(currentLine)
            currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
            currentX = item.getWidth()
          }
          currentLine.pushItem(item)
          continue
        }
        if (item instanceof Penalty) {
          if (item.getPenalty() === MINUS_INFINITE) {
            // force line break
            currentLine.trimEndGlue()
            lines.push(currentLine)
            currentX = 0
          }
        }
      }
      currentLine.trimEndGlue()
      if (currentLine.getItemCount() !== 0) {
        lines.push(currentLine)
      }
      let outputList = new ItemList(TypesetterItemDirection.VERTICAL)
      if (lines.length === 0) {
        return outputList
      }
      // add some metadata to the lines
      let lineNumber = 1
      lines = lines.map( (line) => {
        return line.addMetadata(lineMetadataKey, {
          lineNumber: lineNumber++,
          ratio: line.getWidth() / this.lineWidth
        })
      })
      // add inter-line glue
      outputList.pushItem(lines[0])
      for (let i = 1; i < lines.length; i++) {
        let interLineGlue = new Glue(TypesetterItemDirection.VERTICAL)
        let lineHeight = lines[i].getHeight()
        interLineGlue.setHeight(this.lineSkip-lineHeight).setWidth(this.lineWidth)
        outputList.pushItem(interLineGlue)
        outputList.pushItem(lines[i])
      }
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
      let outputList = new ItemList(HORIZONTAL)
      let currentY = 0
      let currentVerticalList = new ItemList(VERTICAL)
      inputList.getList().forEach((item, i) => {
        if (item instanceof Glue) {
          currentY += item.getHeight()
          currentVerticalList.pushItem(item)
          return
        }
        if (item instanceof ItemList) {
          if (item.getDirection() !== HORIZONTAL) {
            console.warn(`Ignoring vertical list while typesetting a vertical list, item index ${i}`)
            console.log(item)
            return
          }
          currentY += item.getHeight()
          if (currentY > this.textAreaHeight) {
            // new page!
            currentVerticalList.trimEndGlue()
            outputList.pushItem(currentVerticalList)
            currentVerticalList = new ItemList(VERTICAL)
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

  typeset (list) {
    if (list.getDirection() !== VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    return new Promise ( async (resolve) => {
      let verticalListToTypeset = new ItemList(VERTICAL)
      for (const verticalItem of list.getList()) {
        if (verticalItem instanceof Glue) {
          verticalListToTypeset.pushItem(verticalItem)
          continue
        }
        if (verticalItem instanceof ItemList) {
          if (verticalItem.getDirection() === HORIZONTAL) {
            this.debug && console.log(`Processing horizontal list`)
            //this.debug && console.log(verticalItem)
            let typesetItem = await this.typesetHorizontalList(verticalItem)
            this.debug &&  console.log(`Typeset horizontal list`)
            //this.debug &&  console.log(typesetItem)
            typesetItem.getList().forEach((typesetItem) => {
              verticalListToTypeset.pushItem(typesetItem)
            })
          }
        }
      }
      let pageList = await this.typesetVerticalList(verticalListToTypeset)
      resolve(pageList.getList().map((pageItemList) => {
        pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop)
        return new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
          [pageItemList])
      }))
    })
  }

}