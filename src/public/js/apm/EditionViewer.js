/*
 * Copyright (C) 2016-19 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/* global Typesetter */

class EditionViewer {
  
  constructor (collationTokens, aparatusArray, rightToLeft = false, addGlue = true) {
    console.log('Constructing Edition Viewer')
    
    this.collationTokens = collationTokens  
    this.apparatusArray = aparatusArray
    this.rightToLeft = rightToLeft

    this.fontFamily = 'Times New Roman'
    
    this.pageWidthInCm = 21
    
    this.topMarginInCm = 2
    this.leftMarginInCm = 3
    
    this.bottomMarginInCm = 1
    this.rightMarginInCm = 3
    
    this.lineWidthInCm = this.pageWidthInCm - this.leftMarginInCm - this.rightMarginInCm 
    
    this.fontSizeInPts = 14
    this.lineHeightInPts = 20
    this.normalSpaceWidthInEms = 0.32
    
    this.apparatusFontSizeInPts = 11
    this.apparatusLineHeightInPts = 15
    

    
    this.textToLineNumbersInCm = 0.5
    this.textToApparatusInCm = 1
    
    this.fontSize = Typesetter.pt2px(this.fontSizeInPts)
    this.apparatusFontSize = Typesetter.pt2px(this.apparatusFontSizeInPts)
    this.topMargin = Typesetter.cm2px(this.topMarginInCm)
    this.leftMargin = Typesetter.cm2px(this.leftMarginInCm)
    this.bottomMargin = Typesetter.cm2px(this.bottomMarginInCm)
    this.rightMargin = Typesetter.cm2px(this.rightMarginInCm)
    this.textToLineNumbers = Typesetter.cm2px(this.textToLineNumbersInCm)
    this.textToApparatus = Typesetter.cm2px(this.textToApparatusInCm)
    
    this.ts = new Typesetter({
       lineWidth: Typesetter.cm2px(this.lineWidthInCm),
       lineHeight: Typesetter.pt2px(this.lineHeightInPts),
       defaultFontSize: this.fontSize,
       rightToLeft: rightToLeft,
       defaultFontFamily: 'Times New Roman',
       normalSpaceWidth: this.normalSpaceWidthInEms
    })
    
    this.tsApparatus = new Typesetter({
       lineWidth: Typesetter.cm2px(this.lineWidthInCm),
       lineHeight: Typesetter.pt2px(this.apparatusLineHeightInPts),
       defaultFontSize: this.apparatusFontSize,
       rightToLeft: rightToLeft,
       defaultFontFamily: 'Times New Roman',
       normalSpaceWidth: this.normalSpaceWidthInEms
    })
    
    this.mainTextTokens = this.generateTokensToTypesetFromCollationTableTokens(this.collationTokens, addGlue)
    console.log('Main Text Tokens')
    console.log(this.mainTextTokens)
    
    this.ct2tsIndexMap = this.getCollationTableIndexToTypesetTokensMap(this.mainTextTokens)
    
    console.log('Index Map')
    console.log(this.ct2tsIndexMap)
    
    this.typesetMainTextTokens = this.ts.typesetTokens(this.mainTextTokens)
    
    console.log('ts Tokens')
    console.log(this.typesetMainTextTokens)
    
    console.log('apparatus Array') 
    console.log(this.apparatusArray)
    
    for(const apparatus of this.apparatusArray) {
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
      tokensToTypeset.push(collationTableToken)
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
  
  getCollationTableIndexToTypesetTokensMap(tokensToTypeset) {
    
    let map = []
    let currentTokenIndex = 0
    for(const token of tokensToTypeset) {
      if (typeof(token.collationTableIndex) === 'number') {
        map[token.collationTableIndex] = currentTokenIndex
      }
      currentTokenIndex++
    }
    return map
  }
  
  
  getLineNumbersForApparatusEntry(note, tsTokens, map) {
    if (typeof(tsTokens[map[note.start]]) === 'undefined') {
      console.log('Found undefined')
      console.log('note.start: ' + note.start)
      console.log('map [note.start]: ' + map[note.start])
      console.log('tsTokens[map[note.start] : ' + tsTokens[map[note.start]])
      console.log('tsTokens.length: ' + tsTokens.length) 
    }
    return { 
        start: tsTokens[map[note.start]].lineNumber, 
        end: tsTokens[map[note.end]].lineNumber
    } 
  }
  
  getApparatusTokensToTypeset() {
    
    let apparatusToTypesetArray = []
    
    for (const apparatus of this.apparatusArray) {
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
          let entryLesson = this.collationTokens[entry.start].text 
          if (entry.start !== entry.end) {
            entryLesson += ' '
            if (entry.end > (entry.start + 1)) {
              entryLesson += '… '
            }
            entryLesson += this.collationTokens[entry.end].text 
          }
          entryLesson += ']'
          apparatusToTypeset.push({ type: 'text', text: entryLesson})
          apparatusToTypeset.push({ type: 'glue', space: 'normal'} )
          
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
      this.leftMargin, this.topMargin, 
      this.rightMargin, this.bottomMargin, 
      this.textToLineNumbers
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
      
     
      let svgHeight = topMargin + mainTextHeight + (this.textToApparatus * typesetApparatuses.length) + totalApparatusHeight + bottomMargin
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
        apparatusY += this.textToApparatus  
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
