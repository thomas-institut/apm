import { TypesetterRenderer } from './TypesetterRenderer.mjs'
import { Glue } from './Glue.mjs'
import { TextBox } from './TextBox.mjs'
import { Box } from './Box.mjs'
import { ItemList } from './ItemList.mjs'

export class CanvasRenderer extends TypesetterRenderer {

  constructor (canvasElement) {
    super()
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d')
  }

  renderHorizontalList (list, shiftX = 0, shiftY = 0) {
    let currentX = list.getShiftX() + shiftX
    let lineHeight = list.getHeight()
    //console.log(`Rendering line, currentY = ${shiftY}, lineHeight = ${lineHeight}, lineWidth = ${list.getWidth()}`)
    list.getList().forEach( (horizontalItem) => {
      if (horizontalItem instanceof Glue) {
        currentX += horizontalItem.getWidth()
        return
      }
      if (horizontalItem instanceof TextBox) {
        this.ctx.font = `${horizontalItem.getFontSize()}px ${horizontalItem.getFontFamily()}`
        this.ctx.fillText(horizontalItem.getText(), currentX + horizontalItem.getShiftX(),
          shiftY + list.getShiftY() + horizontalItem.getShiftY() + lineHeight)
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
    //console.log(`Rendering vertical list, ${shiftX}, ${shiftY}`)
    let currentY = list.getShiftY() + shiftY
    list.getList().forEach( (item) => {
      if (item instanceof Glue) {
        currentY += item.getHeight()
        return
      }
      if (item instanceof ItemList) {
        // a line
        let lineHeight = item.getHeight()
        this.renderHorizontalList(item, list.getShiftX() + shiftX, currentY)
        currentY += lineHeight
      }
    })
    return true
  }

}