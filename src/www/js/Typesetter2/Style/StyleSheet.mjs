/*
 *  Copyright (C) 2022 Universität zu Köln
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

import { Glue } from '../Glue.mjs'
import { TextBox } from '../TextBox.mjs'
import { Dimension } from '../Dimension.mjs'

/**
 * A stylesheet is a tree of style definition
 *
 * A style definition is a collection of attribute/value pairs
 * arranged in a number of categories:
 *   strings: a set of named strings
 *   page: width (D), height (D), marginTop, marginBottom,... (D),
 *        lineNumbers (E), lineNumbersToTextDistance (D)
 *        minDistanceFromApparatusToText (D), minInterApparatusDistance (D)
 *   paragraph: lineSkip (D), indent (D), align (S), spaceBefore (D), spaceAfter (D)
 *   text: fontFamily (S), fontSize (D), fontStyle (E), fontWeight (E),  shiftY (D)
 *   glue: width (D), shrink (D), stretch (D)
 *
 *   Attributes marked with (E) only allow specific values given in the enums object below
 *   (D) denotes an attribute whose value is taken to be a dimension string (e.g. "12 pt") that can
 *   be translated to a number of pixels.
 *
 *   Any dimension expressed in em assumes that the style in which it appears has or inherits
 *   a definite value for the attribute text.fontSize, which will be used to calculate its pixel
 *   value.
 *
 */

const enums = {
  lineNumbers: [ 'none', 'arabic', 'western'],
  fontStyle: [ '', 'italic'],
  fontWeight: [ '', 'bold'],
}

const categories = [ 'strings', 'page', 'paragraph', 'text', 'glue']


export class StyleSheet {

  /**
   *
   * @param {Object}styleSheetDef
   */
  constructor (styleSheetDef) {
    this.styles = styleSheetDef
    if (this.styles === undefined) {
      console.error('Undefined styles!!!')
    }
    this.names = this.__getNameArray(this.styles)
    this.debug = true
  }


  getStrings(style = 'default'){
    let defaultStrings = this.getStyleDef(style).strings
    return defaultStrings === undefined ? {} : defaultStrings
  }

  merge(anotherStyleSheetDef) {
    Object.keys(anotherStyleSheetDef).forEach( (styleName) => {
      this.__updateStyle(styleName, anotherStyleSheetDef[styleName])
    })
    this.names = this.__getNameArray(this.styles)
  }

  getStyleDefinitions() {
    return this.styles
  }


  __updateStyle(styleName, styleDef) {
    if (this.styleExists(styleName)) {
      // merge
      let currentDef = this.getStyleDef(styleName)
      if (styleDef.parent !== undefined) {
        currentDef.parent = styleDef.parent
      }
      categories.forEach( (category) => {
        if (currentDef[category] !== undefined || styleDef[category] !== undefined) {
          currentDef[category] = this.__mergeObjects(currentDef[category], styleDef[category])
        }
      })
    } else {
      // add the style
      this.styles[styleName] = styleDef
    }
  }

  __mergeObjects(objA, objB) {
    let newObject = {}
    // first, copy all keys defined in objA
    if (objA !== undefined) {
      Object.keys(objA).forEach( (key) => {
        newObject[key] = objA[key]
      })
    }
    // then, overwrite all those defined in objB
    if (objB !== undefined) {
      Object.keys(objB).forEach( (key) => {
        newObject[key] = objB[key]
      })
    }
    return newObject
  }


  __getNameArray(styleDefArray) {
    return Object.keys(styleDefArray)
  }

  /**
   *
   * @param {TypesetterItem}item
   * @param {string|string[]}styles
   * @return {Promise}
   */
  apply(item, styles) {
    return new Promise( async (resolve) => {

      let stylesToApply = this.__getStylesToApply(styles)
      if (stylesToApply.length === 0) {
        stylesToApply = ['default']
      }

      let styleDefs = stylesToApply.map( (styleName) => {
        return this.getStyleDef(styleName)
      })
      let baseTextBox = new TextBox()
      for (let i = 0;  i < styleDefs.length; i++) {
        let styleDef = styleDefs[i]
        if (item instanceof Glue) {
          [item, baseTextBox] = await this.applyStyleToGlue(item, styleDef, baseTextBox)
        } else if (item instanceof TextBox) {
          // if (item.getText() === 'scripts') {
          //   console.log(`Applying style to TB: ${stylesToApply[i]}`)
          //   console.log(styleDef)
          // }
          // console.log(`Applying style to TB`)
          // console.log(styleDef)
          item = await this.applyStyleToTextBox(item, styleDef)
          // console.log('Item after applying style to text box')
          // console.log(item)
        }
      }
      resolve(item)
    })
  }

  /**
   *
   * @param {Glue}glueItem
   * @param {{}}styleDef
   * @param {TextBox}baseTextBox
   * @return {Promise<[Glue, TextBox]>}
   */
  applyStyleToGlue(glueItem, styleDef, baseTextBox) {
    return new Promise( async (resolve) => {
      // first, apply the style to the base text box
      baseTextBox = await this.applyStyleToTextBox(baseTextBox, styleDef)
      if (styleDef.glue !== undefined) {
        // then set the glue
        let glueDef = styleDef.glue
        if (glueDef.width !== undefined && glueDef.width !== '') {
          let pixelValue = await this.getPixelValue(glueDef.width, baseTextBox)
          glueItem.setWidth(pixelValue)
        }
        if (glueDef.stretch !== undefined && glueDef.stretch !== '') {
          let pixelValue = await this.getPixelValue(glueDef.stretch, baseTextBox)
          glueItem.setStretch(pixelValue)
        }
        if (glueDef.shrink !== undefined && glueDef.shrink !== '') {
          let pixelValue = await this.getPixelValue(glueDef.shrink, baseTextBox)
          glueItem.setShrink(pixelValue)
        }
      }
      resolve([glueItem, baseTextBox])
    })
  }

  /**
   *
   * @param {TextBox}textBox
   * @param {{}}styleDef
   * @return {Promise<TextBox>}
   */
  applyStyleToTextBox(textBox, styleDef) {
    return new Promise( async (resolve) => {
      // this.debug && console.log(`Applying style to text box`)
      // this.debug && console.log(styleDef)
      // this.debug && console.log(textBox)
      if (styleDef.text !== undefined) {
        let fontDef = styleDef.text
        if (fontDef.fontFamily !== undefined && fontDef.fontFamily !== '') {
          textBox.setFontFamily(fontDef.fontFamily)
        }
        if (fontDef.fontStyle !== undefined && fontDef.fontStyle !== '') {
          textBox.setFontStyle(fontDef.fontStyle)
        }
        if (fontDef.fontWeight !== undefined && fontDef.fontWeight !== '') {
          textBox.setFontWeight(fontDef.fontWeight)
        }
        if (fontDef.fontSize !== undefined && fontDef.fontSize !== '') {
          if (textBox.getText() === 'scripts') {
            console.log(`Changing font size text box, current font size = ${textBox.getFontSize()}`)
          }
          let newFontSize = await this.getPixelValue(fontDef.fontSize, textBox)
          textBox.setFontSize(newFontSize)
          if (textBox.getText() === 'scripts') {
            console.log(`new font size: ${fontDef.fontSize} = ${textBox.getFontSize()}`)
          }

        }
        if (fontDef.shiftY !== undefined && fontDef.shiftY !== '') {
          let newShiftY = await this.getPixelValue(fontDef.shiftY, textBox)
          textBox.setShiftY(newShiftY)
        }
      }
      resolve(textBox)
    })
  }

  /**
   *
   * @param someString
   * @param {TextBox}textBox
   * @return {Promise<number>}
   */
  getPixelValue(someString, textBox) {
    return new Promise( async (resolve) => {
      let [value, unit] = Dimension.parse(someString)
      switch(unit) {
        case 'em':
          // assume the box's current fontSize is equal to 1em and apply
          // the conversion
          resolve(textBox.getFontSize()*value)
          break

        case 'sp':
          let spaceWidth = 0.25 * textBox.getFontSize()
          console.warn(`Found deprecated 'sp' unit when getting pixel value for '${someString}', using 0.25 em as normal space`)
          resolve(spaceWidth*value)
          break

        default:
          resolve(Dimension.valueUnit2px(value, unit))
      }
    })
  }

  /**
   *
   * @param {string|string[]}styles
   * @private
   */
  __getStylesToApply(styles) {
    let styleString
    if (Array.isArray(styles)) {
      styleString = styles.join(' ')
    } else {
      styleString = styles
    }
    //this.debug && console.log(`Style string: '${styleString}'`)

    let styleArray = styleString.split(' ').filter( (styleName) => {
      let styleExists = this.styleExists(styleName)
      if (!styleExists) {
        console.warn(`Style '${styleName}' does not exist`)
      }
      return styleExists})
    let stylesToApply = []
    styleArray.forEach( (styleName) => {
      stylesToApply = stylesToApply.concat(this.__getStyleAncestryLine(styleName))
    })
    return stylesToApply
  }


  __getStyleAncestryLine(styleName) {
    let line = [styleName]

    let styleDef = this.getStyleDef(styleName)
    if (styleDef !== undefined && styleDef.parent !== undefined && styleDef.parent !== '') {
      let parentAncestry = this.__getStyleAncestryLine(styleDef.parent)
      line = parentAncestry.concat(line)
    }
    return line
  }

  /**
   *
   * @param {string}styleName
   * @return {boolean}
   */
  styleExists(styleName) {
    return this.names.indexOf(styleName) !== -1
  }

  getStyleDef(styleName) {
    return this.styles[styleName]
  }

  /**
   *
   * @param {string[]}styleList
   */
  // getCompiledStyle(styleList) {
  //
  //   let styleDefs = this.__getStylesToApply(styleList).map( (styleName) => {
  //     return this.getStyleDef(styleName)
  //   })
  //   let compiledStyle = {}
  //   styleDefs.forEach( (styleDef) => {
  //
  //   })
  //
  //
  //
  // }

  /**
   *
   * @param styles
   */
  getParagraphStyle(styles) {
    return new Promise ( async (resolve)=> {
      let stylesToApply = this.__getStylesToApply(styles)
      if (stylesToApply.length === 0) {
        stylesToApply = [ 'default']
      }
      // this.debug && console.log(`Getting paragraph style, styles to apply:`)
      // this.debug && console.log(stylesToApply)
      let styleDefs = stylesToApply.map( (styleName) => {
        return this.getStyleDef(styleName)
      })
      // this.debug && console.log(styleDefs)
      let baseTextBox = new TextBox()
      let paragraphStyle = {}
      for (let i = 0;  i < styleDefs.length; i++) {
        let styleDef = styleDefs[i]
        if (styleDef === undefined) {
          console.warn(`Undefined style found '${stylesToApply[i]}'`)
          continue
        }
        [paragraphStyle, baseTextBox] = await this.applyStyleToParagraph(paragraphStyle, styleDef, baseTextBox)
      }
      resolve(paragraphStyle)
    })
  }

  /**
   *
   * @param {Object} paragraphDef
   * @param {{}}styleDef
   * @param {TextBox}baseTextBox
   * @return {Promise<[Object, TextBox]>}
   */
  applyStyleToParagraph(paragraphDef, styleDef, baseTextBox) {

    return new Promise( async (resolve) => {
      // first, apply the style to the base text box
      baseTextBox = await this.applyStyleToTextBox(baseTextBox, styleDef)
      if (styleDef.paragraph !== undefined) {
        // then set the glue
        let parDef = styleDef.paragraph
        let dimensionFields = ['lineSkip', 'indent', 'spaceBefore', 'spaceAfter']
        for (let i = 0; i < dimensionFields.length; i++) {
          let field = dimensionFields[i]
          if (parDef[field] !== undefined && parDef[field] !== '') {
            paragraphDef[field] = await this.getPixelValue(parDef[field], baseTextBox)
          }
        }
        if( parDef.align !== undefined && parDef.align !== '') {
          paragraphDef['align'] = parDef.align
        }
      }
      resolve([paragraphDef, baseTextBox])
    })
  }

}