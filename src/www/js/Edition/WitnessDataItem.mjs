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



export class WitnessDataItem {

  constructor () {
    this.witnessIndex = -1
    this.hand = -1
    this.location = ''
    this.forceHandDisplay = false
  }

  /**
   *
   * @param {WitnessDataItem}dataItem
   * @return {WitnessDataItem}
   */
  static clone(dataItem) {
    let copy = new WitnessDataItem()
    copy.witnessIndex = dataItem.witnessIndex
    copy.hand = dataItem.hand
    copy.location = dataItem.location
    copy.forceHandDisplay = dataItem.forceHandDisplay
    return copy
  }

  setWitnessIndex(witnessIndex) {
    this.witnessIndex = witnessIndex
    return this
  }

  setHand(hand) {
    this.hand = hand
    return this
  }

}