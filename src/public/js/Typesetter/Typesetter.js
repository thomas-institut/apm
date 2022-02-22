/* 
 *  Copyright (C) 2019-21 Universität zu Köln
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
 * The main method is typesetTokens, which takes an array of TypesetterTokens and returns a copy
 * of those tokens with position information that can then be used to place them in an SVG-like element.
 *
 * The first, simpler version of the typesetter assumes that the text will be placed in 2D area of a
 * certain width given as a parameter,
 * but of indeterminate length.
 * 
 * 

 *
 *  The typesetter returns tokens with the following properties added or overwritten
 *    
 *    deltaX: number 
 *    deltaY: number
 *    width: float, measured or assigned width in pixels
 *
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
 *    if type === TypesetterTokenType.GLUE
 *       status: string, = 'set'
 *      
 *  Not all input tokens to typeset will be present in the return array. Specifically, the return
 *  array will not return glue tokens with negative space, empty text tokens and possibly some
 *  glue tokens that are not necessary.
 *
 *  Also, the typeset tokens might be in a different order if there are text direction changes
 */
import * as TypesetterTokenType from './TypesetterTokenType'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { NumeralStyles } from '../toolbox/NumeralStyles'
import * as ArrayUtil from '../toolbox/ArrayUtil'
import { LanguageDetector } from '../toolbox/LanguageDetector'
import { isRtl } from '../toolbox/Util.mjs'

import * as VerticalAlign from '../FmtText/VerticalAlign'
import { StringCounter } from '../toolbox/StringCounter'

export class Typesetter {
  
  constructor(options = {}) {

    let defaultFontSize = 16

    let optionsDefinition = {
      lang: { type: 'string'},
      lineWidth: { type: 'NumberGreaterThanZero', default: 700},
      defaultFontFamily: {type: 'NonEmptyString', default: 'Helvetica' },
      defaultFontSize: { type: 'NumberGreaterThanZero', default: defaultFontSize},
      lineHeight: { type: 'NumberGreaterThanZero', default: defaultFontSize * 2},
      lineNumberStyle: { type: 'string', default: 'latin'},
      rightToLeft: { type: 'boolean', default: false},
      normalSpaceWidth: { type: 'number', default: 0.33}, // in ems
      minSpaceWidth: { type: 'number', default: 0.8}, // in ems
      justifyText: { type: 'boolean', default: false},
      lineNumbersFontSizeMultiplier: { type: 'number', default: 0.8},
      spaceBetweenParagraphs: { type: 'number', default: 0},
      paragraphFirstLineIndent: { type: 'NumberGreaterThanZero', default: defaultFontSize * 2}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'Typesetter'})
    this.options = oc.getCleanOptions(options)
    
    this.emSize = this.getTextWidthWithDefaults('M')
    // console.log(`Fontsize: ${this.options.defaultFontSize}, calculated em width: ${this.emSize}`)
    this.normalSpace = this.getNormalSpaceWidth()
    // console.log(`Typesetter: normal space size: ${this.normalSpace}`)
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
      // console.log('Default string def: ' + this.defaultFontDefinitionString)
    }
    return this.getStringWidth(text, this.defaultFontDefinitionString)
  }

   __advanceX(x, deltaX, rightToLeft) {
    if (rightToLeft) {
      return x - deltaX
    }
    return x + deltaX
  }

   __makeInvisible(token) {
    let invisibleToken = token
    invisibleToken.status = 'set'
    invisibleToken.width = 0
    return invisibleToken
  }

  /**
   *
   * @param {TypesetterToken[]}tokens
   * @param {number}posY
   * @param {number}lineWidth
   * @param {boolean}rightToLeft
   * @param {number}lineNumber
   * @param {number}normalSpace
   * @param lastLine
   * @return {*[]}
   */
   __typesetLine(tokens, posY, lineWidth, rightToLeft, lineNumber, normalSpace, lastLine = false) {

    // console.log(`Typesetting line ${lineNumber} at posY ${posY} with ${tokens.length} tokens`)
    // console.log(`Normal space: ${normalSpace}`)
    // console.log(tokens)
    // 1. make initial and final glue invisible
    // TODO: support indentation of first line
    let i = 0
    while(i < tokens.length && tokens[i].type === TypesetterTokenType.GLUE) {
      tokens[i] = this.__makeInvisible(tokens[i])
      i++
    }
    i = tokens.length -1
    while (i > 0 && tokens[i].type === TypesetterTokenType.GLUE) {
      tokens[i] = this.__makeInvisible(tokens[i])
      i--
    }
    // 2. measure line, count glue and set glue initial width
    let measuredLineWidth = 0
    let glueTokens = 0
    let textTokensCounter = new StringCounter()
    let tokensWithInitialGlue = tokens.map( (token) => {
      if (token.width !== undefined && token.width === 0) {
        // skip over invisible tokens
        return token
      }
      if (token.type === TypesetterTokenType.GLUE) {
        let spaceWidth = (token.space === 'normal') ? normalSpace : token.space
        let glueToken = token
        glueToken.width = spaceWidth
        glueTokens++
        measuredLineWidth += spaceWidth
        return glueToken
      }
      measuredLineWidth += token.width
      return token
    })
    //console.log(`Line measures ${measuredLineWidth} (diff = ${lineWidth - measuredLineWidth}), ${glueTokens} glue tokens`)
    let glueSpaceAdjustment = (lineWidth - measuredLineWidth)/glueTokens
    if (lastLine) {
      glueSpaceAdjustment = 0
    }

    // 3. Reorder the tokens taking into account text direction
    let state = 0
    let orderedTokenIndices = []
    let reverseStack = []
    let glueArray = []
    let hasDirectionChanges = false
    tokensWithInitialGlue.forEach( (token, i) => {
      // console.log(`Processing token ${i}`)
      let tokenLang = token.getLang()
      let isSameDirection = true
      if (token.type === TypesetterTokenType.BOX) {
        isSameDirection = isRtl(tokenLang) === rightToLeft
      }
      switch (state) {
        case 0:
          if (token.type === TypesetterTokenType.GLUE || isSameDirection) {
            // console.log(`Pushing ${i} into main array`)
            orderedTokenIndices.push(i)
          } else {
            // Detected change of direction
            // console.log(`Detected change of direction at token ${i} : ${token.type} ${token.type === TypesetterTokenType.BOX ? token.text : ''}`)
            // console.log(`Pushing ${i} into reverse stack`)
            reverseStack.push(i)
            hasDirectionChanges = true
            state = 1
          }
          break

        case 1:
          if (token.type === TypesetterTokenType.GLUE) {
            // console.log(`Token ${i}: glue token while in reverse direction, pushing to glueArray`)
            glueArray.push(i)
          } else {
            if (!isSameDirection) {
              // console.log(`Another reverse direction token ${i} : ${token.type} ${token.type === TypesetterTokenType.BOX ? token.text : ''}`)
              // console.log(`Pushing ${glueArray.length} glue tokens into reverse stack`)
              while(glueArray.length > 0) {
                reverseStack.push(glueArray.pop())
              }
              // console.log(`Pushing ${i} into reverse stack`)
              reverseStack.push(i)
            } else {
              // back to sameDirection
              // console.log(`Back to normal direction`)
              // console.log(`Pushing all ${reverseStack.length} tokens from the reverse stack into main array `)
              while (reverseStack.length > 0) {
                orderedTokenIndices.push(reverseStack.pop())
              }
              // console.log(`Pushing ${glueArray.length} hanging glue tokens into main array`)
              for (let j = 0; j < glueArray.length; j++) {
                orderedTokenIndices.push(glueArray[j])
              }
              glueArray = []
              // console.log(`Pushing ${i} into main array`)
              orderedTokenIndices.push(i)
              state = 0
            }
          }
          break
      }
    })


    // some checks, just to be sure
    if (state === 0 && reverseStack.length > 0){
      console.error(`Reverse stack has ${reverseStack.length} tokens after ending in state 0`)
    }
    if (state === 0 && glueArray.length > 0) {
      console.error(`There are ${glueArray.length} glue tokens after ending ordering of tokens`)
    }
    // empty the reverse stack
    while(reverseStack.length > 0) {
      orderedTokenIndices.push(reverseStack.pop())
    }
    // empty the glue array
    for (let j = 0; j < glueArray.length; j++) {
      orderedTokenIndices.push(glueArray[j])
    }
    glueArray = []
    if (hasDirectionChanges) {
      // console.log(`Line ${lineNumber} has text with mixed directions, length: ${tokens.length}`)
      // console.log(tokens)
      // console.log(orderedTokenIndices)
    }
    if (orderedTokenIndices.length !== tokensWithInitialGlue.length) {
      console.error(`Ordered token indices and tokensWithInitial glue are not the same length: 
        ${orderedTokenIndices.length} !== ${tokensWithInitialGlue.length}`)
    }


    // 4. Typeset tokens
    let typesetTokens = []
    let currentX = rightToLeft ? lineWidth : 0

    orderedTokenIndices.map( (index) => { return tokensWithInitialGlue[index]}).forEach( (token) => {
      if (token.width !== undefined && token.width === 0) {
        // skip over invisible tokens
        typesetTokens.push(token)
        return
      }
      if (token.type === TypesetterTokenType.GLUE) {
        let spaceWidth = token.width + glueSpaceAdjustment
        let newX = this.__advanceX(currentX, spaceWidth, rightToLeft)
        // create and insert a set glue token into output token array
        let glueToken = token
        glueToken.status = 'set'
        glueToken.width = spaceWidth
        glueToken.lineNumber = lineNumber
        // if rightToLeft, make sure the glue is positioned correctly to the left
        // of the currentX point, at newX
        glueToken.deltaX = rightToLeft ? newX : currentX
        glueToken.deltaY = posY
        currentX = newX
        typesetTokens.push(glueToken)
        return
      }
      // text token
      let newToken = token
      let newX = this.__advanceX(currentX, token.width, rightToLeft)
      textTokensCounter.addString(token.text)
      newToken.lineNumber = lineNumber
      newToken.occurrenceInLine = textTokensCounter.getCount(token.text)
      newToken.deltaX = rightToLeft === isRtl(token.lang) ? currentX : newX
      newToken.deltaY = posY
      newToken.status = 'set'
      typesetTokens.push(newToken)
      currentX = newX
    })
    if (hasDirectionChanges) {
      // console.log(`Typeset tokens`)
      // console.log(typesetTokens)
    }

    return typesetTokens
  }

  /**
   *
   * @param {TypesetterToken[]} tokens
   * @param {boolean|number}defaultFontSize
   * @return {*[]}
   */
  typesetTokens(tokens, defaultFontSize = false) {

    if (defaultFontSize === false) {
      defaultFontSize = this.options.defaultFontSize
    }
    
    let typesetTokens = []
    let lineWidth = this.options.lineWidth
    let rightToLeft = this.options.rightToLeft

    let currentY = defaultFontSize
    let pxLineHeight = this.options.lineHeight

    // TODO: change this to something more like Knuth's line breaking algorithm in TeX
    //  See The TEX Book ch 13, and "TeX, the Program"  par 813+
    //   1) Algorithm: for each paragraph in input
    //      a) Add glue to end of the paragraph so that last line is not justified.
    //      b) Determine line breaks.
    //      c) For each individual line, adjust glue and calculate each token's position
    //         taking care of changes in text direction.
    //      d) Add vertical space after paragraph (could be set to 0)
    //   2) A product of the typeset process should be the size of the text box and the number of lines.

    // 1. Divide the text in paragraphs
    let paragraphs = []
    let currentParagraph = []
    tokens.forEach( (token) => {
      if (token.type === TypesetterTokenType.BOX && token.text === "\n") {
        currentParagraph.push(token)
        paragraphs.push(currentParagraph)
        currentParagraph = []
      } else {
        currentParagraph.push(token)
      }
    })
    if (currentParagraph.length !== 0) {
      paragraphs.push(currentParagraph)
    }
    // console.log(`There are ${paragraphs.length} paragraph(s) in the text`)

    // 2. Process paragraphs
    let currentLine = 1
    let langDetector = new LanguageDetector({defaultLang: this.options.lang})
    paragraphs.forEach( (tokenArray) => {
      let currentLineTokens = []
      let accLineWidth = 0
      tokenArray.forEach( (token) => {
        if (token.type === TypesetterTokenType.GLUE) {
          let spaceWidth = (token.space === 'normal') ? this.normalSpace : token.space
          if (token.space <= 0) {
            // ignore negative and zero space
            currentLineTokens.push(this.__makeInvisible(token))
            return
          }
          if ((accLineWidth + spaceWidth) > lineWidth) {
            // new line
            currentLineTokens.push(this.__makeInvisible(token))
            let lineTypeSetTokens = this.__typesetLine(currentLineTokens, currentY, lineWidth, rightToLeft, currentLine, this.normalSpace)
            ArrayUtil.pushArray(typesetTokens, lineTypeSetTokens)
            // advance to the next line
            currentY += pxLineHeight
            currentLine++
            accLineWidth = 0
            currentLineTokens = []
            return
          } else {
            // just put the glue token into the line
            currentLineTokens.push(token)
            accLineWidth += spaceWidth
          }
          return
        }
        // token is text
        if (token.text === '') {
          // Empty text, ignore and move on
          currentLineTokens.push(this.__makeInvisible(token))
          return
        }
        if (token.text === "\n") {
          // just make invisible
          currentLineTokens.push(this.__makeInvisible(token))
          return
        }

        // normal text token
        // Determine the token's width, fontsize
        // if
        let detectedTokenLang = langDetector.detectLang(token.text)
        // TODO: determine font based on actual token language and perhaps a style
        let fontDefString = ''
        if (token.fontWeight) {
          fontDefString += token.fontWeight + ' '
        }
        let fontSize = defaultFontSize
        if (token.fontSize !== undefined && token.fontSize !== 1) {
          // font size is a factor of the default fontSize
          fontSize = token.fontSize * defaultFontSize
        }
        fontDefString += fontSize + 'px ' + this.options.defaultFontFamily

        let tokenWidth = this.getStringWidth(token.text, fontDefString)
        let newToken = token
        newToken.width = tokenWidth
        newToken.fontSize = fontSize
        newToken.fontFamily = this.options.defaultFontFamily
        newToken.fontSize = fontSize
        newToken.width = tokenWidth
        try {
          newToken.setLang( token.getLang() === '' ? detectedTokenLang : token.getLang())
        } catch (e) {
          console.log(`Caught error`)
          console.log(e)
          console.log(token)
        }

        if ( (accLineWidth + tokenWidth) > lineWidth) {
          // new line
          let lineTypeSetTokens = this.__typesetLine(currentLineTokens, currentY, lineWidth, rightToLeft, currentLine, this.normalSpace)
          ArrayUtil.pushArray(typesetTokens, lineTypeSetTokens)
          // advance to the next line
          currentY += pxLineHeight
          accLineWidth = 0
          currentLine++
          currentLineTokens = []
        }
        currentLineTokens.push(newToken)
        accLineWidth += tokenWidth
      })
      if (currentLineTokens.length !== 0) {
        let lineTypeSetTokens = this.__typesetLine(currentLineTokens, currentY, lineWidth, rightToLeft, currentLine, this.normalSpace, true)
        ArrayUtil.pushArray(typesetTokens, lineTypeSetTokens)
        currentLine++
      }
      // new paragraph
      currentY += pxLineHeight + this.options.spaceBetweenParagraphs
    })
    return typesetTokens
  }


  getNumberString(number, style= '') {
    switch(style) {
      case 'ar':
        return NumeralStyles.toDecimalArabic(number)
      default:
        return NumeralStyles.toDecimalWestern(number)
    }
  }

  /**
   * Takes an array of typeset tokens and generates
   * typeset tokens for line numbers placed at the same y coordinate as
   * the lines in the typeset text.
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
          type: TypesetterTokenType.BOX,
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
    
    if (token.type === TypesetterTokenType.GLUE) {
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
    let baseLineShift = 0

    if (token.fontWeight) {
      fontWeight = token.fontWeight
    }

    if (token.verticalAlign) {
      switch (token.verticalAlign) {
        case VerticalAlign.SUPERSCRIPT:
          // console.log(`Applying superscript`)
          // console.log(token)
          // console.log(`Fontsize: ${fontSize}pt = ${Typesetter.pt2px(fontSize)}px`)
          baseLineShift = Typesetter.pt2px(-fontSize/4)
          // console.log(`Baseline shift: ${baseLineShift}`)
          break

        case VerticalAlign.SUBSCRIPT:
          baseLineShift = Typesetter.pt2px(fontSize/4)
          break
      }
    }
    
    if (token.fontStyle) {
      fontStyle = token.fontStyle
    }

    let addFontSize = false
    if (token.fontSize) {
      addFontSize = true
      fontSize = token.fontSize
    }

    let posX = left + token.deltaX
    // testing RTL

    let svgString = "<text "
    if (showFontBasicInfo) {
      svgString += 'fill="' +  fillColor + '" font-size="' + fontSize + '" '
      svgString += 'font-family="' + fontFamily + '" '
    } else {
      if (addFontSize) {
        svgString += 'font-size="' + fontSize + '" '
      }
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

    svgString += ' x="' + posX + '" y="' + (top + token.deltaY + baseLineShift) + '">' +  token.text + '</text>'
    return svgString
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
  
  // static mm2px(mm) {
  //   return mm * 3.7795275590551184 //   = mm * 96 [px/in] / 25.4 [mm/in]
  // }
  
  static cm2px(cm) {
    return cm * 37.795275590551184 //   = mm * 96 [px/in] / 2.54 [cm/in]
  }
  static px2cm(px) {
    return px / 37.795275590551184 //   = px * 1/96 [in/px] * 2.54 [cm/in]
  }
  
  static pt2px(pt) {
    return pt * 4 / 3  // = pt * 72 [pt/in] *  1/96 [in/px]
  }
  
  // static in2px(inches) {
  //   return inches * 96
  // }
  //
  
}