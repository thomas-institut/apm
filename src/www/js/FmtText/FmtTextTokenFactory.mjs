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

import { FmtTextToken } from './FmtTextToken.mjs'
import * as FmtTextTokenType from './FmtTextTokenType.mjs'
import * as ParagraphStyle from './ParagraphStyle.mjs'
import * as MarkType from './MarkType.mjs'

export class FmtTextTokenFactory {

  /**
   *
   * @param {string} someString
   * @returns {FmtTextToken}
   */
  static normalText(someString) {
    return (new FmtTextToken(FmtTextTokenType.TEXT)).setText(someString)
  }

  static normalSpace() {
    return new FmtTextToken(FmtTextTokenType.GLUE)
  }

  static paragraphMark(style = ParagraphStyle.NORMAL) {
    return (new FmtTextToken(FmtTextTokenType.MARK)).setMarkType(MarkType.PARAGRAPH).setStyle(style)

  }

  /**
   *
   * @param fmtTextToken
   * @return {FmtTextToken}
   */
  static clone(fmtTextToken) {
    let newText = new FmtTextToken()
    newText.type = fmtTextToken.type
    switch(newText.type) {
      case FmtTextTokenType.TEXT:
        newText.text = fmtTextToken.text
        newText.fontStyle = fmtTextToken.fontStyle
        newText.fontWeight = fmtTextToken.fontWeight
        newText.verticalAlign = fmtTextToken.verticalAlign
        newText.fontSize = fmtTextToken.fontSize
        newText.classList = fmtTextToken.classList
        break

      case FmtTextTokenType.GLUE:
        newText.space = fmtTextToken.space // i.e., default size, whatever that means for the typesetter/presenter context
        break


      case FmtTextTokenType.MARK:
        newText.markType = fmtTextToken.markType
        newText.style = fmtTextToken.style
        break

      default:
        console.warn(`Unsupported type in FormattedTextToken constructor: ${fmtTextToken.type}`)
        newText.type = FmtTextTokenType.EMPTY
    }
    return newText
  }

  /**
   *
   * @param {Object} someObject
   */
  static buildFromObject(someObject) {
    // console.log(`Building from object`)
    // console.log(someObject)
    if (someObject instanceof FmtTextToken) {
      return this.clone(someObject)
    }
    if (someObject.type === undefined) {
      throw new Error('No type in object')
    }
    switch(someObject.type) {
      case FmtTextTokenType.TEXT:
        let newToken = new FmtTextToken(FmtTextTokenType.TEXT)
        if (someObject.text === undefined) {
          throw new Error('No text in object')
        }
        newToken.setText(someObject.text)
        let keysToCopy = ['verticalAlign', 'fontWeight', 'fontStyle', 'fontSize', 'classList']
        keysToCopy.forEach( (key) => {
          if (someObject[key] !== undefined) {
            newToken[key] = someObject[key]
          }
        })
        return newToken

      case FmtTextTokenType.GLUE:
        let glueToken = this.normalSpace()
        if (someObject.space !== undefined) {
          glueToken.space = someObject.space
        }
        return glueToken

      case FmtTextTokenType.MARK:
        let markToken = new FmtTextToken(FmtTextTokenType.MARK)
        if (someObject.markType === undefined) {
          throw new Error('No mark type in object')
        }
        markToken.setMarkType(someObject.markType)
        if (someObject.style !== undefined) {
          markToken.setStyle(someObject.style)
        }
        return markToken

      default:
        throw new Error(`Invalid type '${someObject.type}' in object`)
    }
  }
}