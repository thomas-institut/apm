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


export class Typesetter2StyleSheetTokenRenderer extends AsyncFmtTextRenderer {

  constructor (options = {}) {
    super()
    let optionsSpec = {
      styleSheet: { type: 'object', default: DefaultStyleSheet.defaultStyleSheet},
      textBoxMeasurer: { type: 'object', objectClass: TextBoxMeasurer},
      debug: { type: 'boolean', default: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'FmtText Typesetter2 Renderer'})

    this.options = oc.getCleanOptions(options)
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
            let textBox = await this.ss.apply(TextBoxFactory.simpleText(token.text), styleNames)
            /**@var {TextBox} textBox*/
            if (token.fontStyle === FontStyle.ITALIC) {
              textBox.setFontStyle('italic')
            }
            if (token.fontWeight === FontWeight.BOLD) {
              textBox.setFontWeight('bold')
            }
            if (token.fontSize < 1) {
              textBox.setFontSize(textBox.getFontSize()*token.fontSize)
            }
            if (token.verticalAlign === VerticalAlign.SUPERSCRIPT) {
              textBox = await this.ss.apply(textBox, 'superscript')
            }
            if (token.verticalAlign === VerticalAlign.SUBSCRIPT) {
              textBox = await this.ss.apply(textBox, 'subscript')
            }
            items.push(textBox)
        }
      }
      resolve(items)
    })
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