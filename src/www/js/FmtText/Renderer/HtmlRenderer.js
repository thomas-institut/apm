/*
 *  Copyright (C) 2021 Universität zu Köln
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

import {OptionsChecker} from '@thomas-inst/optionschecker'
import * as FmtTextTokenType from '../FmtTextTokenType.mjs'
import * as FontStyle from '../FontStyle.mjs'
import * as FontWeight from '../FontWeight.mjs'
import * as FontSize from '../FontSize.mjs'
import * as VerticalAlign from '../VerticalAlign.mjs'
import { FmtTextRenderer } from './FmtTextRenderer'


export class HtmlRenderer extends FmtTextRenderer{

  constructor (options = {}) {
    super()
    let optionsSpec = {
      plainMode: { type: 'boolean', default: false},
      tokenClasses: { type: 'array', default: [ 'token']},
      tokenIndexClassPrefix: { type: 'string', default: 'token-'},
      textClasses: { type: 'array', default: ['text']},
      glueClasses: { type: 'array', default: ['glue']}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'FmtText Html Renderer'})

    this.options = oc.getCleanOptions(options)
    if (this.options.plainMode) {
      this.options.tokenClasses = []
      this.options.tokenIndexClassPrefix = ''
      this.options.textClasses = []
      this.options.glueClasses = []
    }
  }

  /**
   *
   * @param {FmtTextToken[]} fmtText
   * @param lang
   * @return {string}
   */
  render(fmtText, lang = '') {
    return fmtText.map((t, i) => {
      let tokenClasses = this.options.tokenClasses
      let classes  = []
      switch(t.type) {
        case FmtTextTokenType.GLUE:
          tokenClasses = tokenClasses.concat(this.options.glueClasses)
          classes  = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses)
          if (classes.length === 0) {
            return ' '
          }
          return `<span class="${classes.join(' ')}"> </span>`

        case FmtTextTokenType.TEXT :
          tokenClasses = tokenClasses.concat(this.options.textClasses)
          classes  = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses)
          let spanStart = ''
          let spanEnd = ''
          if (classes.length !== 0) {
            spanStart = `<span class="${classes.join(' ')}">`
            spanEnd = '</span>'
          }
          let textWrappers = []
          if (t.fontStyle === FontStyle.ITALIC) {
            textWrappers.push('i')
          }
          if (t.fontWeight === FontWeight.BOLD) {
            textWrappers.push('b')
          }
          if (t.verticalAlign === VerticalAlign.SUPERSCRIPT) {
            textWrappers.push('sup')
          }
          if (t.verticalAlign === VerticalAlign.SUBSCRIPT) {
            textWrappers.push('sub')
          }
          if (t.fontSize === FontSize.SMALL && t.verticalAlign === VerticalAlign.BASELINE) {
            textWrappers.push('small')
          }
          let startWrappers = ''
          for (let j = 0; j < textWrappers.length; j++) {
            startWrappers += `<${textWrappers[j]}>`
          }
          let endWrappers = ''
          for (let j = textWrappers.length -1; j >= 0; j--) {
            endWrappers += `</${textWrappers[j]}>`
          }
          return `${spanStart}${startWrappers}${t.text}${endWrappers}${spanEnd}`
      }
    }).join('')

  }

}

/**
 *
 * @param {string} indexPrefix
 * @param {number} index
 * @param {string[]} tokenClasses
 * @return {string[]}
 */
function getClassArrayForToken(indexPrefix, index, tokenClasses) {
  let indexClass = indexPrefix !== '' ? `${indexPrefix}${index}` : ''
  let classArray = []
  if (tokenClasses !== []) {
    classArray = classArray.concat(tokenClasses)
  }
  if (indexClass !== '') {
    classArray.push(indexClass)
  }
  return classArray

}