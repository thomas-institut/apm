// noinspection ES6PreferShortImport

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

/*

Minimal data structure for a critical edition

 Edition := {
     ... optional general Id info, e.g. title, etc....

     // An edition's main text is MainTextToken array. Each token that contains a word normally refers
     // to a column in a collation table. In the simplest case, there is only one collation table.
     // The main text will also contain spaces and formatting marks such as paragraph and section break with
     // a variety of styles in order to support things such as headings, chapters, etc.

     mainText : MainTextToken[]
     apparatuses:  Apparatus[]
     witnesses:  EditionWitnessInfo[]

     ... eventually also:  information on how to order and display witnesses, e.g. witness groups
 }

EditionWitnessInfo := {
  siglum: string,
  title: string (optional)
  ... other info that specific viewer might want to display ...
}

MainTextToken := {
    type: text | space/glue | possibly others like marks for marginal information, ref
    fmtText:  FmtText

    ... other info needed for specialized representations, e.g. normalization, simpleText

    ctColumn: int, an index into a collation table
        Normally, the main text will be generated out of a witness in a collation table which also will
        be used to generate an automatic critical apparatus. This field allows for the two data structures
        to be put together
}

Apparatus :=   {
    type: string constant, e.g. 'criticus', 'fontium', etc
    entries: ApparatusEntry[]
    ... perhaps other data depending on the apparatus type
}

ApparatusEntry  := {
     section:  int[], an index into the mainText tree
          e.g. [ 0 ], the first and only section in the main text
               [1, 3], the 4th  section of the 2nd main section

     from: int, index to the MainTextToken in the given section
     to: int, index to the MainTextToken in the given section
     lemma: string, can be derived from (mainText, from, to), but the editor could override it  (TODO: how to do this in UI?)
     subEntries:  ApparatusSubEntry[]
}

ApparatusSubEntry := {
      type: string constant, e.g. 'variant', 'addition', 'custom'
      fmtText:  FmtText, e.g. the actual variant (or anything that can be converted to fmtText, e.g., a simple string)
      witnessData: SubEntryWitnessInfo[], info about the witnesses associated with the entry, e.g., the witnesses in which the variant is present
      ... other things depending on the sub-entry type
     // the idea is that the edition viewer or typesetter will generate the actual formatted text for presentation
     // out of the given fmtText and the witnessData.  However, it should be possible to override
     // that mechanism and provide a custom-made sub-entry text with the required formatting.

SubEntryWitnessInfo := {
     witnessIndex : integer
     ... basically all the pertinent info from the transcription token, but the user could override it for this particular collation table....
     hand:  integer
     location: string constant representing where the phenomenon is located, e.g. margin-right, overline
     technique: string constant, e.g. points-above, a deletion technique

 */

import { MainTextToken } from './MainTextToken.mjs'
import { FmtTextUtil } from '@/lib/FmtText/FmtTextUtil.js'

export class Edition {

  constructor () {
    this.lang = ''
    this.infoText = 'Empty Edition'
    this.info = {}

    this.mainText = []

    /**
     *
     * @member {Apparatus[]}
     */
    this.apparatuses = []


    this.witnesses = []

    /**
     *
     * @member {SiglaGroup[]}
     */
    this.siglaGroups = [];

    /**
     *
     * @member {FoliationChangeInfoInterface[] | null}
     */
    this.foliationChanges = null;
  }

  /**
   *
   * @param {MainTextToken[]}mainText
   */
  setMainText(mainText) {
    this.mainText = mainText
    return this
  }

  setLang(lang) {
    this.lang = lang
    return this
  }

  getLang() {
    return this.lang
  }

  /**
   *
   * @return {string[]}
   */
  getSigla() {
    return this.witnesses.map( w => w.siglum)
  }

  /**
   *
   * @return {MainTextToken}
   * @param {number}index
   */
  getMainTextToken(index) {
    return this.mainText[index] !== undefined ? this.mainText[index] : new MainTextToken()
  }

  /**
   *
   * @param {number}from
   * @param {number}to
   * @return {string}
   */
  getPlainTextForRange(from, to) {
    if (to<0 || from > to) {
      return ''
    }
    if (from < 0) {
      from = 0
    }
    return this.mainText.filter( (token, i) => {
      return i>=from && i<= to
    }).map ( (token) => { return  FmtTextUtil.tokenGetPlainText(token)}).join('')
  }

}
