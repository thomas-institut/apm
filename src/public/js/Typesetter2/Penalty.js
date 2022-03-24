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


import { TypesetterItem } from './TypesetterItem'

export const INFINITE = 1000
export const MINUS_INFINITE = -1000

export class Penalty extends TypesetterItem {

  constructor () {
    super()
    this.penalty = 0
    this.width = 0
    this.height = 0
    this.flagged = false
  }

  isFlagged() {
    return this.flagged
  }

  /**
   *
   * @param {boolean}flagged
   * @return {Penalty}
   */
  setFlagged(flagged) {
    this.flagged = flagged
    return this
  }

  getPenalty() {
    return this.penalty
  }

  /**
   *
   * @param {number}penalty
   * @return {Penalty}
   */
  setPenalty(penalty) {
    if (penalty > INFINITE) {
      penalty = INFINITE
    }
    if (penalty < MINUS_INFINITE) {
      penalty = MINUS_INFINITE
    }
    this.penalty = penalty
    return this
  }


}