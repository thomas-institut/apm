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


import { TypesetterTokenFactory } from '../Typesetter/TypesetterTokenFactory'
import * as WitnessTokenType from '../Witness/WitnessTokenType'
import * as ApparatusSubEntryType from '../Edition/SubEntryType'
import { NumeralStyles } from '../toolbox/NumeralStyles'
import { FmtText } from '../FmtText/FmtText'
import { TypesetterTokenRenderer } from '../FmtText/Renderer/TypesetterTokenRenderer'
import { pushArray } from '../toolbox/ArrayUtil'
import { HtmlRenderer } from '../FmtText/Renderer/HtmlRenderer'
import { CtData } from '../CtData/CtData'
import { FmtTextFactory} from '../FmtText/FmtTextFactory'
import { WitnessTokenStringParser } from '../toolbox/WitnessTokenStringParser'

// const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'


// const thinSpace = String.fromCodePoint(0x2009)

const enDash = String.fromCodePoint(0x2013)

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

  static genSubEntryHtmlContent(style, subEntry, sigla) {
    switch(style) {
      case 'la':
        return this.genSubEntryHtmlContentLatin(subEntry, sigla)

      case 'ar':
        return this.genSubEntryHtmlContentArabic(subEntry, sigla)

      case 'he':
        return this.genSubEntryHtmlContentHebrew(subEntry, sigla)

      default:
        console.warn(`Unsupported style/language ${style}`)
        return '---'
    }
  }

  static typesetSubEntryHebrew(subEntryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens = []

    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    switch(subEntryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString, 'he').setBold())
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(hebrewStyle.strings.omission, 'he').setFontSize(hebrewStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString, 'he').setBold()
        ]

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(hebrewStyle.strings.addition, 'he').setFontSize(hebrewStyle.smallFontFactor))
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString, 'he').setBold())
        return theTokens


      case ApparatusSubEntryType.CUSTOM:
        return theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${subEntryType}`)
        return []
    }
  }

  static genSubEntryHtmlContentHebrew(subEntry, sigla) {
    let entryType = subEntry.type
    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)
    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla)
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} <b>${siglaString}</b>`

      case ApparatusSubEntryType.OMISSION:
        return `<small>${hebrewStyle.strings.omission}</small> <b>${siglaString}</b>`

      case ApparatusSubEntryType.ADDITION:
        return `<small>${hebrewStyle.strings.addition}</small> ${theText} <b>${siglaString}</b>`

      case ApparatusSubEntryType.CUSTOM:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  static typesetSubEntryArabic(entryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens = []
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString, 'ar'))
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(arabicStyle.strings.omission, 'ar').setFontSize(arabicStyle.smallFontFactor),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString, 'ar')
        ]

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(arabicStyle.strings.addition, 'ar').setFontSize(arabicStyle.smallFontFactor))
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString, 'ar'))
        return theTokens

      case ApparatusSubEntryType.CUSTOM:
        return  theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return []
    }
  }

  static genSubEntryHtmlContentArabic(subEntry, sigla) {
    let entryType = subEntry.type
    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)
    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla,  'ar')
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusSubEntryType.OMISSION:
        return `<small>${arabicStyle.strings.omission}</small> ${siglaString}`

      case ApparatusSubEntryType.ADDITION:
        return `<small>${arabicStyle.strings.addition}</small> ${theText} ${siglaString}`

      case ApparatusSubEntryType.CUSTOM:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }


  static typesetSubEntryLatin(subEntryType, theText, witnessIndices, sigla) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))

    let theTokens = []
    switch(subEntryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString))
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        return [
          TypesetterTokenFactory.simpleText(latinStyle.strings.omission).setItalic(),
          TypesetterTokenFactory.normalSpace(),
          TypesetterTokenFactory.simpleText(siglaString)
        ]

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(latinStyle.strings.addition).setItalic())
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        theTokens.push(TypesetterTokenFactory.simpleText(siglaString))
        return theTokens


      case ApparatusSubEntryType.CUSTOM:
        return theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${subEntryType}`)
        return []
    }
  }

  static genSubEntryHtmlContentLatin(subEntry, sigla) {
    let entryType = subEntry.type


    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)

    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla)
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusSubEntryType.OMISSION:
        return `<i>${latinStyle.strings.omission}</i> ${siglaString}`

      case ApparatusSubEntryType.ADDITION:
        return `<i>${latinStyle.strings.addition}</i> ${theText} ${siglaString}`

      case ApparatusSubEntryType.CUSTOM:
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
        column[row] = { tokenType: WitnessTokenType.EMPTY }
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

  static getMainTextForGroup(group, mainTextInputTokens, normalized = true, lang = '') {
    return mainTextInputTokens
      .filter( (t, i) => { return i>=group.from && i<=group.to}) // get group main text columns
      .map( (t) => {   // get text for each column
        if (t.tokenType === WitnessTokenType.EMPTY) { return ''}
        if (WitnessTokenStringParser.strIsPunctuation(t.text, lang)) { return  ''}
        if (normalized) {
          if (t.normalizedText !== undefined && t.normalizedText !== '') {
            return t.normalizedText
          }
        }
        return t.text
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  static findNonEmptyMainTextToken(ctIndex, ctToMainTextMap, mainTextTokens, forward, lang = '') {
    while (ctIndex >= 0 && ctIndex < ctToMainTextMap.length && (
      ctToMainTextMap[ctIndex] === -1 ||
      WitnessTokenStringParser.strIsPunctuation(mainTextTokens[ctToMainTextMap[ctIndex]]['text'], lang)) ) {
      ctIndex = forward ? ctIndex + 1 : ctIndex -1
    }
    if (ctIndex < 0 || ctIndex >= ctToMainTextMap.length) {
      return -1
    }
    return ctToMainTextMap[ctIndex]
  }



  static _genSiglaHtmlFromWitnessData(subEntry, sigla, numberStyle) {
    return subEntry.witnessData
      .map( (w) => {
            if (w.hand !== 0) {
              return `${sigla[w.witnessIndex]}<sup>${this.getNumberString(w.hand+1, numberStyle)}</sup>`
            }
            return sigla[w.witnessIndex]})
      .join('')
  }

  static getNumberString(n, style) {
    if (style === 'ar') {
      return NumeralStyles.toDecimalArabic(n)
    }
    return NumeralStyles.toDecimalWestern(n)
  }

  /**
   *
   * @param {object}ctData
   * @param {Edition}edition
   * @param {number} from
   * @param {number} to
   * @param newEntry
   * @param {string}lemma
   * @param {array}currentApparatusEntries
   * @param {boolean}verbose
   */
  static updateCtDataWithNewEntry(ctData, edition, from, to, newEntry, lemma, currentApparatusEntries, verbose = false) {
    verbose && console.log(`Updated apparatus entry `)
    // this.verbose && console.log(this.selection)
    verbose && console.log(newEntry)

    let fromToken =edition.getMainTextToken( from)
    let toToken = edition.getMainTextToken( to)

    let ctFromTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, fromToken.editionWitnessTokenIndex)
    let ctToTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, toToken.editionWitnessTokenIndex)

    verbose && console.log(`CT range: ${ctFromTokenIndex} - ${ctToTokenIndex}`)
    if (newEntry.isNew) {
      if (FmtText.getPlainText(newEntry.text) !== '') {
        ctData = CtData.addCustomApparatusTextSubEntry(ctData,
          newEntry.apparatus,
          ctFromTokenIndex,
          ctToTokenIndex,
          lemma,
          newEntry
        )
      }
    } else {
      if (FmtText.getPlainText(newEntry.text) === '') {
        console.log(`Deleting current custom entry`)
        ctData = CtData.deleteCustomApparatusTextSubEntries(ctData,
          newEntry.apparatus,
          ctFromTokenIndex,
          ctToTokenIndex
        )
      } else {
        console.log('Updating custom entry....')
        // just add and delete, perhaps do something more sophisticated later
        ctData = CtData.deleteCustomApparatusTextSubEntries(ctData,
          newEntry.apparatus,
          ctFromTokenIndex,
          ctToTokenIndex
        )
        ctData = CtData.addCustomApparatusTextSubEntry(ctData,
          newEntry.apparatus,
          ctFromTokenIndex,
          ctToTokenIndex,
          lemma,
          newEntry
        )
      }
    }

    if (newEntry.changesInEnabledEntries) {
      console.log(`Changes in enabled entries`)
      newEntry.enabledEntriesArray.forEach( (enabled, i) => {
        if (currentApparatusEntries[newEntry.apparatusIndex][i].enabled !== enabled) {
          console.log(`Apparatus sub entry ${i} enabled change to ${enabled}`)
          let theHash = currentApparatusEntries[newEntry.apparatusIndex][i].hashString()
          CtData.changeEnableStatusForSubEntry(ctData,
            newEntry.apparatus,
            ctFromTokenIndex,
            ctToTokenIndex,
            theHash,
            enabled,
            lemma
          )
        }
      })
    }

    return ctData
  }

  /**
   *
   * @param {string}lemma
   * @param {string}lemmaText
   */
   static getLemmaString(lemma, lemmaText) {
    let separator = ''
    let custom = false
    switch(lemma) {
      case '':
      case 'dash':
        separator = ` ${enDash} `
        break

      case 'ellipsis':
        separator = '...'
        break

      default:
        custom = true
    }
    if (custom) {
      return lemma
    }
    let lemmaTextWords = lemmaText.split(' ')
    // if lemmaText is short,
    if (lemmaTextWords.length <= 3) {
      return lemmaText
    }

    return  `${lemmaTextWords[0]}${separator}${lemmaTextWords[lemmaTextWords.length-1]}`
  }


}