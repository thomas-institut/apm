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


export class WitnessDataItem  {

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


  static clone(dataItem: WitnessDataItem) {
    let copy = new WitnessDataItem()
    copy.witnessIndex = dataItem.witnessIndex
    copy.hand = dataItem.hand
    copy.location = dataItem.location
    copy.forceHandDisplay = dataItem.forceHandDisplay
    if (dataItem.siglum !== undefined) {
      copy.siglum = dataItem.siglum
    }
    if (dataItem.omitSiglum !== undefined) {
      copy.omitSiglum = dataItem.omitSiglum
    }
    if (dataItem.realFoliationChange !== undefined) {
      copy.realFoliationChange = dataItem.realFoliationChange
    }
    return copy
  }

  setWitnessIndex(witnessIndex: number): this {
    this.witnessIndex = witnessIndex
    return this
  }

  setHand(hand: number): this {
    this.hand = hand
    return this
  }

}