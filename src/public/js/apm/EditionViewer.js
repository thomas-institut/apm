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

class EditionViewer {
  
  constructor (tokens, notes, divId) {
    console.log('Constructing Edition Viewer')
    this.tokens = tokens
    this.notes = notes
    this.container = $('#' + divId)
    
    this.fontFamily = 'Times New Roman'
    
    // em-square in pixels
    this.fontSizeInPoints = 16
    this.lineHeightInPoints = 22
    
    this.lineWidthInEms = 40  
    this.leftMargin = 3    // in ems
    this.rightMargin = 3   // in ems
    
    
    this.emSize = this.getTextWidth('m', this.fontSizeInPoints + 'pt ' + this.fontFamily)
    this.spaceWidth = this.getTextWidth(' ', this.fontSizeInPoints + 'pt ' + this.fontFamily)
    this.lineNumbersWidth = this.getTextWidth('000', this.lineNumbersFontSizeInPoints + 'pt ' + this.fontFamily)
    this.textWidth = this.lineWidthInEms*this.emSize
    this.distanceToLineNumbers = this.emSize
    this.distanceFromMarginToText = this.lineNumbersWidth + this.distanceToLineNumbers
    
    console.log(' - em-size: ' + this.emSize)
    console.log(' - space width: ' + this.spaceWidth)
    console.log(' - text width: ' + this.textWidth)
    console.log(' - line numbers width: ' + this.lineNumbersWidth)
    console.log(' - distance from line numbers to text: ' + this.distanceToLineNumbers)
    
    this.fontSize = this.fontSizeInPoints*4/3
    this.lineHeight = this.lineHeightInPoints*4/3
    
    this.lineNumbersFontSize = this.fontSize*0.8
    
    this.container.html(this.getHtml())
  }
  
  getHtml() {
    let pxLeftMargin = this.distanceFromMarginToText
    let pxRightMargin = this.distanceFromMarginToText
    let svgWidth = this.textWidth + pxLeftMargin  + pxRightMargin
    let placedTokens = this.placeTokensInLines(this.tokens)
    let numLines = placedTokens[placedTokens.length-1].lineNumber
    let lineNumbers = this.placeLineNumbers(numLines)
    let svgHeight = this.lineHeight*numLines+(this.fontSize/2)
    let html = '<svg class="editionsvg" height="' + svgHeight + '" width="' + svgWidth + '">'
    
    for(const token of placedTokens) {
      html += this.genTextSvg(pxLeftMargin+token.deltaX, token.deltaY, this.fontSize, token.text)
    }
    
    for(const lineNumber of lineNumbers) {
      html += this.genTextSvg(pxLeftMargin+lineNumber.deltaX, lineNumber.deltaY, this.lineNumbersFontSize, lineNumber.text)
    }
    html += '</svg>'
    return html
  }
  
  placeLineNumbers(maxLineNumber, lineFrequency = 5) {
    let lineNumbers = []
    for(let i=1; i <=maxLineNumber; i++) {
      if (i=== 1 || (i % lineFrequency) === 0 )
        lineNumbers.push({
          text: i.toString(),
          deltaX: - this.distanceToLineNumbers - this.getStringWidth(i.toString(), this.lineNumbersFontSize),
          deltaY: i*this.lineHeight
        })
          
        
    }
    return lineNumbers
  }
  
  getStringWidth(someString, fontSizeInPixels) {
    return  this.getTextWidth(someString, fontSizeInPixels + 'px  ' + this.fontFamily)
  }
  
  getTextWidth(text, font) {
    // re-use canvas object for better performance
    if (typeof(this.canvas) === 'undefined') {
      this.canvas = document.createElement("canvas")
    }
    let context = this.canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
  }
  
  genTextSvg(x, y, fontsize, text) {
    return '<text fill="#000000" font-size="' + fontsize + 'px" font-family="'  +
            this.fontFamily + '" x="' + x + '" y="' + y + '">' +  text + '</text>'
  }
  
  /**
   * Calculates the line positions of the given tokens for a given line Width
   * Returns a copy of the tokens adding or overwriting position information:
   *   lineNumber (starting in 1)
   *   deltaX  : relative X position 
   *   deltaY  : relative Y position
   * 
   * @param {array} tokens
   * @param {bool} rightToLeft
   * @returns {array}
   */
  
  placeTokensInLines(tokens, rightToLeft = false) {
    
    function isOutOfBounds(x, lineWidth, rightToLeft) {
      if (rightToLeft) {
        return x < 0
      }
      return x > lineWidth
    }
    
    function advanceX(x, deltaX, rightToLeft) {
      if (rightToLeft) {
        return x - deltaX
      }
      return x + deltaX
    }
    
    let newTokens = []
    let lineWidth = this.textWidth
    let currentLine = 1
    let currentX = rightToLeft ? lineWidth : 0
    let currentY = this.lineHeight
    let pxSpaceWidth = this.spaceWidth
    let pxLineHeight = this.lineHeight
    
    for(const token of tokens) {
      let newToken = token
      let tokenWidth = this.getStringWidth(token.text, this.fontSize) 
      //console.log('Processing token: ')
      //console.log(token)
      //console.log('Current X:' +  currentX)
      //console.log('Token Width: ' + tokenWidth)
      let newX = advanceX(currentX, tokenWidth, rightToLeft)
      //console.log('new X: ' + newX)
      // check to see if the word fits in the line
      if (isOutOfBounds(newX, lineWidth, rightToLeft)) {
        //console.log('Word is out of bounds')
        currentY += pxLineHeight
        currentLine++
        currentX = rightToLeft ? lineWidth : 0
      } 
      
      newToken.lineNumber = currentLine
      newToken.deltaX = currentX
      newToken.deltaY = currentY
      
      //console.log(newToken)
      // now advance currentX adding an em-space
      currentX = advanceX(currentX, tokenWidth + pxSpaceWidth, rightToLeft)
      // check if currentX is out of bounds
      if (isOutOfBounds(currentX, lineWidth, rightToLeft)) {
        currentY += pxLineHeight
        currentLine++
        currentX = rightToLeft ? lineWidth : 0
      }
      newTokens.push(newToken)
    }
    
    return newTokens
    
  }
 
  
  lineNotes(notes, placedTokens) {
    
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
