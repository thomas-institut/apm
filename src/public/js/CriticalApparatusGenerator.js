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

import * as TokenType from './constants/TranscriptionTokenType'
import { isPunctuationToken } from './toolbox/Util.mjs'
import { SequenceWithGroups } from './SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import * as NormalizationSource from './constants/NormalizationSource'
import {ApparatusCommon} from './EditionComposer/ApparatusCommon'
import { generateMainText} from './EditionMainTextGenerator.mjs'
import * as ApparatusEntryType from './constants/ApparatusEntryType'
import * as ApparatusType from './constants/ApparatusType'


// Apparatus =   {
//     type: string constant
//     entries: ApparatusEntry[]
//     ... perhaps other data depending on the apparatus type
// }
//
// ApparatusEntry  = {
//      from: int, = CT column number
//      to: int, = CT column number
//      lemma: string, can be derived from the CT, but the editor could override it  (TODO: how to do this?)
//      subEntries:  ApparatusSubEntry[]
// }
//
// ApparatusSubEntry = {
//       type: string constant, e.g. 'variant', 'addition'
//       text:  string, e.g. the actual variant
//       witnessData: SubEntryWitnessInfo[], info about the witnesses associated with the entry, e.g., the witnesses in which the variant is present
//       ... other things depending on the sub-entry type, e.g. rich text
//
// SubEntryWitnessInfo = {
//      witnessIndex : integer
//      ... basically all the pertinent info from the transcription token, but the user could override it for this particular collation table....
//      hand:  integer
//      location: string constant representing where the phenomenon is located, e.g. margin-right, overline
//      technique: string constant, e.g. points-above, a deletion technique
//

export class CriticalApparatusGenerator {

  constructor (options) {
  }

  /**
   * Generates an automatic critical apparatus from the given collation table data (which can
   * be an edition too) using the given witness index as the main text.
   *
   * @param ctData
   * @param baseWitnessIndex,  if not given or -1, the base witness is the edition witness given in ctData or the first witness in the table
   * @returns object
   */
  generateCriticalApparatus(ctData, baseWitnessIndex = -1) {

    if (baseWitnessIndex === -1) {
      baseWitnessIndex = ctData['editionWitnessIndex'] !== undefined ? ctData['editionWitnessIndex'] : ctData['witnessOrder'][0]
    }

    // 1. Construct an array with main text tokens: a map of the base witness' row in the collation
    //    table exchanging the references for the actual tokens and filling the null references with empty tokens
    let mainTextTokens = ctData['collationMatrix'][baseWitnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : TokenType.EMPTY } : ctData['witnesses'][baseWitnessIndex]['tokens'][tokenRef])

    let generatedNormalizedMainText = generateMainText(mainTextTokens, true)
    let generatedMainText = generateMainText(mainTextTokens, true, [ NormalizationSource.AUTOMATIC_COLLATION, NormalizationSource.COLLATION_EDITOR_AUTOMATIC])

    let columnGroups = this._getGroupsFromCtData(ctData)
    // TODO: detect a series of empty main text tokens at the beginning of the text and create a group with them
    //  this group would only be added if the user has not already created it or created groups that contain it
    //  entirely (for example: a user might have decided to include the first few words of the main text in
    //  a group together with the empty main text columns so that the apparatus indicate initial variants
    let entries = []
    columnGroups.forEach( (columnGroup) => {

      let ctColumns = []
      let mainTextIndices = []
      for (let ctColNumber = columnGroup.from; ctColNumber <= columnGroup.to; ctColNumber++) {
        ctColumns.push(ApparatusCommon.getCollationTableColumn(ctData, ctColNumber))
        mainTextIndices.push(generatedNormalizedMainText.ctToMainTextMap[ctColNumber])
      }

      if (ctColumns.every( col => this.isCtTableColumnEmpty(col))) {
        // skip groups consisting of only empty columns
        return
      }

      let groupMatrix = new Matrix(ctColumns.length, ctColumns[0].length)
      groupMatrix.setFromArray(ctColumns)
      // a row in groupMatrix is one collation table column
      // this means that a groupMatrix column is a row in the CT
      if (mainTextIndices.every( i => i === -1)) {
        // 1. Nothing on the main text for this group
        // First find the previous index for which there is main text,
        // the  sub-entries, one or more additions, will be associated with it
        let ctIndex = columnGroup.from
        while (ctIndex >= 0 && (
          generatedNormalizedMainText.ctToMainTextMap[ctIndex] === -1 ||
          isPunctuationToken(generatedNormalizedMainText.mainTextTokens[generatedNormalizedMainText.ctToMainTextMap[ctIndex]]['text'])) ) {
          ctIndex--
        }
        // a mainTextIndex of -1 means that the apparatus entry comes before the text, normally with the lemma 'pre'
        // in the printed edition
        let mainTextIndex = ctIndex < 0 ? -1 : generatedNormalizedMainText.ctToMainTextMap[ctIndex]
        // collect additions
        let additions = []
        for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
          if (witnessIndex === baseWitnessIndex) {
            // ignore base witness
            continue
          }
          let theText = this._getNormalizedRowTextFromGroupMatrix(groupMatrix, witnessIndex)
          if (theText === '') {
            // ignore empty witness text
            // TODO: check for deletions
            continue
          }
          // TODO: check for different hands and addition location
          //  there might be complications when additions consist of words with several hands or in several locations

          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(additions, theText, witnessData)
        }
        let subEntries = this._buildSubEntryArrayFromVariantArray(additions, ApparatusEntryType.ADDITION)
        if (subEntries.length !== 0) {
            entries.push({
              start: mainTextIndex,
              end: mainTextIndex,
              ctGroup: columnGroup,
              from: ctIndex,
              to: ctIndex,
              lemma: mainTextIndex !== -1 ? ApparatusCommon.getNormalizedTextFromInputToken(generatedMainText.mainTextTokens[mainTextIndex]) : 'pre',
              subEntries: subEntries
            })
        }
        return
      }
      // 2. There's main text in the group, we need to find omissions and variants
      let normalizedGroupMainText = ApparatusCommon.getMainTextForGroup(columnGroup, mainTextTokens, true)
      if (normalizedGroupMainText === '') {
        // ignore empty string (normally main text consisting only of punctuation)
        return
      }
      let groupVariants = []
      let groupOmissions = []

      for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
        // inspect every witness
        if (witnessIndex === baseWitnessIndex) {
          // ignore base witness
          continue
        }
        let normalizedWitnessText = this._getNormalizedRowTextFromGroupMatrix(groupMatrix, witnessIndex)
        if (normalizedWitnessText === '') {
          // omission
          // TODO: check for deletions (i.e., the text might be present as a deletion in the witness)
          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(groupOmissions, normalizedWitnessText, witnessData)
          continue
        }
        if (normalizedWitnessText !== normalizedGroupMainText) {
          // variant
          // TODO: check for different hands and corrections
          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(groupVariants, normalizedWitnessText, witnessData)
        }
      }
      let mainTextIndexFrom = generatedNormalizedMainText.ctToMainTextMap[columnGroup.from]
      if (mainTextIndexFrom === -1) {
        // need to find first non-empty main text token in
        //console.log('Finding non empty main text token forward')
        mainTextIndexFrom = ApparatusCommon.findNonEmptyMainTextToken(columnGroup.from,
          generatedNormalizedMainText.ctToMainTextMap, generatedNormalizedMainText.mainTextTokens, true)
      }
      let mainTextIndexTo = generatedNormalizedMainText.ctToMainTextMap[columnGroup.to]
      if (mainTextIndexTo === -1) {
        //console.log(`Finding non empty main text token backwards from ${columnGroup.to}, from = ${columnGroup.from}`)
        mainTextIndexTo = ApparatusCommon.findNonEmptyMainTextToken(columnGroup.to,
          generatedNormalizedMainText.ctToMainTextMap, generatedNormalizedMainText.mainTextTokens, false)
      }

      let subEntries =  this._buildSubEntryArrayFromVariantArray(groupOmissions, ApparatusEntryType.OMISSION)
        .concat(this._buildSubEntryArrayFromVariantArray(groupVariants, ApparatusEntryType.VARIANT))
      if (subEntries.length !== 0) {
        entries.push({
          lemma: ApparatusCommon.getMainTextForGroup(columnGroup, mainTextTokens, false),
          start: mainTextIndexFrom,
          end: mainTextIndexTo,
          ctGroup: columnGroup,
          from: generatedMainText.mainTextTokens[mainTextIndexFrom].collationTableIndex,
          to: generatedMainText.mainTextTokens[mainTextIndexTo].collationTableIndex,
          subEntries: subEntries
        })
      }
    })

    return {
      type: ApparatusType.CRITICUS,
      entries: entries,
      // ... extra data ...
      baseWitnessIndex: baseWitnessIndex,
      mainTextTokens: generatedMainText.mainTextTokens,
      criticalApparatus: entries   // TODO: remove this
    }
  }

  _getGroupsFromCtData(ctData) {
    if (ctData['witnesses'].length === 0) {
      return []
    }
    let groupedColumns = ctData['groupedColumns'] === undefined ? [] : ctData['groupedColumns']
    let seq = new SequenceWithGroups(ctData['collationMatrix'][0].length, groupedColumns)
    return seq.getGroups()
  }

  /**
   * Adds a witness index to a variant array
   *
   * The variant array is array of objects of the form:
   *   {  text: 'someText', witnessDataArray: [ wd1, wd2, ... ]}
   *
   * This method simply places the given witness index in the element with the given
   * text or creates such an element if the text is not in any element of the array
   *
   * @param theArray
   * @param text
   * @param witnessData
   * @private
   */
  _addWitnessDataToVariantArray(theArray, text, witnessData) {
    let textIndex = theArray.map( v => v.text ).indexOf(text)
    if (textIndex === -1) {
      // the text is not in the array, create a new element
      theArray.push( { text:text, witnessDataArray: [ witnessData]})
    } else {
      // add the witness index to the appropriate element
      theArray[textIndex].witnessDataArray.push(witnessData)
    }
  }

  _buildSubEntryArrayFromVariantArray(variantArray, subEntryType) {
    return variantArray.map( (v) => {
      return {
        type: subEntryType,
        witnessData: v.witnessDataArray,
        text: v.text
      }
    })
  }

  _getNormalizedRowTextFromGroupMatrix(matrix, rowNumber) {
    return matrix.getColumn(rowNumber)
      .map( (token) => {
        if (token.tokenType === TokenType.EMPTY) {
          return ''
        }
        let theText = ApparatusCommon.getNormalizedTextFromInputToken(token)
        if (isPunctuationToken(theText)) {
          return ''
        }
        return theText
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  isCtTableColumnEmpty(ctColumn) {
    return ctColumn.every( e => e.tokenType === TokenType.EMPTY)
  }

  /**
   * Creates a witness data object
   *
   * TODO: make this type of object a class and use a factory or a constructor
   *
   * @param witnessIndex
   * @param hand
   * @param location
   * @returns {{witnessIndex, location: string, hand: number}}
   */
  createWitnessData(witnessIndex, hand = 0, location = '') {
    return  { witnessIndex: witnessIndex, hand: hand, location: location}
  }
}