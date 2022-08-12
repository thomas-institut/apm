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
import { DimensionString } from '../DimensionString.mjs'

/**
 * A collection of styles
 *
 * A style is, in essence, a set of parameters that can be applied to different
 * typesetting structures.  Each style has a unique name within the collection.
 *
 */
export class StyleSheet {

  /**
   *
   * @param styleSheetDef
   * @param {TextBoxMeasurer}textBoxMeasurer
   */
  constructor (styleSheetDef, textBoxMeasurer) {
    this.styles = styleSheetDef
    this.names = this.__getNameArray(this.styles)
    this.textBoxMeasurer = textBoxMeasurer
    this.debug = true
  }

  merge(anotherStyleSheetDef) {
    Object.keys(anotherStyleSheetDef).forEach( (styleName) => {
      this.updateStyle(styleName, anotherStyleSheetDef[styleName])
    })
    this.names = this.__getNameArray(this.styles)
  }

  getStyleDefinitions() {
    return this.styles
  }

  updateStyle(styleName, styleDef) {
    if (this.styleExists(styleName)) {
      // merge
      let currentDef = this.getStyleDef(styleName)
      if (styleDef.parent !== undefined) {
        currentDef.parent = styleDef.parent
      }
      ['text', 'paragraph','glue'].forEach( (key) => {
        if (currentDef[key] !== undefined || styleDef[key] !== undefined) {
          currentDef[key] = this.__mergeObjects(currentDef[key], styleDef[key])
        }
      })
    } else {
      // add the style
      this.styles[styleName] = styleDef
    }
  }

  __mergeObjects(objA, objB) {
    let newObject = {}
    if (objA !== undefined) {
      Object.keys(objA).forEach( (key) => {
        newObject[key] = objA[key]
      })
    }
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
          // debug && console.log(`Applying style to TB`)
          // debug && console.log(styleDef)
          item = await this.applyStyleToTextBox(item, styleDef)
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
   * @param textBox
   * @param styleDef
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
          let newFontSize = await this.getPixelValue(fontDef.fontSize, textBox)
          textBox.setFontSize(newFontSize)
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
      let [value, unit] = DimensionString.parse(someString)
      switch(unit) {
        case 'em':
          // assume the box's current fontSize is equal to 1em and apply
          // the conversion
          resolve(textBox.getFontSize()*value)
          break

        case 'sp':
          let spaceWidth = await this.__getSpaceWidth(textBox)
          resolve(spaceWidth*value)
          break

        default:
          resolve(DimensionString.valueUnit2px(value, unit))
      }
    })
  }

  /**
   *
   * @param {TextBox}textBox
   * @return {Promise<number>}
   * @private
   */
  __getSpaceWidth(textBox) {
    let spaceTextBox = (new TextBox())
      .setText(' ')
      .setFontFamily(textBox.getFontFamily())
      .setFontSize(textBox.getFontSize())
      .setFontStyle(textBox.getFontStyle())
      .setFontWeight(textBox.getFontWeight())
    return new Promise( (resolve) => {
      this.textBoxMeasurer.getBoxWidth(spaceTextBox).then( (width) => {
        resolve(width)
      })
    })
  }

  /**
   *
   * @param {string|string[]}styles
   * @private
   */
  __getStylesToApply(styles) {
    let styleString = ''
    if (Array.isArray(styles)) {
      styleString = styles.join(' ')
    } else {
      styleString = styles
    }
    //this.debug && console.log(`Style string: '${styleString}'`)

    let styleArray = styleString.split(' ').filter( (styleName) => { return this.styleExists(styleName)})
    let stylesToApply = []
    styleArray.forEach( (styleName) => {
      stylesToApply = stylesToApply.concat(this.__getStyleAncestryLine(styleName))
    })
    return stylesToApply
  }


  __getStyleAncestryLine(styleName) {
    let line = [styleName]

    let styleDef = this.getStyleDef(styleName)
    if (styleDef !== undefined && styleDef.parent !== '') {
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