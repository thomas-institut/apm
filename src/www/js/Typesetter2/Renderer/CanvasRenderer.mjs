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

  constructor (canvasElement, textDirection = '') {
    super()
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d')
    this.scale = 1
    this.pageMargin = 20
    if (textDirection !== '') {
      // console.log(`Setting canvas text direction to '${textDirection}'`)
      //this.ctx.direction = textDirection
    }
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
    let debug = false
    let text = textBoxItem.getText()
    // hack to work around Firefox's bug with single RTL brackets
    let brackets = [ '[', ']', '(', ')', '{', '}', '«', '»']
    if (brackets.indexOf(text) !== -1  && textBoxItem.getTextDirection() === 'rtl') {
      // insert a RTL marker before the text to force correct display
      text = String.fromCodePoint(0x202B) + text
    }
    let [shiftX, shiftY] = this.getDeviceCoordinates(textBoxItem.getShiftX(), textBoxItem.getShiftY())
    let [,textBoxHeight] = this.getDeviceCoordinates(0, textBoxItem.getHeight())
    let [, fontSize] = this.getDeviceCoordinates(0, textBoxItem.getFontSize())
    let fontWeight = textBoxItem.getFontWeight() === '' ? 'normal' : textBoxItem.getFontWeight()
    let fontStyle = textBoxItem.getFontStyle() === '' ? 'normal' : textBoxItem.getFontStyle()
    let fontVariant = 'normal'
    let currentCanvasDirection = this.ctx.direction
    if (textBoxItem.getTextDirection() !== '') {
      this.ctx.direction = textBoxItem.getTextDirection()
      // debug && console.log(`Setting canvas direction to ${this.ctx.direction}, default is ${currentCanvasDirection}`)
      // debug && console.log(textBoxItem)
    }

    this.ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${textBoxItem.getFontFamily()} `
    this.ctx.fillStyle = '#000000'
    this.ctx.fillText(text, x + shiftX,
      y +shiftY + textBoxHeight)
    this.ctx.direction = currentCanvasDirection
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