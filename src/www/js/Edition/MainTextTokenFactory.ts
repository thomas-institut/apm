// noinspection ES6PreferShortImport

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

import {MainTextToken} from './MainTextToken.js';
import * as EditionMainTextTokenType from './MainTextTokenType.js';
import {FmtText, fmtTextFromString, newGlueToken} from "../lib/FmtText/FmtText";
import {MainTextTokenType} from "@/Edition/EditionInterface";

export class MainTextTokenFactory {

  /**
   * Creates and returns a simple text token with the specified attributes.
   *
   * @param {string} type - The type of the text token to be created.
   * @param {string} text - The textual content of the token.
   * @param {number} editionWitnessTokenIndex - The index reference for edition witness within the token.
   * @param {string} [lang=''] - The language code for the text token. Defaults to an empty string.
   * @return {MainTextToken} The created text token with assigned properties.
   */
  static createSimpleText(type: MainTextTokenType, text: string, editionWitnessTokenIndex: number, lang: string = ''): MainTextToken {
    let t = new MainTextToken();
    t.type = type;
    t.fmtText = fmtTextFromString(text);
    t.editionWitnessTokenIndex = editionWitnessTokenIndex;
    t.setLang(lang);
    return t;
  }

  /**
   * Creates a new instance of MainTextToken with formatted text and specified attributes.
   *
   * @param {string} type - The type of the token to be created.
   * @param {FmtTextTokenClass[]} fmtText - The formatted text content for the token.
   * @param {number} editionWitnessTokenIndex - The index representing the edition or witness token.
   * @param {string} [lang=''] - The language code for the token (optional, defaults to an empty string).
   * @return {MainTextToken} A new instance of MainTextToken with the specified attributes.
   */
  static createWithFmtText(type: MainTextTokenType, fmtText: FmtText, editionWitnessTokenIndex: number, lang: string = ''): MainTextToken {
    let t = new MainTextToken();
    t.type = type;
    t.fmtText = fmtText;
    t.editionWitnessTokenIndex = editionWitnessTokenIndex;
    t.setLang(lang);
    return t;
  }

  static createNormalGlue() {
    let t = new MainTextToken();
    t.type = EditionMainTextTokenType.GLUE;
    t.space = 'normal';
    t.fmtText = [ newGlueToken()];
    return t;
  }

  static createParagraphEnd(style = '') {
    let t = new MainTextToken();
    t.type = EditionMainTextTokenType.PARAGRAPH_END;
    return t.setStyle(style);
  }

  /**
   *
   * @param {MainTextToken}token
   */
  static clone(token: MainTextToken) {
    let t = new MainTextToken();
    t.type = token.type;
    t.fmtText = token.fmtText;
    t.style = token.style;
    t.editionWitnessTokenIndex = token.editionWitnessTokenIndex;
    if (token.lang !== undefined) {
      t.setLang(token.lang);
    }
    return t;
  }

}