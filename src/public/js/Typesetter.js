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

/**
 * 
 * Typesetter class
 * 
 * The class provides a typesetting engine that allows for various typesetting scenarios.
 * The main method is typesetTokens, which takes an array of tokens and returns a copy
 * of those tokens with position information that can then be used to place them in an SVG-like element.
 *
 * At the moment the typesetter only aligns the left side margin for ltr text or the right side for rtl text. That is,
 * it does not properly justifies the text.
 * 
 * 
 * A token is an object with the following properties:
 *    type:  'text' | 'glue'
 *    
 *    type === 'text'
 *      text : string
 *      fontFamily:  string = CSS font-family (optional, defaults to defaultFontFamily given in the constructor options)
 *      fontStyle: 'normal' | 'italic',  defaults to 'normal'
 *      fontSize:  number, font size in pixels
 *      fontWeight: 'normal' | 'bold', defaults to 'normal'
 *    
 *    type === 'glue' 
 *       The term 'glue' is taken from Donald Knuth's the TeXbook, where it is explained in 
 *       chapter 12. Glue is meant to represent a potentially variable-length space that may or 
 *       may not eventually appear in the typeset text. It may not appear, for example, if it is an inter-word
 *       space that falls at the end of the line.
 *       
 *       space: 'normal' | number,  if a number is given this is the space size in pixels; if 'normal'
 *              the normalSpaceWidth given in the constructor options is used
 *       stretch: number, extra pixels the space can have, this is only a suggestion, the typesetter
 *           algorithm may stretch spaces more than this in extreme situations.
 *       shrink: number , how many pixels less the space can have; (space - shrink) is the absolute minimum
 *           for the space
 *           
 *       For the moment, stretch and shrink are ignored, stretch defaults to 10000 (essentially
 *       infinite) and shrink defaults to zero
 *      
 *  The typesetter returns tokens with the following properties added or overwritten
 *    
 *    deltaX: number 
 *    deltaY: number
 *    width: float, token width in pixels. 
 *        for a  text token, (deltaX, deltaY) is the position to use when placing the token in SVG using
 *        the appropriate text direction. So, if the text is left-to-right, the position
 *        corresponds to the left-most point of the text's baseline; if the text is
 *        right-to-left, the position corresponds to the right-most point of the baseline
 *        
 *        for a glue token, (deltaX, deltaY) is the position of the bottom, left corner of an 
 *        imaginary rectangle representing the white space.  
 *        
 *    lineNumber: number 
 *    
 *    when the token text direction is not the default one:
 *    
 *      direction: 'rtl' | 'ltr' 
 *    
 *    if type === 'glue'
 *       status: string, = 'set'
 *      
 *  Not all input tokens to typeset will be present in the return array. Specifically, the return
 *  array will not return glue tokens with negative space, empty text tokens and  possibly some
 *  glue tokens that are not necessary.
 *
 *  TODO: Change the return policy, the typesetter returns ALL input tokens, some of them marked as 'invisible'
 */

import {OptionsChecker} from '@thomas-inst/optionschecker'

export class Typesetter {
  
  constructor(options = {}) {

    let defaultFontSize = 16

    let optionsDefinition = {
      lang: { type: 'string'},
      lineWidth: { type: 'NumberGreaterThanZero', default: 700},
      defaultFontFamily: {type: 'NonEmptyString', default:'Helvetica' },
      defaultFontSize: { type: 'NumberGreaterThanZero', default: defaultFontSize},
      lineHeight: { type: 'NumberGreaterThanZero', default: defaultFontSize * 2},
      lineNumberStyle: { type: 'string', default: 'latin'},
      rightToLeft: { type: 'boolean', default: false},
      normalSpaceWidth: { type: 'number', default: 1}, // in ems
      minSpaceWidth: { type: 'number', default: 0.8}, // in ems
      justifyText: { type: 'boolean', default: false},
      lineNumbersFontSizeMultiplier: { type: 'number', default: 0.8},
      spaceBetweenParagraphs: { type: 'number', default: 0},
      paragraphFirstLineIndent: { type: 'NumberGreaterThanZero', default: defaultFontSize * 2}
    }

    let oc = new OptionsChecker(optionsDefinition, 'Typesetter')
    this.options = oc.getCleanOptions(options)
    
    //this.emSize = this.getTextWidthWithDefaults('m')
    this.emSize = this.options.defaultFontSize
    this.normalSpace = this.getNormalSpaceWidth()
    console.log(`Typesetter: normal space size: ${this.normalSpace}`)
  }

  getNormalSpaceWidth() {
    return this.emSize * this.options.normalSpaceWidth
  }

  
  getStringWidth(text, fontDefinitionString) {
    // re-use canvas object for better performance
    if (typeof(this.canvas) === 'undefined') {
      this.canvas = document.createElement("canvas")
    }
    let context = this.canvas.getContext("2d");
    context.font = fontDefinitionString;
    let metrics = context.measureText(text);
    // if (text === ' ' || text === 'm') {
    //   console.log(`Measuring string '${text}'`)
    //   console.log(metrics)
    // }
    return metrics.width
  }
  
  getTextWidthWithDefaults(text) {
    if (typeof(this.defaultFontDefinitionString) === 'undefined') {
      this.defaultFontDefinitionString = this.options.defaultFontSize  + 'px ' + '"' + this.options.defaultFontFamily + '"'
      console.log('Default string def: ' + this.defaultFontDefinitionString)
    }
    return this.getStringWidth(text, this.defaultFontDefinitionString) 
  }
  
  typesetTokens(tokens, defaultFontSize = false) {
    
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

    function makeInvisible(token) {
      let invisibleToken = token
      invisibleToken.status = 'set'
      invisibleToken.width = 0
      return invisibleToken
    }
    
    if (defaultFontSize === false) {
      defaultFontSize = this.options.defaultFontSize
    }
    
    let typesetTokens = []
    let lineWidth = this.options.lineWidth
    let rightToLeft = this.options.rightToLeft
    let currentLine = 1
    let currentX = rightToLeft ? lineWidth : 0
    let currentY = defaultFontSize
    let pxLineHeight = this.options.lineHeight
    
    for(const token of tokens) {
      if (token.type === 'glue') {
        let spaceWidth = (token.space === 'normal') ? this.normalSpace : token.space
        if (token.space <= 0) {
          // ignore negative and zero space
          typesetTokens.push(makeInvisible(token))
          continue
        }
        let newX = advanceX(currentX, spaceWidth, rightToLeft)
        if (isOutOfBounds(newX, lineWidth, rightToLeft)) {
          typesetTokens.push(makeInvisible(token))
          // advance to the next line
          currentY += pxLineHeight
          currentLine++
          currentX = rightToLeft ? lineWidth : 0
        } else {
          // create and insert a set glue token into output token array
          let glueToken = token
          glueToken.status = 'set'
          glueToken.width = token.space
          glueToken.lineNumber = currentLine
          // if rightToLeft, make sure the glue is positioned correctly to the left
          // of the currentX point, at newX
          glueToken.deltaX = rightToLeft ? newX : currentX
          glueToken.deltaY = currentY
          currentX = newX
          typesetTokens.push(glueToken)
        }
        continue
      }
      // Token is of type text
      if (token.text === '') {
        // Empty text, ignore and move on
        typesetTokens.push(makeInvisible(token))
        continue
      }
      
      if (token.text === "\n") {
        // newline means start a new paragraph
        typesetTokens.push(makeInvisible(token))
        // new paragraph
        currentY += pxLineHeight + this.options.spaceBetweenParagraphs
        currentLine++
        currentX = rightToLeft ? lineWidth : 0
        currentX = advanceX(currentX, this.options.paragraphFirstLineIndent, rightToLeft)
        continue
      }

      // normal text token
      let fontDefString = ''
      if (token.fontWeight) {
        fontDefString += token.fontWeight + ' '
      }
      fontDefString += defaultFontSize + 'px ' + this.options.defaultFontFamily
      
      let tokenWidth = this.getStringWidth(token.text, fontDefString) 
      let newX = advanceX(currentX, tokenWidth, rightToLeft)
      if (isOutOfBounds(newX, lineWidth, rightToLeft)) {
        currentY += pxLineHeight
        currentLine++
        currentX = rightToLeft ? lineWidth : 0
      } 
      
      let newToken = token
      newToken.lineNumber = currentLine
      newToken.deltaX = currentX
      newToken.deltaY = currentY
      newToken.fontFamily = this.options.defaultFontFamily
      newToken.fontSize = defaultFontSize
      newToken.width = tokenWidth
      newToken.status = 'set'
      newToken.lang = this.options.lang
      typesetTokens.push(newToken)
      
      currentX = advanceX(currentX, tokenWidth, rightToLeft)

    }
    return typesetTokens
  }
  
  typesetString(theString, defaultFontSize = false) {
    let tokens = this.getTokensFromString(theString)
    return this.typesetTokens(tokens, defaultFontSize)
  }
  
  
  typesetMarkdownString(theString, defaultFontSize) {
    let tokens = this.getTokensFromMarkdownString(theString)
    return this.typesetTokens(tokens, defaultFontSize)
  }

  getNumberString(number, style= '') {
    switch(style) {
      case 'arabic':
      default: return number.toString()
    }
  }

  /**
   * Takes an array of typeset tokens and generates
   * typeset token for line numbers 
   * if rightToLeft, line numbers will have all deltaX = 0 
   * which will make them left-aligned
   * if not rightToLeft, line numbers will be right aligned,
   * so all their deltaX will be negative
   * 
   * @param {array} typesetTokens
   * @param {int} lineNumberFrequency
   * @returns {array}
   */
  typesetLineNumbers(typesetTokens, lineNumberFrequency) {
    
   // get line y positions
    let lineNumbersDeltaYs = []
    for(const token of typesetTokens) {
      lineNumbersDeltaYs[token.lineNumber] = token.deltaY
    }
    let lineNumbersFontDefinition = (this.options.defaultFontSize * this.options.lineNumbersFontSizeMultiplier) + 'px ' + this.options.defaultFontFamily
    let lineNumberTokens =[]
    for (const i in lineNumbersDeltaYs) {
      if ( (i * 1) ===1 || (i % lineNumberFrequency) === 0 ) {
        let tokenWidth = this.getStringWidth(i.toString(), lineNumbersFontDefinition)
        let newToken = {
          type: 'text',
          text: this.getNumberString(i, this.options.lineNumberStyle),
          deltaX: this.options.rightToLeft ? 0 : -tokenWidth,  //left-align on rtl text and right-align on ltr text
          deltaY: lineNumbersDeltaYs[i],
          fontSize: this.options.defaultFontSize * this.options.lineNumbersFontSizeMultiplier,
          width: tokenWidth,
          status: 'set',
          direction: 'ltr'
        }
        lineNumberTokens.push(newToken)
      }
    }
    return lineNumberTokens
  }
  
  genTokenSvg(left, top, token, showGlue = false, showFontBasicInfo = true) {
    
    if (token.type === 'glue') {
      if (!showGlue || token.width===0) {
        return ''
      }
      let fontHeight = this.options.defaultFontSize
      return '<rect x="' + (left + token.deltaX) + '" y="' + (top + token.deltaY - fontHeight) + '" ' +
        'width="' + token.width + '" height="' + fontHeight + '" ' +
        'style="fill:silver;"/>'
      
    }
    // text token
    if (token.width === 0) {
      return ''
    }
    let fontSize = this.options.defaultFontSize
    let fillColor = '#000000'
    let fontFamily = this.options.defaultFontFamily
    let fontWeight = ''
    let fontStyle = ''

    if (token.fontWeight) {
      fontWeight = token.fontWeight
    }
    
    if (token.fontStyle) {
      fontStyle = token.fontStyle
    }
    
    if (token.fontSize) {
      fontSize = token.fontSize
    }

    let posX = left + token.deltaX
    // testing RTL

    let svgString = "<text "
    if (showFontBasicInfo) {
      svgString += 'fill="' +  fillColor + '" font-size="' + fontSize + '" '
      svgString += 'font-family="' + fontFamily + '" '
    }

    if (fontStyle) {
      svgString += 'font-style="' + fontStyle +'" '
    }

    if (fontWeight) {
      svgString += 'font-weight="' + fontWeight +'" '
    }

    if (token.lang === 'he' || token.lang === 'ar') {
      svgString += 'direction="rtl" '
    }

    svgString += ' x="' + posX + '" y="' + (top + token.deltaY) + '">' +  token.text + '</text>'
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
    
    // TODO: parse markdown properly. At this point only bold and italics on single
    //  words are supported
    
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
    //console.log('Getting text height: ')
    //console.log(tokens[tokens.length-1])
    if (tokens.length === 0) {
      return 0
    }
    // find the last token that is visible
    let lastTokenIndex = tokens.length - 1
    while (typeof(tokens[lastTokenIndex].deltaY) === 'undefined') {
      lastTokenIndex--
    }
    return tokens[lastTokenIndex].deltaY + (this.options.defaultFontSize * 0.4)
  }
  
  getTextWidth() {
    return this.options.lineWidth
  }
  
  // Unit conversion methods
  
  static mm2px(mm) {
    return mm * 3.7795275590551184 //   = mm * 96 [px/in] / 25.4 [mm/in]
  }
  
  static cm2px(cm) {
    return cm * 37.795275590551184 //   = mm * 96 [px/in] / 2.54 [cm/in]
  }
  static px2cm(px) {
    return px / 37.795275590551184 //   = px * 1/96 [in/px] * 2.54 [cm/in]
  }
  
  static pt2px(pt) {
    return pt * 4 / 3  // = pt * 72 [pt/in] *  1/96 [in/px]
  }
  
  static in2px(inches) {
    return inches * 96
  }
  
  
}