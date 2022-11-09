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

export class BrowserUtilities {

  static setCanvasHiPDI(canvasElement, width, height) {
    let ratio = window.devicePixelRatio;
    canvasElement.width = width * ratio;
    canvasElement.height = height * ratio;
    canvasElement.style.width = width + "px";
    canvasElement.style.height = height + "px";
    let context = canvasElement.getContext("2d")
    try {
      context.scale(ratio, ratio);
    } catch (e) {
      throw Error(`Could not scale canvas, device pixel ratio = ${ratio}, dimensions ${width}x${height}`)
    }
    return canvasElement;
  }

}