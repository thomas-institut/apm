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

export const INFINITE_PENALTY = 1000
export const MINUS_INFINITE_PENALTY = -1000

/**
 * A penalty value that helps typesetters decide whether the
 * item's position in a list is a desirable or undesirable place
 * to insert a break.
 *
 * An INFINITE penalty means that the typesetter should never
 * break the list at this point, whereas a MINUS_INFINITE value
 * means that the typesetter must insert a break.
 */
export class Penalty extends TypesetterItem {

  constructor () {
    super()
    /**
     * The penalty value, a number between MINUS_INFINITE and INFINITE.
     * Should never be accessed directly.
     * @type {number}
     */
    this.penalty = 0
    /**
     * A boolean flag. Typesetters should try not to insert break at
     * two consecutive flagged penalties.
     * @type {boolean}
     */
    this.flagged = false

    /**
     * TODO: explain the meaning of width and height for Penalty items
     */
    this.width = 0
    this.height = 0

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
    if (penalty > INFINITE_PENALTY) {
      penalty = INFINITE_PENALTY
    }
    if (penalty < MINUS_INFINITE_PENALTY) {
      penalty = MINUS_INFINITE_PENALTY
    }
    this.penalty = penalty
    return this
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'Penalty'
    obj.penalty = this.penalty
    obj.flagged = this.flagged
    return obj
  }

  setFromObject (object, mergeValues)  {
    super.setFromObject(object, mergeValues)
    // repeating width and height in the template so that they default to 0, not to -1 as in TypesetterItem
    const template = {  width: 0, height: 0, penalty: 0, flagged: false}
    this._copyValues(template, object, mergeValues)
    return this
  }

  // Factory Methods
  static createForcedBreakPenalty() {
    return (new Penalty()).setPenalty(MINUS_INFINITE_PENALTY)
  }

}