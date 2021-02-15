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

import { OptionsChecker } from '@thomas-inst/optionschecker'
import * as TypesetterTokenFactory from './TypesetterTokenFactory'
import * as TypesetterTokenType from './TypesetterTokenType'

export class MarkdownProcessor {

  constructor (options) {
    let optionsDefinition = {
      normalSpace: { type: 'NumberGreaterThanZero', default: 4}
    }

    let optionsChecker = new OptionsChecker(optionsDefinition, 'MarkdownProcessor')
    this.options = optionsChecker.getCleanOptions(options)

  }

  getTokensFromMarkdownString(theString) {
    // TODO: parse markdown properly. At this point only bold and italics on single
    //  words are supported

    let stringTokens = this.getTokensFromString(theString)

    let boldRegExp = RegExp('^\\*\\*(.*)\\*\\*([.,;:?!]*)$')
    let italicsRegExp = RegExp('^_(.*)_([.,;:?!]*)$')
    let mdTokens = []
    for (const stringToken of stringTokens) {
      if (stringToken.type === TypesetterTokenType.GLUE) {
        mdTokens.push(stringToken)
        continue
      }
      if (boldRegExp.test(stringToken.text)) {
        let regExpArray = boldRegExp.exec(stringToken.text)
        stringToken.setText(regExpArray[1]).setBold()
        // stringToken.text = regExpArray[1]
        // stringToken.fontWeight = 'bold'
        mdTokens.push(stringToken)
        if (regExpArray[2]) {
          mdTokens.push(TypesetterTokenFactory.simpleText(regExpArray[2]))
        }
        continue
      }
      if (italicsRegExp.test(stringToken.text)) {
        let regExpArray = italicsRegExp.exec(stringToken.text)
        stringToken.setText(regExpArray[1]).setItalic()
        // stringToken.text = regExpArray[1]
        // stringToken.fontStyle = 'italic'
        mdTokens.push(stringToken)
        if (regExpArray[2]) {
          mdTokens.push(TypesetterTokenFactory.simpleText(regExpArray[2]))
        }
        continue
      }

      mdTokens.push(stringToken)

    }

    return mdTokens
  }

  getTokensFromString(theString) {
    let tokensText = theString.split(' ')
    let tokens = []
    for (const tokenText of tokensText) {
      tokens.push(TypesetterTokenFactory.simpleText(tokenText))
      tokens.push(TypesetterTokenFactory.normalSpace())
    }
    return tokens
  }
}