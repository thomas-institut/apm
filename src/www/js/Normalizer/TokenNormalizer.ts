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
/**
 * A normalizer that is meant to be used for a single token
 * The method normalizeString should normally return a single word
 * When a normalizations may result in more than one word or token, each one of them
 * meant to be in its own column in collation table, a ParserNormalizer should
 * be used instead
 */
export class TokenNormalizer {

  normalizeString(str: string): string {
    return str
  }

}