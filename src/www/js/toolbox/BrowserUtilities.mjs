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


const maxCanvasDimension = 32000
const maxCanvasArea  = 16000 * 16000


export class BrowserUtilities {

  static setCanvasHiPDI(canvasElement, width, height) {
    let ratio = window.devicePixelRatio
    // let ratio = 1
    console.log(`Setting canvas to ${width} x ${height} pixels, pixel ratio = ${ratio}`)

    let canvasWidth
    let canvasHeight
    [canvasWidth, canvasHeight] = getSafeCanvasDimensions(width, height, ratio, true)
    if (canvasWidth === maxCanvasDimension || canvasHeight === maxCanvasDimension) {
      console.warn(`Oversized canvas cropped to ${canvasWidth} x ${canvasHeight} pixels`)
    }
    canvasElement.width = canvasWidth
    canvasElement.height = canvasHeight

    canvasElement.style.width = canvasWidth + "px"
    canvasElement.style.height = canvasHeight + "px"
    let context = canvasElement.getContext("2d")
    try {
      context.scale(ratio, ratio);
    } catch (e) {
      throw Error(`Could not scale canvas, device pixel ratio = ${ratio}, dimensions ${width}x${height}`)
    }
    return canvasElement;
  }
}

function getDimension(dimension, ratio, max) {
  return dimension * ratio > max ? max : dimension * ratio
}

function getSafeCanvasDimensions(width, height, ratio, cropHeight = true) {
  let canvasWidth = getDimension(width, ratio, maxCanvasDimension)
  let canvasHeight = getDimension(height, ratio, maxCanvasDimension)
  let canvasArea = canvasHeight * canvasWidth
  if (canvasArea > maxCanvasArea) {
    // need to crop one dimension
    if (cropHeight) {
      canvasHeight = Math.floor(maxCanvasArea / canvasWidth)
    } else {
      canvasWidth = Math.floor(maxCanvasArea / canvasHeight)
    }
  }
  return [ canvasWidth, canvasHeight]
}