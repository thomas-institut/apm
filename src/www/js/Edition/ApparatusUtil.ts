// noinspection ES6PreferShortImport

/*
 *  Copyright (C) 2022 Universität zu Köln
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


import {deepCopy} from '../toolbox/Util.js';
import {WitnessDataItem} from "./WitnessDataItem.js";
import {SiglaGroup} from "./SiglaGroup.js";
import {CompactFmtText, fromCompact, getPlainText} from "../lib/FmtText/FmtText.js";

const enDash = String.fromCodePoint(0x2013);

export interface LemmaComponents {
  type: string,
  text: string,
  from?: string,
  separator?: string,
  to?: string,
  numWords?: number
}


export class ApparatusUtil {

  static getLemmaComponents(apparatusEntryLemma: CompactFmtText, lemmaText: string): LemmaComponents {
    let separator = '';
    let custom = false;
    const theLemma = getPlainText(fromCompact(apparatusEntryLemma));

    switch (theLemma) {
      case '':
      case 'dash':
        separator = `${enDash}`;
        break;

      case 'ellipsis':
        separator = '...';
        break;

      default:
        custom = true;
    }
    if (custom) {
      return {type: 'custom', text: getPlainText(fromCompact(apparatusEntryLemma))};
    }
    if (lemmaText === '') {
      lemmaText = 'pre';
    }
    let lemmaTextWords = lemmaText.split(' ');
    // if lemmaText is short,
    if (lemmaTextWords.length <= 3) {
      return {
        type: 'full', text: lemmaText, numWords: lemmaTextWords.length
      };
    }
    return {
      text: '',
      type: 'shortened',
      from: lemmaTextWords[0],
      separator: separator,
      to: lemmaTextWords[lemmaTextWords.length - 1],
    };
  }

  static getSiglaData(witnessData: WitnessDataItem[], sigla: string[], siglaGroups: SiglaGroup[]) {

    let wData: WitnessDataItem[] = deepCopy(witnessData);
    let wDataArray = wData.filter((w) => {
      return !w.omitSiglum;
    }).map((w) => {
      w.siglum = sigla[w.witnessIndex].toString();
      return w;
    });

    siglaGroups.forEach((sg) => {
      let siglaIndexes = wDataArray.map((w) => {
        // turn non-zero hands to -1 so that they are not matched by the sigla group
        return w.hand === 0 ? w.witnessIndex : -1;
      });
      let matchedIndexes = sg.matchWitnesses(siglaIndexes);
      if (matchedIndexes.length !== 0) {
        // change the first matched witness to the group siglum
        let firstMatchedWitnessPosition = siglaIndexes.indexOf(matchedIndexes[0]);
        //console.log(`First matched witness position in array: ${firstMatchedWitnessPosition}`)
        wDataArray[firstMatchedWitnessPosition].siglum = sg.siglum;
        wDataArray[firstMatchedWitnessPosition].hand = 0;
        wDataArray[firstMatchedWitnessPosition].witnessIndex = -1;
        // filter out matched witnesses
        wDataArray = wDataArray.filter((w) => {
          return matchedIndexes.indexOf(w.witnessIndex) === -1;
        });
      }
    });

    return wDataArray;
  }

}