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


import * as TypesetterTokenType from './TypesetterTokenType'


export class TypesetterToken {

  constructor (type = TypesetterTokenType.TEXT) {
    this.type = type
    if (type === TypesetterTokenType.TEXT) {
      this.text = ''
    }
    if (type === TypesetterTokenType.GLUE) {
      this.space = 'normal'
    }
  }

  /**
   *
   * @param {string}text
   * @param {string}lang
   * @return {TypesetterToken}
   */
  setText(text, lang = '') {
    this.text = text
    if (lang !== '') {
      this.lang = lang
    }
    return this
  }

  setLang(lang = '') {
    if (lang === '') {
      this.lang = undefined
    } else {
      this.lang = lang
    }
    return this
  }

  setFontSize(fontSize) {
    this.fontSize = fontSize
    return this
  }

  setItalic() {
    this.fontStyle = 'italic'
    return this
  }

  setNormalSlant() {
    this.fontStyle = 'normal'
  }

  setBold() {
    this.fontWeight = 'bold'
    return this
  }

  setNormalWeight() {
    this.fontWeight = 'normal'
    return this
  }

  setLength(spaceLength) {
    this.space = spaceLength
    return this
  }

  getLang() {
    return this.lang === undefined ? '' : this.lang
  }

}