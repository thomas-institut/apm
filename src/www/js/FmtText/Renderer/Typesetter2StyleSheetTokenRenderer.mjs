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

import * as FmtTokenType from '../FmtTextTokenType.mjs'
import * as VerticalAlign from '../VerticalAlign.mjs'
import * as DefaultStyleSheet from '../../Typesetter2/Style/DefaultStyleSheet.mjs'

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { Glue } from '../../Typesetter2/Glue.mjs'
import { TextBoxFactory } from '../../Typesetter2/TextBoxFactory.mjs'
import { StyleSheet} from '../../Typesetter2/Style/StyleSheet.mjs'
import { TextBoxMeasurer } from '../../Typesetter2/TextBoxMeasurer/TextBoxMeasurer.mjs'
import { AsyncFmtTextRenderer} from './AsyncFmtTextRenderer.mjs'
import * as FontStyle from '../FontStyle.mjs'
import * as FontWeight from '../FontWeight.mjs'
import { TextBox } from '../../Typesetter2/TextBox.mjs'
import { FmtTextClassProcessor } from './FmtTextClassProcessor.mjs'
import { ObjectFactory } from '../../Typesetter2/ObjectFactory.mjs'


export class Typesetter2StyleSheetTokenRenderer extends AsyncFmtTextRenderer {

  constructor (options = {}) {
    super()
    let optionsSpec = {
      styleSheet: { type: 'object', default: DefaultStyleSheet.defaultStyleSheet},
      textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
      defaultTextDirection: { type: 'string'},
      classProcessors: { type: 'array', default: [], elementDefinition: {
        type: 'object', objectClass: FmtTextClassProcessor
        }},
      debug: { type: 'boolean', default: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'FmtText Typesetter2 Renderer'})

    this.options = oc.getCleanOptions(options)
    this.classProcessors = this.options.classProcessors
    this.classProcessorsClassNames = this.classProcessors.map( (p) => { return p.getClassName()} )
    this.debug = this.options.debug

    /**
     *
     * @type {StyleSheet}
     * @private
     */
    this.ss = new StyleSheet(this.options.styleSheet, this.options.textBoxMeasurer)

  }

  /**
   *
   * @param {FmtTextToken[]}fmtText
   * @param {string|string[]}styleNames
   * @return{ Promise<TypesetterItem[]>}
   */
  renderWithStyle(fmtText, styleNames) {
    return new Promise( async (resolve) => {
      let items = []
      for(let tokenIndex = 0; tokenIndex < fmtText.length; tokenIndex++) {
        let token = fmtText[tokenIndex]
        if (token.type === FmtTokenType.EMPTY) {
          continue
        }
        switch( token.type) {
          case FmtTokenType.GLUE:
            let glueItem = await this.ss.apply(new Glue(), styleNames)
            /** @var {Glue} glueItem */
            // token.space  controls glue, if it is a string other than '' then
            // glue should be set according to the named style given by it. However, this is not
            // actually implemented or used right now. An empty string in token.space
            // means that the glue's parameters should be set with the values given by the token's
            // width, stretch and shrink members
            if (token.space === '') {
              // token.space is either a style string (e.g., 'normal')
              glueItem.setWidth(token.width).setStretch(token.stretch).setShrink(token.shrink)
            }
            items.push(glueItem)
            break

          case FmtTokenType.TEXT:
            /**@var {TextBox}textBox*/
            let textBox = await this.ss.apply( (new TextBox().setText(token.text)), styleNames)

            if (token.fontStyle === FontStyle.ITALIC) {
              textBox.setFontStyle('italic')
            }
            if (token.fontWeight === FontWeight.BOLD) {
              textBox.setFontWeight('bold')
            }
            if (token.fontSize < 1 && token.verticalAlign === VerticalAlign.BASELINE) {
              // console.log(`Setting font size ${token.fontSize}`)
              textBox.setFontSize(textBox.getFontSize()*token.fontSize)
              // console.log(textBox)
            }
            if (token.verticalAlign === VerticalAlign.SUPERSCRIPT) {
              // console.log(`Setting superscript`)
              textBox = await this.ss.apply(textBox, 'superscript')
              // console.log(textBox)
            }
            if (token.verticalAlign === VerticalAlign.SUBSCRIPT) {
              textBox = await this.ss.apply(textBox, 'subscript')
            }
            // apply classes
            // TODO: make this generic, for now this will take care of sigla
            if (token.classList !== undefined && token.classList !== '') {
              let classes = token.classList.split(' ')
              if (classes.indexOf('sigla') !== -1) {
                // SIGLA class
                textBox = await this.ss.apply( textBox, 'sigla')
                textBox.setTextDirection(this.options.defaultTextDirection)
              }
            }
            items.push(textBox)
        }
      }
      // At this point we have a 1 to 1 mapping of the fmtText item into Typesetter2 items,
      // we need to split the text boxes so that each initial and final punctuation character gets its own box.
      // This is necessary for the Bidi algorithm to properly work
      let outputItems = []
      items.forEach( (item) => {
        if (item instanceof TextBox) {
          outputItems.push(...this.expandTextBox(item))
        } else {
          outputItems.push(item)
        }
      })
      resolve(outputItems)
    })
  }

  /**
   *
   * @param {TextBox}textBox
   * @return TextBox[]
   */
  expandTextBox(textBox) {

    // for now, just take care of final comma, semicolon and dot
    let theText = textBox.getText()
    if (theText === '') {
      return [textBox]
    }
    const finals = [';', '.', ',']
    let finalChar = theText.charAt(theText.length-1)
    if (finals.indexOf(finalChar) === -1) {
      return [textBox]
    }
    console.log(`Splitting box with text '${theText}' into two`)
    let textBoxExportObject = textBox.getExportObject()
    let initialTextBox = ObjectFactory.fromObject(textBoxExportObject)
    initialTextBox.setText(theText.substring(0,theText.length-1))
    let finalTextBox = ObjectFactory.fromObject(textBoxExportObject)
    finalTextBox.setText(finalChar)

   return [initialTextBox, finalTextBox]
  }

  /**
   *
   * @param {string}className
   * @private
   */
  __getClassProcessor(className) {
    let processorIndex = this.classProcessorsClassNames.indexOf(className)
    if (processorIndex === -1) {
      return undefined
    }
    return this.classProcessors[processorIndex]
  }

  /**
   *
   * @param fmtText
   * @param lang
   * @return {Promise<TypesetterItem[]>}
   */
  render(fmtText, lang = '') {
    return this.renderWithStyle(fmtText, 'default')
  }

  __getTextDirection(lang) {
    switch(lang) {
      case 'ar':
      case 'he':
        return 'rtl'

      default:
        return 'ltr'
    }
  }

}