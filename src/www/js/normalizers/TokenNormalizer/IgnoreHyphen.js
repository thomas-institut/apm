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

import { TokenNormalizer } from '../../Normalizer/TokenNormalizer'

export class IgnoreHyphen extends TokenNormalizer {

  /**
   *
   * @returns string
   * @param  str string
   */
  normalizeString(str) {
    return str.replace('\u002d', '')
  }

}