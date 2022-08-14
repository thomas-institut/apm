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
import { NumeralStyles } from '../toolbox/NumeralStyles.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'
import { TypesetterTokenRenderer } from '../FmtText/Renderer/TypesetterTokenRenderer'
import { pushArray } from '../toolbox/ArrayUtil.mjs'
import { HtmlRenderer } from '../FmtText/Renderer/HtmlRenderer'
import { CtData } from '../CtData/CtData'
import { FmtTextFactory} from '../FmtText/FmtTextFactory.mjs'
import { WitnessTokenStringParser } from '../toolbox/WitnessTokenStringParser'
import { deepCopy, escapeHtml } from '../toolbox/Util.mjs'

// const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'
const INPUT_TOKEN_FIELD_NORMALIZATION_SOURCE = 'normalizationSource'


// const thinSpace = String.fromCodePoint(0x2009)

const enDash = String.fromCodePoint(0x2013)

const latinStyle = {
  strings: {
    omission: 'om.',
    addition: 'add.',
    ante: 'ante',
    post: 'post'
  }
}

const arabicStyle = {
  smallFontFactor: 0.8,
  strings : {
    omission: 'نقص',
    addition: 'ز',
    ante: 'قبل',
    post: 'بعد'
  }
}

const hebrewStyle = {
  smallFontFactor: 0.8,
  strings : {
    omission: 'חסר',
    addition: 'נוסף',
    ante: 'לפני',
    post: 'אחרי'
  }
}

export class ApparatusCommon {

  /**
   *
   * @param {string}style
   * @param subEntry
   * @param {string[]}sigla
   * @param {SiglaGroup[]}siglaGroups
   * @param fullSiglaInBrackets
   * @return {string}
   */
  static genSubEntryHtmlContent(style, subEntry, sigla, siglaGroups = [], fullSiglaInBrackets = false) {
    switch(style) {
      case 'la':
        return this.genSubEntryHtmlContentLatin(subEntry, sigla, siglaGroups, fullSiglaInBrackets)

      case 'ar':
        return this.genSubEntryHtmlContentArabic(subEntry, sigla, siglaGroups, fullSiglaInBrackets)

      case 'he':
        return this.genSubEntryHtmlContentHebrew(subEntry, sigla, siglaGroups, fullSiglaInBrackets)

      default:
        console.warn(`Unsupported style/language ${style}`)
        return '---'
    }
  }


  static typesetSubEntryHebrew(subEntryType, theText, witnessIndices, sigla, siglaGroups) {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens = []

    let siglaTokens = this._getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, 'he' ).map ( (t) => { return t.setBold()})
    // console.log(`Sigla tokens: `)
    // console.log(siglaTokens)

    switch(subEntryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        theTokens.push(TypesetterTokenFactory.simpleText(hebrewStyle.strings.omission, 'he').setFontSize(hebrewStyle.smallFontFactor))
        theTokens.push( TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(hebrewStyle.strings.addition, 'he').setFontSize(hebrewStyle.smallFontFactor))
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens


      case ApparatusSubEntryType.FULL_CUSTOM:
        return theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${subEntryType}`)
        return []
    }
  }

  static getKeywordString(keyword, lang) {
    let stringsObject = {}
    switch(lang) {
      case 'la':
        stringsObject = latinStyle.strings
        break

      case 'ar':
        stringsObject = arabicStyle.strings
        break

      case 'he':
        stringsObject = hebrewStyle.strings
        break
    }

    if (stringsObject[keyword] !== undefined) {
      return stringsObject[keyword]
    }
    return keyword
  }

  /**
   * Returns an array of typesetter tokens for the given keyword
   * Accepts also a FmtText array which will be converted to plain text before processing
   *
   * @param {string|FmtTextToken[]}keyword
   * @param {string}lang
   * @return {TypesetterToken}
   */
  static getKeywordTypesetterTokens(keyword, lang) {
    if (typeof keyword !== 'string') {
      keyword = FmtText.getPlainText(FmtTextFactory.fromAnything(keyword))
    }
    let keywordString = this.getKeywordString(keyword, lang)
    let fmtText = FmtTextFactory.fromAnything(keywordString)
    switch(lang) {
      case 'he':
        fmtText = fmtText.map( (token) => { return token.setFontSize(hebrewStyle.smallFontFactor)})
        break

      case 'ar':
        fmtText = fmtText.map( (token) => { return token.setFontSize(arabicStyle.smallFontFactor)})
        //token.setFontSize(arabicStyle.smallFontFactor)
        break

      default:
        fmtText = fmtText.map( (token) => { return token.setItalic()})
    }
    return (new TypesetterTokenRenderer()).render(fmtText)
  }

  static getKeywordHtml(keyword, lang) {
    let keywordString = this.getKeywordString(keyword, lang)
    switch(lang) {
      case 'ar':
      case 'he':
        return `<small>${keywordString}</small>`

      default:
        return `<i>${keywordString}</i>`
    }
  }

  /**
   *
   * @param subEntry
   * @param {string[]}sigla
   * @param {SiglaGroup[]}siglaGroups
   * @param {boolean}fullSiglaInBrackets
   * @return {string}
   */
  static genSubEntryHtmlContentHebrew(subEntry, sigla, siglaGroups, fullSiglaInBrackets) {
    let entryType = subEntry.type
    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)
    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla, 'he', siglaGroups, fullSiglaInBrackets)
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} <b>${siglaString}</b>`

      case ApparatusSubEntryType.OMISSION:
        return `${this.getKeywordHtml('omission', 'he')} <b>${siglaString}</b>`

      case ApparatusSubEntryType.ADDITION:
        return `${this.getKeywordHtml('addition', 'he')} ${theText} <b>${siglaString}</b>`

      case ApparatusSubEntryType.FULL_CUSTOM:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  static typesetSubEntryArabic(entryType, theText, witnessIndices, sigla, siglaGroups) {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens = []
    let siglaTokens = this._getSiglaTypesetterTokens(witnessIndices, sigla,siglaGroups, 'ar' )
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        theTokens.push(TypesetterTokenFactory.simpleText(arabicStyle.strings.omission, 'ar').setFontSize(arabicStyle.smallFontFactor))
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(arabicStyle.strings.addition, 'ar').setFontSize(arabicStyle.smallFontFactor))
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, siglaTokens)
        return theTokens

      case ApparatusSubEntryType.FULL_CUSTOM:
        return  theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return []
    }
  }

  /**
   *
   * @param subEntry
   * @param {string[]}sigla
   * @param {SiglaGroup[]}siglaGroups
   * @param {boolean}fullSiglaInBrackets
   * @return {string}
   */
  static genSubEntryHtmlContentArabic(subEntry, sigla, siglaGroups, fullSiglaInBrackets) {
    let entryType = subEntry.type
    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)
    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla,  'ar', siglaGroups, fullSiglaInBrackets)
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusSubEntryType.OMISSION:
        return `<small>${arabicStyle.strings.omission}</small> ${siglaString}`

      case ApparatusSubEntryType.ADDITION:
        return `<small>${arabicStyle.strings.addition}</small> ${theText} ${siglaString}`

      case ApparatusSubEntryType.FULL_CUSTOM:
        return theText

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  static _getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, lang) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let witnessData = witnessIndices.map ( (i) => { return { witnessIndex: i, hand: 0}})
    let filledUpWitnessData = this._fillUpSigla(witnessData, sigla, siglaGroups)

    // TODO: support hands:
    let siglaString = filledUpWitnessData.map( (w) => { return w.siglum}).join('')
    return [ TypesetterTokenFactory.simpleText(siglaString, lang) ]
  }


  static typesetSubEntryLatin(subEntryType, theText, witnessIndices, sigla, siglaGroups) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    // convert the text tokens to proper typesetter tokens
    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))

    let theTokens = []
    switch(subEntryType) {
      case ApparatusSubEntryType.VARIANT:
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, this._getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, 'la'))
        return theTokens

      case ApparatusSubEntryType.OMISSION:
        theTokens.push(TypesetterTokenFactory.simpleText(latinStyle.strings.omission).setItalic())
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, this._getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, 'la'))
        return theTokens

      case ApparatusSubEntryType.ADDITION:
        theTokens.push(TypesetterTokenFactory.simpleText(latinStyle.strings.addition).setItalic())
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, theTextTokens)
        theTokens.push(TypesetterTokenFactory.normalSpace())
        pushArray(theTokens, this._getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, 'la'))
        return theTokens


      case ApparatusSubEntryType.FULL_CUSTOM:
        return theTextTokens

      default:
        console.warn(`Unsupported apparatus entry type: ${subEntryType}`)
        return []
    }
  }

  static genSubEntryHtmlContentLatin(subEntry, sigla, siglaGroups, fullSiglaInBrackets) {
    let entryType = subEntry.type


    let theText = (new HtmlRenderer({plainMode: true})).render(subEntry.fmtText)

    let siglaString = this._genSiglaHtmlFromWitnessData(subEntry, sigla, 'la', siglaGroups, fullSiglaInBrackets)
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusSubEntryType.OMISSION:
        return `<i>${latinStyle.strings.omission}</i> ${siglaString}`

      case ApparatusSubEntryType.ADDITION:
        return `<i>${latinStyle.strings.addition}</i> ${theText} ${siglaString}`

      case ApparatusSubEntryType.FULL_CUSTOM:
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


  static _fillUpSigla(witnessData, sigla, siglaGroups) {
    let wData = deepCopy(witnessData)
    let wDataArray = wData.map ( (w) => {
      w.siglum = sigla[w.witnessIndex]
      return w
    })

    siglaGroups.forEach ( (sg) => {
      let siglaIndexes = wDataArray.map ( (w) => {
        // turn non-zero hands to -1 so that they are not matched by the sigla group
        return w.hand === 0 ? w.witnessIndex : -1
      })
      let matchedIndexes = sg.matchWitnesses(siglaIndexes)
      if (matchedIndexes.length !== 0) {
        // change the first matched witness to the group siglum
        let firstMatchedWitnessPosition = siglaIndexes.indexOf(matchedIndexes[0])
        //console.log(`First matched witness position in array: ${firstMatchedWitnessPosition}`)
        wDataArray[firstMatchedWitnessPosition].siglum = sg.siglum
        wDataArray[firstMatchedWitnessPosition].hand = 0
        wDataArray[firstMatchedWitnessPosition].witnessIndex = -1
        // filter out matched witnesses
        wDataArray = wDataArray.filter( (w) => {
          return matchedIndexes.indexOf(w.witnessIndex) === -1
        })
      }
    })

    return wDataArray
  }

  static __getSiglaHtmlFromFilledUpWitnessData(witnessData, numberStyle) {
    return witnessData.map ( (w) => {
      return  w.hand === 0 ? w.siglum : `${w.siglum}<sup>${this.getNumberString(w.hand+1, numberStyle)}</sup>`
    }).join('')
  }

  /**
   *
   * @param subEntry
   * @param {string[]}sigla
   * @param {string}numberStyle
   * @param {SiglaGroup[]}siglaGroups
   * @param {boolean}fullSiglaInBrackets
   * @return {string}
   * @private
   */
  static _genSiglaHtmlFromWitnessData(subEntry, sigla, numberStyle, siglaGroups, fullSiglaInBrackets = false) {

    let fullSiglumDataArray = this._fillUpSigla(subEntry.witnessData, sigla, [])
    let fullSiglaHtml = this.__getSiglaHtmlFromFilledUpWitnessData(fullSiglumDataArray, numberStyle)
    let matchedSiglumDataArray = this._fillUpSigla(subEntry.witnessData, sigla, siglaGroups)
    let matchedSiglaHtml = this.__getSiglaHtmlFromFilledUpWitnessData(matchedSiglumDataArray, numberStyle)

    if (matchedSiglaHtml === fullSiglaHtml) {
      return fullSiglaHtml
    }
    if (fullSiglaInBrackets) {
      return `${matchedSiglaHtml}  ( = ${fullSiglaHtml})`
    }
    return `<a title="= ${escapeHtml(fullSiglaHtml)}">${matchedSiglaHtml}</a>`
  }

  /**
   *
   * @param {number}n
   * @param {string}style
   * @return {string|*}
   */
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
   * @param {number} mainTextFromTokenIndex
   * @param {number} mainTextToTokenIndex
   * @param {object}newEntry
   * @param {string}lemma
   * @param {array}currentApparatusEntries
   * @param {boolean}verbose
   */
  static updateCtDataWithNewEntry(ctData, edition, mainTextFromTokenIndex, mainTextToTokenIndex, newEntry, lemma, currentApparatusEntries, verbose = false) {
    verbose && console.log(`Updated apparatus entry `)
    verbose && console.log(newEntry)

    let fromMainTextToken = edition.getMainTextToken(mainTextFromTokenIndex)
    let toMainTextToken = edition.getMainTextToken(mainTextToTokenIndex)

    let ctFromTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, fromMainTextToken.editionWitnessTokenIndex)
    let ctToTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, toMainTextToken.editionWitnessTokenIndex)

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
   * @param {string|FmtTextToken[]}lemma
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
      return FmtText.getPlainText(lemma)
    }
    if (lemmaText === '') {
      lemmaText = 'pre'
    }
    let lemmaTextWords = lemmaText.split(' ')
    // if lemmaText is short,
    if (lemmaTextWords.length <= 3) {
      return lemmaText
    }

    return  `${lemmaTextWords[0]}${separator}${lemmaTextWords[lemmaTextWords.length-1]}`
  }

  static getLemmaComponents(apparatusEntryLemma, lemmaText) {
    let separator = ''
    let custom = false
    switch(apparatusEntryLemma) {
      case '':
      case 'dash':
        separator = `${enDash}`
        break

      case 'ellipsis':
        separator = '...'
        break

      default:
        custom = true
    }
    if (custom) {
      return { type: 'custom', text:  FmtText.getPlainText(apparatusEntryLemma) }
    }
    if (lemmaText === '') {
      lemmaText = 'pre'
    }
    let lemmaTextWords = lemmaText.split(' ')
    // if lemmaText is short,
    if (lemmaTextWords.length <= 3) {
      return {
        type: 'full',
        text:  lemmaText,
        numWords: lemmaTextWords.length
      }
    }
    return {
      type: 'shortened',
      from: lemmaTextWords[0],
      separator: separator,
      to:lemmaTextWords[lemmaTextWords.length-1],
    }
  }


}