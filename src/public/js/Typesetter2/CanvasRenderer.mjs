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

export class CanvasRenderer extends TypesetterRenderer {

  constructor (canvasElement) {
    super()
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d')
    this.scale = 1
    this.pageMargin = 20
  }

  setScale(scale) {
    this.scale = scale
    return this
  }

  setPageMargin(pageMargin) {
    this.pageMargin = Math.round(pageMargin)
    return this
  }

  /**
   *
   * @param {TypesetterDocument}doc
   */
  getCanvasDimensionsForDoc(doc) {
    let maxPageWidth = 0
    let canvasHeight = this.pageMargin
    doc.getPages().forEach( (page) => {
      let [pageWidth, pageHeight] = this.getDeviceCoordinates(page.getWidth(), page.getHeight())
      maxPageWidth = Math.max(maxPageWidth, pageWidth)
      canvasHeight += pageHeight + this.pageMargin
    })
    return [ Math.round(maxPageWidth + 2 *this.pageMargin), Math.round(canvasHeight)]
  }



  renderTextBox (textBoxItem, x, y) {
    let [shiftX, shiftY] = this.getDeviceCoordinates(textBoxItem.getShiftX(), textBoxItem.getShiftY())
    let [,textBoxHeight] = this.getDeviceCoordinates(0, textBoxItem.getHeight())
    let [, fontSize] = this.getDeviceCoordinates(0, textBoxItem.getFontSize())
    this.ctx.font = `${fontSize}px ${textBoxItem.getFontFamily()}`
    this.ctx.fillStyle = '#000000'
    this.ctx.fillText(textBoxItem.getText(), x + shiftX,
      y +shiftY + textBoxHeight)
  }

  getDeviceCoordinates (x, y) {
    return [ x*this.scale, y*this.scale]
  }

  _preRenderDocument (doc) {
    this.pagePositions = []
    // build the canvas positions for all pages
    let currentY = this.pageMargin
    doc.getPages().forEach( (page) =>  {
      this.pagePositions.push( [this.pageMargin,currentY])
      let [, pageHeight] = this.getDeviceCoordinates(page.getWidth(), page.getHeight())
      currentY += pageHeight + this.pageMargin
    })
  }

  _preRenderPage (page, pageIndex) {
    let [pageWidth, pageHeight] = this.getDeviceCoordinates(page.getWidth(), page.getHeight())
    this.ctx.fillStyle = "#FFFFFF"
    this.ctx.fillRect(this.pagePositions[pageIndex][0], this.pagePositions[pageIndex][1], pageWidth, pageHeight)
  }

  getShiftForPageIndex (pageIndex) {
    return this.pagePositions[pageIndex]
  }

}