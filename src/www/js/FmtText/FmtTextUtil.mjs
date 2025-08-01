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

import * as FmtTextTokenType from './FmtTextTokenType.mjs'
import {FmtTextTokenFactory} from './FmtTextTokenFactory.mjs'



export class FmtTextUtil {

  /**
   *
   * @param {FmtText}fmtText
   * @return {FmtTextToken[]}
   */
  static getCanonical(fmtText) {
    if (typeof fmtText === 'string') {
      return [FmtTextTokenFactory.normalText(fmtText)];
    }
    if (!Array.isArray(fmtText)) {
      return [ fmtText ];
    }
    return fmtText;
  }
  /**
   *
   * @param {FmtText} fmtText
   * @return {string}
   */
  static getPlainText(fmtText) {
     return this.getCanonical(fmtText).map( (token) => { return this.tokenGetPlainText(token)}).join('')
  }

  /**
   *
   * @param {FmtText}fmtText1
   * @param {FmtText}fmtText2
   * @return {FmtText}
   */
  static concat(fmtText1, fmtText2) {
    // let realFmt1 = FmtTextFactory.fromAnything(fmtText1)
    // let realFmt2 = FmtTextFactory.fromAnything(fmtText2)
    // let newFmtText = []
    // pushArray(newFmtText, realFmt1)
    // pushArray(newFmtText, realFmt2)
    // return newFmtText
    return [ ...this.getCanonical(fmtText1), ...this.getCanonical(fmtText2) ];
  }

  /**
   * Attempts to change the text of a fmtText preserving
   * all formats.
   * This only works predictably when there is a single text token in the fmtText array,
   * if there is more than one, only the formats of the first token will the preserved
   *
   * @param {FmtTextToken[]}fmtText
   * @param {string}newPlainText
   * @return {[]}
   */
  static withPlainText(fmtText, newPlainText) {
    if (fmtText.length === 0) {
      return []
    }
    let textTokens = fmtText.filter( (token) => { return token.type === FmtTextTokenType.TEXT})
    if (textTokens.length === 0) {
      // no text
      return fmtText
    }
    let theTextToken = FmtTextTokenFactory.clone(textTokens[0])
    theTextToken.text = newPlainText
    return [theTextToken]
  }

  /**
   *
   * @param {FmtTextToken}token
   * @return {string}
   */
  static tokenGetPlainText(token) {
    switch(token.type) {
      case FmtTextTokenType.GLUE:
        return ' ';
      case FmtTextTokenType.TEXT:
        return token.text;

      default:
        return '';
    }

  }
}