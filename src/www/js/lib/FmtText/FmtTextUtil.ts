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

import * as FmtTextTokenType from './FmtTextTokenType.js'
import {FmtTextTokenFactory} from './FmtTextTokenFactory.js'
import {FmtTextToken} from "./FmtTextToken.js";
import {FmtTextFactory} from "./FmtTextFactory.js";



export class FmtTextUtil {

  /**
   * Returns an array of FmtTextToken from a variable
   */
  static getCanonical(fmtText: FmtTextToken[] | FmtTextToken | string | string[]): FmtTextToken[] {
    if (typeof fmtText === 'string') {
      return FmtTextFactory.fromString(fmtText);
    }
    if (Array.isArray(fmtText)) {
      let fmtTextArray: FmtTextToken[] = []
      fmtText.forEach( (element) => {
        fmtTextArray = fmtTextArray.concat(this.getCanonical(element))
      })
      return fmtTextArray;
    }
    // fmtTest is a single FmtTexToken
    return [fmtText];
  }

  static getPlainText(fmtText: FmtTextToken[] | FmtTextToken | string): string {
     return this.getCanonical(fmtText).map( (token) => { return this.tokenGetPlainText(token)}).join('')
  }

  static concat(fmtText1: FmtTextToken[] | string, fmtText2: FmtTextToken[] | string): FmtTextToken[] {
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
  static withPlainText(fmtText: FmtTextToken[], newPlainText: string): FmtTextToken[] {
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
  static tokenGetPlainText(token: FmtTextToken): string {
    switch(token.type) {
      case FmtTextTokenType.GLUE:
        return ' ';
      case FmtTextTokenType.TEXT:
        return token.text ?? '';

      default:
        return '';
    }
  }
}