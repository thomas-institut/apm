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