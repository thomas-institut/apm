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


import * as Util from '../../toolbox/Util.ts'
import { TokenNormalizer } from '../../Normalizer/TokenNormalizer'

export class RemoveHamzahMaddahFromAlifWawYahNormalizer extends TokenNormalizer {

  constructor () {
    super()
    this.complexAlifs = [
      String.fromCodePoint(0x622), // Alif with maddah above
      String.fromCodePoint(0x623), // Alif with hamzah above
      String.fromCodePoint(0x625) // Alif with hamzah below
    ];

    this.simpleAlif = String.fromCodePoint(0x627);

    this.complexWaws = [
      String.fromCodePoint(0x624) // waw with hamza above
    ];

    this.simpleWaw = String.fromCodePoint(0x648);

    this.complexYahs = [
      String.fromCodePoint(0x626) // yah with hamza above
    ];

    this.simpleYah = String.fromCodePoint(0x64A);
  }

  /**
   *
   * @returns string
   * @param  str string
   */
  normalizeString(str) {
    let withoutAlifs = Util.stringReplaceArray( str, this.complexAlifs, this.simpleAlif)
    let withoutWaws = Util.stringReplaceArray(withoutAlifs, this.complexWaws, this.simpleWaw)
    return Util.stringReplaceArray(withoutWaws,  this.complexYahs, this.simpleYah)

  }

}