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

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { Edition } from './Edition.mjs'
import { Typesetter } from '../Typesetter/Typesetter'
import {FmtTextFactory} from '../FmtText/FmtTextFactory.mjs'

import * as MainTextTokenType from './MainTextTokenType.mjs'
import { TypesetterTokenFactory } from '../Typesetter/TypesetterTokenFactory'
import { TypesetterTokenRenderer } from '../FmtText/Renderer/TypesetterTokenRenderer'
import { getTextDirectionForLang, removeExtraWhiteSpace } from '../toolbox/Util.mjs'
import { pushArray } from '../toolbox/ArrayUtil.mjs'
import { ApparatusCommon } from '../EditionComposer/ApparatusCommon.js'

import * as SubEntryType from './SubEntryType.mjs'
import { FmtText } from '../FmtText/FmtText.mjs'

import * as VerticalAlign from '../FmtText/VerticalAlign.mjs'
import * as FontSize from '../FmtText/FontSize.mjs'
import * as HorizontalAlign from '../Typesetter/HorizontalAlign'
import { MainText } from './MainText.mjs'
import { Paragraph } from '../Typesetter/Paragraph'
import { ApparatusUtil } from './ApparatusUtil.mjs'

const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)



export class EditionViewerSvg {

  constructor (options) {

    let optionsDefinition = {
      edition: { type: 'object', objectClass: Edition, required: true },
      fontFamily:  { type: 'NonEmptyString', required: true},

      entrySeparator: { type: 'string', default: verticalLine},
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine},
      pageWidthInCm: { type: 'NumberGreaterThanZero', default: 21},
      pageHeightInCm: { type: 'NumberGreaterThanZero', default: 29.7},
      marginInCm: {type: 'object', default: {
          top: 2,
          left: 3,
          bottom: 1,
          right: 3
        }},
      mainTextFontSizeInPts: { type: 'NumberGreaterThanZero', default: 12},
      lineNumbersFontSizeMultiplier: { type: 'NumberGreaterThanZero', default: 0.8},
      apparatusFontSizeInPts: { type: 'NumberGreaterThanZero', default: 10},
      mainTextLineHeightInPts: { type: 'NumberGreaterThanZero', default: 15},
      apparatusLineHeightInPts: { type: 'NumberGreaterThanZero', default: 12},
      normalSpaceWidthInEms: { type: 'NumberGreaterThanZero', default: 0.33},
      textToLineNumbersInCm: { type: 'NumberGreaterThanZero', default: 0.5},
      textToApparatusInCm: { type: 'NumberGreaterThanZero', default: 1.5},
      interApparatusInCm: { type: 'NumberGreaterThanZero', default: 0.5}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'EditionViewer'})
    this.options = oc.getCleanOptions(options)
    this.edition = this.options.edition

    this.geometry = {
      lineWidth: Typesetter.cm2px(this.options.pageWidthInCm -
        this.options.marginInCm.left - this.options.marginInCm.right),
      mainTextLineHeight: Typesetter.pt2px(this.options.mainTextLineHeightInPts),
      mainTextFontSize: Typesetter.pt2px(this.options.mainTextFontSizeInPts),
      apparatusLineHeight: Typesetter.pt2px(this.options.apparatusLineHeightInPts),
      apparatusFontSize: Typesetter.pt2px(this.options.apparatusFontSizeInPts),
      margin: {
        top: Typesetter.cm2px(this.options.marginInCm.top),
        left: Typesetter.cm2px(this.options.marginInCm.left),
        bottom: Typesetter.cm2px(this.options.marginInCm.bottom),
        right: Typesetter.cm2px(this.options.marginInCm.right)
      },
      textToLineNumbers: Typesetter.cm2px(this.options.textToLineNumbersInCm),
      textToApparatus: Typesetter.cm2px(this.options.textToApparatusInCm),
      interApparatus: Typesetter.cm2px(this.options.interApparatusInCm),
      normalSpaceWidthInEms: this.options.normalSpaceWidthInEms
    }
    // console.log(`SVG Geometry`)
    // console.log(this.geometry)
  }

  /**
   *
   *
   * @return {string}
   */
  getSvg() {

    let textDirection = getTextDirectionForLang(this.edition.lang)
    let svgClass = 'edition-svg'

    // 1. Typeset the main text
    let mainTextTypesetter = new Typesetter({
      lang: this.edition.lang,
      lineWidth: this.geometry.lineWidth,
      lineHeight: this.geometry.mainTextLineHeight,
      defaultFontSize: this.geometry.mainTextFontSize,
      lineNumbersFontSizeMultiplier:  this.options.lineNumbersFontSizeMultiplier,
      rightToLeft: textDirection === 'rtl',
      defaultFontFamily: this.options.fontFamily,
      normalSpaceWidth: this.options.normalSpaceWidthInEms,
      lineNumberStyle: this.edition.lang
    })

    let mainTextParagraphsToTypeset = this._getTypesetterParagraphsForMainText()
    console.log(`MainTextParagraphsToTypeset`)
    console.log(mainTextParagraphsToTypeset)
    let mainTextTypesetTokens = mainTextTypesetter.typesetParagraphs(mainTextParagraphsToTypeset)
    console.log(`typesetTokens`)
    console.log(mainTextTypesetTokens)

    let mainTextToTypesetterTokensMap = this._genMainTokenIndexToTypesetterTokenMap(this.edition.mainText, mainTextTypesetTokens)
    // console.log(`mainTextToTypesetterTokensMap`)
    // console.log(mainTextToTypesetterTokensMap)

    // 2. Typeset the apparatuses
    let apparatusTypesetter = new Typesetter({
      lang: this.edition.lang,
      lineWidth: this.geometry.lineWidth,
      lineHeight: this.geometry.apparatusLineHeight,
      defaultFontSize: this.geometry.apparatusFontSize,
      rightToLeft: textDirection === 'rtl',
      defaultFontFamily: this.options.fontFamily,
      normalSpaceWidth: this.options.normalSpaceWidthInEms
    })

    let apparatusesTypesetTokens = this.edition.apparatuses.map( (app) => {
      let apparatusParagraph = new Paragraph()
      apparatusParagraph.setLineHeight(this.geometry.apparatusLineHeight)
        .setTokens(this._getTypesetterTokensForApparatus(app, mainTextTypesetTokens, mainTextToTypesetterTokensMap))

      return apparatusTypesetter.typesetParagraphs([apparatusParagraph])
    })
    let apparatusHeights = apparatusesTypesetTokens.map( (tokens) => { return apparatusTypesetter.getTextHeight(tokens)})
    let totalApparatusHeight = apparatusHeights.reduce( (x, y) => { return x+y})

    // console.log(`ApparatusHeights`)
    // console.log(apparatusHeights)
    // console.log(`Total: ${totalApparatusHeight}`)

    // 3. Generate SVG
    let mainTextHeight = mainTextTypesetter.getTextHeight(mainTextTypesetTokens)
    let mainTextWidth = mainTextTypesetter.getTextWidth()

    let numberNonEmptyApparatuses = apparatusesTypesetTokens.filter( (app) => {return app.length !== 0}).length

    let svgHeight = this.geometry.margin.top + mainTextHeight + this.geometry.textToApparatus +
    (this.geometry.interApparatus * numberNonEmptyApparatuses) + totalApparatusHeight + this.geometry.margin.bottom
    // console.log(`SVG height in px: ${svgHeight}`)




    svgHeight = Math.max(Typesetter.px2cm(svgHeight), this.options.pageHeightInCm)
    // console.log(`SVG height in cm: ${svgHeight}`)

    let svgWidth = this.options.pageWidthInCm

    // let svgHeightInPx = Typesetter2.cm2px(svgHeight)
    // let svgWidthInPx = Typesetter2.cm2px(svgWidth)


    let svg = `<svg class="${svgClass}" height="${svgHeight}cm" width="${svgWidth}cm">`

    svg += "<!-- Text tokens -->\n"
    svg += `<g font-size="${this.geometry.mainTextFontSize}" font-family="${this.options.fontFamily}" fill="#000000">`


    for(const token of mainTextTypesetTokens) {
      let tokenSvg = mainTextTypesetter.genTokenSvg(this.geometry.margin.left, this.geometry.margin.top, token, false, false)
      if (tokenSvg !== '') {
        svg += tokenSvg
      }
    }
    svg += "</g>\n"

    // // line numbers
    let typesetLineNumbers = mainTextTypesetter.typesetLineNumbers(mainTextTypesetTokens,5)


    svg += "<!-- Line numbers -->\n"
    let lineNumbersX = this.geometry.margin.left - this.geometry.textToLineNumbers
    if (textDirection === 'rtl') {
      lineNumbersX = this.geometry.margin.left + mainTextWidth + this.geometry.textToLineNumbers
    }
    svg += `<g font-size="${this.geometry.mainTextFontSize * this.options.lineNumbersFontSizeMultiplier}" font-family="${this.options.fontFamily}" fill="#000000">\n`
    for(const token of typesetLineNumbers) {
      let tokenSvg = mainTextTypesetter.genTokenSvg(lineNumbersX, this.geometry.margin.top, token, false, false)
      if (tokenSvg !== '') {
        svg += "\t\t" +  tokenSvg + "\n"
      }
    }
    svg += "\n</g>\n"

    // apparatuses

    let apparatusY = this.geometry.margin.top + mainTextHeight + this.geometry.textToApparatus
    apparatusesTypesetTokens.forEach( (tokens, index) => {
      if (index !== 0) {
        apparatusY += apparatusHeights[index-1]
        apparatusY += this.geometry.interApparatus
      }
      svg += `<!-- Apparatus ${index} -->\n`
      if (tokens.length === 0) {
        svg += `<!-- empty -->`
        return
      }

      if (textDirection === 'rtl') {
        svg += '<line x1="' + (mainTextTypesetter.getTextWidth() + this.geometry.margin.left) + '" y1="' + (apparatusY - 5) + '" ' +
          'x2="' + (mainTextTypesetter.getTextWidth() + this.geometry.margin.left - 50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
      } else {
        svg += '<line x1="' + this.geometry.margin.left + '" y1="' + (apparatusY - 5) + '" ' +
          'x2="' + (this.geometry.margin.left+50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
      }
      svg += "\n"
      svg += `<g font-size="${this.geometry.apparatusFontSize}" font-family="${this.options.fontFamily}" fill="#000000">\n`
      tokens.forEach( (token) => {
        let tokenSvg = mainTextTypesetter.genTokenSvg(this.geometry.margin.left, apparatusY, token, false, false)
        if (tokenSvg !== '') {
          svg += "\t\t" + mainTextTypesetter.genTokenSvg(this.geometry.margin.left, apparatusY, token, false, false) + "\n"
        }
      })
      svg += "\n</g>\n"
    })

    svg += '</svg>'
    return svg
  }

  /**
   *
   * @param {string|number} lineNumber
   * @return {string}
   * @private
   */
  _getLineNumberString(lineNumber) {
    if (isNaN(lineNumber)) {
      return lineNumber
    }
    return ApparatusCommon.getNumberString(lineNumber, this.edition.lang)
  }

  __getOccurrenceInLine(index, tsTokens, map) {
    if ( tsTokens[map[index]] === undefined) {
      return 1
    }
    return tsTokens[map[index]].occurrenceInLine
  }

  __getTotalOccurrencesInLine(index, tsTokens, map) {
    if ( tsTokens[map[index]] === undefined) {
      return 1
    }
    return tsTokens[map[index]].numberOfOccurrencesInLine
  }

  /**
   *
   * @param {ApparatusEntry} entry
   * @param {TypesetterToken[]} tsTokens
   * @param {number[]}map
   * @return {{start: *, end: *}|{start: string, end: string}}
   * @private
   */
  _getLineNumbersForApparatusEntry(entry, tsTokens, map) {
    if (entry.from === -1) {
      return { start: 'pre', end: 'pre'}
    }
    if (tsTokens[map[entry.from]] === undefined) {
      console.warn(`Entry start undefined: from = ${entry.from}, map value = ${map[entry.from]}`)
      console.log(entry)
      return {
        start: 'ERROR',
        end: 'ERROR'
      }
    }
    if (entry.to !== -1 && tsTokens[map[entry.to]] === undefined) {
      console.warn(`Entry end undefined: to = ${entry.to}, map value = ${map[entry.to]}`)
      console.log(entry)
      return {
        start: 'ERROR',
        end: 'ERROR'
      }
    }
    return {
      start: tsTokens[map[entry.from]].lineNumber,
      end: entry.to === -1 ? tsTokens[map[entry.from]].lineNumber :  tsTokens[map[entry.to]].lineNumber
    }
  }

  _getTypesetterParagraphsForMainText() {

    let typesetterRenderer = new TypesetterTokenRenderer()

    return MainText.getParagraphs(this.edition.mainText).map( (mainTextParagraph) => {
      let typesetterTokens = []

      if (mainTextParagraph.type === 'normal') {
        typesetterTokens.push(TypesetterTokenFactory.normalSpace())
        typesetterTokens.push(TypesetterTokenFactory.normalSpace())
      }
      mainTextParagraph.tokens.forEach( (mainTextToken) => {
        switch(mainTextToken.type) {
          case MainTextTokenType.GLUE:
            let theGlue = TypesetterTokenFactory.normalSpace()
            theGlue.mainTextTokenIndex = mainTextToken.originalIndex
            typesetterTokens.push(theGlue)
            break

          case MainTextTokenType.TEXT:
            let fmtTextTypesetterTokens =  typesetterRenderer.render(mainTextToken.fmtText, this.edition.lang)
            // tag the first typeset token with the main text index
            if (fmtTextTypesetterTokens.length > 0) {
              fmtTextTypesetterTokens[0].mainTextTokenIndex = mainTextToken.originalIndex
            }
            // apply font styles according to paragraph style
            fmtTextTypesetterTokens = fmtTextTypesetterTokens.map( (typesetterToken) => {
              switch (mainTextParagraph.type) {
                case 'h1':
                  return typesetterToken.setBold().setFontSize(1.5)

                case 'h2':
                  return typesetterToken.setBold().setFontSize(1.2)


                case 'h3':
                  return typesetterToken.setBold()

                default:
                  return typesetterToken
              }
            })
            typesetterTokens = typesetterTokens.concat (fmtTextTypesetterTokens)
            break
        }
      })
      let paragraphToTypeset = new Paragraph()
      paragraphToTypeset.setTokens(typesetterTokens)
      let defaultLineHeight = this.geometry.mainTextLineHeight
      switch(mainTextParagraph.type) {
        case 'normal':
          paragraphToTypeset.setLineHeight(defaultLineHeight).setTextAlignment(HorizontalAlign.JUSTIFIED)
          break

        case 'h1':
          paragraphToTypeset.setLineHeight(defaultLineHeight*1.5)
            .setSpaceAfter(defaultLineHeight*1.5)
            .setTextAlignment(HorizontalAlign.CENTERED)
          break

        case 'h2':
          paragraphToTypeset.setLineHeight(defaultLineHeight*1.2)
            .setSpaceAfter(defaultLineHeight*1.2)
            .setTextAlignment(HorizontalAlign.CENTERED)
          break

        case 'h3':
          paragraphToTypeset.setLineHeight(defaultLineHeight)
            .setSpaceAfter(defaultLineHeight*0.25)
            .setSpaceBefore(defaultLineHeight*0.5)
            .setTextAlignment(HorizontalAlign.RAGGED)
          break
      }
      return paragraphToTypeset
    })
  }

  _getLemmaTypesetterTokens(apparatusEntry, typesettingInfo, map) {
    let lemmaTokens = []
    let lemmaComponents = ApparatusUtil.getLemmaComponents(apparatusEntry.lemma, apparatusEntry.lemmaText)

    switch(lemmaComponents.type) {
      case 'custom':
        return [ TypesetterTokenFactory.simpleText(lemmaComponents.text).setLang(this.edition.lang)]

      case 'full':
        let lemmaNumberString = ''
        if (lemmaComponents.numWords === 1) {
          let occurrenceInLine = this.__getOccurrenceInLine(apparatusEntry.from, typesettingInfo, map)
          let numberOfOccurrencesInLine = this.__getTotalOccurrencesInLine(apparatusEntry.from, typesettingInfo, map)
          if (numberOfOccurrencesInLine > 1) {
            lemmaNumberString = ApparatusCommon.getNumberString(occurrenceInLine, this.edition.lang)
          }
        }
        lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaComponents.text).setLang(this.edition.lang))
        if (lemmaNumberString !== '') {
          lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaNumberString)
            .setVerticalAlign(VerticalAlign.SUPERSCRIPT).setFontSize(FontSize.SUPERSCRIPT))
        }
        return lemmaTokens

      case 'shortened':
        // determine occurrence numbers
        let lemmaNumberStringFrom = ''
        let occurrenceInLineFrom = this.__getOccurrenceInLine(apparatusEntry.from, typesettingInfo, map)
        let numberOfOccurrencesInLineFrom = this.__getTotalOccurrencesInLine(apparatusEntry.from, typesettingInfo,  map)
        if (numberOfOccurrencesInLineFrom > 1) {
          lemmaNumberStringFrom = ApparatusCommon.getNumberString(occurrenceInLineFrom, this.edition.lang)
        }
        let lemmaNumberStringTo = ''
        let occurrenceInLineTo = this.__getOccurrenceInLine(apparatusEntry.to, typesettingInfo, map)
        let numberOfOccurrencesInLineTo = this.__getTotalOccurrencesInLine(apparatusEntry.to, typesettingInfo, map)
        if (numberOfOccurrencesInLineTo > 1) {
          lemmaNumberStringTo = ApparatusCommon.getNumberString(occurrenceInLineTo, this.edition.lang)
        }

        // build lemma
        lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaComponents.from).setLang(this.edition.lang))
        if (lemmaNumberStringFrom !== '') {
          lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaNumberStringFrom)
            .setVerticalAlign(VerticalAlign.SUPERSCRIPT).setFontSize(FontSize.SUPERSCRIPT))
        }
        // TODO: add a little glue around the separator
        lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaComponents.separator))
        lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaComponents.to).setLang(this.edition.lang))
        if (lemmaNumberStringTo !== '') {
          lemmaTokens.push(TypesetterTokenFactory.simpleText(lemmaNumberStringTo)
            .setVerticalAlign(VerticalAlign.SUPERSCRIPT).setFontSize(FontSize.SUPERSCRIPT))
        }
        return lemmaTokens


      default:
        console.warn(`Unknown lemma component type '${lemmaComponents.type}'`)
        return [ TypesetterTokenFactory.simpleText('ERROR')]
    }
  }

  /**
   *
   * @param {Apparatus} app
   * @param {TypesetterToken[]} mainTextTypesetTokens
   * @param {number[]} map
   * @private
   */
  _getTypesetterTokensForApparatus(app, mainTextTypesetTokens, map) {
    let ttTokens = []
    let sigla = this.edition.getSigla()
    let lastLine = ''
    let firstLineNumberAlreadyPrinted = false
    app.entries.forEach( (apparatusEntry, aeIndex) => {
      //console.log(`Processing apparatus entry ${aeIndex}`)
      let enabledSubEntries = apparatusEntry.subEntries.filter( (se) => {
        return se.enabled
      })
      if (enabledSubEntries.length === 0) {
        // nothing to do for empty entries
        //console.log(`No entries`)
        return
      }

      let currentLineTtToken = this._getApparatusLineNumberTypesetterToken(apparatusEntry, mainTextTypesetTokens, map)
      let currentLine = currentLineTtToken.text
      // console.log(`Current Line: ${currentLine}`)
      // console.log(`Last line: ${lastLine}`)
      let lineTtTokens = []
      if (currentLine === lastLine) {
        // line tokens is just an entry separator
        // TODO: use better space
        lineTtTokens.push(TypesetterTokenFactory.normalSpace())
        lineTtTokens.push(TypesetterTokenFactory.normalSpace())
        lineTtTokens.push(TypesetterTokenFactory.simpleText(this.options.entrySeparator, this.edition.lang))
        lineTtTokens.push(TypesetterTokenFactory.normalSpace())
        lineTtTokens.push(TypesetterTokenFactory.normalSpace())

      } else {
        if (firstLineNumberAlreadyPrinted) {
          // insert a line separator between line numbers in all but the first line
          lineTtTokens.push(TypesetterTokenFactory.simpleText(this.options.apparatusLineSeparator, this.edition.lang).setBold())
          lineTtTokens.push(TypesetterTokenFactory.normalSpace())
          lineTtTokens.push(TypesetterTokenFactory.normalSpace())
        }
        lastLine = currentLine
        lineTtTokens.push(currentLineTtToken)
        lineTtTokens.push(TypesetterTokenFactory.normalSpace())
        firstLineNumberAlreadyPrinted = true
      }
      pushArray(ttTokens, lineTtTokens)
      // LEMMA section
      // preLemma
      let preLemmaTokens = []
      switch(apparatusEntry.preLemma) {
        case '':
          // don't do anything
          break

        case 'ante':
        case 'post':
          preLemmaTokens = ApparatusCommon.getKeywordTypesetterTokens(apparatusEntry.preLemma, this.edition.lang)
          break

        default:
          preLemmaTokens = ApparatusCommon.getKeywordTypesetterTokens(apparatusEntry.preLemma, this.edition.lang)
      }
      pushArray(ttTokens, preLemmaTokens)
      if (preLemmaTokens.length !== 0) {
        ttTokens.push(TypesetterTokenFactory.normalSpace())
      }

      // lemma
     pushArray(ttTokens, this._getLemmaTypesetterTokens(apparatusEntry, mainTextTypesetTokens, map))

      // postLemma
      if (apparatusEntry.postLemma !== '') {
        ttTokens.push(TypesetterTokenFactory.normalSpace())
        let postLemmaTokens  = ApparatusCommon.getKeywordTypesetterTokens(apparatusEntry.postLemma, this.edition.lang)
        //let postLemmaTokens = this._getTypesetTokensFromCustomLemmaGroupValue(apparatusEntry.postLemma, this.edition.lang)
        pushArray(ttTokens, postLemmaTokens)
      }

      // separator
      let separatorTokens = []
      switch(apparatusEntry.separator) {
        case '':
          if (!apparatusEntry.allSubEntriesAreOmissions()) {
            separatorTokens = [ TypesetterTokenFactory.simpleText(']').setLang(this.edition.lang) ]
          }
          break

        case 'off':
          break

        case 'colon':
          separatorTokens = [ TypesetterTokenFactory.simpleText(':').setLang(this.edition.lang) ]
          break

        default:
          separatorTokens = (new TypesetterTokenRenderer()).render(
            FmtTextFactory.fromString(removeExtraWhiteSpace(FmtText.getPlainText(apparatusEntry.separator)))
          )
      }
      pushArray(ttTokens, separatorTokens)
      ttTokens.push(TypesetterTokenFactory.normalSpace())



      enabledSubEntries.forEach( (subEntry) => {
        let theText = subEntry.type === SubEntryType.OMISSION ? [] : subEntry.fmtText
        let witnessIndices = subEntry.witnessData.map ( (wd) => { return wd.witnessIndex})

        let typesetterTokens = []

        switch (this.edition.lang) {
          case 'la':
            typesetterTokens = ApparatusCommon.typesetSubEntryLatin(subEntry.type, theText, witnessIndices, sigla, this.edition.siglaGroups)
            break

          case 'he':
            typesetterTokens = ApparatusCommon.typesetSubEntryHebrew(subEntry.type, theText, witnessIndices, sigla, this.edition.siglaGroups)
            break

          case 'ar':
            typesetterTokens = ApparatusCommon.typesetSubEntryArabic(subEntry.type, theText, witnessIndices, sigla, this.edition.siglaGroups)
            break
        }
        pushArray(ttTokens, typesetterTokens)
        // TODO: change this to a better space
        ttTokens.push(TypesetterTokenFactory.normalSpace())
        // ttTokens.push(TypesetterTokenFactory.normalSpace())

      })
    })
    if (ttTokens.length !== 0) {
      // add a line separator at end
      // ttTokens.push(TypesetterTokenFactory.normalSpace())
      ttTokens.push(TypesetterTokenFactory.simpleText(this.options.apparatusLineSeparator, this.edition.lang).setBold())
      // ttTokens.push(TypesetterTokenFactory.normalSpace())
    }
    return ttTokens
  }

  _getTypesetTokensFromCustomLemmaGroupValue(customText, lang) {
    console.log(`Getting typeset token from custom lemma group value, lang = ${lang}`)
    console.log(customText)
    let text = removeExtraWhiteSpace(FmtText.getPlainText(FmtTextFactory.fromAnything(customText)))
    console.log(`Processed plain text: '${text}'`)
    let fmtText
    switch (lang) {
      case 'he':
      case 'ar':
        fmtText = FmtTextFactory.fromAnything(text).map( (token) => { return token.setFontSize(0.8)})
        break

      default:
        fmtText = FmtTextFactory.fromAnything(text).map( (token) => { return token.setItalic()})
    }

    return (new TypesetterTokenRenderer()).render(fmtText)
  }


  /**
   *
   * @param {ApparatusEntry} entry
   * @param {TypesetterToken[]} mainTextTypesetTokens
   * @param {number[]} map
   * @return {TypesetterToken}
   * @private
   */
  _getApparatusLineNumberTypesetterToken(entry, mainTextTypesetTokens, map) {
    let range = this._getLineNumbersForApparatusEntry(entry, mainTextTypesetTokens, map)
    let lineString =  this._getLineNumberString(range.start)
    if (range.start !== range.end) {
      lineString += '-' + this._getLineNumberString(range.end)
    }
    return TypesetterTokenFactory.simpleText(lineString).setBold()
  }

  _genMainTokenIndexToTypesetterTokenMap(mainTextTokens, typesetterTokens) {
    let theMap = mainTextTokens.map ( () => { return -1})
    typesetterTokens.forEach( (typesetterToken, i) => {
      if (typesetterToken['mainTextTokenIndex'] !== undefined) {
        theMap[typesetterToken['mainTextTokenIndex']] = i
      }
    })
    return theMap
  }

}