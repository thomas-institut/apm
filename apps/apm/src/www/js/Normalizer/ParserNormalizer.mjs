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
 * A normalizer meant to be used when parsing a text into witness tokens.
 * The normalizeString method must return an array of WitnessToken
 * If the normalizer is not applicable to the given string,
 * it must return an empty array.
 */
export class ParserNormalizer {

  /**
   * Generates an array of WitnessToken for a given string
   * or an empty array if the string cannot or should not be
   * normalized according to the normalizer's use cases.
   * @param {string}str
   * @param {string}lang
   * @return {WitnessToken[]}
   */
  normalizeString(str, lang) {
    return []
  }

  /**
   * Returns true if the normalizer is applicable to
   * the given string
   * @param {string}str
   * @param {string}lang
   * @return {boolean}
   */
  isApplicable(str, lang) {
    return false
  }

}