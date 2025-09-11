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

import {FmtTextToken} from "./FmtTextToken.js";


/*

FmtText is not a class per se but simply an array of FormattedTextToken

Any function that takes FormattedText as input could also accept shortcut representations of basic text that can
easily be transformed into a fully specified array of FormattedTextToken. For example: a simple string including
spaces, an array mixing FormattedTextToken objects and strings.

  Also, it is not necessary to provide any attribute that can have a sensible default. So, a glue token can
be just { type: glue }  and a text token { text: 'someString' }
 */
import {FmtTextTokenFactory} from './FmtTextTokenFactory.js';


export class FmtTextFactory {

  /**
   * Creates a FmtText array from a string
   */
  static fromString(theString: string): FmtTextToken[] {

    let fmtText = [];
    let currentWord = '';

    Array.from(sanitizeString(theString)).forEach((char) => {
      if (char === ' ') {
        if (currentWord !== '') {
          fmtText.push(FmtTextTokenFactory.normalText(currentWord));
          currentWord = '';
        }
        fmtText.push(FmtTextTokenFactory.normalSpace());
      } else {
        currentWord += char;
      }
    });
    if (currentWord !== '') {
      fmtText.push(FmtTextTokenFactory.normalText(currentWord));
    }
    return fmtText;
  }

  /**
   * Creates a FmtTextToken array from a variable: fmtTextToken export objects
   * anything that can be converted to a string and arrays of those are supported
   *
   */
  static fromAnything(theThing: any): FmtTextToken[] {

    if (theThing === undefined) {
      return [];
    }
    if (Array.isArray(theThing)) {
      let fmtText: FmtTextToken[] = [];
      theThing.forEach((arrayElement) => {
        fmtText = fmtText.concat(this.fromAnything(arrayElement));
      });
      return fmtText;
    }
    if (typeof theThing === 'object') {
      return [FmtTextTokenFactory.buildFromObject(theThing)];
    }
    if (typeof theThing === 'string') {
      return this.fromString(theThing);
    }

    if (theThing.toString() !== undefined) {
      return FmtTextFactory.fromString(theThing.toString());
    }
    console.warn(`Cannot create FmtText from given value`);
    console.log(theThing);

    return this.empty();
  }


  static empty(): FmtTextToken[] {
    return [];
  }

  /**
   *
   * @return {FmtTextToken[]}
   */
  static oneNormalSpace(): FmtTextToken[] {
    let fmtText = [];
    fmtText.push(FmtTextTokenFactory.normalSpace());
    return fmtText;
  }
}

function sanitizeString(str: string): string {
  return str.replace(/\s+/g, ' ');
}