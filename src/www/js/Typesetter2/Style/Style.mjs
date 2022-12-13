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
 * A collection of styles
 *
 * A style is, in essence, a set of parameters that can be applied to different
 * typesetting structures: paragraphs, text boxes, glue.
 *
 * Styles can have parent, from which they inherit all parameters not set
 * explicitly by the style.
 *
 *
 */

export class Style {

  /**
   *
   * @param {string}name
   * @param {string}parent
   */
  constructor (name, parent= '') {
    if (name === '') {
      throw Error(`A style name must be a non-empty string`)
    }
    this.name = name
    this.parent = parent
    this.textBox = {}
    this.paragraph = {}
    this.glue = {}
  }

}