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

import {FmtTextFactory} from '../lib/FmtText/FmtTextFactory.js';
import {FmtTextUtil} from '../lib/FmtText/FmtTextUtil.js';
import {FmtTextToken} from "../lib/FmtText/FmtTextToken.js";
import {MainTextTokenInterface, MainTextTokenType} from "./EditionInterface";


export class MainTextToken implements MainTextTokenInterface {

  type: MainTextTokenType;
  fmtText: FmtTextToken[];
  editionWitnessTokenIndex: number;
  style: string;
  space?: string;
  lang?: string;
  originalIndex?: number;
  x?: number;
  y?: number;
  lineNumber?: number;
  numberOfOccurrencesInLine?: number;
  occurrenceInLine?: number;


  constructor() {
    this.type = 'empty';
    this.fmtText = FmtTextFactory.empty();
    this.editionWitnessTokenIndex = -1;
    this.style = '';
  }

  setFromInterface(token: MainTextTokenInterface): this {
    this.type = token.type;
    this.fmtText = FmtTextFactory.fromAnything(token.fmtText);
    this.editionWitnessTokenIndex = token.editionWitnessTokenIndex;
    this.style = token.style;
    return this;
  }


  getPlainText(): string {
    return FmtTextUtil.getPlainText(this.fmtText);
  }

  setText(theText: any, editionWitnessTokenIndex = -1, lang = ''): this {
    this.type = 'text';
    this.fmtText = FmtTextFactory.fromAnything(theText);
    this.editionWitnessTokenIndex = editionWitnessTokenIndex;
    return this.setLang(lang);
  }

  setStyle(style: string): this {
    this.style = style;
    return this;
  }

  setLang(lang: string): this {
    this.lang = lang === '' ? undefined : lang;
    return this;
  }
}
