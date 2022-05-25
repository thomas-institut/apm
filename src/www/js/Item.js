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

const ITEM_TEXT = 1
const ITEM_RUBRIC = 2
const ITEM_SIC = 3
const ITEM_UNCLEAR = 4
const ITEM_ILLEGIBLE = 5
const ITEM_GLIPH = 6
const ITEM_ADDITION = 7
const ITEM_DELETION = 8
const ITEM_MARK = 9
const ITEM_NO_WORD_BREAK = 10
const ITEM_ABBREVIATION = 11
const ITEM_LINE_BREAK = 12
const ITEM_INITIAL = 13
const ITEM_CHUNK_MARK = 14
const ITEM_CHARACTER_GAP = 15
const ITEM_PARAGRAPH_MARK = 16
const ITEM_MATH_TEXT = 17
const ITEM_MARGINAL_MARK = 18
const ITEM_BOLD = 19
const ITEM_ITALIC = 20
const ITEM_HEADING = 21
const ITEM_CHAPTER_MARK = 22
const ITEM_UNSUPPORTED = 9999

class Item {

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