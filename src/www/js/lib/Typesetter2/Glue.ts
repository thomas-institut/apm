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


import {TypesetterItem} from './TypesetterItem.js';
import * as TypesetterItemDirection from './TypesetterItemDirection.js';
import * as MetadataKey from './MetadataKey.js';
import * as GlueType from './GlueType.js';

export const INFINITE_STRETCH = 100000;

/**
 * A Glue item with certain width and height that can
 * shrink or stretch by a certain amount in the item's direction.
 *
 *
 * Since Glue items can actually stretch more than their given stretch value,  Glue items
 * with both stretch and shrink equal to zero are not necessarily equivalent to an empty space
 * of the item's given width and height.
 * When such a space is needed, a Box should be used.
 */
export class Glue extends TypesetterItem {
  /**
   * The number of pixels the item can stretch in the item's direction.
   *
   * Glue items will normally be allowed to stretch more than this number, but
   * with some sort of "aesthetic" penalty associated with it.
   *
   */
  stretch: number;
  /**
   * The number of pixels the item can shrink in the item's direction.
   *
   * Glue items will NOT be allowed to shrink more than this number.
   * Typesetters will rather have an overflown line or page than a
   * cramped one.
   */
  shrink: number;

  constructor(direction = TypesetterItemDirection.HORIZONTAL) {
    super(direction);
    this.stretch = 0;
    this.shrink = 0;

    // Glue items start with 0 width and height!
    this.width = 0;
    this.height = 0;
  }

  static createLineFillerGlue() {
    return (new Glue()).setWidth(0).setStretch(INFINITE_STRETCH).addMetadata(MetadataKey.GLUE_TYPE, GlueType.LINE_FILLER);
  }

  getStretch() {
    return this.stretch;
  }

  setStretch(stretch: number): this {
    this.stretch = stretch;
    return this;
  }

  getShrink(): number {
    return this.shrink;
  }

  setShrink(shrink: number): this {
    this.shrink = shrink;
    return this;
  }

  getExportObject() {
    let obj = super.getExportObject();
    obj.class = 'Glue';
    obj.stretch = this.stretch;
    obj.shrink = this.shrink;
    return obj;
  }


  // Factory methods

  setFromObject(object: any, mergeValues: boolean) {
    super.setFromObject(object, mergeValues);
    // repeating width and height in the template so that they default to 0, not to -1 as in TypesetterItem
    const template = {width: 0, height: 0, stretch: 0, shrink: 0};
    this.copyValues(template, object, mergeValues);
    return this;
  }

}