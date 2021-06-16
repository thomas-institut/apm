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


// TODO: eliminate this file altogether!


import * as TypesetterTokenFactory from '../TypesetterTokenFactory'
import * as TokenType from '../constants/TranscriptionTokenType'
import { isPunctuationToken } from '../toolbox/Util.mjs'
import * as ApparatusEntryType from '../constants/ApparatusEntryType'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'


const thinSpace = String.fromCodePoint(0x2009)



const latinStyle = {
  strings: {
    omission: 'om.',
    addition: 'add.'
  }
}

const arabicStyle = {
  smallFontFactor: 0.8,
  strings : {
    omission: 'نقص',
    addition: 'ز'
  }
}

const hebrewStyle = {
  smallFontFactor: 0.8,
  strings : {
    omission: 'חסר',
    addition: 'נוסף'
  }
}



export class ApparatusCommon {

  static genEntryHtmlContent(style, subEntry, sigla) {
    switch(style) {
      case 'la':
        return this.genEntryLatinHtml(subEntry, sigla)

      case 'ar':
        return this.genEntryArabicHtml(subEntry, sigla)

      case 'he':
        return this.genEntryHebrewHtml(subEntry, sigla)

      default:
        console.warn(`Unsupported style/language ${style}`)
        return '---'
    }
  }

  static genEntryHebrew(entryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return [
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString).setBold()
        ]

      case ApparatusEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(hebrewStyle.strings.omission).setFontSize(hebrewStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString).setBold()
        ]

      case ApparatusEntryType.ADDITION:
        return [
          TypesetterTokenFactory.simpleText(hebrewStyle.strings.addition).setFontSize(hebrewStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString).setBold()
        ]

      case ApparatusEntryType.SIMPLE_TEXT:
        return [
          TypesetterTokenFactory.simpleText(theText)
        ]

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return []
    }
  }

  static genEntryHebrewHtml(subEntry, sigla) {
    let entryType = subEntry.type
    let theText = subEntry.text
    let siglaString = subEntry.witnessData.map( (w) => { return sigla[w.witnessIndex]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return `${theText} <b>${siglaString}</b>`

      case ApparatusEntryType.OMISSION:
        return `<small>${hebrewStyle.strings.omission}</small> <b>${siglaString}</b>`

      case ApparatusEntryType.ADDITION:
        return `<small>${hebrewStyle.strings.addition}</small> ${theText} <b>${siglaString}</b>`

      case ApparatusEntryType.SIMPLE_TEXT:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  static genEntryArabic(entryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return [
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(arabicStyle.strings.omission).setFontSize(arabicStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.ADDITION:
        return [
          TypesetterTokenFactory.simpleText(arabicStyle.strings.addition).setFontSize(arabicStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.SIMPLE_TEXT:
        return [
          TypesetterTokenFactory.simpleText(theText)
        ]

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return []
    }
  }

  static genEntryArabicHtml(subEntry, sigla) {
    let entryType = subEntry.type
    let theText = subEntry.text
    let siglaString = subEntry.witnessData.map( (w) => { return sigla[w.witnessIndex]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusEntryType.OMISSION:
        return `<small>${arabicStyle.strings.omission}</small> ${siglaString}`

      case ApparatusEntryType.ADDITION:
        return `<small>${arabicStyle.strings.addition}</small> ${theText} ${siglaString}`

      case ApparatusEntryType.SIMPLE_TEXT:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }


  static genEntryLatin(entryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return [
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(latinStyle.strings.omission).setItalic(),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.ADDITION:
        return [
          TypesetterTokenFactory.simpleText(latinStyle.strings.addition).setItalic(),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(theText),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusEntryType.SIMPLE_TEXT:
        return [
          TypesetterTokenFactory.simpleText(theText)
        ]

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return []
    }
  }

  static genEntryLatinHtml(subEntry, sigla) {
    let entryType = subEntry.type
    let theText = subEntry.text
    let siglaString = subEntry.witnessData.map( (w) => { return sigla[w.witnessIndex]}).join('')
    switch(entryType) {
      case ApparatusEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusEntryType.OMISSION:
        return `<i>${latinStyle.strings.omission}</i> ${siglaString}`

      case ApparatusEntryType.ADDITION:
        return `<i>${latinStyle.strings.addition}</i> ${theText} ${siglaString}`

      case ApparatusEntryType.SIMPLE_TEXT:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
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