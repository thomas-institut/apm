import { TypesetterRenderer } from './TypesetterRenderer'
import { Glue } from './Glue'
import { TextBox } from './TextBox'
import { Box } from './Box'
import { ItemList } from './ItemList'

export class CanvasRenderer extends TypesetterRenderer {

  constructor (canvasElement) {
    super()
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d')
  }

  renderHorizontalList (list, shiftX = 0, shiftY = 0) {
    let currentX = shiftX
    let lineHeight = list.getHeight()
    console.log(`Rendering line, currentY = ${shiftY}, lineHeight = ${lineHeight}, lineWidth = ${list.getWidth()}`)
    list.getList().forEach( (horizontalItem) => {
      if (horizontalItem instanceof Glue) {
        currentX += horizontalItem.getWidth()
        return
      }
      if (horizontalItem instanceof TextBox) {
        this.ctx.font = `${horizontalItem.getFontSize()}px ${horizontalItem.getFontFamily()}`
        this.ctx.fillText(horizontalItem.getText(), currentX, shiftY + lineHeight)
        currentX += horizontalItem.getWidth()
        return
      }
      if (horizontalItem instanceof Box) {
        currentX += horizontalItem.getWidth()
      }
    })
    return true
  }

  renderVerticalList (list, shiftX = 0, shiftY = 0) {
    let currentY = shiftY
    list.getList().forEach( (item) => {
      if (item instanceof Glue) {
        currentY += item.getHeight()
        return
      }
      if (item instanceof ItemList) {
        // a line
        let lineHeight = item.getHeight()
        this.renderHorizontalList(item, shiftX, currentY)
        currentY += lineHeight
      }
    })
    return true
  }

}