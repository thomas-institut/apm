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

import { FmtTextRenderer } from './FmtTextRenderer'
import * as FmtTokenType from '../FmtTextTokenType'
import * as FontStyle from '../FontStyle'
import * as FontWeight from '../FontWeight'
import * as VerticalAlign from '../VerticalAlign'

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { Glue } from '../../Typesetter2/Glue.mjs'
import { TextBoxFactory } from '../../Typesetter2/TextBoxFactory.mjs'

const superScriptFontSize = 0.58
const subScriptFontSize = 0.58

export class Typesetter2TokenRenderer extends FmtTextRenderer {

  constructor (options = {}) {
    super()
    let optionsSpec = {
      defaultFontFamily: { type: 'string'},
      defaultFontSize: { type: 'number'},
      defaultFontWeight: { type: 'string', default: ''},
      defaultFontStyle: { type: 'string', default: ''},
      normalSpaceWidth: { type: 'number'},
      normalSpaceShrink: { type: 'number'},
      normalSpaceStretch: {type: 'number'}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'FmtText Typesetter2 Renderer'})

    this.options = oc.getCleanOptions(options)
  }

  /**
   *
   * @param fmtText
   * @param lang
   * @return {TypesetterItem[]}
   */
  render (fmtText, lang = '') {
    // console.log(`Rendering fmtText as Typesetter2 items`)
    let textDirection = this.__getTextDirection(lang)

    return fmtText.filter( (t) => {return t.type !== FmtTokenType.EMPTY}).map ( (fmtTextToken) => {
      switch( fmtTextToken.type) {
        case FmtTokenType.GLUE:
          let glueItem = new Glue()
          glueItem.setWidth(this.options.normalSpaceWidth)
            .setStretch(this.options.normalSpaceStretch)
            .setShrink(this.options.normalSpaceShrink)
          if (fmtTextToken.space === -1) {
            // This is to deal with old fmtText, where normal was coded as space -1
            return glueItem
          }
          if (fmtTextToken.space !== '') {
            return glueItem  // TODO: Check this
          } else {
            return glueItem.setWidth(fmtTextToken.width).setStretch(fmtTextToken.stretch).setShrink(fmtTextToken.shrink)
          }

        case FmtTokenType.TEXT:
          let textBox = TextBoxFactory.simpleText(fmtTextToken.text, {
            fontFamily: this.options.defaultFontFamily,
            fontSize: this.options.defaultFontSize
          }, textDirection)
          if (this.options.defaultFontStyle=== 'italic' || fmtTextToken.fontStyle === FontStyle.ITALIC) {
            textBox.setFontStyle('italic')
          }
          if (this.options.defaultFontWeight === 'bold' || fmtTextToken.fontWeight === FontWeight.BOLD) {
            textBox.setFontWeight('bold')
          }
          // TODO: check font size handling
          if (fmtTextToken.fontSize < 1) {
            textBox.setFontSize(this.options.defaultFontSize*fmtTextToken.fontSize)
          }

          if (fmtTextToken.verticalAlign === VerticalAlign.SUPERSCRIPT) {
            textBox.setFontSize(textBox.getFontSize() * superScriptFontSize).setShiftY(-superScriptFontSize * textBox.getFontSize())
          }

          if (fmtTextToken.verticalAlign === VerticalAlign.SUBSCRIPT) {
            textBox.setFontSize(textBox.getFontSize() * subScriptFontSize).setShiftY(subScriptFontSize * textBox.getFontSize())
          }
          return textBox
      }
    })

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