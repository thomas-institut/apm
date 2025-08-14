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

import { WitnessToken } from './WitnessToken.js'
import * as WitnessTokenType from './WitnessTokenType.js'
import * as WitnessTokenClass from './WitnessTokenClass.js'
import * as WitnessFormat from './EditionWitnessFormatMark.js'
import * as EditionWitnessParagraphStyle from './EditionWitnessParagraphStyle.js'
import * as NormalizationSource from '../constants/NormalizationSource.js'

/**
 * A token that can appear in an edition witness
 *
 * An edition witness is, as any other witness, an array of tokens. What sets an edition
 * witness apart from a witness that comes out of a manuscript transcription is that
 * the edition witness must also contain formatting information similar to what can be
 * done in a word processor: bold, italic, superscripts, subscripts, paragraphs, sections,
 * headings, and so on.
 *
 * With this information another process can take the witness and present it properly as
 * a document to be printed or in a browser.
 *
 * Normally, spaces do not need to be present in the witness since they can be generated automatically and
 * may, in fact, depend on the way the main text is to presented. For example, it is not necessarily the
 * case that paragraphs should be indented, so indentation, which amounts to adding some space to the output,
 * should be left to a presentation process. At the witness level it is better to concentrate on semantic
 * descriptions of the formatting: paragraph and font styles rather than explicit formatting.
 *
 * EditionWitnessToken:
 *   from WitnessToken:
 *      text, normalizedText, normalizationSource
 *      tokenClass (always EDITION)
 *      tokenType: adds the type FORMAT_MARK
 *         format marks capture things like paragraph and section marks and other special marks that
 *         should not be considered as punctuation or whitespace for collation purposes.
 *
 *   newly defined members:
 *      name: string, the name of a format mark
 *      style: string, a single description for the style associated with the token
 *         for example, a paragraph style
 *
 *      formats: string[], an array of formats to be applied to the token
 *         for example, a word token could have several: ['bold', 'italic', 'underline']
 *
 *      TODO: Perhaps add a fully custom spec with FmtText, but only when absolute needed
 *         it is best to deal with styles only
 *      fmtText: FmtTextToken[],  if not empty, a custom, fully formatted specification of the
 *        token.  This should only be used in extreme cases!!
 *
 *
 *
 */

export class EditionWitnessToken extends WitnessToken {
  private markType: string = '';
  private style: string = '';
  private formats: string[] = [];

  constructor () {
    super()
    this.tokenClass = WitnessTokenClass.EDITION
    this.__removeAllFormats()
  }

  setWord (wordString: string): this {
    super.setWord(wordString)
    this.__removeAllFormats()
    return this
  }

  setNumberingLabel(label: string): this {
    this.__removeText()
    this.__removeAllFormats()
    this.text = label
    this.tokenType = WitnessTokenType.NUMBERING_LABEL
    return this
  }

  setParagraphEnd(style = EditionWitnessParagraphStyle.NORMAL): this {
    this.setFormatMark(WitnessFormat.PARAGRAPH_END, style)
    return this
  }

  setFormatMark(formatMarkName: string, style: string = '', formats: string[] = []): WitnessToken {
    this.tokenType = WitnessTokenType.FORMAT_MARK
    this.markType = formatMarkName
    this.style = style
    this.formats = formats
    this.__removeText()
    return this
  }


  getCtDataObject () {
    let theObject = super.getCtDataObject()
    theObject.markType = this.markType
    theObject.style = this.style
    theObject.formats = this.formats
    return theObject
  }

  __removeAllFormats() {
    this.markType = ''
    this.style = ''
    this.formats = []
  }

  __removeText() {
    this.text = ''
    this.normalizedText = ''
    this.normalizationSource = NormalizationSource.NONE
  }
}