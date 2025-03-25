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

/**
 * Baseline information for specific fonts
 */

/**
 * Multiplier is the ratio of the font size to the position of the baseline
 * from the top of the font.
 * @type {[{family: string, multiplier: number},{family: string, multiplier: number},{family: string, multiplier: number}]}
 */
// const fontData = [
//   { family: 'FreeSerif', multiplier: 0.9},
//   { family: 'Arial', multiplier: 0.9052736842105263},
//   { family: 'Linux Libertine', multiplier: 0.8940447368421053}
// ]

const fontData = [
  { family: 'FreeSerif', multiplier: 0.8},
  { family: 'Arial', multiplier: 0.776},
  { family: 'Linux Libertine', multiplier: 0.785},
  { family: 'Amiri', multiplier: 0.643},
  { family: 'Scheherazade New', multiplier: 0.659},
  { family: 'ScheherazadeNew', multiplier: 0.659},
]


export class FontBaselineInfo {

  static getBaseline(fontFamily, fontSize) {
    let index = fontData.map( fd => fd.family).indexOf(fontFamily)
    if (index === -1) {
      return fontSize
    }
    return fontSize * fontData[index].multiplier
  }
}