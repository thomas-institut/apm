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
import * as ApparatusSubEntryType from '../Edition/SubEntryType'
import { NumeralStyles } from '@/toolbox/NumeralStyles'
import { FmtTextUtil } from '@/lib/FmtText/FmtTextUtil'
import { TypesetterTokenRenderer } from '@/lib/FmtText/Renderer/TypesetterTokenRenderer'
import { pushArray } from '@/lib/ToolBox/ArrayUtil'
import { HtmlRenderer } from '@/lib/FmtText/Renderer/HtmlRenderer'
import { FmtTextFactory} from '@/lib/FmtText/FmtTextFactory'
import { escapeHtml } from '@/toolbox/Util'
import { ApparatusUtil } from '@/Edition/ApparatusUtil'
import * as MainTextTokenType from '@/Edition/MainTextTokenType'
import { StringCounter } from '@/toolbox/StringCounter'
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {TypesetterToken} from "@/Typesetter/TypesetterToken";
import {FmtTextToken} from "@/lib/FmtText/FmtTextToken.js";
import {MainTextToken} from "@/Edition/MainTextToken";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {WitnessDataItem} from "@/Edition/WitnessDataItem";


export interface MainTextTypesettingInfo {
  yPositions: number[],
  tokens: MainTextToken[],
  lineMap: PositionToLineMapEntry[],
}

export interface PositionToLineMapEntry   {
  pY: number,
  line: number,
}

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
  static genSubEntryHtmlContent(style: string, subEntry: ApparatusSubEntry, sigla: string[], siglaGroups: SiglaGroup[] = [], fullSiglaInBrackets = false): string {
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

  static typesetSubEntryHebrew(subEntryType: string, theText: string, witnessIndices: number[], sigla: string[], siglaGroups: SiglaGroup[]): TypesetterToken[] {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens: TypesetterToken[] = []

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

  static getKeywordString(keyword: string, lang: string): string {
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

    // @ts-expect-error Using array access
    if (stringsObject[keyword] !== undefined) {
      // @ts-expect-error Using array access
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
  static getKeywordTypesetterTokens(keyword: FmtTextToken[] | string, lang: string): TypesetterToken[] {
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

  static getKeywordHtml(keyword: string, lang: string) {
    let keywordString = this.getKeywordString(keyword, lang)
    switch(lang) {
      case 'ar':
      case 'he':
        return `<small>${keywordString}</small>`

      default:
        return `<i>${keywordString}</i>`
    }
  }

  static getForcedTextDirectionSpace(textDirection: string) {
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
  static genSubEntryHtmlContentHebrew(subEntry: ApparatusSubEntry, sigla: string[], siglaGroups: SiglaGroup[], fullSiglaInBrackets: boolean): string {
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

  static typesetSubEntryArabic(entryType: string, theText: string, witnessIndices: number[], sigla: string[], siglaGroups: SiglaGroup[]): TypesetterToken[] {
    // TODO: use witnessData instead of witnessIndices, like in the html version

    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))
    let theTokens: TypesetterToken[] = []
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
  static genSubEntryHtmlContentArabic(subEntry: ApparatusSubEntry, sigla: string[], siglaGroups: SiglaGroup[], fullSiglaInBrackets: boolean): string {
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

  static _getSiglaTypesetterTokens(witnessIndices: number[], sigla: string[], siglaGroups: SiglaGroup[], lang: string) : TypesetterToken[] {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    let witnessData = witnessIndices.map ( (i) => { return { witnessIndex: i, hand: 0}})
    let filledUpWitnessData = ApparatusUtil.getSiglaData(witnessData, sigla, siglaGroups)

    // TODO: support hands:
    let siglaString = filledUpWitnessData.map( (w) => { return w.siglum}).join('')
    return [ TypesetterTokenFactory.simpleText(siglaString, lang) ]
  }


  static typesetSubEntryLatin(subEntryType: string, theText: string, witnessIndices: number[], sigla: string[], siglaGroups: SiglaGroup[] ): TypesetterToken[] {
    // TODO: use witnessData instead of witnessIndices, like in the html version
    // let siglaString = witnessIndices.map( (i) => { return sigla[i]}).join('')
    // convert the text tokens to proper typesetter tokens
    let theTextTokens = (new TypesetterTokenRenderer()).render(FmtTextFactory.fromAnything(theText))

    let theTokens: TypesetterToken[] = []
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

  static genSubEntryHtmlContentLatin(subEntry: ApparatusSubEntry, sigla: string[], siglaGroups: SiglaGroup[], fullSiglaInBrackets: boolean) {
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

  static __getSiglaHtmlFromFilledUpWitnessData(witnessData: WitnessDataItem[], numberStyle: string) {
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
  static _genSiglaHtmlFromWitnessData(subEntry: ApparatusSubEntry, sigla: string[], numberStyle: string, siglaGroups: SiglaGroup[], fullSiglaInBrackets: boolean = false): string {

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
  static getNumberString(n: number, style: string): string {
    if (n < 0) {
      return '???'
    }
    if (style === 'ar') {
      return NumeralStyles.toDecimalArabic(n)
    }
    return NumeralStyles.toDecimalWestern(n)
  }


  /**
   * Returns an object with information about line and y positions for every
   * token in the given main text token array
   *
   * @param {string}containerSelector
   * @param {string}classPrefix The class that identifies a token in the DOM
   * @param {[]}tokens
   * @returns {{lineMap: *[], yPositions: *[], tokens: *[]}}
   */
  static getMainTextTypesettingInfo(containerSelector: string, classPrefix: string, tokens: MainTextToken[]): MainTextTypesettingInfo {
    let yPositions: number[] = []
    let tokensWithInfo = tokens.map( (token, i) => {
      if (token.type === MainTextTokenType.PARAGRAPH_END) {
        return token
      }
      let span = $(`${containerSelector} .${classPrefix}${i}`)
      let position = span.offset();
      if (position === undefined) {
        throw new Error(`Position for token ${i} not found in DOM`)
      }
      let pY = position.top
      yPositions.push(pY)
      token.x = position.left
      token.y = pY
      return token
    })

    let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
    let lineMap = calculateYPositionToLineMap(yPositions);

    let tokensWithLineNumbers = tokensWithInfo.map( (t) => {
      // @ts-expect-error y is guaranteed to be defined at this point
      t.lineNumber = getLineNumber(t.y, lineMap)
      return t
    })
    // get the occurrence number in each line
    let currentLine = -1
    let tokensWithOccurrencesInfo: MainTextToken[] = []
    let occurrenceInLineCounter = new StringCounter()
    let currentLineTokens: MainTextToken[] = []
    tokensWithLineNumbers.forEach( (t) => {
      if (t.lineNumber !== currentLine) {
        currentLineTokens = currentLineTokens.map( (t) => {
          if (t.type === MainTextTokenType.TEXT) {
            t.numberOfOccurrencesInLine = occurrenceInLineCounter.getCount(t.getPlainText())
          }
          return t
        })
        tokensWithOccurrencesInfo.push(...currentLineTokens);
        occurrenceInLineCounter.reset()
        currentLineTokens = []
        if (t.lineNumber === undefined) {
          throw new Error("Line number not found for token, this should never happen")
        }
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
  static getLineNumberString(apparatusEntry: ApparatusEntry, mainTextTypesettingInfo: MainTextTypesettingInfo, lang: string): string {
    if (mainTextTypesettingInfo.tokens[apparatusEntry.from] === undefined) {
      // before the main text
      return ApparatusCommon.getNumberString(1, lang)
    }

    let startLine = mainTextTypesettingInfo.tokens[apparatusEntry.from].lineNumber
    let endLine = mainTextTypesettingInfo.tokens[apparatusEntry.to] === undefined ? -1 :
      mainTextTypesettingInfo.tokens[apparatusEntry.to].lineNumber

    if (startLine === undefined || endLine === undefined) {
      console.warn(`Line number data not found for apparatus entry ${apparatusEntry.from}-${apparatusEntry.to}, this should never happen`);
      return '???'
    }
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
  static getOccurrenceInLine(mainTextTokenIndex: number, mainTextTypesettingInfo: MainTextTypesettingInfo): number {
    if (mainTextTypesettingInfo.tokens[mainTextTokenIndex] === undefined) {
      return 1
    }
    return mainTextTypesettingInfo.tokens[mainTextTokenIndex].occurrenceInLine ?? 1
  }

  /**
   *
   * @param mainTextIndex
   * @param tokensWithTypesetInfo
   * @returns {number}
   */
  static getTotalOccurrencesInLine(mainTextIndex: number, tokensWithTypesetInfo: MainTextToken[]): number {
    if (tokensWithTypesetInfo[mainTextIndex] === undefined) {
      return 1
    }
    return tokensWithTypesetInfo[mainTextIndex].numberOfOccurrencesInLine ?? 1
  }

  static getLemmaHtml(apparatusEntry: ApparatusEntry, mainTextTypesettingInfo: MainTextTypesettingInfo, lang: string): string {

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


function calculateYPositionToLineMap(yPositions: number[], textSizeInPixels = 16) : PositionToLineMapEntry[] {
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


function getLineNumber(y: number, lineMap: PositionToLineMapEntry[]) {
  for(let i = 0; i < lineMap.length; i++) {
    if (y === lineMap[i].pY) {
      return lineMap[i].line
    }
  }
  return -1
}