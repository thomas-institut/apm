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


interface FontData {
  family: string,
  multiplier: number,
}

/**
 * Multiplier is the ratio of the font size to the position of the baseline
 * from the top of the font.
 *
 * This can be calculated using the OS/2 metric values for the font, which
 * can be found using, for example, FontForge. The multiplier is the ratio
 * between the ascent and the em-size (normally 1000 or 2048)
 *
 */
const fontData :FontData[] = [
  { family: 'FreeSerif', multiplier: 0.9},
  { family: 'Arial', multiplier: 0.9},
  { family: 'Linux Libertine', multiplier: 1831/2048},
  { family: 'Amiri', multiplier: 1.124},
  { family: 'Scheherazade New', multiplier: 2750/2048},
  { family: 'Noto Naskh Arabic', multiplier: 2189/2048},
  { family: 'Adobe Arabic', multiplier: 1530/2048},
]



export class FontBaselineInfo {

  static getBaseline(fontFamily: string, fontSize: number) {
    let index = fontData.map( fd => fd.family).indexOf(fontFamily)
    if (index === -1) {
      return fontSize
    }
    return fontSize * fontData[index].multiplier
  }
}