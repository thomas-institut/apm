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
 * Baseline height information for specific fonts
 */

const fontData = [
  { family: 'FreeSerif', multiplier: 1.1},
  { family: 'Arial', multiplier: 1.1172},
  { family: 'Linux Libertine', multiplier: 1.14}
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