/*
 *  Copyright (C) 2021 Universität zu Köln
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

import * as MainTextSectionType from './MainTextSectionType'
import * as SectionBreakType from './SectionBreakType'

export class MainTextSection {

  constructor () {
    /** @member {string} */
    this.id = ''

    /** @member {string} */
    this.style = ''

    /** @member {string} */
    this.type = MainTextSectionType.NORMAL

    /** @member {MainTextSection[]} */
    this.subSections = []

    /** @member {MainTextToken[]} */
    this.text = []

    this.breakBefore = SectionBreakType.NONE
    this.spaceBefore = 0
    this.breakAfter = SectionBreakType.NONE
    this.spaceAfter = 0
  }



  // TODO: space or glue before/after?  How about vertical space before/after?

}