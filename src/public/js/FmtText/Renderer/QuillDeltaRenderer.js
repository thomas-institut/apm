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
import * as FmtTextTokenType from '../FmtTextTokenType'
import * as FontStyle from '../FontStyle'
import * as FontSize from '../FontSize'
import * as FontWeight from '../FontWeight'
import * as VerticalAlign from '../VerticalAlign'

export class QuillDeltaRenderer extends FmtTextRenderer {

  render (fmtText, lang = '') {
    let deltaOps = fmtText.map( (fmtTextToken) => {
      if (fmtTextToken.type === FmtTextTokenType.GLUE) {
        return { insert: ' '}
      }

      let attr = {}
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
      return  {
        insert: fmtTextToken.text,
        attributes: attr
      }
    })
    return { ops: deltaOps}
  }
}