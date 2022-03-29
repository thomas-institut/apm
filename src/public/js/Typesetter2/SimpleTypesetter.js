import { Typesetter2 } from './Typesetter2'
import { ItemList } from './ItemList'
import * as TypesetterItemDirection from './TypesetterItemDirection'
import { HORIZONTAL, VERTICAL } from './TypesetterItemDirection'
import { Glue } from './Glue'
import { TextBox } from './TextBox'
import { MINUS_INFINITE, Penalty } from './Penalty'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TypesetterPage } from './TypesetterPage'

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
      }
    })
    this.options = oc.getCleanOptions(options)
    this.lineWidth = this.options.pageWidth - this.options.marginLeft - this.options.marginRight
    this.textAreaHeight = this.options.pageHeight - this.options.marginTop - this.options.marginBottom
    this.lineSkip = this.options.lineSkip
  }


  typesetHorizontalList (list) {
    let inputList = super.typesetHorizontalList(list)
    //console.log(`Typesetting horizontal list, lineWidth = ${this.lineWidth}`)
    let lines = []
    let currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
    let currentX = 0
    inputList.getList().forEach( (item) => {
      if (item instanceof Glue) {
        //console.log(`Processing glue at currentX = ${currentX}`)
        currentX += item.getWidth()
        //console.log(`New currentX = ${currentX}`)
        currentLine.pushItem(item)
        return
      }
      if (item instanceof TextBox) {
        //console.log(`Processing text box at currentX = ${currentX}, text = '${item.getText()}'`)
        currentX += item.getWidth()
        //console.log(`New currentX = ${currentX}`)
        if (currentX > this.lineWidth) {
          // new line
          //console.log(`New line`)
          currentLine.trimEndGlue()
          lines.push(currentLine)
          currentLine = new ItemList(TypesetterItemDirection.HORIZONTAL)
          currentX = item.getWidth()
        }
        currentLine.pushItem(item)
        return
      }
      if (item instanceof Penalty) {
        if (item.getPenalty() === MINUS_INFINITE) {
          // force line break
          currentLine.trimEndGlue()
          lines.push(currentLine)
          currentX = 0
        }
      }
    })
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
    return outputList
  }

  /**
   *
   * @param {ItemList}list
   * @return {ItemList}
   */
  typesetVerticalList (list) {
    let inputList = super.typesetVerticalList(list)
    let outputList = new ItemList(HORIZONTAL)
    let currentY = 0
    let currentVerticalList = new ItemList(VERTICAL)
    inputList.getList().forEach( (item, i) => {
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
    return outputList
  }

  typeset (list) {
    if (list.getDirection() !== VERTICAL) {
      throw new Error(`Cannot typeset a non-vertical list`)
    }
    let verticalListToTypeset = new ItemList(VERTICAL)
    list.getList().forEach( (verticalItem) => {
      if (verticalItem instanceof Glue) {
        verticalListToTypeset.pushItem(verticalItem)
        return
      }
      if (verticalItem instanceof ItemList) {
        if (verticalItem.getDirection() === HORIZONTAL) {
          // console.log(`Processing horizontal list`)
          // console.log(verticalItem)
          let typesetItem = this.typesetHorizontalList(verticalItem)
          // console.log(`Typeset horizontal list`)
          // console.log(typesetItem)
          typesetItem.getList().forEach( (typesetItem) => {
            verticalListToTypeset.pushItem(typesetItem)
          })
        }
      }
    })
    let pageList = this.typesetVerticalList(verticalListToTypeset)
    return pageList.getList().map((pageItemList) => {
      pageItemList.setShiftX(this.options.marginLeft).setShiftY(this.options.marginTop)
      return new TypesetterPage(this.options.pageWidth, this.options.pageHeight,
        [  pageItemList ])
    })
  }

}