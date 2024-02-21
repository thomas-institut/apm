import * as Util from '../../toolbox/Util.mjs'
import { ParserNormalizer } from '../../Normalizer/ParserNormalizer.mjs'
import { WitnessToken } from '../../Witness/WitnessToken.mjs'
import * as NormalizationSource from '../../constants/NormalizationSource.mjs'
import { EditionWitnessTokenStringParser } from '../../toolbox/EditionWitnessTokenStringParser.mjs'
import * as WitnessTokenType from '../../Witness/WitnessTokenType.mjs'

export class IgnoreIntraWordQuotationMark extends ParserNormalizer {

  constructor () {
    super()
    this.quotationMarks = [
      String.fromCodePoint(0x2018), String.fromCodePoint(0x2019), // single quotation marks left + right
      String.fromCodePoint(0x201c), String.fromCodePoint(0x201d), // double quotation marks left + right
    ];
    this.debug = true
  }

  normalizeString(str, lang) {
    let firstLetter = str.charAt(0)
    let quotationMark = str.charAt(1)
    if (this.quotationMarks.indexOf(quotationMark) === -1) {
      // not a quotation mark
      return []
    }
    let restOfWord = str.substring(2)
    this.debug &&  console.log(`Rest of word: '${restOfWord}'`)

    let tokens = EditionWitnessTokenStringParser.parseStringWithPunctuation(restOfWord, lang)
    this.debug && console.log(`Got ${tokens.length} token(s) from parser`)
    this.debug && console.log(tokens)
    // fix the first token!
    if (tokens[0].tokenType === WitnessTokenType.WORD) {

      // the normal case: the first token is a word
      let firstTokenText = tokens[0].text
      tokens[0].setWord(firstLetter + quotationMark + firstTokenText).withNormalization(firstLetter + firstTokenText, NormalizationSource.PARSER_NORMALIZER)
    } else {
      // this is weird, but basically, we'll just add a word token before the other tokens
      let newToken = new WitnessToken()
      newToken.setWord(firstLetter+ quotationMark).withNormalization(firstLetter, NormalizationSource.PARSER_NORMALIZER)
      tokens.unshift(newToken)
    }
    return tokens
  }

  isApplicable(str, lang) {
    if (lang !== 'he') {
      return false
    }
    if (str.length < 2) {
      return false
    }
    let isApplicable = false

    if (str.charAt(1) === '\u2019' || str.charAt(1) === '\u201d') {
      isApplicable = true
      console.log(`IIWQM for '${str}': ${isApplicable}`)
    }

    return isApplicable
  }



}