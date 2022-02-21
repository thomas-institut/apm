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



/**
 *
 * A TypesetterToken is an object with the following properties:
 *    type:  'box' | 'glue' | 'penalty'
 *
 *    type === 'box'
 *      text : string, the textual contents of the box.
 *         TODO: perhaps need to change this to a box contents object that allows for non-textual items such
 *          as images, icons, etc.
 *      fontFamily:  string = CSS font-family (optional, defaults to defaultFontFamily given in the constructor options)
 *      fontStyle: 'normal' | 'italic',  defaults to 'normal'
 *      fontSize:  number, font size in pixels
 *      fontWeight: 'normal' | 'bold', defaults to 'normal'
 *      position: 'normal' | 'subscript' | 'superscript'
 *      lang: string, two letter code of the box's language, used to potentially used different fonts for different
 *         languages and, more importantly, to determine the text's direction (rtl/ltr)
 *
 *      width: if text === '', width represents a non-breaking space of the given width, otherwise width
 *         is normally determined by measuring the text field with the given font specifications
 *         by default it starts with the value of UNDEFINED_WIDTH, which is a very large negative number essentially
 *         unlikely to be used as a given value in any application
 *
 *
 *    type === 'glue'
 *       The term 'glue' is taken from Donald Knuth's the TeXbook, where it is explained in
 *       chapter 12. Glue is meant to represent a potentially variable-length space that may or
 *       may not eventually appear in the typeset text. It may not appear, for example, if it is an inter-word
 *       space that falls at the end of the line.
 *
 *       space: 'normal' | '1em' | ... ,  a string pointing to a generic glue specification that will
 *           be used at a later stage the determine the actual width, stretch and shrink parameters. If
 *           space === '', the actual parameters are used
 *
 *       width: the assigned width of the glue, usually derived from the default font based on the value of space
 *       stretch: number, extra pixels the space can have, this is only a suggestion, the typesetter
 *           algorithm may stretch spaces more than this in extreme situations. An infinite stretch (in practice
 *           just a big number like 100 000) represents glue that will take up the rest of the available width
 *           in a line.
 *       shrink: number, how many pixels less the space can have; (space - shrink) is the absolute minimum
 *           for the space
 *
 *    type === 'penalty'
 *
 *       penalty: number indicating how desirable or undesirable it is to break the line at this point.
 *           a minus infinite penalty means a forced break and a plus infinite penalty means there should never be
 *           a break at this place.  A plus infinite penalty effectively joins the preceding box with the next and can
 *           be used, for example, to force a person's title and their name to be always in the same line:
 *              'Dr. Smith'  =>  [  {box, 'Dr.'}, {glue, normal}, {penalty, +inf}, {box, 'Smith'}]
 *           The effect is different than adding an empty box because the glue between 'Dr.' and 'Smith'
 *           can stretch or shrink where the box will always be of the given width.
 *       flag: boolean, Knuth's algorithm tries to avoid two breaks at flagged penalties.
 */
export class TypesetterToken {

  constructor () {
    this.type = TypesetterTokenType.BOX
    this.width = 0
    this.stretch = 0
    this.shrink = 0
    this.penalty = 0
    this.flagged = false
    this.text = ''
    this.lang = ''
    this.lineNumber = 0
    this.occurrenceInLine = 0
  }

  /**
   *
   * @param {string}text
   * @param {string}lang
   * @return {TypesetterToken}
   */
  setText(text, lang = '') {
    this.type = TypesetterTokenType.BOX
    this.text = text
    this.lang = lang
    this.width = TypesetterToken.UNDEFINED_WIDTH
    this.stretch = 0
    this.shrink = 0
    this.penalty = 0
    this.flagged = false
    return this
  }

  setLang(lang = '') {
    this.lang = lang
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

  setSpace(spaceLength) {
    this.type = TypesetterTokenType.GLUE
    this.space = spaceLength
    this.stretch = 0
    this.shrink = 0
    this.width = TypesetterToken.UNDEFINED_WIDTH
    this.penalty = 0
    this.flagged = false
    this.text = ''
    return this
  }

  setVerticalAlign(vAlign) {
    this.verticalAlign = vAlign
    return this
  }

  /**
   *
   * @param {number} width
   * @param {number} stretch
   * @param {number} shrink
   */
  setGlue(width, stretch=0, shrink=0) {
    this.type = TypesetterTokenType.GLUE
    this.width = width
    this.stretch = stretch
    this.shrink = shrink
    this.penalty = 0
    this.flagged = false
    this.text = ''
    return this
  }

  setEmptyBox(width) {
    this.type = TypesetterTokenType.BOX
    this.text = ''
    this.width = width
    this.stretch = 0
    this.shrink = 0
    this.penalty = 0
    this.flagged = false
    return this
  }

  getLang() {
    return this.lang
  }

}

TypesetterToken.UNDEFINED_WIDTH = -999999
TypesetterToken.INFINITE_STRETCH = 100000
TypesetterToken.INFINITE_PENALTY = 100000
TypesetterToken.MINUS_INFINITE_PENALTY = -100000
