// noinspection ES6PreferShortImport

import * as WitnessTokenType from '../Witness/WitnessTokenType.js';
import {arraysAreEqual} from '../lib/ToolBox/ArrayUtil.js';
import {WitnessTokenInterface} from "../CtData/CtDataInterface.js";

export const NO_MATCH = 0;
export const FULL_MATCH = 1;

export const SAME_TYPE = 0.25;

/**
 * Weight of text match
 */
export const TEXT_SIMILARITY_MULTIPLIER = 0.65;

export const FORMAT_SIMILARITY_MULTIPLIER = 0.1;


export class TokenMatchScorer {

  /**
   * Returns a number between 0 a 1 that represents how similar are the given tokens
   * Tokens of same type get at least 0.2, if the have the same text they get 0.9
   * and then they get more the more format attributes they share
   */
  getMatchScore(a: WitnessTokenInterface, b: WitnessTokenInterface): number {
    const attributesToCompare = ['fontWeight', 'fontStyle'];

    if (a.tokenType !== b.tokenType) {
      return NO_MATCH;
    }
    if (a.tokenType === WitnessTokenType.FORMAT_MARK) {
      let thingsToMatch = 3;
      let scoreForEachThing = (FULL_MATCH - SAME_TYPE) / thingsToMatch;
      // compare mark type, styles and formats
      if (a.markType !== b.markType) {
        return SAME_TYPE;
      }
      if (a.style !== b.style) {
        return SAME_TYPE + scoreForEachThing;
      }
      if (a.formats !== undefined && b.formats !== undefined) {
        if (!arraysAreEqual(a.formats, b.formats)) {
          return SAME_TYPE + 2 * scoreForEachThing;
        }
      }


      return FULL_MATCH;
    }
    // other types: word, space, punctuation
    let score = SAME_TYPE;

    score += TEXT_SIMILARITY_MULTIPLIER * this.getTextSimilarityScore(a.text, b.text);
    if (a.fmtText === undefined && b.fmtText === undefined) {
      return score;
    }

    if (a.fmtText === undefined && b.fmtText !== undefined) {
      return score;
    }
    if (a.fmtText !== undefined && b.fmtText === undefined) {
      return score;
    }

    // formatted texts
    let matchedAttributes = 0;
    attributesToCompare.forEach((attribute) => {
      // @ts-expect-error Using fmtText as object
      if (a.fmtText[attribute] === b.fmtText[attribute]) {
        matchedAttributes++;
      }
    });
    score += FORMAT_SIMILARITY_MULTIPLIER * (matchedAttributes / attributesToCompare.length);
    return score;
  }

  private getTextSimilarityScore(textA: string, textB: string): number {
    const lengthScore = 0.25;
    const subStrScore = 0.75;
    // Super rough implementation, this should have a proper edit distance algorithm
    // such as Damerau-Levenshtein (https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance)
    // as it is, strings that are not sub/super strings of each other get a very low score
    if (textA === textB) {
      return 1;
    }
    let longerString = textA.length >= textB.length ? textA : textB;
    let shorterString = textB.length <= textA.length ? textB : textA;
    let lengthDiff = longerString.length - shorterString.length;
    if (lengthDiff === 0) {
      // different strings of same length
      // this is where this implementation is very weak and a proper edit distance score
      // could be much better
      return lengthScore;
    }
    if (longerString.substring(0, shorterString.length) === shorterString || longerString.substring(lengthDiff) === shorterString) {
      // strings of different lengths but the shorter one is identical to the head or the
      // tail of the longer one
      // using lengthScore + subStrScore to leave open the possibility to combinations
      // that do not add up to 1
      return (lengthScore + subStrScore) * (shorterString.length / longerString.length);
    }
    return lengthScore * (shorterString.length / longerString.length);
  }
}