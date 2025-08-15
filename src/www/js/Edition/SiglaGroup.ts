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


import {arraysAreEqual, numericSort, uniq} from '../lib/ToolBox/ArrayUtil.js';
import {SiglaGroupInterface} from "../CtData/CtDataInterface";

export class SiglaGroup implements SiglaGroupInterface {
  public siglum: string = '';
  public witnesses: number[] = [];

  static fromObject(obj: SiglaGroupInterface): SiglaGroup {
    return new SiglaGroup().setFromInterface(obj);
  }

  setFromInterface(sg: SiglaGroupInterface): this {
    this.siglum = sg.siglum;
    this.witnesses = sg.witnesses.map(w => w);
    return this;
  }


  /**
   * Returns an array with the matched witnesses in the given array
   * if and only if all sigla group witness are matched
   * (in other words, if the sigla group does not match the
   * given witness list, it returns an empty array)
   *
   */
  matchWitnesses(witnessesToMatch: number[]): number[] {
    let matchedWitnesses: number[] = [];
    witnessesToMatch.forEach((w) => {
      if (this.witnesses.indexOf(w) !== -1) {
        matchedWitnesses.push(w);
      }
    });
    matchedWitnesses = numericSort(uniq(matchedWitnesses));
    if (arraysAreEqual(matchedWitnesses, this.witnesses)) {
      return matchedWitnesses;
    }
    return [];
  }
}