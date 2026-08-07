// noinspection ES6PreferShortImport

import * as ApparatusType from '../constants/ApparatusType.js';
import {WitnessTokenInterface} from "../CtData/CtDataInterface.js";
import * as WitnessTokenType from "../Witness/WitnessTokenType.js";
import {Punctuation} from "../defaults/Punctuation.js";

import {Group} from "./SequenceWithGroups.js";

import {ApparatusInterface, LemmaType} from "./EditionInterface.js";
import {Apparatus} from "./Apparatus.js";
import {CompactFmtText, fromCompactFmtText, getPlainText} from "@thomas-inst/fmt-text";
import {MainTextToken} from "./MainTextToken.js";

export class ApparatusTools {

  static createEmpty(): ApparatusInterface {
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
  static findEntryIndex(app: ApparatusInterface, mainTextFrom: number, mainTextTo: number): number {
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
  static sortEntries<T extends Apparatus | ApparatusInterface>(app: T): T {
    app.entries = app.entries.sort((entryA, entryB) => {
      return compareEntryLocations(entryA.from, entryB.from, entryA.to, entryB.to);
    });
    return app;
  }

  static getLemmaTypeFromCtDataCustomApparatusEntry(lemma: CompactFmtText): LemmaType {
    switch (getPlainText(fromCompactFmtText(lemma))) {
      case '':
        return 'auto';

      case 'dash':
        return 'dash';

      case 'ellipsis':
        return 'ellipsis';

      default:
        return 'custom';
    }
  }

  static getMainTextWordsForRange(from: number, to: number, tokens: MainTextToken[], lang: string = ''): string[] {
    return tokens
      .filter((_t, i) => i >= from && i <= to)
      .map((t) => {
        if (t.type === 'text') {
          const theText = getPlainText(t.fmtText);
          if (Punctuation.stringIsAllPunctuation(theText, lang)) {
            if (theText === '|') {
              return '|';
            }
            return '';
          }
          return theText;
        }
        return '';
      });
  }

  static getNormalizedMainTextForGroup(group: Group, mainTextInputTokens: WitnessTokenInterface[], lang: string = ''): string {
    const normalized = true;
    return mainTextInputTokens
      .filter((_t, i) => {
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
          if (t.text === '|') {
            return '|';
          }
          return '';
        }
        if (normalized) {
          if (t.normalizedText !== undefined && t.normalizedText !== '') {
            return t.normalizedText;
          }
        }
        return t.text;
      }).filter((t) => t !== '').join(' ');
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
