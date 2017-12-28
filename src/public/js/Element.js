/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/* eslint "no-unused-vars": "off" */
const ELEMENT_INVALID = -1
const ELEMENT_LINE = 1
const ELEMENT_HEAD = 2
const ELEMENT_GLOSS = 3
const ELEMENT_PAGE_NUMBER = 4
const ELEMENT_CUSTODES = 5
const ELEMENT_NOTE_MARK = 6
const ELEMENT_ADDITION = 7
const ELEMENT_LINE_GAP = 8


class Element {
  static getValidMarginalPlacements () {
    return [
      'margin left',
      'margin right',
      'margin top',
      'margin bottom'
    ]
  }
}