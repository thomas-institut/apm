
import * as TypesetterTokenFactory from '../TypesetterTokenFactory'
import * as TokenType from '../constants/TokenType'
import { isPunctuationToken } from '../toolbox/Util.mjs'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'


const thinSpace = String.fromCodePoint(0x2009)

export class ApparatusCommon {

  static genOmissionEntryHebrew(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(' ')
    return [
      TypesetterTokenFactory.simpleText('חסר').setFontSize(0.8),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString).setBold()
    ]
  }

  static genAdditionEntryHebrew(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(' ')
    return [
      TypesetterTokenFactory.simpleText('נוסף').setFontSize(0.8),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString).setBold()
    ]
  }

  static genVariantEntryHebrew(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(' ')
    return [
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString).setBold()
    ]
  }

  static genOmissionEntryArabic(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(thinSpace)
    return [
      TypesetterTokenFactory.simpleText('نقص').setFontSize(0.8),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }

  static genAdditionEntryArabic(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(thinSpace)
    return [
      TypesetterTokenFactory.simpleText('ز').setFontSize(0.8),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }

  static genVariantEntryArabic(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join(thinSpace)
    return [
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }


  static genOmissionEntryLatin(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    return [
      TypesetterTokenFactory.simpleText('om.').setItalic(),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }

  static genAdditionEntryLatin(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    return [
      TypesetterTokenFactory.simpleText('add.').setItalic(),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }

  static genVariantEntryLatin(theText, witnessIndices, sigla) {
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    return [
      TypesetterTokenFactory.simpleText(theText),
      TypesetterTokenFactory.normalSpace(),
      TypesetterTokenFactory.simpleText(siglaString)
    ]
  }

  static getCollationTableColumn(ctData, col) {
    let column = [];
    ctData['collationMatrix'].forEach( (tokenRefs, row) => {
      let ref = tokenRefs[col]
      if (ref === -1) {
        column[row] = { tokenType: TokenType.EMPTY }
      } else {
        column[row] = ctData['witnesses'][row]['tokens'][ref]
      }
    })
    return column
  }

  /**
   *  Gets the text for the given token, the normal text or
   *  the normalized text if there is one
   * @param token
   * @param normalizationSourcesToIgnore
   * @returns {*}
   */
  static getNormalizedTextFromInputToken(token, normalizationSourcesToIgnore = []){
    let text = token[INPUT_TOKEN_FIELD_TEXT]
    if (token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== undefined && token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== '') {
      let norm = token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT]
      let source = token[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] !== undefined ? token[INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE] : ''
      if (source === '' || normalizationSourcesToIgnore.indexOf(source) === -1) {
        // if source === '', this is  a normalization from the transcription
        text = norm
      }
    }
    return text
  }

  static getMainTextForGroup(group, mainTextInputTokens) {
    return mainTextInputTokens
      .filter( (t, i) => { return i>=group.from && i<=group.to}) // get group main text columns
      .map( (t) => {   // get text for each column
        if (t.tokenType === TokenType.EMPTY) { return ''}
        if (isPunctuationToken(t.text)) { return  ''}
        if (t.normalizedText !== undefined && t.normalizedText !== '') {
          return t.normalizedText
        }
        return t.text
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  static findNonEmptyMainTextToken(ctIndex, ctToMainTextMap, mainTextTokens, forward) {
    while (ctIndex >= 0 && ctIndex < ctToMainTextMap.length && (
      ctToMainTextMap[ctIndex] === -1 ||
      isPunctuationToken(mainTextTokens[ctToMainTextMap[ctIndex]]['text'])) ) {
      ctIndex = forward ? ctIndex + 1 : ctIndex -1
    }
    if (ctIndex < 0 || ctIndex >= ctToMainTextMap.length) {
      return -1
    }
    return ctToMainTextMap[ctIndex]
  }




}