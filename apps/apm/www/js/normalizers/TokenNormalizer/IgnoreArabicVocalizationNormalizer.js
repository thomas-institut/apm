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

export class IgnoreArabicVocalizationNormalizer extends TokenNormalizer {
  
  constructor () {
    super()
    this.arabicVowelDiacritics = [
      String.fromCodePoint(0x64B),
      String.fromCodePoint(0x64C),
      String.fromCodePoint(0x64D),
      String.fromCodePoint(0x64E),
      String.fromCodePoint(0x64F),
      String.fromCodePoint(0x650),
      String.fromCodePoint(0x652)
    ];
  }

  /**
   *
   * @returns string
   * @param  str string
   */
  normalizeString(str) {
    return Util.stringReplaceArray(str, this.arabicVowelDiacritics, '')
  }

}