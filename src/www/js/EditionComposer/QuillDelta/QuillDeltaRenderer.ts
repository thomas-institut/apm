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

import {FmtTextRenderer} from '@/lib/FmtText/Renderer/FmtTextRenderer';
import * as FmtTextTokenType from '@/lib/FmtText/FmtTextTokenType.js';
import * as FontStyle from '@/lib/FmtText/FontStyle.js';
import * as FontSize from '@/lib/FmtText/FontSize.js';
import * as FontWeight from '@/lib/FmtText/FontWeight.js';
import * as VerticalAlign from '@/lib/FmtText/VerticalAlign.js';
import * as MarkType from '@/lib/FmtText/MarkType.js';
import * as ParagraphStyle from '@/lib/FmtText/ParagraphStyle.js';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {deepCopy} from '@/toolbox/Util';
import {FmtText} from "@/lib/FmtText/FmtText.js";
import {QuillDelta, QuillDeltaInsertOp} from "@/lib/types/Quill";


/**
 * A function that takes a Quill Delta attribute object, possibly updates something in it
 * an returns the updated version
  */
export type QuillDeltaAttributeTranslator = (attr: {[key: string]: any}) => {[key: string]: any};

export type ClassToAttributeTranslators = { [key: string]: QuillDeltaAttributeTranslator}

export class QuillDeltaRenderer extends FmtTextRenderer {
  private readonly translators: ClassToAttributeTranslators;
  private translatorsAvailable: string[];
  private options: any;

  constructor(options: any) {
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
   */
  render (fmtText: FmtText, _lang = ''): QuillDelta {
    let deltaOps  = fmtText.map( (fmtTextToken) : QuillDeltaInsertOp  => {
      if (fmtTextToken.type === FmtTextTokenType.EMPTY) {
        return { insert: ''}
      }
      if (fmtTextToken.type === FmtTextTokenType.GLUE) {
        let attr =  deepCopy(this.options.defaultGlueAttrObject)
        return { insert: ' ', attributes: attr }
      }

      if (fmtTextToken.type === FmtTextTokenType.MARK) {
        switch (fmtTextToken.markType) {
          case MarkType.PARAGRAPH:
            let attributes: any = {}
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

      let quillDeltaAttributeObject =  deepCopy(this.options.defaultTextAttrObject)
      // console.log(`Using default text attr object`)
      // console.log(attr)
      if (fmtTextToken.fontStyle === FontStyle.ITALIC) {
        quillDeltaAttributeObject.italic = true
      }
      if (fmtTextToken.fontWeight === FontWeight.BOLD) {
        quillDeltaAttributeObject.bold = true
      }

      if ((fmtTextToken.fontSize ?? 1) <  FontSize.NORMAL) {
        // fontsize is a numeric value, but for Quill we only have a 'small' attribute
        switch(fmtTextToken.verticalAlign) {
          case VerticalAlign.SUPERSCRIPT:
            quillDeltaAttributeObject.superscript = true
            break
          default:
            quillDeltaAttributeObject.small = true
        }
      }
      // translate classList
      if (fmtTextToken.classList !== undefined) {
        let classArray = fmtTextToken.classList?.split(' ');
        for (let i = 0; i < classArray.length; i++) {
          let className = classArray[i]
          if (this.translatorsAvailable.indexOf(className) !== -1) {
            quillDeltaAttributeObject = this.translators[className](quillDeltaAttributeObject)
          }
        }
      }

      return  {
        insert: fmtTextToken.text ?? '',
        attributes: quillDeltaAttributeObject
      }
    })
    return { ops: deltaOps}
  }
}