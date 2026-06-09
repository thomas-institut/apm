/*
 *  Copyright (C) 2023 Universität zu Köln
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

// noinspection ES6PreferShortImport

import {WitnessDataItemInterface} from "../CtData/CtDataInterface.js";

export class WitnessDataItem implements WitnessDataItemInterface {

  witnessIndex: number = -1;
  hand: number = -1;
  location: string = '';
  forceHandDisplay: boolean = false;
  siglum: string = '';
  omitSiglum: boolean = false;
  /**
   * If true, the data is used when there's a foliation change from
   * a non-empty foliation to a another one. For example, from '20r' to '20v'.
   * When a foliation changes from '' to other value, there's no actual foliation,
   * it's simply the first time there's a foliation value for that witness.
   */
  realFoliationChange?: boolean;

  static clone(dataItem: WitnessDataItemInterface) {
    return new WitnessDataItem().setFromInterface(dataItem);
  }

  setFromInterface(dataItem: WitnessDataItemInterface): this {
    this.witnessIndex = dataItem.witnessIndex;
    this.hand = dataItem.hand;
    this.location = dataItem.location;
    this.forceHandDisplay = dataItem.forceHandDisplay;
    if (dataItem.siglum !== undefined) {
      this.siglum = dataItem.siglum;
    }
    if (dataItem.omitSiglum !== undefined) {
      this.omitSiglum = dataItem.omitSiglum;
    }
    if (dataItem.realFoliationChange !== undefined) {
      this.realFoliationChange = dataItem.realFoliationChange;
    }
    return this;
  }

  setWitnessIndex(witnessIndex: number): this {
    this.witnessIndex = witnessIndex;
    return this;
  }

  setHand(hand: number): this {
    this.hand = hand;
    return this;
  }

}