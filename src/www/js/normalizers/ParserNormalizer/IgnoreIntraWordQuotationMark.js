import * as Util from '../../toolbox/Util.mjs'
import { ParserNormalizer } from '../../Normalizer/ParserNormalizer'
import { WitnessToken } from '../../Witness/WitnessToken'
import * as NormalizationSource from '../../constants/NormalizationSource'

export class IgnoreIntraWordQuotationMark extends ParserNormalizer {

  constructor () {
    super()
    this.quotationMarks = [
      String.fromCodePoint(0x2018), String.fromCodePoint(0x2019), // single quotation marks left + right
      String.fromCodePoint(0x201c), String.fromCodePoint(0x201d), // double quotation marks left + right
    ];
  }

  normalizeString(str, lang) {
    let token = new WitnessToken()
    token.setWord(str).withNormalization(Util.stringReplaceArray(str, this.quotationMarks, ''), NormalizationSource.PARSER_NORMALIZER)
    return [token]
  }

  isApplicable(str, lang) {
    if (lang !== 'he') {
      return false
    }

    let re = /^[\u0590-\u05FF]\u2019|\u201d/
    return re.test(str)
  }



}