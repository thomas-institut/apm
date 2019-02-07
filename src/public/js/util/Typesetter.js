/*
 * Copyright (C) 2016-18 Universität zu Köln
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

/**
 * 
 * Typesetter class
 * 
 * The class provides a typesetting engine that allows for various typesetting scenarios.
 * The main method is typesetTokens, which takes an array of tokens and returns a copy
 * of those tokens with position information that can then be used to place them in a HTML canvas
 * or an SVG
 * 
 * 
 * A token is an object with the following elements:
 *    type:  string => 'text' | 'glue'
 *    
 *    type === 'text'
 *      text : string
 *      fontFamily:  string = CSS font-family (optional, default to defaultFontFamily given in constructor options)
 *      fontStyle: string, = CSS font-style  (defaults to 'normal')
 *      fontSize:  string, = CSS font-size, but only em and px sizes are recognized
 *      fontWeight: string = CSS font-weight (defaults to 'normal')
 *    
 *    type === 'glue' 
 *       The term 'glue' is taken from Donald Knuth's the TeXbook, where it is explained in 
 *       chapter 12. Glue is meant to represent a potentially variable length space that may or 
 *       may not eventually appear in the typeset text. 
 *       
 *       space: int, normal length of the space in pixels
 *       stretch: int, extra pixels the space can have, this is only a suggestion, the typesetter
 *           algorithm may stretch spaces more than this in extreme situations.
 *       shrink: int, how many pixels less the space can have; space - shrink is the absolute minimum
 *           for the space
 *           
 *       For the moment, stretch and shrink are ignored, stretch defaults to 10000 (esentially 
 *       infinite) and shrink defaults to zero
 *      
 *  The typesetter returns tokens with the following elements added
 *    
 *    deltaX: float
 *    deltaY: float
 *    lineNumber: int
 *    
 *    if type===glue
 *       status: string, = 'set'
 *       setSpace: float, the calculated width of the glue
 *      
 */

class Typesetter {
  
  constructor(options = {}) {
    console.log('Constructing typesetter')
    this.options = this.getSanitizedOptions(options)
    
    this.emSize = this.getTextWidthWithDefaults('m')
    this.normalSpace = this.options.normalSpaceWidth * this.emSize
    
    console.log(this.options)
    console.log('emSize = ' + this.emSize)
    console.log('normalSpace = ' + this.normalSpace)
    
  }
  
  getDefaultOptions() {
    let options = {}
    
    options.lineWidth = 700
    options.defaultFontFamily = 'Helvetica'
    options.defaultFontSize = 16
    options.lineHeight = options.defaultFontSize * 2
    options.rightToLeft = false
    options.normalSpaceWidth = 1  // in ems
    options.minSpaceWidth = 0.8 // in ems
    options.justifyText = false
    
    return options
  }
  
  getSanitizedOptions(options = {}) {
    
    let sanitizedOptions = this.getDefaultOptions()
    
    if (typeof(options.lineWidth) === 'number') {
      sanitizedOptions.lineWidth = options.lineWidth
    }
    
    if (typeof(options.lineHeight) === 'number') {
      sanitizedOptions.lineHeight = options.lineHeight
    }
    
    if (typeof(options.defaultFontFamily) === 'string') {
      sanitizedOptions.defaultFontFamily = options.defaultFontFamily
    }
    
    if (typeof(options.defaultFontSize) === 'number') {
      sanitizedOptions.defaultFontSize = options.defaultFontSize
    }
    
    if (typeof(options.normalSpaceWidth) === 'number') {
      sanitizedOptions.normalSpaceWidth = options.normalSpaceWidth
    }
    
    if (typeof(options.minSpaceWidth) === 'number') {
      sanitizedOptions.minSpaceWidth = options.minSpaceWidth
    }
    
    if (typeof(options.rightToLeft === 'boolean')) {
      sanitizedOptions.rightToLeft = options.rightToLeft
    }
    
    // TODO: fill this up
    
    return sanitizedOptions
  }
  
  getStringWidth(text, fontDefinitionString) {
    // re-use canvas object for better performance
    if (typeof(this.canvas) === 'undefined') {
      this.canvas = document.createElement("canvas")
    }
    let context = this.canvas.getContext("2d");
    context.font = fontDefinitionString;
    let metrics = context.measureText(text);
    return metrics.width
  }
  
  getTextWidthWithDefaults(text) {
    if (typeof(this.defaultFontDefinitionString) === 'undefined') {
      this.defaultFontDefinitionString = this.options.defaultFontSize  + 'px ' + this.options.defaultFontFamily
      console.log('Default string def: ' + this.defaultFontDefinitionString)
    }
    return this.getStringWidth(text, this.defaultFontDefinitionString) 
  }
  
  typesetTokens(tokens) {
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
    
    let typesetTokens = []
    let lineWidth = this.options.lineWidth
    let rightToLeft = this.options.rightToLeft
    let currentLine = 1
    let currentX = rightToLeft ? lineWidth : 0
    let currentY = this.options.defaultFontSize
    let pxLineHeight = this.options.lineHeight
    
    for(const token of tokens) {
      if (token.type === 'glue') {
        //console.log('Space token')
        let spaceWidth = token.space
        if (token.space <= 0) {
          // ignore negative and zero space
          continue
        }
        let newX = advanceX(currentX, spaceWidth, rightToLeft)
        if (isOutOfBounds(newX, lineWidth, rightToLeft)) {
          currentY += pxLineHeight
          currentLine++
          currentX = rightToLeft ? lineWidth : 0
        } else {
          let glueToken = token
          glueToken.status = 'set'
          glueToken.setSpace = token.space
          glueToken.lineNumber = currentLine
          glueToken.deltaX = currentX
          glueToken.deltaY = currentY
          currentX = newX
          typesetTokens.push(glueToken)
        }
        continue
      }
      // Token is of type text
      if (token.text === '') {
        // ignore empty text
        continue
      }
      let newToken = token
      let fontDefString = ''
      if (token.fontWeight) {
        fontDefString += token.fontWeight + ' '
      }
      fontDefString += this.options.defaultFontSize + 'px ' + this.options.defaultFontFamily
      
      let tokenWidth = this.getStringWidth(token.text, fontDefString) 
      let newX = advanceX(currentX, tokenWidth, rightToLeft)
      if (isOutOfBounds(newX, lineWidth, rightToLeft)) {
        currentY += pxLineHeight
        currentLine++
        currentX = rightToLeft ? lineWidth : 0
      } 
      
      newToken.lineNumber = currentLine
      newToken.deltaX = currentX
      newToken.deltaY = currentY
      newToken.fontFamily = this.options.defaultFontFamily
      newToken.fontSize = this.options.defaultFontSize
      
      currentX = advanceX(currentX, tokenWidth, rightToLeft)
      typesetTokens.push(newToken)
    }
    return typesetTokens
  }
  
  typesetString(theString) {
    let tokens = this.getTokensFromString(theString)
    return this.typesetTokens(tokens)
  }
  
  
  typesetMarkdownString(theString) {
    let tokens = this.getTokensFromMarkdownString(theString)
    return this.typesetTokens(tokens)
  }
  
  genTextSvg(left, top, token, showGlue = true) {
    
    if (token.type === 'glue') {
      if (!showGlue) {
        return ''
      }
      let fontHeight = this.options.defaultFontSize
      let svg = '<rect x="' + (left+token.deltaX) + '" y="' + (top+token.deltaY - fontHeight ) + '" '+
              'width="' + token.setSpace + '" height="' + fontHeight + '" ' +
              'style="fill:silver;"/>'
      return svg
      
    }
    if (token.text === '') {
      return ''
    }
    let fontsize = this.options.defaultFontSize
    let fillColor = '#000000'
    let fontfamily = this.options.defaultFontFamily
    let fontWeight = ''
    let fontStyle = ''
    if (token.fontWeight) {
      fontWeight = token.fontWeight
    }
    
    if (token.fontStyle) {
      fontStyle = token.fontStyle
    }
    
    let svgString = '<text fill="' +  fillColor + '" font-size="' + fontsize + '" '
    svgString += 'font-family="' + fontfamily + '" '
    if (fontWeight) {
      svgString += 'font-weight="' + fontWeight +'" '
    }
    
    if (fontStyle) {
      svgString += 'font-style="' + fontStyle +'" '
    }
    svgString += ' x="' + (left + token.deltaX) + '" y="' + (top + token.deltaY) + '">' +  token.text + '</text>'
    return svgString
  }
  
  
  getTokensFromString(theString) {
    let tokensText = theString.split(' ')
    let tokens = []
    for (const tokenText of tokensText) {
      tokens.push({type: 'text', text: tokenText})
      tokens.push({type: 'glue',  space: this.normalSpace })
    }
    return tokens
  }
  
  getTokensFromMarkdownString(theString) {
    let stringTokens = this.getTokensFromString(theString)
    
    let boldRegExp = RegExp('^\\*\\*(.*)\\*\\*([.,;:?!]*)$')
    let italicsRegExp = RegExp('^_(.*)_([.,;:?!]*)$')
    let mdTokens = []
    for (const stringToken of stringTokens) {
      if (stringToken.type === 'glue') {
        mdTokens.push(stringToken)
        continue
      }
      if (boldRegExp.test(stringToken.text)) {
        let regExpArray = boldRegExp.exec(stringToken.text)
        stringToken.text = regExpArray[1]
        stringToken.fontWeight = 'bold'
        mdTokens.push(stringToken)
        if (regExpArray[2]) {
          mdTokens.push({ type: 'text', text: regExpArray[2]})
        }
        continue
      }
      if (italicsRegExp.test(stringToken.text)) {
        let regExpArray = italicsRegExp.exec(stringToken.text)
        stringToken.text = regExpArray[1]
        stringToken.fontStyle = 'italic'
        mdTokens.push(stringToken)
        if (regExpArray[2]) {
          mdTokens.push({ type: 'text', text: regExpArray[2]})
        }
        continue
      }
      
      mdTokens.push(stringToken)
      
    }
    
    return mdTokens
  }
  
  getTextHeight(tokens) {
    // NOTE: just estimating the descender height at this point
    // when browser support advanced text metrics this can be 
    // calculated automatically 
    return tokens[tokens.length-1].deltaY + (this.options.defaultFontSize * 0.4)
  }
  
  getTextWidth() {
    return this.options.lineWidth
  }
  
  // Unit conversion methods
  
  static mm2px(mm) {
    return mm * 3.779527559 //   = mm * 96 [px/in] / 25.4 [mm/in]
  }
  
  static cm2px(cm) {
    return cm * 37.79527559 //   = mm * 96 [px/in] / 2.54 [cm/in]
  }
  
  static pt2px(pt) {
    return pt * 4 / 3  // = pt * 72 [pt/in] *  1/96 [in/px]
  }
  
  static in2px(inches) {
    return inches * 96
  }
  
  
}