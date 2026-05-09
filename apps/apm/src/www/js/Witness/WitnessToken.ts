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

import * as WitnessTokenType from './WitnessTokenType.js';
import * as NormalizationSource from '../constants/NormalizationSource.js';
import {WitnessTokenInterface} from "@/CtData/CtDataInterface";
import {FmtText} from "@/lib/FmtText/FmtText";

/**
 * A token that can appear in a witness
 *
 *    tokenType :  'empty' | 'whitespace' | 'punctuation' | 'word' | ... others defined by other token classes
 *    text: string, the text associated with the token
 *    normalizedText: string
 *    normalizationSource: string, an indication of where the normalization comes from
 *    tokenClass: string, a further specification of the token type, it normally declares where the token
 *       comes from:  'fullTx' (a full transcription), 'edition', etc.
 *
 *
 *    depending on the type and class, a token can have other properties
 */


export class WitnessToken implements WitnessTokenInterface{
  tokenType: string;
  text: string;
  tokenClass: string;
  normalizedText: string;
  normalizationSource: string;
  fmtText?: FmtText;

  constructor() {
    this.tokenType = WitnessTokenType.EMPTY;
    this.text = '';
    this.tokenClass = '';
    this.normalizedText = '';
    this.normalizationSource = NormalizationSource.NONE;
  }


  setWord(wordString: string): this {
    this.tokenType = WitnessTokenType.WORD;
    this.text = wordString;
    return this;
  }

  setPunctuation(punctuationString: string): this {
    this.tokenType = WitnessTokenType.PUNCTUATION;
    this.text = punctuationString;
    return this;
  }

  setWhitespace(whiteSpaceString: string = ' '): this {
    this.tokenType = WitnessTokenType.WHITESPACE;
    this.text = whiteSpaceString;
    this.normalizedText = '';
    this.normalizationSource = NormalizationSource.NONE;
    return this;
  }


  /**
   *
   * @param {string} normalizedText
   * @param {string} normalizationSource
   * @return {this}
   */
  withNormalization(normalizedText: string, normalizationSource: string = NormalizationSource.DEFAULT): this {
    this.normalizedText = normalizedText;
    this.normalizationSource = normalizationSource;
    return this;
  }

  /**
   * Returns a WitnessTokenInterface object
   */
  getCtDataObject(): WitnessTokenInterface {
    return {
      tokenClass: this.tokenClass,
      tokenType: this.tokenType,
      text: this.text,
      fmtText: [],
      normalizedText: this.normalizedText,
      normalizationSource: this.normalizationSource
    };
  }
}