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
import { pushArray, varsAreEqual } from '../../toolbox/ArrayUtil'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory'
import { FmtTextTokenFactory} from '../../FmtText/FmtTextTokenFactory'
import * as FmtTextTokenType from '../../Edition/MainTextTokenType'
import * as FontWeight from '../../FmtText/FontWeight'
import * as FontStyle from '../../FmtText/FontStyle'
import * as FontSize from '../../FmtText/FontSize'
import * as VerticalAlign from '../../FmtText/VerticalAlign'
import { rTrimNewlineCharacters } from '../../toolbox/Util.mjs'

export class GenericQuillDeltaConverter extends QuillDeltaConverter {

  constructor (options) {
    super(options)

    let optionsSpec = {
      ignoreParagraphs: { type: 'boolean', default: true}
    }
    let oc= new OptionsChecker({optionsDefinition: optionsSpec, context:  'Generic QD Converter'})
    this.options = oc.getCleanOptions(options)

  }

  toFmtText(quillDelta) {
    this.debug && console.log(`Converting quill Delta`)
    if (varsAreEqual(quillDelta.ops, [ {insert: "\n"}])) {
      // empty editor
      this.debug && console.log(`Empty editor, returning []`)
      return []
    }
    this.debug && console.log(`There are ${quillDelta.ops.length} ops in delta`)
    let opsMap = quillDelta.ops.map ( (ops, i) => {
      this.debug && console.log(`Processing ops ${i}`)
      this.debug && console.log(ops)
      // if (ops.insert === "\n") {
      //   // single paragraph mark
      //   this.debug && console.log(`Single paragraph mark, not implemented yet`)
      //   return [ ]
      // }
      let insertText = ops.insert
      if (i === quillDelta.ops.length-1) {
        // remove trailing new lines
        insertText = rTrimNewlineCharacters(insertText)
      }
      let paragraphs
      if (this.options.ignoreParagraphs) {
        insertText = insertText.replace("\n", ' ')
        this.debug && console.log(`Ignoring paragraphs, ops.insert changed to: `)
        this.debug && console.log(insertText)
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
    this.debug && console.log(`Final FmtText array`)
    this.debug && console.log(fmtText)
    return fmtText
  }

}

