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
const fontData = [
  { family: 'FreeSerif', multiplier: 0.9},
  { family: 'Arial', multiplier: 0.9},
  { family: 'Linux Libertine', multiplier: 0.8940625},
  { family: 'Amiri', multiplier: 1.124},
  { family: 'Scheherazade New', multiplier: 1.3428125},
  { family: 'ScheherazadeNew', multiplier: 1.3428125},
  { family: 'Noto Naskh Arabic', multiplier: 1.069},
  { family: 'Adobe Arabic', multiplier: 0.74709375},
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