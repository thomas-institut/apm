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


import { TypesetterItem } from './TypesetterItem.js'
import * as TypesetterItemDirection from './TypesetterItemDirection.js'

/**
 * A rectangular area of a certain width and height.
 *
 * Descendants of this class represent different graphical elements that
 * can be rendered on a graphical surface, for example, text boxes,
 * boxes filled with a certain colour or pattern, images, etc.
 */
export class Box extends TypesetterItem {

  constructor (direction = TypesetterItemDirection.HORIZONTAL) {
    super(direction)
    this.width = 0
    this.height = 0
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'Box'
    return obj
  }

}