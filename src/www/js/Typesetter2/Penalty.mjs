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
import { ObjectFactory } from './ObjectFactory.mjs'

export const INFINITE_PENALTY = 1000
export const BAD_POINT_FOR_A_BREAK = 200
export const REALLY_BAD_POINT_FOR_A_BREAK = 800

export const MINUS_INFINITE_PENALTY = -1000

export const GOOD_POINT_FOR_A_BREAK = -20
export const REALLY_GOOD_POINT_FOR_A_BREAK = -800
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
     * Item to insert if a break is inserted at this penalty
     * e.g., a hyphen
     * TODO: allow any box or list of boxes as an item to insert
     * @type {TextBox|null}
     */
    this.itemToInsert = null

    /**
     * Width and height are meaningless for penalties
     */
    this.width = 0
    this.height = 0
  }

  isFlagged() {
    return this.flagged
  }

  /**
   *
   * @param {boolean}flag
   * @return {Penalty}
   */
  setFlag(flag) {
    this.flagged = flag
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

  hasItemToInsert() {
    return this.itemToInsert !== null
  }

  getItemToInsert() {
    return this.itemToInsert
  }

  /**
   *
   * @param {TextBox}item
   */
  setItemToInsert(item) {
    this.itemToInsert = item
    return this
  }

  getItemToInsertWidth() {
    if (!this.hasItemToInsert()) {
      return 0
    }
    return this.itemToInsert.getWidth()
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'Penalty'
    // including non-zero widths and heights
    // just in case a hypothetical descendant
    // of Penalty want to use them for anything
    if (this.width !== 0) {
      obj.width = this.width
    } else {
      // super.getExportObject() may have set it,
      // but it's not needed
      delete obj.width
    }
    if (this.height !== 0) {
      obj.height = this.height
    } else {
      // super.getExportObject() may have set it,
      // but it's not needed
      delete obj.height
    }
    if (this.penalty !== 0) {
      obj.penalty = this.penalty
    }
    if (this.flagged) {
      obj.flagged = this.flagged
    }
    if (this.hasItemToInsert()) {
      obj.itemToInsert =this.itemToInsert.getExportObject()
    }
    return obj
  }

  setFromObject (object, mergeValues)  {
    super.setFromObject(object, mergeValues)
    // repeating width and height in the template so that they default to 0, not to -1 as in TypesetterItem
    const template = {  width: 0, height: 0, penalty: 0, flagged: false}
    this._copyValues(template, object, mergeValues)
    if (object.itemToInsert === undefined || object.itemToInsert === null) {
      this.itemToInsert = null
    } else {
      this.itemToInsert = ObjectFactory.fromObject(object.itemToInsert)
    }
    return this
  }

  // Factory Methods
  static createForcedBreakPenalty() {
    return (new Penalty()).setPenalty(MINUS_INFINITE_PENALTY)
  }

}