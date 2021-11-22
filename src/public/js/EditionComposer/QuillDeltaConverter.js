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

import { FmtTextFactory } from '../FmtText/FmtTextFactory'
import * as FontWeight from '../FmtText/FontWeight'
import * as FontStyle from '../FmtText/FontStyle'
import * as FontSize from '../FmtText/FontSize'
import * as FmtTextTokenType from '../Edition/MainTextTokenType'
import { varsAreEqual } from '../toolbox/ArrayUtil'
import * as VerticalAlign from '../FmtText/VerticalAlign'

export class QuillDeltaConverter {
  static toFmtText(quillDelta) {
    // console.log(`Converting quill Delta`)
    // console.log(quillDelta.ops)
    if (varsAreEqual(quillDelta.ops, [ {insert: "\n"}])) {
      // empty editor
      return []
    }
    let opsMap = quillDelta.ops.map ( (ops) => {
      let insertText = ops.insert.replace("\n", ' ')
      // console.log(`Insert text: '${insertText}'`)
      let theFmtText = FmtTextFactory.fromString(insertText)
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
    opsMap.forEach( (opsFmtText, i) => {
      // console.log(`Processing opsMap element ${i}`)
      opsFmtText.forEach( (token, j) => {
        // console.log(`Processing fmtText element ${j}`)
        fmtText.push(token)
      })
    })
    // console.log(fmtText)
    return fmtText
  }
}