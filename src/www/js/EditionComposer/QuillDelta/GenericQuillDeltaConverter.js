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

import { QuillDeltaConverter } from './QuillDeltaConverter'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { pushArray, varsAreEqual } from '../../toolbox/ArrayUtil.mjs'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory.mjs'
import { FmtTextTokenFactory} from '../../FmtText/FmtTextTokenFactory.mjs'
import * as FmtTextTokenType from '../../Edition/MainTextTokenType.mjs'
import * as FontWeight from '../../FmtText/FontWeight.mjs'
import * as FontStyle from '../../FmtText/FontStyle.mjs'
import * as FontSize from '../../FmtText/FontSize.mjs'
import * as VerticalAlign from '../../FmtText/VerticalAlign.mjs'
import * as ParagraphStyle from '../../FmtText/ParagraphStyle.mjs'
import { rTrimNewlineCharacters } from '../../toolbox/Util.mjs'

export class GenericQuillDeltaConverter extends QuillDeltaConverter {

  constructor (options) {
    super(options)

    let optionsSpec = {
      ignoreParagraphs: { type: 'boolean', default: true},
      // an object containing attribute to class translators.
      // e.g.
      // {  someAttribute:  (attributeValue, currentClassList) => { ... return newClassList} }
      attrToClassTranslators: { type: 'object', default: {}}
    }
    let oc= new OptionsChecker({optionsDefinition: optionsSpec, context:  'Generic QD Converter'})
    this.options = oc.getCleanOptions(options)
    this.translators = this.options.attrToClassTranslators
    this.translatorsAvailable = Object.keys(this.translators)

  }

  toFmtText(quillDelta) {
    // this.debug && console.log(`Converting quill Delta`)
    if (varsAreEqual(quillDelta.ops, [ {insert: "\n"}])) {
      // empty editor
      // this.debug && console.log(`Empty editor, returning []`)
      return []
    }
    // this.debug && console.log(`There are ${quillDelta.ops.length} ops in delta`)
    let opsMap = quillDelta.ops.map ( (ops, i) => {
      // this.debug && console.log(`Processing ops ${i}`)
      // this.debug && console.log(ops)
      if (ops.insert === "\n") {
        // single paragraph mark
        if (this.options.ignoreParagraphs) {
          return []
        }
        if (ops.attributes !== undefined && ops.attributes.header !== undefined) {
          let headerStyle = ''
          switch(ops.attributes.header) {
            case 1:
              headerStyle = ParagraphStyle.HEADING1
              break

            case 2:
              headerStyle = ParagraphStyle.HEADING2
              break

            case 3:
              headerStyle = ParagraphStyle.HEADING3
              break
          }
          return [ FmtTextTokenFactory.paragraphMark(headerStyle)]
        }
        return [ FmtTextTokenFactory.paragraphMark()]
      }
      // text with, possibly, some newline characters
      let insertText = ops.insert
      if (i === quillDelta.ops.length-1) {
        // remove trailing new lines
        insertText = rTrimNewlineCharacters(insertText)
      }
      let paragraphs
      if (this.options.ignoreParagraphs) {
        insertText = insertText.replace("\n", ' ')
        // this.debug && console.log(`Ignoring paragraphs, ops.insert changed to: `)
        // this.debug && console.log(insertText)
        paragraphs = [ insertText ]
      } else {
        paragraphs = insertText.split("\n")
        if (paragraphs.length > 1) {
          this.debug && console.log(`-- ${paragraphs.length-1} paragraph break(s) in ops`)
        }
      }

      let parsFmtText = paragraphs.map( (paragraphText) => {
        let theFmtText = FmtTextFactory.fromString(paragraphText)
        if (ops.attributes !== undefined) {
          for (let i = 0; i < theFmtText.length; i++) {
            if (theFmtText[i].type === FmtTextTokenType.GLUE) {
              continue
            }
            if (ops.attributes.bold) {
              theFmtText[i].fontWeight = FontWeight.BOLD
            }
            if (ops.attributes.italic) {
              theFmtText[i].fontStyle = FontStyle.ITALIC
            }
            if (ops.attributes.small) {
              theFmtText[i].fontSize = FontSize.SMALL
            }
            if (ops.attributes.superscript) {
              theFmtText[i].fontSize = FontSize.SUPERSCRIPT
              theFmtText[i].verticalAlign = VerticalAlign.SUPERSCRIPT
            }
            let attributesToIgnore = [ 'bold', 'italic', 'small', 'superscript']
            let attrKeys =  Object.keys(ops.attributes)
            let classList = ''
            for (let j = 0; j <attrKeys.length; j++) {
              let key = attrKeys[j]
              if (attributesToIgnore.indexOf(key) !== -1) {
                continue
              }
              if (this.translatorsAvailable.indexOf(key) !== -1) {
                classList = this.translators[key](ops.attributes[key], classList)
              }
            }
            theFmtText[i].classList = classList
          }
        }
        return theFmtText
      })
      let fmtText = []
      parsFmtText.forEach( (lineFmtTxt) => {
        pushArray(fmtText, lineFmtTxt)
        if (!this.options.ignoreParagraphs) {
          fmtText.push(FmtTextTokenFactory.paragraphMark())
        }
      })
      if (!this.options.ignoreParagraphs) {
        // remove the final paragraph mark
        fmtText.pop()
      }
      return fmtText
    })

    let fmtText = []
    opsMap.forEach( (opsFmtText, i) => {
      // console.log(`Processing opsMap element ${i}`)
      opsFmtText.forEach( (token, j) => {
        // console.log(`Processing fmtText element ${j}`)
        fmtText.push(token)
      })
    })
    // this.debug && console.log(`Final FmtText array`)
    // this.debug && console.log(fmtText)
    return fmtText
  }

}

