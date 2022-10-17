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

import { MainTextToken } from './MainTextToken'
import * as EditionMainTextTokenType from './MainTextTokenType'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'

export class MainTextTokenFactory {

  static createSimpleText(text, editionWitnessTokenIndex, lang = '') {
    let t = new MainTextToken()
    t.type = EditionMainTextTokenType.TEXT
    t.fmtText = FmtTextFactory.fromString(text)
    t.editionWitnessTokenIndex = editionWitnessTokenIndex
    t.setLang(lang)
    return t
  }

  static createWithFmtText(fmtText, editionWitnessTokenIndex, lang = '') {
    let t = new MainTextToken()
    t.type = EditionMainTextTokenType.TEXT
    t.fmtText = fmtText
    t.editionWitnessTokenIndex = editionWitnessTokenIndex
    t.setLang(lang)
    return t
  }

  static createNormalGlue() {
    let t = new MainTextToken()
    t.type = EditionMainTextTokenType.GLUE
    t.space = 'normal'
    t.fmtText = FmtTextFactory.oneNormalSpace()
    return t
  }

  static createParagraphEnd(style = '') {
    let t = new MainTextToken()
    t.type = EditionMainTextTokenType.PARAGRAPH_END
    return t.setStyle(style)
  }

}