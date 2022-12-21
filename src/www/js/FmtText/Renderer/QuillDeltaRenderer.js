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

import { FmtTextRenderer } from './FmtTextRenderer'
import * as FmtTextTokenType from '../FmtTextTokenType.mjs'
import * as FontStyle from '../FontStyle.mjs'
import * as FontSize from '../FontSize.mjs'
import * as FontWeight from '../FontWeight.mjs'
import * as VerticalAlign from '../VerticalAlign.mjs'
import * as MarkType from '../MarkType.mjs'
import * as ParagraphStyle from '../ParagraphStyle.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { deepCopy } from '../../toolbox/Util.mjs'

export class QuillDeltaRenderer extends FmtTextRenderer {

  constructor(options) {
    super()
    let oc = new OptionsChecker({
      context: 'QuillDeltaRenderer',
      optionsDefinition: {
        // an object containing class translators
        // e.g.
        // {
        //    someClassName: (attr) => {  ...modify attr in some way... return modifiedAttr },
        //    otherClass: (attr) => {  ...modify attr in some way... return modifiedAttr }
        // }
        classToAttrTranslators: {
          type: 'object',
          default: { }
        },
        defaultTextAttrObject: { type: 'object', default: {}},
        defaultGlueAttrObject: { type: 'object', default: {}}
      }
    })

    let cleanOptions = oc.getCleanOptions(options)
    this.translators = cleanOptions.classToAttrTranslators
    this.translatorsAvailable = Object.keys(this.translators)
    this.options = cleanOptions

  }

  /**
   * Returns a Quill delta object representing the
   * given fmtText in the given language
   * @param fmtText
   * @param lang
   * @return {{ops: unknown[]}}
   */
  render (fmtText, lang = '') {
    let deltaOps = fmtText.map( (fmtTextToken) => {
      if (fmtTextToken.type === FmtTextTokenType.GLUE) {
        let attr =  deepCopy(this.options.defaultTextAttrObject)
        return { insert: ' ', attr: attr}
      }

      if (fmtTextToken.type === FmtTextTokenType.MARK) {
        switch (fmtTextToken.markType) {
          case MarkType.PARAGRAPH:
            let attributes = {}
            switch(fmtTextToken.style) {
              case ParagraphStyle.HEADING1:
                attributes.header = 1
                break

              case ParagraphStyle.HEADING2:
                attributes.header = 2
                break

              case ParagraphStyle.HEADING3:
                attributes.header = 3
                break
            }
            if (attributes.header !== undefined) {
              return { insert: "\n", attributes: attributes}
            }
            return { insert: "\n"}

          default:
            console.warn(`Unsupported mark type ${fmtTextToken.markType} rendering QuillDelta from fmtText`)
            return { insert:  ' '}
        }
      }

      let attr =  deepCopy(this.options.defaultTextAttrObject)
      // console.log(`Using default text attr object`)
      // console.log(attr)
      if (fmtTextToken.fontStyle === FontStyle.ITALIC) {
        attr.italic = true
      }
      if (fmtTextToken.fontWeight === FontWeight.BOLD) {
        attr.bold = true
      }

      if (fmtTextToken.fontSize <  FontSize.NORMAL) {
        // fontsize is a numeric value, but for Quill we only have a 'small' attribute
        switch(fmtTextToken.verticalAlign) {
          case VerticalAlign.SUPERSCRIPT:
            attr.superscript = true
            break
          default:
            attr.small = true
        }
      }
      // translate classList
      let classArray = fmtTextToken.classList.split(' ')
      for (let i = 0; i < classArray.length; i++) {
        let className = classArray[i]
        if (this.translatorsAvailable.indexOf(className) !== -1) {
          attr = this.translators[className](attr)
        }
      }

      return  {
        insert: fmtTextToken.text,
        attributes: attr
      }
    })
    return { ops: deltaOps}
  }
}