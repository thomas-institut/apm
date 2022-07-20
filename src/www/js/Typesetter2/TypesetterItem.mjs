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

import * as TypesetterItemDirection from './TypesetterItemDirection.mjs'
import { TypesetterObject } from './TypesetterObject.mjs'

/**
 * The base class for all typesetter items.
 *
 * All typesetting work can be done with 3 types of typesetter items:
 *   Box, Glue and Penalty.
 *
 * Of these, Box is the one that could have different types of descendents,
 * the most common one being TextBox
 *
 */
export class TypesetterItem extends TypesetterObject {

  constructor (direction = TypesetterItemDirection.UNDEFINED) {
    super()
    if (this.constructor === TypesetterItem) {
      throw new Error("Abstract classes cannot be instantiated")
    }

    /**
     * The item's direction: horizontal, vertical or undefined
     * @type {number}
     */
    this.direction = direction

    /**
     * The width of the item in pixels.
     *
     * Not necessarily the actual width of the rendered item, but rather the
     * distance that a renderer would advance horizontally after the item is rendered.
     *
     * A value of -1 means that the width is not set.  Typesetter classes should decide
     * what to do with undefined widths,  but normally some sort of measurement process will be
     * called
     * @type {number}
     */
    this.width = -1  // not set

    /**
     * The height of the item in pixels.
     *
     * Not necessarily the actual height of the rendered item, but rather the
     * distance that a renderer would advance in the vertical direction after the
     * item is rendered. For text boxes this distance is actually the
     * distance from the current vertical position to the text's baseline.
     * Individual glyphs may go under the baseline or above the current
     * vertical position.
     *
     * A value of -1 means that the height is not set.
     *
     * Typesetter classes should decide what to do with undefined heights,
     * but normally some sort of measurement process will be called
     *
     * @type {number}
     */
    this.height = -1 // not set

    /**
     * The number of pixels the item should be shifted horizontally with respect
     * to its normal position.
     *
     * This number is independent of the item's width.
     *
     * @type {number}
     */
    this.shiftX = 0

    /**
     * The number of pixels the item should be shifted vertically with respect
     * to its normal position.
     *
     * This number is independent of the item's height.
     *
     * @type {number}
     */
    this.shiftY = 0

  }

  /**
   *
   * @return {number}
   */
  getDirection() {
    return this.direction
  }

  /**
   *
   * @return {number}
   */
  getWidth() {
    return this.width
  }

  /**
   *
   * @param width
   */
  setWidth(width) {
    this.width = width
    return this
  }

  /**
   *
   * @return {number}
   */
  getHeight() {
    return this.height
  }

  /**
   *
   * @param height
   */
  setHeight(height) {
    this.height = height
    return this
  }

  /**
   *
   * @return {number}
   */
  getShiftX() {
    return this.shiftX
  }

  /**
   *
   * @param {number} x
   */
  setShiftX(x) {
    this.shiftX = x
    return this
  }

  /**
   *
   * @return {number}
   */
  getShiftY() {
    return this.shiftY
  }

  /**
   *
   * @param {number}y
   */
  setShiftY(y) {
    this.shiftY = y
    return this
  }

  getExportObject () {
    let obj =  super.getExportObject()
    obj.class = 'TypesetterItem'
    if (this.width !== -1) {
      obj.width = this.width
    }
    if (this.height !== -1) {
      obj.height = this.height
    }
    if (this.shiftX !== 0) {
      obj.shiftX = this.shiftX
    }
    if (this.shiftY !== 0){
      obj.shiftY = this.shiftY
    }
    if (this.direction !== TypesetterItemDirection.UNDEFINED) {
      obj.direction = this.direction
    }
    return obj
  }

  setFromObject (object, mergeValues) {
    super.setFromObject(object, mergeValues)
    const template = {  width: -1, height: -1, shiftX: 0, shiftY: 0, direction: TypesetterItemDirection.UNDEFINED}
    this._copyValues(template, object, mergeValues)
    return this
  }
}