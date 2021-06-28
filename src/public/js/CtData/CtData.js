/*
 *  Copyright (C) 2021 Universität zu Köln
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

import * as WitnessTokenType from '../constants/WitnessTokenType'


/**
 * A collection of static methods to manipulate the CtData (= Collation Table Data)  structure
 */
export class CtData  {

  /**
   * Returns an array with the given witness tokens as they are laid out
   * in the collation table, replacing empty references with empty tokens
   *
   * @param ctData
   * @param witnessIndex number
   */
  static getCtWitnessTokens(ctData, witnessIndex) {
    return ctData['collationMatrix'][witnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : WitnessTokenType.EMPTY } : ctData['witnesses'][witnessIndex]['tokens'][tokenRef])
  }

}