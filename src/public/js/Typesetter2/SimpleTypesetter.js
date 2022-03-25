
import { Typesetter2 } from './Typesetter2'
import { ItemList } from './ItemList'
import * as TypesetterItemDirection from './TypesetterItemDirection'
import { Glue } from './Glue'
import { TextBox } from './TextBox'
import { MINUS_INFINITE, Penalty } from './Penalty'

export const lineMetadataKey = 'SimpleTypesetterLine'

export class SimpleTypesetter extends Typesetter2 {
  constructor (lineWidth, lineSkip = 24) {
    super()
    this.lineWidth = lineWidth
    this.lineSkip = lineSkip
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
      return line.addMetaData(lineMetadataKey, {
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

}