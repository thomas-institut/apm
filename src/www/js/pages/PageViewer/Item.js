/* 
 *  Copyright (C) 2019 Universität zu Köln
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

/* eslint "no-unused-vars": "off" */

export const ITEM_TEXT = 1
export const ITEM_RUBRIC = 2
export const ITEM_SIC = 3
export const ITEM_UNCLEAR = 4
export const ITEM_ILLEGIBLE = 5
export const ITEM_GLIPH = 6
export const ITEM_ADDITION = 7
export const ITEM_DELETION = 8
export const ITEM_MARK = 9
export const ITEM_NO_WORD_BREAK = 10
export const ITEM_ABBREVIATION = 11
export const ITEM_LINE_BREAK = 12
export const ITEM_INITIAL = 13
export const ITEM_CHUNK_MARK = 14
export const ITEM_CHARACTER_GAP = 15
export const ITEM_PARAGRAPH_MARK = 16
export const ITEM_MATH_TEXT = 17
export const ITEM_MARGINAL_MARK = 18
export const ITEM_BOLD = 19
export const ITEM_ITALIC = 20
export const ITEM_HEADING = 21
export const ITEM_CHAPTER_MARK = 22
export const ITEM_UNSUPPORTED = 9999

export class Item {

  static getValidDeletionTechniques () {
    return [
      'dot-above',
      'dot-above-dot-under',
      'dots-above',
      'dots-underneath',
      'strikeout', 
      'line-above',
      'no-sign',
      'vacat'
    ]
  }

  static getValidAdditionPlaces () {
    return [
        'above',
        'below',
        'inline',
        'inspace',
        'overflow', 
        'margin left',
        'margin right', 
        'margin top', 
        'margin bottom'
      ]
  }

  static getValidUnclearReasons () {
    return [
        'unclear',
        'damaged'
      ]
  }

  static getValidIllegibleReasons () {
    return [
        'damaged',
        'illegible'
      ]
  }
}
