import * as Util from '../../toolbox/Util.mjs'
import { ParserNormalizer } from '../../Normalizer/ParserNormalizer'
import { WitnessToken } from '../../Witness/WitnessToken'
import * as NormalizationSource from '../../constants/NormalizationSource'

export class IgnoreIntraWordQuotationMark extends ParserNormalizer {

  constructor () {
    super()
    this.quotationMarks = [
      '“',
     '‘'
    ];
  }

  normalizeString(str, lang) {
    let token = new WitnessToken()
    token.setWord(str).withNormalization(Util.stringReplaceArray(str, this.quotationMarks, ''), NormalizationSource.COLLATION_EDITOR_AUTOMATIC)
    return [token]
  }

  isApplicable(str, lang) {
    if (lang !== 'he') {
      return false
    }

    let re = /^[\u0590-\u05FF]”|‘/
    return re.test(str)
  }



}