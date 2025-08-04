import * as ApparatusType from '@/constants/ApparatusType';
import {WitnessTokenInterface} from "@/CtData/CtDataInterface";
import * as WitnessTokenType from "@/Witness/WitnessTokenType";
import {Punctuation} from "@/defaults/Punctuation";

import {Group} from "./SequenceWithGroups";
import {Apparatus} from "./Apparatus";

export class ApparatusTools {

  static createEmpty(): Apparatus {
    return {
      type: ApparatusType.CRITICUS, entries: []
    };
  }

  /**
   * Returns -1 if there's no entry for the given main text location
   * @param app
   * @param mainTextFrom
   * @param mainTextTo
   * @return {number}
   */
  static findEntryIndex(app: Apparatus, mainTextFrom: number, mainTextTo: number): number {
    let index = -1;
    let found = false;
    app.entries.forEach((entry, i) => {
      if (found) {
        return;
      }
      if (compareEntryLocations(mainTextFrom, entry.from, mainTextTo, entry.to) === 0) {
        index = i;
        found = true;
      }
    });
    return index;
  }

  /**
   * Sorts the entries in ascending order according to their main text indices
   */
  static sortEntries(app: Apparatus): Apparatus {
    const newEntries = app.entries.sort((entryA, entryB) => {
      return compareEntryLocations(entryA.from, entryB.from, entryA.to, entryB.to);
    });
    return {
      type: app.type, entries: newEntries
    };
  }

  static getMainTextForGroup(group: Group, mainTextInputTokens: WitnessTokenInterface[], normalized = true, lang = '') {
    return mainTextInputTokens
    .filter((t, i) => {
      return i >= group.from && i <= group.to;
    }) // get group main text columns
    .map((t) => {   // get text for each column
      if (t.tokenType === WitnessTokenType.EMPTY) {
        return '';
      }
      if (t.tokenType === WitnessTokenType.NUMBERING_LABEL) {
        return '';
      }
      if (Punctuation.stringIsAllPunctuation(t.text, lang)) {
        return '';
      }
      if (normalized) {
        if (t.normalizedText !== undefined && t.normalizedText !== '') {
          return t.normalizedText;
        }
      }
      return t.text;
    })
    .filter(t => t !== '')   // filter out empty text
    .join(' ');
  }
}

function compareEntryLocations(fromA: number, fromB: number, toA: number, toB: number) {
  if (fromA === fromB) {
    if (toA === toB) {
      return 0;
    }
    if (toA > toB) {
      return 1;
    }
    return -1;
  }
  if (fromA > fromB) {
    return 1;
  }
  return -1;
}
