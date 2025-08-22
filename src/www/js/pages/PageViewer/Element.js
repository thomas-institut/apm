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
export const ELEMENT_INVALID = -1
export const ELEMENT_LINE = 1
export const ELEMENT_HEAD = 2
export const ELEMENT_GLOSS = 3
export const ELEMENT_PAGE_NUMBER = 4
export const ELEMENT_CUSTODES = 5
export const ELEMENT_NOTE_MARK = 6
export const ELEMENT_SUBSTITUTION = 7
export const ELEMENT_LINE_GAP = 8
export const ELEMENT_ADDITION = 9


export class Element extends FloatingElement {
  static getValidMarginalPlacements () {
    return [
      'margin left',
      'margin right',
      'margin top',
      'margin bottom'
    ]
  }
}