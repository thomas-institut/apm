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

/* global Typesetter */

class EditionViewer {
  
  constructor (userOptions) {
    console.log('Constructing Edition Viewer')
    console.log('User options')
    console.log(userOptions)

    let optionsDefinition = {
      collationTokens: {type: 'Array', default: []},
      apparatusArray:  {type: 'Array', default: []},
      isRightToLeft: { type: 'boolean', default: false},
      addGlue: { type: 'boolean', default: true},
      fontFamily:  { type: 'NonEmptyString', default: 'Times New Roman'},
      pageWidthInCm: { type: 'NumberGreaterThanZero', default: 21},
      marginInCm: {type: 'object', default: {
        top: 2,
        left: 3,
        bottom: 1,
        right: 3
      }},
      mainTextFontSizeInPts: { type: 'NumberGreaterThanZero', default: 14},
      apparatusFontSizeInPts: { type: 'NumberGreaterThanZero', default: 11},
      mainTextLineHeightInPts: { type: 'NumberGreaterThanZero', default: 20},
      apparatusLineHeightInPts: { type: 'NumberGreaterThanZero', default: 15},
      normalSpaceWidthInEms: { type: 'NumberGreaterThanZero', default: 0.32},
      textToLineNumbersInCm: { type: 'NumberGreaterThanZero', default: 0.5},
      textToApparatusInCm: { type: 'NumberGreaterThanZero', default: 1}
    }

    let oc = new OptionsChecker(optionsDefinition, 'EditionViewer')
    this.options = oc.getCleanOptions(userOptions)

    console.log('Options')
    console.log(this.options)
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
       lineWidth: this.geometry.lineWidth,
       lineHeight: this.geometry.mainTextLineHeight,
       defaultFontSize: this.geometry.mainTextFontSize,
       rightToLeft: options.isRightToLeft,
       defaultFontFamily: options.fontFamily,
       normalSpaceWidth: options.normalSpaceWidthInEms
    })
    
    this.tsApparatus = new Typesetter({
       lineWidth: this.geometry.lineWidth,
       lineHeight: this.geometry.apparatusLineHeight,
       defaultFontSize: this.geometry.apparatusFontSize,
       rightToLeft: options.isRightToLeft,
       defaultFontFamily: options.fontFamily,
       normalSpaceWidth: options.normalSpaceWidthInEms
    })
    
    this.mainTextTokens = this.generateTokensToTypesetFromCollationTableTokens(options.collationTokens, options.addGlue)
    console.log('Main Text Tokens')
    console.log(this.mainTextTokens)
    
    this.typesetMainTextTokens = this.ts.typesetTokens(this.mainTextTokens)
    
    console.log('ts Tokens')
    console.log(this.typesetMainTextTokens)
    
    this.ct2tsIndexMap = this.getCollationTableIndexToTypesetTokensMap(this.typesetMainTextTokens)
    
    console.log('Index Map')
    console.log(this.ct2tsIndexMap)
    
    console.log('apparatus Array') 
    console.log(options.apparatusArray)
    
    for(const apparatus of options.apparatusArray) {
      for (const note of apparatus) {
        let lineNumbers = this.getLineNumbersForApparatusEntry(note, this.typesetMainTextTokens, this.ct2tsIndexMap)
        note.lineStart = lineNumbers.start
        note.lineEnd = lineNumbers.end
      }
    }
    
    this.apparatusTokensToTypeset = this.getApparatusTokensToTypeset()
    
    console.log('Apparatus to typeset')
    console.log(this.apparatusTokensToTypeset)
    
    this.lineNumbers = this.ts.typesetLineNumbers(this.typesetMainTextTokens,5)
    this.typesetApparatuses = []
    for (const apparatusToTypeset of this.apparatusTokensToTypeset) {
      this.typesetApparatuses.push(this.tsApparatus.typesetTokens(apparatusToTypeset))
    }
  }

  generateTokensToTypesetFromCollationTableTokens(collationTableTokens, addGlue = true) {
    // for now, just add whitespace in between the tokens
    let tokensToTypeset = []
    let currentCollationTableTokenIndex = 0
    for(const collationTableToken of collationTableTokens) {
      collationTableToken.collationTableIndex = currentCollationTableTokenIndex
      currentCollationTableTokenIndex++
      tokensToTypeset.push(Object.assign({}, collationTableToken)) // push a copy of the token
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
//    let currentTokenIndex = 0
//    
//    for(const token of tokensToTypeset) {
//      if (typeof(token.collationTableIndex) === 'number') {
//        map[token.collationTableIndex] = currentTokenIndex
//      }
//      currentTokenIndex++
//    }

    for (let i=0; i < typesetTokens.length; i++) {
      map[typesetTokens[i].collationTableIndex] = i
    }
    return map
  }
  
  
  getLineNumbersForApparatusEntry(note, tsTokens, map) {
    if (note.start === -1) {
      return { start: 'pre', end: 'pre'}
    }
    if (typeof(tsTokens[map[note.start]]) === 'undefined') {
      console.log('Found undefined')
      console.log('note.start: ' + note.start)
      console.log('map [note.start]: ' + map[note.start])
      console.log('tsTokens[map[note.start] : ' + tsTokens[map[note.start]])
      console.log('tsTokens.length: ' + tsTokens.length)
      return {
        start: 'ERROR',
        end: 'ERROR'
      }
    }
    return { 
        start: tsTokens[map[note.start]].lineNumber, 
        end: tsTokens[map[note.end]].lineNumber
    } 
  }
  
  getApparatusTokensToTypeset() {
    
    let apparatusToTypesetArray = []
    
    for (const apparatus of this.options.apparatusArray) {
      let apparatusToTypeset = []
      
      // 1. group notes by start-end
      let groups = []
      for (const note of apparatus) {
        let pageGroup = 'g_' + note.lineStart.toString() 
        if (note.lineStart !== note.lineEnd) {
          pageGroup += '_' + note.lineEnd.toString()
        }
        
        if (typeof(groups[pageGroup]) === 'undefined' ) {
          groups[pageGroup] = { 
            lineStart: note.lineStart,
            lineEnd: note.lineEnd,
            entries: []
          }
        }
        groups[pageGroup].entries.push(note)
      }
      console.log('GROUPS')
      console.log(groups)
      // 2. TODO: order the groups
      
      // 3. build the pageGroup entries
      for(const pageGroupKey in groups) {
        let pageGroup = groups[pageGroupKey]
        let pageString = pageGroup.lineStart.toString() 
        if (pageGroup.lineEnd !== pageGroup.lineStart) {
          pageString += '–' + pageGroup.lineEnd.toString()
        }
        apparatusToTypeset.push({ type: 'text', text: pageString, fontWeight: 'bold'})
        apparatusToTypeset.push({ type: 'glue', space: 'normal'} )
        
        for (const entry of pageGroup.entries) {
          let entryLesson = ''
          if (entry.start === -1) {
            entryLesson = ''
            //console.log('Start = -1')
            //console.log(entry)
          } else {
            entryLesson = this.options.collationTokens[entry.start].text
            if (entry.start !== entry.end) {
              entryLesson += ' '
              if (entry.end > (entry.start + 1)) {
                entryLesson += '… '
              }
              entryLesson += this.collationTokens[entry.end].text
            }
            entryLesson += ']'
          }
          if (entryLesson !== '') {
            apparatusToTypeset.push({ type: 'text', text: entryLesson})
            apparatusToTypeset.push({ type: 'glue', space: 'normal'} )
          }
          let entryTokens = this.tsApparatus.getTokensFromMarkdownString(entry.markDown)
          for (const entryToken of entryTokens ) {
            apparatusToTypeset.push(entryToken)
          }
          apparatusToTypeset.push({ type: 'glue', space: 15 })  // TODO: parametrize this!
        }
                
      }
      
      
      apparatusToTypesetArray.push(apparatusToTypeset)
    }
    return apparatusToTypesetArray
    
  }
  
  getHtml() {
    let html = this.getSvgHtml(
      this.typesetMainTextTokens, 
      this.lineNumbers, 
      this.typesetApparatuses,
      'editionsvg', 
      this.geometry.margin.left, this.geometry.margin.top, 
      this.geometry.margin.right, this.geometry.margin.bottom, 
      this.geometry.textToLineNumbers
      )
    
    return html
  }
  
  
   getSvgHtml(typesetTokens, typesetLineNumbers, typesetApparatuses, svgClass, leftMargin = 0, topMargin = 0, rightMargin = 0, bottomMargin = 0, textToLineNumbers = 10) {
     
      let typesetter = this.ts
      let typesetterAparatus = this.tsApparatus
      
      let mainTextHeight = typesetter.getTextHeight(typesetTokens)
      let mainTextWidth = typesetter.getTextWidth()
      let apparatusHeights = []
      let totalApparatusHeight = 0
      for (const apparatus of typesetApparatuses) {
        let height = typesetterAparatus.getTextHeight(apparatus)
        apparatusHeights.push(height)
        totalApparatusHeight += height
      }
      
     
      let svgHeight = topMargin + mainTextHeight + (this.geometry.textToApparatus * typesetApparatuses.length) + totalApparatusHeight + bottomMargin
      let svgWidth = leftMargin + mainTextWidth + rightMargin


      let html = '<svg class="' + svgClass + '" height="' + svgHeight + '" width="' + svgWidth + '">'

      for(const token of typesetTokens) {
          html += typesetter.genTokenSvg(leftMargin, topMargin, token)
      }
      let lineNumbersX = leftMargin - textToLineNumbers
      if (typesetter.options.rightToLeft) {
          lineNumbersX = leftMargin + typesetter.getTextWidth() + textToLineNumbers
      }
      for(const token of typesetLineNumbers) {
          html += typesetter.genTokenSvg(lineNumbersX, topMargin, token)
      }
      
      let apparatusY = topMargin + mainTextHeight
      let currentApparatusIndex = 0
      for (const apparatus of typesetApparatuses) {
        apparatusY += this.geometry.textToApparatus  
        apparatusY += currentApparatusIndex !== 0 ? apparatusHeights[currentApparatusIndex-1] : 0
        
        if (this.rightToLeft) {
          html += '<line x1="' + (typesetter.getTextWidth() + leftMargin) + '" y1="' + (apparatusY - 5) + '" ' + 
                'x2="' + (typesetter.getTextWidth() + leftMargin - 50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'         
        } else {
          html += '<line x1="' + leftMargin + '" y1="' + (apparatusY - 5) + '" ' + 
                'x2="' + (leftMargin+50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
        }
                
        for(const token of apparatus) {
          html += typesetter.genTokenSvg(leftMargin, apparatusY, token)
        }
        currentApparatusIndex++
      }

      html += '</svg>'
      return html
  }
  
  
}
