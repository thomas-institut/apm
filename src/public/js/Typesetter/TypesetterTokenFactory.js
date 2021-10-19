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

import * as TypesetterTokenType from './TypesetterTokenType'
import { TypesetterToken } from './TypesetterToken'

/**
 *
 * @param {string}theText
 * @param {string}lang
 * @returns {TypesetterToken}
 */
export function simpleText(theText, lang = '') {
  return (new TypesetterToken()).setText(theText, lang)
}

/**
 *
 * @returns {TypesetterToken}
 */
export function normalSpace() {
  return new TypesetterToken(TypesetterTokenType.GLUE)
}
