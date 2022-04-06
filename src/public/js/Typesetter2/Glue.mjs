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


import { TypesetterItem } from './TypesetterItem.mjs'
import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'

export class Glue extends TypesetterItem {

  constructor (direction = TypesetterItemDirection.HORIZONTAL) {
    super(direction)
    this.stretch = 0
    this.shrink = 0
    this.width = 0
    this.height = 0
  }



  getStretch() {
    return this.stretch
  }

  setStretch(stretch) {
    this.stretch = stretch
    return this
  }

  getShrink() {
    return this.shrink
  }

  setShrink(shrink) {
    this.shrink = shrink
    return this
  }


}