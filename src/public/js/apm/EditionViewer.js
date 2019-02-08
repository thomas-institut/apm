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
  
  constructor (tokens, notes, divId, rightToLeft = false) {
    console.log('Constructing Edition Viewer')
    this.tokens = tokens
    this.notes = notes
    this.container = $('#' + divId)
    this.fontFamily = 'Times New Roman'
    
    this.lineWidthInCm = 11
    this.fontSizeInPts = 14
    this.lineHeightInPts = 20
    
    this.apparatusFontSizeInPts = 12
    this.apparatusLineHeightInPts = 18
    
    this.topMarginInCm = 0.5
    this.leftMarginInCm = 2
    
    this.bottomMarginInCm = 1
    this.rightMarginInCm = 2
    
    this.textToLineNumbersInCm = 0.5
    this.textToApparatusInCm = 1.5
    
    this.topMargin = Typesetter.cm2px(this.topMarginInCm)
    this.leftMargin = Typesetter.cm2px(this.leftMarginInCm)
    this.bottomMargin = Typesetter.cm2px(this.bottomMarginInCm)
    this.rightMargin = Typesetter.cm2px(this.rightMarginInCm)
    this.textToLineNumbers = Typesetter.cm2px(this.textToLineNumbersInCm)
    this.textToApparatus = Typesetter.cm2px(this.textToApparatusInCm)
    
    this.ts = new Typesetter({
       lineWidth: Typesetter.cm2px(this.lineWidthInCm),
       lineHeight: Typesetter.pt2px(this.lineHeightInPts),
       defaultFontSize: Typesetter.pt2px(this.fontSizeInPts),
       rightToLeft: rightToLeft,
       defaultFontFamily: 'Times New Roman',
       normalSpaceWidth: 0.32,
    })
    
    this.tsApparatus = new Typesetter({
       lineWidth: Typesetter.cm2px(this.lineWidthInCm),
       lineHeight: Typesetter.pt2px(this.apparatusLineHeightInPts),
       defaultFontSize: Typesetter.pt2px(this.apparatusFontSizeInPts),
       rightToLeft: rightToLeft,
       defaultFontFamily: 'Times New Roman',
       normalSpaceWidth: 0.32,
    })

    // Some fake note text to test how it looks
    this.fakeApparatusMds  = [ 
        '**2** shown] _om._ A   with] wit C   **6** aperiamad] + iste A' ,
        '**1** This] A:24r  B:141v  C:48   **10** qui] B:142r   iste] C:49   **12** Optio] A:24v' 
    ]
    
    this.container.html(this.getHtml())
  }
  
  getHtml() {
    
    this.typesetTokens = this.ts.typesetTokens(this.tokens)
    let lineNumbers = this.ts.typesetLineNumbers(this.typesetTokens,5)
    let typesetApparatuses = []
    for (const fakeApparatusMd of this.fakeApparatusMds) {
      typesetApparatuses.push(this.tsApparatus.typesetMarkdownString(fakeApparatusMd))
    }
    
    let html = this.getSvgHtml(
      this.typesetTokens, 
      lineNumbers, 
      typesetApparatuses,
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
      
     
      let svgHeight = topMargin + mainTextHeight + this.textToApparatus * typesetApparatuses.length + totalApparatusHeight + bottomMargin
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
      for (const apparatus of typesetApparatuses) {
        apparatusY += this.textToApparatus 
        html += '<line x1="' + leftMargin + '" y1="' + (apparatusY - 5) + '" ' + 
                'x2="' + (leftMargin+50) + '" y2="' +  (apparatusY - 5) + '" style="stroke: silver; stroke-width: 1" />'
                
        for(const token of apparatus) {
          html += typesetter.genTokenSvg(leftMargin, apparatusY, token)
        }
      }

      html += '</svg>'
      return html
  }
  
  

  
  /**
   * Returns a list of tokens to be typeset for the given line range 
   * 
   * @returns array
   */
  getApparatusTokensFromNotes(linedNotes, startLine, endLine) {
    return []
  }
  
  
}
