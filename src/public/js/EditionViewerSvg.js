/* 
 *  Copyright (C) 2019 Universität zu Köln
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

import {OptionsChecker } from '@thomas-inst/optionschecker'
import {Typesetter} from './Typesetter'
import { MarkdownProcessor } from './MarkdownProcessor'
import { NumeralStyles } from './NumeralStyles'

import * as TypesetterTokenFactory from './TypesetterTokenFactory'
import * as TypesetterTokenType from './TypesetterTokenType'


const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

export class EditionViewerSvg {
  
  constructor (userOptions) {
    // console.log('Constructing Edition Viewer')
    // console.log('User options')
    // console.log(userOptions)

    let optionsDefinition = {
      collationTokens: {type: 'Array', default: []},
      apparatusArray:  {type: 'Array', default: []},
      entrySeparator: { type: 'string', default: verticalLine},
      apparatusLineSeparator: { type: 'string', default: doubleVerticalLine},
      lang: { type: 'string'},
      isRightToLeft: { type: 'boolean', default: false},
      addGlue: { type: 'boolean', default: true},
      fontFamily:  { type: 'NonEmptyString', default: 'Noto Naskh Arabic UI'},
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
      normalSpaceWidthInEms: { type: 'NumberGreaterThanZero', default: 0.32},
      textToLineNumbersInCm: { type: 'NumberGreaterThanZero', default: 0.5},
      textToApparatusInCm: { type: 'NumberGreaterThanZero', default: 1}
    }

    let oc = new OptionsChecker(optionsDefinition, 'EditionViewer')
    this.options = oc.getCleanOptions(userOptions)
    let options = this.options
    
    this.geometry = {
      lineWidth: Typesetter.cm2px(options.pageWidthInCm - 
              options.marginInCm.left - options.marginInCm.right),
      mainTextLineHeight: Typesetter.pt2px(options.mainTextLineHeightInPts),
      mainTextFontSize: Typesetter.pt2px(options.mainTextFontSizeInPts),
      apparatusLineHeight: Typesetter.pt2px(options.apparatusLineHeightInPts),
      apparatusFontSize: Typesetter.pt2px(options.apparatusFontSizeInPts),
      margin: { 
        top: Typesetter.cm2px(options.marginInCm.top),
        left: Typesetter.cm2px(options.marginInCm.left),
        bottom: Typesetter.cm2px(options.marginInCm.bottom),
        right: Typesetter.cm2px(options.marginInCm.right)
      },
      textToLineNumbers: Typesetter.cm2px(options.textToLineNumbersInCm),
      textToApparatus: Typesetter.cm2px(options.textToApparatusInCm),
      normalSpaceWidthInEms: options.normalSpaceWidthInEms
    }
    
    this.ts = new Typesetter({
       lang: this.options.lang,
       lineWidth: this.geometry.lineWidth,
       lineHeight: this.geometry.mainTextLineHeight,
       defaultFontSize: this.geometry.mainTextFontSize,
       lineNumbersFontSizeMultiplier:  this.options.lineNumbersFontSizeMultiplier,
       rightToLeft: options.isRightToLeft,
       defaultFontFamily: options.fontFamily,
       normalSpaceWidth: options.normalSpaceWidthInEms,
       lineNumberStyle: this.options.lang
    })
    
    this.tsApparatus = new Typesetter({
       lang: this.options.lang,
       lineWidth: this.geometry.lineWidth,
       lineHeight: this.geometry.apparatusLineHeight,
       defaultFontSize: this.geometry.apparatusFontSize,
       rightToLeft: options.isRightToLeft,
       defaultFontFamily: options.fontFamily,
       normalSpaceWidth: options.normalSpaceWidthInEms
    })
    
    this.mainTextTokens = this.generateTokensToTypesetFromCollationTableTokens(options.collationTokens, options.addGlue)
    //console.log('Main Text Tokens')
    //console.log(this.mainTextTokens)
    
    this.typesetMainTextTokens = this.ts.typesetTokens(this.mainTextTokens)
    
    //console.log('ts Tokens')
    //console.log(this.typesetMainTextTokens)
    
    this.ct2tsIndexMap = this.getCollationTableIndexToTypesetTokensMap(this.typesetMainTextTokens)
    
    //console.log('Index Map')
    //console.log(this.ct2tsIndexMap)
    
    // console.log('apparatus Array')
    // console.log(options.apparatusArray)
    
    for(const apparatus of options.apparatusArray) {
      for (const apparatusEntry of apparatus) {
        let lineNumbers = this.getLineNumbersForApparatusEntry(apparatusEntry, this.typesetMainTextTokens, this.ct2tsIndexMap)
        apparatusEntry.lineStart = lineNumbers.start
        apparatusEntry.lineEnd = lineNumbers.end
      }
    }
    
    this.apparatusTokensToTypeset = this.getApparatusTokensToTypeset()
    
    // console.log('Apparatus to typeset')
    // console.log(this.apparatusTokensToTypeset)
    
    this.lineNumbers = this.ts.typesetLineNumbers(this.typesetMainTextTokens,5)
    this.typesetApparatuses = []
    for (const apparatusToTypeset of this.apparatusTokensToTypeset) {
      this.typesetApparatuses.push(this.tsApparatus.typesetTokens(apparatusToTypeset))
    }
  }

  generateTokensToTypesetFromCollationTableTokens(collationTableTokens, addGlue = true) {
    let tokensToTypeset = []
    let currentCollationTableTokenIndex = 0
    for(const collationTableToken of collationTableTokens) {
       let ctToken = Object.assign({}, collationTableToken)
      ctToken.collationTableIndex = currentCollationTableTokenIndex
      currentCollationTableTokenIndex++
      tokensToTypeset.push(ctToken)
      if (addGlue) {
        tokensToTypeset.push({type: 'glue', space: 'normal'})
      }
    }
    if (addGlue) {
      if (tokensToTypeset.length > 1) {
        tokensToTypeset.pop()  // take out the last glue
      }
    }
    return tokensToTypeset
  }
  
  /**
   * Generates a map of collation table indexes to 
   * typeset tokens 
   * 
   *  map[i] = index in the typeset tokens array of 
   *          the i-th collation table token
   *  
   * @param {Array} typesetTokens
   * @returns {Array}
   */
  getCollationTableIndexToTypesetTokensMap(typesetTokens) {
    let map = []
    for (let i=0; i < typesetTokens.length; i++) {
      map[typesetTokens[i].collationTableIndex] = i
    }
    return map
  }

  getLineNumbersForApparatusEntry(entry, tsTokens, map) {
    if (entry.start === -1) {
      return { start: 'pre', end: 'pre'}
    }
    if (typeof(tsTokens[map[entry.start]]) === 'undefined') {
      console.log('Found undefined start')
      console.log('note.start: ' + entry.start)
      console.log('map [note.start]: ' + map[entry.start])
      console.log('tsTokens[map[note.start] : ' + tsTokens[map[entry.start]])
      console.log('tsTokens.length: ' + tsTokens.length)
      return {
        start: 'ERROR',
        end: 'ERROR'
      }
    }
    if (entry.end !== -1 && typeof(tsTokens[map[entry.end]]) === 'undefined') {
      console.log('Found undefined end')
      console.log(entry)
      console.log('note.end: ' + entry.end)
      console.log('map [note.end]: ' + map[entry.end])
      console.log('tsTokens[map[note.end] : ' + tsTokens[map[entry.end]])
      console.log('tsTokens.length: ' + tsTokens.length)
      return {
        start: 'ERROR',
        end: 'ERROR'
      }
    }
    return { 
        start: tsTokens[map[entry.start]].lineNumber,
        end: entry.end === -1 ? tsTokens[map[entry.start]].lineNumber :  tsTokens[map[entry.end]].lineNumber
    } 
  }

  getLineNumberString(lineNumber) {
    if (isNaN(lineNumber)) {
      return lineNumber
    }
    if (this.options.lang === 'ar') {
      return NumeralStyles.toDecimalArabic(lineNumber)
    }
    return NumeralStyles.toDecimalWestern(lineNumber)
  }
  
  getApparatusTokensToTypeset() {
    let apparatusToTypesetArray = []
    
    for (const apparatus of this.options.apparatusArray) {
      let apparatusToTypeset = []
      
      // 1. group entries by start-end lines
      let lineGroups = []
      for (const apparatusEntry of apparatus) {
        let lineGroupTitle = 'g_' + apparatusEntry.lineStart.toString()
        if (apparatusEntry.lineStart !== apparatusEntry.lineEnd) {
          lineGroupTitle += '_' + apparatusEntry.lineEnd.toString()
        }
        
        if (lineGroups[lineGroupTitle] === undefined ) {
          lineGroups[lineGroupTitle] = {
            lineStart: apparatusEntry.lineStart,
            lineEnd: apparatusEntry.lineEnd,
            entries: []
          }
        }
        lineGroups[lineGroupTitle].entries.push(apparatusEntry)
      }
      // console.log('LINE GROUPS')
      // console.log(lineGroups)
      // 2. TODO: order the groups
      
      // 3. build the pageGroup entries
      let numLineGroups = Object.keys(lineGroups).length
      Object.keys(lineGroups).forEach( (lineGroupTitle, i) => {

        let lineGroup = lineGroups[lineGroupTitle]
        let lineString = this.getLineNumberString(lineGroup.lineStart)
        if (lineGroup.lineEnd !== lineGroup.lineStart) {
          lineString += '–' + this.getLineNumberString(lineGroup.lineEnd)
        }

        // line number
        if (i !== 0) {
          apparatusToTypeset.push(TypesetterTokenFactory.simpleText(this.options.apparatusLineSeparator).setBold())
          apparatusToTypeset.push(TypesetterTokenFactory.normalSpace())
        }
        apparatusToTypeset.push(TypesetterTokenFactory.simpleText(lineString).setBold())
        apparatusToTypeset.push(TypesetterTokenFactory.normalSpace())

        let numEntries = lineGroup.entries.length
        lineGroup.entries.forEach( (lineGroupEntry, entryIndex) => {
          // console.log(`Processing entry ${lineGroupTitle}:${entryIndex} of ${numEntries}`)
          let entryLesson = ''
          // build entry lesson
          if (lineGroupEntry.start === -1) {
            entryLesson = ''
          } else {
            entryLesson = this.options.collationTokens[lineGroupEntry.start].text
            if (lineGroupEntry.start !== lineGroupEntry.end) {
              // more than one word in the lesson
              let fullLessonWords = this.options.collationTokens
                .filter( (t,i) => { return i>=lineGroupEntry.start && i<=lineGroupEntry.end})
                .filter(t => t.type === 'text')
                .filter ( t => t.text !== '')
                .map ( t => t.text)
              let fullLesson = fullLessonWords.join(' ')
              if (fullLessonWords.length <= 2) {  // TODO: parametrize this, probably per language
                entryLesson = fullLesson
              } else {
                //console.log(`Multi-word lesson: '${fullLesson}' (length: ${fullLesson.length})`)
                if (fullLesson.length > 25) { // TODO: parametrize this, probably per language
                  entryLesson = fullLessonWords
                    .filter( (w,i,a) => {return i===0 || i === a.length-1 })
                    .join(' … ')
                } else {
                  entryLesson = fullLesson
                }
              }
            }
            // TODO: if there's only one entry, no ] should be added
            entryLesson += ']'
          }
          // add lesson if not empty
          if (entryLesson !== '') {
            apparatusToTypeset.push(TypesetterTokenFactory.simpleText(entryLesson))
            apparatusToTypeset.push(TypesetterTokenFactory.normalSpace())
          }
          // add subEntries
          let numSubEntries = lineGroupEntry.entries.length
          lineGroupEntry.entries.forEach( (subEntry, subEntryIndex) => {
            // console.log(`Processing subEntry ${subEntryIndex}`)
            let mdProcessor = new MarkdownProcessor({normalSpace: this.tsApparatus.getNormalSpaceWidth()})
            let subEntryTokens = []
            if (subEntry.typesetterTokens.length !== 0) {
              subEntryTokens = subEntry.typesetterTokens
            } else {
              // console.log(`No typesetter tokens, processing markdown: ${subEntry.markDown}`)
              subEntryTokens = mdProcessor.getTokensFromMarkdownString(subEntry.markDown)
            }
            for (const subEntryToken of subEntryTokens ) {
              apparatusToTypeset.push(subEntryToken)
            }
            if (subEntryIndex !==(numSubEntries -1 )) {
              apparatusToTypeset.push(TypesetterTokenFactory.normalSpace().setLength(10))
            }
          })
          // insert entry separators, but not if it's the last entry
          if (entryIndex !== (numEntries - 1)) {
            apparatusToTypeset.push(TypesetterTokenFactory.normalSpace().setLength(10))  // TODO: parametrize this!
            apparatusToTypeset.push(TypesetterTokenFactory.simpleText(this.options.entrySeparator))
            apparatusToTypeset.push(TypesetterTokenFactory.normalSpace().setLength(10))  // TODO: parametrize this!
          }
        })
        apparatusToTypeset.push(TypesetterTokenFactory.normalSpace().setLength(10))
      })
      apparatusToTypesetArray.push(apparatusToTypeset)
    }
    //console.log('Apparatus to Typeset')
    //console.log(apparatusToTypesetArray)
    return apparatusToTypesetArray
    
  }
  
  getSvg() {
    // console.log('Getting SVG')
    // console.log(this.typesetMainTextTokens)
    return this._getSvgHtml(
      this.typesetMainTextTokens,
      this.lineNumbers,
      this.typesetApparatuses,
      'edition-svg',
      this.geometry.margin.left, this.geometry.margin.top,
      this.geometry.margin.right, this.geometry.margin.bottom,
      this.geometry.textToLineNumbers
    )
  }
  
  
   _getSvgHtml(typesetTokens, typesetLineNumbers, typesetApparatuses, svgClass, leftMargin = 0, topMargin = 0, rightMargin = 0, bottomMargin = 0, textToLineNumbers = 10) {

     let typesetter = this.ts
     let typesetterApparatus = this.tsApparatus

     let mainTextHeight = typesetter.getTextHeight(typesetTokens)
     let mainTextWidth = typesetter.getTextWidth()
     let apparatusHeights = []
     let totalApparatusHeight = 0
     for (const apparatus of typesetApparatuses) {
       let height = typesetterApparatus.getTextHeight(apparatus)
       apparatusHeights.push(height)
       totalApparatusHeight += height
     }


     let svgHeight = topMargin + mainTextHeight + (this.geometry.textToApparatus * typesetApparatuses.length) + totalApparatusHeight + bottomMargin
     svgHeight = Math.max(Typesetter.px2cm(svgHeight), this.options.pageHeightInCm)

     let svgWidth = this.options.pageWidthInCm
     let textDirection = this.options.isRightToLeft ? 'rtl' : 'ltr'


     let svg = `<svg class="${svgClass}" height="${svgHeight}cm" width="${svgWidth}cm">`

     svg += "<!-- Text tokens -->\n"
     svg += `<g font-size="${this.geometry.mainTextFontSize}" font-family="${this.options.fontFamily}" fill="#000000">`

     // svg += `\t<text direction="${textDirection}">\n`
     // svg += `<text>`
     for(const token of typesetTokens) {
       let tokenSvg = typesetter.genTokenSvg(leftMargin, topMargin, token, false, false)
        if (tokenSvg !== '') {
         svg += tokenSvg
       }
     }
     // svg += "</text>"
     svg += "</g>\n"

     // line numbers
     svg += "<!-- Line numbers -->\n"
     let lineNumbersX = leftMargin - textToLineNumbers
     if (typesetter.options.rightToLeft) {
       lineNumbersX = leftMargin + typesetter.getTextWidth() + textToLineNumbers
     }
     svg += `<g font-size="${this.geometry.mainTextFontSize * this.options.lineNumbersFontSizeMultiplier}" font-family="${this.options.fontFamily}" fill="#000000">\n`
     // svg += "\t<text>\n"
     for(const token of typesetLineNumbers) {
       let tokenSvg = typesetter.genTokenSvg(lineNumbersX, topMargin, token, false, false)
       if (tokenSvg !== '') {
         svg += "\t\t" +  tokenSvg + "\n"
       }
     }
     // svg += "\n\t</text>"
     svg += "\n</g>\n"

     // apparatus

     let apparatusY = topMargin + mainTextHeight
     let currentApparatusIndex = 0
     for (const apparatus of typesetApparatuses) {
       svg += `<!-- Apparatus ${currentApparatusIndex+1} -->\n`
       apparatusY += this.geometry.textToApparatus
       apparatusY += currentApparatusIndex !== 0 ? apparatusHeights[currentApparatusIndex-1] : 0

       if (this.options.isRightToLeft) {
         svg += '<line x1="' + (typesetter.getTextWidth() + leftMargin) + '" y1="' + (apparatusY - 5) + '" ' +
           'x2="' + (typesetter.getTextWidth() + leftMargin - 50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
       } else {
         svg += '<line x1="' + leftMargin + '" y1="' + (apparatusY - 5) + '" ' +
           'x2="' + (leftMargin+50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
       }
       svg += "\n"
       svg += `<g font-size="${this.geometry.apparatusFontSize}" font-family="${this.options.fontFamily}" fill="#000000">\n`
       // svg += `\n<text direction="${textDirection}">`
       for(const token of apparatus) {
         let tokenSvg = typesetter.genTokenSvg(leftMargin, apparatusY, token, false, false)
         if (tokenSvg !== '') {
           svg += "\t\t" + typesetter.genTokenSvg(leftMargin, apparatusY, token, false, false) + "\n"
         }
       }
       // svg += "\n\t</text>"
       svg += "\n</g>\n"
       currentApparatusIndex++
     }
     svg += '</svg>'
     return svg
  }
  
  
}
