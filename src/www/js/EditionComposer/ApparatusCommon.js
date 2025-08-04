/*
 *  Copyright (C) 2021-24 Universität zu Köln
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


import { TypesetterTokenFactory } from '@/Typesetter/TypesetterTokenFactory'
import * as ApparatusSubEntryType from '../Edition/SubEntryType.mjs'
import { NumeralStyles } from '../toolbox/NumeralStyles.mjs'
import { FmtTextUtil } from '../FmtText/FmtTextUtil.mjs'
import { TypesetterTokenRenderer } from '@/FmtText/Renderer/TypesetterTokenRenderer'
import { pushArray } from '../toolbox/ArrayUtil.mjs'
import { HtmlRenderer } from '@/FmtText/Renderer/HtmlRenderer'
import { FmtTextFactory} from '../FmtText/FmtTextFactory.mjs'
import { escapeHtml } from '../toolbox/Util.mjs'
import { ApparatusUtil } from '../Edition/ApparatusUtil.mjs'
import * as MainTextTokenType from '../Edition/MainTextTokenType.mjs'
import { StringCounter } from '../toolbox/StringCounter.mjs'


// const enDash = String.fromCodePoint(0x2013)

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

/**
 * Static methods for typesetting an apparatus in the browser
 */
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
   * Returns an array of typesetter tokens for the given keyword.
   *
   * Accepts also a FmtText array which will be converted to plain text before processing
   *
   * @param {FmtText} keyword
   * @param {string}lang
   * @return {TypesetterToken}
   */
  static getKeywordTypesetterTokens(keyword, lang) {
    keyword = FmtTextUtil.getPlainText(keyword)
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

  static getForcedTextDirectionSpace(textDirection) {
    return `<span class="force-${textDirection}">&nbsp;</span>`
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
    let textDirection = 'rtl'
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText}${this.getForcedTextDirectionSpace(textDirection)}<b>${siglaString}</b>`

      case ApparatusSubEntryType.OMISSION:
        return `${this.getKeywordHtml('omission', 'he')}${this.getForcedTextDirectionSpace(textDirection)}<b>${siglaString}</b>`

      case ApparatusSubEntryType.ADDITION:
        return `${this.getKeywordHtml('addition', 'he')} ${theText}${this.getForcedTextDirectionSpace(textDirection)}<b>${siglaString}</b>`

      case ApparatusSubEntryType.FULL_CUSTOM:
        let keywordHtml = ''
        switch (subEntry.keyword) {
          case 'omission':
          case 'addition':
            keywordHtml= `${this.getKeywordHtml(subEntry.keyword, 'he')} `
        }
        let siglaHtml = ''
        if (siglaString !== '') {
          siglaHtml = `${this.getForcedTextDirectionSpace(textDirection)}<span class="force-rtl"><b>${siglaString}</b></span>`
        }
        return `${keywordHtml}${theText}${siglaHtml}`

      case ApparatusSubEntryType.AUTO_FOLIATION:
        return `${theText}${this.getForcedTextDirectionSpace(textDirection)}<b>${siglaString}</b>`;

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
    let textDirection = 'rtl'
    switch(entryType) {
      case ApparatusSubEntryType.VARIANT:
        return `${theText} ${siglaString}`

      case ApparatusSubEntryType.OMISSION:
        return `<small>${arabicStyle.strings.omission}</small> ${siglaString}`

      case ApparatusSubEntryType.ADDITION:
        return `<small>${arabicStyle.strings.addition}</small> ${theText} ${siglaString}`

      case ApparatusSubEntryType.FULL_CUSTOM:
        let keywordHtml = ''
        switch (subEntry.keyword) {
          case 'omission':
          case 'addition':
            keywordHtml= `${this.getKeywordHtml(subEntry.keyword, 'ar')} `
        }
        let siglaHtml = ''
        if (siglaString !== '') {
          siglaHtml = `${this.getForcedTextDirectionSpace(textDirection)}<span class="force-rtl">${siglaString}</span>`
        }
        return `${keywordHtml}${theText}${siglaHtml}`

      case ApparatusSubEntryType.AUTO_FOLIATION:
        return `${theText}${this.getForcedTextDirectionSpace(textDirection)}<b>${siglaString}</b>`;

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  static _getSiglaTypesetterTokens(witnessIndices, sigla, siglaGroups, lang) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let witnessData = witnessIndices.map ( (i) => { return { witnessIndex: i, hand: 0}})
    let filledUpWitnessData = ApparatusUtil.getSiglaData(witnessData, sigla, siglaGroups)

    // TODO: support hands:
    let siglaString = filledUpWitnessData.map( (w) => { return w.siglum}).join('')
    return [ TypesetterTokenFactory.simpleText(siglaString, lang) ]
  }


  static typesetSubEntryLatin(subEntryType, theText, witnessIndices, sigla, siglaGroups) {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    // let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
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
        let keywordHtml = ''
        switch (subEntry.keyword) {
          case 'omission':
          case 'addition':
            keywordHtml= `<i>${latinStyle.strings[subEntry.keyword]}</i> `
        }
        return `${keywordHtml}${theText} ${siglaString}`

      case ApparatusSubEntryType.AUTO_FOLIATION:
        return `${theText}<b>${siglaString}</b>`;

      default:
        console.warn(`Unsupported apparatus entry type: ${entryType}`)
        return '???'
    }
  }

  // static findNonEmptyMainTextToken(ctIndex, ctToMainTextMap, mainTextTokens, forward, lang = '') {
  //   while (ctIndex >= 0 && ctIndex < ctToMainTextMap.length && (
  //     ctToMainTextMap[ctIndex] === -1 ||
  //     Punctuation.stringIsAllPunctuation(mainTextTokens[ctToMainTextMap[ctIndex]]['text'], lang)) ) {
  //     ctIndex = forward ? ctIndex + 1 : ctIndex -1
  //   }
  //   if (ctIndex < 0 || ctIndex >= ctToMainTextMap.length) {
  //     return -1
  //   }
  //   return ctToMainTextMap[ctIndex]
  // }

  static __getSiglaHtmlFromFilledUpWitnessData(witnessData, numberStyle) {
    return witnessData.map ( (w) => {
      if (w.hand === 0 && !w.forceHandDisplay) {
        return w.siglum
      }
      return `${w.siglum}<sup>${this.getNumberString(w.hand+1, numberStyle)}</sup>`
    }).join('')
  }

  /**
   *
   * @param {ApparatusSubEntry}subEntry
   * @param {string[]}sigla
   * @param {string}numberStyle
   * @param {SiglaGroup[]}siglaGroups
   * @param {boolean}fullSiglaInBrackets
   * @return {string}
   * @private
   */
  static _genSiglaHtmlFromWitnessData(subEntry, sigla, numberStyle, siglaGroups, fullSiglaInBrackets = false) {

    if (subEntry.witnessData.length === 0) {
      return ''
    }

    let fullSiglumDataArray = ApparatusUtil.getSiglaData(subEntry.witnessData, sigla, [])
    let fullSiglaHtml = this.__getSiglaHtmlFromFilledUpWitnessData(fullSiglumDataArray, numberStyle)
    let matchedSiglumDataArray = ApparatusUtil.getSiglaData(subEntry.witnessData, sigla, siglaGroups)
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
   * @return {string}
   */
  static getNumberString(n, style) {
    if (style === 'ar') {
      return NumeralStyles.toDecimalArabic(n)
    }
    return NumeralStyles.toDecimalWestern(n)
  }

  /**
   *
   * @param {CtDataInterface}ctData
   * @param {Edition}edition
   * @param {number} mainTextFromTokenIndex
   * @param {number} mainTextToTokenIndex
   * @param {object}newEntry
   * @param {string}lemma
   * @param {array}currentApparatusEntries
   * @param {boolean}verbose
   */
  // static updateCtDataWithNewEntry(ctData, edition, mainTextFromTokenIndex, mainTextToTokenIndex, newEntry, lemma, currentApparatusEntries, verbose = false) {
  //   verbose && console.log(`Updated apparatus entry `)
  //   verbose && console.log(newEntry)
  //
  //   let fromMainTextToken = edition.getMainTextToken(mainTextFromTokenIndex)
  //   let toMainTextToken = edition.getMainTextToken(mainTextToTokenIndex)
  //
  //   let ctFromTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, fromMainTextToken.editionWitnessTokenIndex)
  //   let ctToTokenIndex = CtData.getCtIndexForEditionWitnessTokenIndex(ctData, toMainTextToken.editionWitnessTokenIndex)
  //
  //   verbose && console.log(`CT range: ${ctFromTokenIndex} - ${ctToTokenIndex}`)
  //   if (newEntry.isNew) {
  //     if (FmtTextUtil.getPlainText(newEntry.text) !== '') {
  //       ctData = CtData.addCustomApparatusTextSubEntry(ctData,
  //         newEntry.apparatus,
  //         ctFromTokenIndex,
  //         ctToTokenIndex,
  //         lemma,
  //         newEntry
  //       )
  //     }
  //   } else {
  //     if (FmtTextUtil.getPlainText(newEntry.text) === '') {
  //       console.log(`Deleting current custom entry`)
  //       ctData = CtData.deleteCustomApparatusTextSubEntries(ctData,
  //         newEntry.apparatus,
  //         ctFromTokenIndex,
  //         ctToTokenIndex
  //       )
  //     } else {
  //       console.log('Updating custom entry....')
  //       // just add and delete, perhaps do something more sophisticated later
  //       ctData = CtData.deleteCustomApparatusTextSubEntries(ctData,
  //         newEntry.apparatus,
  //         ctFromTokenIndex,
  //         ctToTokenIndex
  //       )
  //       ctData = CtData.addCustomApparatusTextSubEntry(ctData,
  //         newEntry.apparatus,
  //         ctFromTokenIndex,
  //         ctToTokenIndex,
  //         lemma,
  //         newEntry
  //       )
  //     }
  //   }
  //
  //   if (newEntry.changesInEnabledEntries) {
  //     console.log(`Changes in enabled entries`)
  //     newEntry.enabledEntriesArray.forEach( (enabled, i) => {
  //       if (currentApparatusEntries[newEntry.apparatusIndex][i].enabled !== enabled) {
  //         console.log(`Apparatus sub entry ${i} enabled change to ${enabled}`)
  //         let theHash = currentApparatusEntries[newEntry.apparatusIndex][i].hashString()
  //         CtData.changeEnableStatusForSubEntry(ctData,
  //           newEntry.apparatus,
  //           ctFromTokenIndex,
  //           ctToTokenIndex,
  //           theHash,
  //           enabled,
  //           lemma
  //         )
  //       }
  //     })
  //   }
  //
  //   return ctData
  // }

  /**
   *
   * @param {string|FmtTextToken[]}lemma
   * @param {string}lemmaText
   */
  //  static getLemmaString(lemma, lemmaText) {
  //   let separator = ''
  //   let custom = false
  //   switch(lemma) {
  //     case '':
  //     case 'dash':
  //       separator = ` ${enDash} `
  //       break
  //
  //     case 'ellipsis':
  //       separator = '...'
  //       break
  //
  //     default:
  //       custom = true
  //   }
  //   if (custom) {
  //     return FmtTextUtil.getPlainText(lemma)
  //   }
  //   if (lemmaText === '') {
  //     lemmaText = 'pre'
  //   }
  //   let lemmaTextWords = lemmaText.split(' ')
  //   // if lemmaText is short,
  //   if (lemmaTextWords.length <= 3) {
  //     return lemmaText
  //   }
  //
  //   return  `${lemmaTextWords[0]}${separator}${lemmaTextWords[lemmaTextWords.length-1]}`
  // }

  /**
   * Returns an object with information about line and y positions for every
   * token in the given main text token array
   *
   * @param {string}containerSelector
   * @param {string}classPrefix The class that identifies a token in the DOM
   * @param {[]}tokens
   * @returns {{lineMap: *[], yPositions: *[], tokens: *[]}}
   */
  static getMainTextTypesettingInfo(containerSelector, classPrefix, tokens) {
    let yPositions = []
    let tokensWithInfo = tokens.map( (token, i) => {
      if (token.type === MainTextTokenType.PARAGRAPH_END) {
        return token
      }
      let span = $(`${containerSelector} .${classPrefix}${i}`)
      let position = span.offset()
      let pY = position.top
      yPositions.push(pY)
      token.x = position.left
      token.y = pY
      return token
    })

    let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
    let lineMap = calculateYPositionToLineMap(yPositions);

    let tokensWithLineNumbers = tokensWithInfo.map( (t) => {
      t.lineNumber = getLineNumber(t.y, lineMap)
      return t
    })
    // get the occurrence number in each line
    let currentLine = -1
    let tokensWithOccurrencesInfo = []
    let occurrenceInLineCounter = new StringCounter()
    let currentLineTokens = []
    tokensWithLineNumbers.forEach( (t) => {
      if (t.lineNumber !== currentLine) {
        currentLineTokens = currentLineTokens.map( (t) => {
          if (t.type === MainTextTokenType.TEXT) {
            t.numberOfOccurrencesInLine = occurrenceInLineCounter.getCount(t.getPlainText())
          }
          return t
        })
        pushArray(tokensWithOccurrencesInfo, currentLineTokens)
        occurrenceInLineCounter.reset()
        currentLineTokens = []
        currentLine = t.lineNumber
      }
      if (t.type === MainTextTokenType.TEXT ) {
        let text = t.getPlainText()
        occurrenceInLineCounter.addString(text)
        t.occurrenceInLine = occurrenceInLineCounter.getCount(text)
      }
      currentLineTokens.push(t)
    })
    if (currentLineTokens.length > 0) {
      currentLineTokens = currentLineTokens.map( (t) => {
        if (t.type === MainTextTokenType.TEXT) {
          t.numberOfOccurrencesInLine = occurrenceInLineCounter.getCount(t.getPlainText())
        }
        return t
      })
      pushArray(tokensWithOccurrencesInfo, currentLineTokens)
    }

    return { yPositions: uniqueYPositions, tokens: tokensWithOccurrencesInfo, lineMap: lineMap }

  }

  /**
   * Returns a string with the line number or line number range corresponding to the
   * given apparatus entry in the given language.
   *
   * @param apparatusEntry
   * @param mainTextTypesettingInfo
   * @param {string}lang
   * @returns {string}
   */
  static getLineNumberString(apparatusEntry, mainTextTypesettingInfo, lang) {
    if (mainTextTypesettingInfo.tokens[apparatusEntry.from] === undefined) {
      // before the main text
      return ApparatusCommon.getNumberString(1, lang)
    }

    let startLine = mainTextTypesettingInfo.tokens[apparatusEntry.from].lineNumber
    let endLine = mainTextTypesettingInfo.tokens[apparatusEntry.to] === undefined ? '???' :
      mainTextTypesettingInfo.tokens[apparatusEntry.to].lineNumber

    if (startLine === endLine) {
      return ApparatusCommon.getNumberString(startLine, lang)
    }
    return `${ApparatusCommon.getNumberString(startLine, lang)}-${ApparatusCommon.getNumberString(endLine, lang)}`
  }

  /**
   *
   * @param mainTextTokenIndex
   * @param mainTextTypesettingInfo
   * @returns {number}
   */
  static getOccurrenceInLine(mainTextTokenIndex, mainTextTypesettingInfo) {
    if (mainTextTypesettingInfo.tokens[mainTextTokenIndex] === undefined) {
      return 1
    }
    return mainTextTypesettingInfo.tokens[mainTextTokenIndex].occurrenceInLine
  }

  /**
   *
   * @param mainTextIndex
   * @param tokensWithTypesetInfo
   * @returns {number}
   */
  static getTotalOccurrencesInLine(mainTextIndex, tokensWithTypesetInfo) {
    if (tokensWithTypesetInfo[mainTextIndex] === undefined) {
      return 1
    }
    return tokensWithTypesetInfo[mainTextIndex].numberOfOccurrencesInLine
  }

  static getLemmaHtml(apparatusEntry, mainTextTypesettingInfo, lang) {

    let lemmaComponents = ApparatusUtil.getLemmaComponents(apparatusEntry.lemma, apparatusEntry.lemmaText)

    switch(lemmaComponents.type) {
      case 'custom':
        return lemmaComponents.text

      case 'full':
        let lemmaNumberString = ''
        if (lemmaComponents.numWords === 1) {
          let occurrenceInLine = this.getOccurrenceInLine(apparatusEntry.from, mainTextTypesettingInfo)
          let numberOfOccurrencesInLine = this.getTotalOccurrencesInLine(apparatusEntry.from, mainTextTypesettingInfo.tokens)
          if (numberOfOccurrencesInLine > 1) {
            lemmaNumberString = `<sup>${this.getNumberString(occurrenceInLine, lang)}</sup>`
          }
        }
        return `${lemmaComponents.text}${lemmaNumberString}`

      case 'shortened':
        let lemmaNumberStringFrom = ''
        let occurrenceInLineFrom = this.getOccurrenceInLine(apparatusEntry.from, mainTextTypesettingInfo)
        let numberOfOccurrencesInLineFrom = this.getTotalOccurrencesInLine(apparatusEntry.from, mainTextTypesettingInfo.tokens)
        if (numberOfOccurrencesInLineFrom > 1) {
          lemmaNumberStringFrom = `<sup>${this.getNumberString(occurrenceInLineFrom, lang)}</sup>`
        }
        let lemmaNumberStringTo = ''
        let occurrenceInLineTo = this.getOccurrenceInLine(apparatusEntry.to, mainTextTypesettingInfo)
        let numberOfOccurrencesInLineTo = this.getTotalOccurrencesInLine(apparatusEntry.to, mainTextTypesettingInfo.tokens)
        if (numberOfOccurrencesInLineTo > 1) {
          lemmaNumberStringTo = `<sup>${this.getNumberString(occurrenceInLineTo, lang)}</sup>`
        }
        return `${lemmaComponents.from}${lemmaNumberStringFrom}${lemmaComponents.separator}${lemmaComponents.to}${lemmaNumberStringTo}`

      default:
        console.warn(`Unknown lemma component type '${lemmaComponents.type}'`)
        return 'ERROR'
    }
  }

}


function calculateYPositionToLineMap(yPositions, textSizeInPixels = 16) {
  let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
  let halfTextSize = textSizeInPixels / 2
  let currentYPosition = -1000
  let currentLine = 0
  let yPositionToLineMap = []
  for (let i = 0; i < uniqueYPositions.length; i++) {
    if (uniqueYPositions[i] > (currentYPosition + halfTextSize)) {
      currentYPosition = uniqueYPositions[i]
      currentLine++
    }
    yPositionToLineMap.push({ pY: uniqueYPositions[i], line: currentLine})
  }
  return yPositionToLineMap
}


function getLineNumber(y, lineMap) {
  for(let i = 0; i < lineMap.length; i++) {
    if (y === lineMap[i].pY) {
      return lineMap[i].line
    }
  }
  return -1
}