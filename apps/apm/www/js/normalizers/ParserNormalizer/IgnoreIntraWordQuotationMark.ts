// noinspection ES6PreferShortImport

import { ParserNormalizer } from '../../Normalizer/ParserNormalizer.js';
import { WitnessToken } from '../../Witness/WitnessToken.js';
import type { WitnessTokenInterface } from '../../CtData/CtDataInterface.js';
import * as NormalizationSource from '../../constants/NormalizationSource.js';
import { EditionWitnessTokenStringParser } from '../../toolbox/EditionWitnessTokenStringParser.js';
import * as WitnessTokenType from '../../Witness/WitnessTokenType.js';

/**
 * Normalizer that ignores intra‑word quotation marks for Hebrew.
 * It removes the opening quotation mark that appears after the first
 * character of a word and parses the rest of the word using the
 * {@link EditionWitnessTokenStringParser}. The resulting token list is
 * returned as an array of {@link WitnessTokenInterface} objects.
 */
export class IgnoreIntraWordQuotationMark extends ParserNormalizer {
  private quotationMarks: string[];
  private readonly debug: boolean;

  constructor() {
    super();
    this.quotationMarks = [
      String.fromCodePoint(0x2018), // left single quotation mark
      String.fromCodePoint(0x2019), // right single quotation mark
      String.fromCodePoint(0x201c), // left double quotation mark
      String.fromCodePoint(0x201d)  // right double quotation mark
    ];
    this.debug = false;
  }

  /**
   * Parse a string that starts with a letter followed by a quotation mark.
   * The leading quotation mark is ignored and the remainder of the word is
   * tokenised.
   *
   * @param str  The input string (e.g. "a‘bcd").
   * @param lang Language code – this normaliser only applies to Hebrew ("he").
   * @returns An array of {@link WitnessTokenInterface}.
   */
  normalizeString(str: string, lang: string): WitnessTokenInterface[] {
    const firstLetter = str.charAt(0);
    const quotationMark = str.charAt(1);

    if (this.quotationMarks.indexOf(quotationMark) === -1) {
      // not a recognised quotation mark – nothing to normalise.
      return [];
    }

    const restOfWord = str.substring(2);
    this.debug && console.log(`Rest of word: '${restOfWord}'`);

    const tokens = EditionWitnessTokenStringParser.parseStringWithPunctuation(restOfWord, lang);
    this.debug && console.log(`Got ${tokens.length} token(s) from parser`);
    this.debug && console.log(tokens);

    // Adjust the first token to include the leading letter and quotation mark.
    if (tokens[0].tokenType === WitnessTokenType.WORD) {
      const firstTokenText = tokens[0].text;
      tokens[0]
        .setWord(firstLetter + quotationMark + firstTokenText)
        .withNormalization(firstLetter + firstTokenText, NormalizationSource.PARSER_NORMALIZER);
    } else {
      // Edge case: the parser did not return a WORD token first – prepend one.
      const newToken = new WitnessToken();
      newToken
        .setWord(firstLetter + quotationMark)
        .withNormalization(firstLetter, NormalizationSource.PARSER_NORMALIZER);
      tokens.unshift(newToken);
    }

    return tokens;
  }

  /**
   * Determine whether this normaliser should be used for the given string.
   * It only applies to Hebrew strings that start with a letter followed by a
   * right‑hand single or double quotation mark.
   */
  isApplicable(str: string, lang: string): boolean {
    if (lang !== 'he') {
      return false;
    }
    if (str.length < 2) {
      return false;
    }

    const qm = str.charAt(1);
    return qm === '\u2019' || qm === '\u201d';
  }
}
