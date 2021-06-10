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

import * as TokenType from './constants/TokenType'
import { isPunctuationToken } from './toolbox/Util.mjs'
import { SequenceWithGroups } from './SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import * as NormalizationSource from './constants/NormalizationSource'
import {ApparatusCommon} from './EditionComposer/ApparatusCommon'
import { generateMainText} from './EditionMainTextGenerator.mjs'


const ENTRY_TYPE_ADDITION = 'addition'
const ENTRY_TYPE_OMISSION = 'omission'
const ENTRY_TYPE_VARIANT = 'variant'


export class CriticalApparatusGenerator {

  constructor (options) {


  }

  /**
   * Generates an automatic critical apparatus from the given collation table data (which can
   * be an edition too) using the given witness index as the main text.
   *
   * An critical edition apparatus consists of
   *
   * @param ctData
   * @param baseWitnessIndex
   * @returns {[]}
   */
  generateCriticalApparatus(ctData, baseWitnessIndex = 0) {
    // let profiler = new SimpleProfiler('criticalApparatusGeneration')

    // let mainTextInputTokens = this.getWitnessTokensFromReferenceRow(ctData, baseWitnessIndex)

    // Construct an array with main text tokens: a map of the base witness' row in the collation
    // table exchanging the references for the actual tokens and filling the null references with empty tokens
    let mainTextTokens = ctData['collationMatrix'][baseWitnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : TokenType.EMPTY } : ctData['witnesses'][baseWitnessIndex]['tokens'][tokenRef])

    let generatedNormalizedMainText = generateMainText(mainTextTokens, true)
    // console.log(`Normalized main text`)
    // console.log(generatedNormalizedMainText)
    let generatedMainText = generateMainText(mainTextTokens, true, [ NormalizationSource.AUTOMATIC_COLLATION, NormalizationSource.COLLATION_EDITOR_AUTOMATIC])
    // console.log(`Main text`)
    // console.log(generatedMainText)

    let columnGroups = this._getGroupsFromCtData(ctData)
    // TODO: detect a series of empty main text tokens at the beginning of the text and create a group with them
    //  this group would only be added if the user has not already created it or created groups that contain it
    //  entirely (for example: a user might have decided to include the first few words of the main text in
    //  a group together with the empty main text columns so that the apparatus indicate initial variants
    let criticalApparatus = []
    columnGroups.forEach( (columnGroup) => {

      let ctColumns = []
      let mainTextIndices = []
      for (let c = columnGroup.from; c<= columnGroup.to; c++) {
        ctColumns.push(ApparatusCommon.getCollationTableColumn(ctData, c))
        mainTextIndices.push(generatedNormalizedMainText.ctToMainTextMap[c])
      }
      if (ctColumns.every( col => this.isCtTableColumnEmpty(col))) {
        return
      }

      let groupMatrix = new Matrix(ctColumns.length, ctColumns[0].length)
      groupMatrix.setFromArray(ctColumns)
      // a row in groupMatrix is one collation table column
      // this means that a groupMatrix column is a row in the CT
      if (mainTextIndices.every( i => i === -1)) {
        // 1. Nothing on the main text for this token
        // First find the previous token index that is in the main text,
        // this is where the apparatus entry will appear
        let ctIndex = columnGroup.from
        while (ctIndex >= 0 && (
          generatedNormalizedMainText.ctToMainTextMap[ctIndex] === -1 ||
          isPunctuationToken(generatedNormalizedMainText.mainTextTokens[generatedNormalizedMainText.ctToMainTextMap[ctIndex]]['text'])) ) {
          ctIndex--
        }
        // a mainTextIndex of -1 means that the apparatus entry comes before the text, normally with the lesson 'pre'
        // in the printed edition
        let mainTextIndex = ctIndex < 0 ? -1 : generatedNormalizedMainText.ctToMainTextMap[ctIndex]
        // collect additions
        let additions = []
        for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
          if (witnessIndex === baseWitnessIndex) {
            // ignore base witness
            continue
          }
          let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex)
          if (theText === '') {
            // ignore empty witness text
            // TODO: check for deletions
            continue
          }
          // TODO: check for different hands and addition location

          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(additions, theText, witnessData)
        }
        let entries = this._genApparatusEntryFromArray([], additions, ENTRY_TYPE_ADDITION)
        if (entries.length !== 0) {
            criticalApparatus.push({
              start: mainTextIndex,
              end: mainTextIndex,
              lemma: mainTextIndex !== -1 ? ApparatusCommon.getNormalizedTextFromInputToken(generatedMainText.mainTextTokens[mainTextIndex]) : 'pre',
              entries:entries
            })
        }
        return
      }
      // 2. There's main text, we need to find omissions and variants
      let mainText = ApparatusCommon.getMainTextForGroup(columnGroup, mainTextTokens)
      if (mainText === '') {
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
        let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex)
        if (theText === '') {
          // omission
          // TODO: check for deletions (i.e., the text might be present as a deletion in the witness)
          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(groupOmissions, theText, witnessData)
          continue
        }
        if (theText !== mainText) {
          // variant
          // TODO: check for different hands and corrections
          let witnessData = this.createWitnessData(witnessIndex)
          this._addWitnessDataToVariantArray(groupVariants, theText, witnessData)
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

      let entries =  this._genApparatusEntryFromArray([],groupOmissions, ENTRY_TYPE_OMISSION)
      entries = this._genApparatusEntryFromArray(entries, groupVariants, ENTRY_TYPE_VARIANT)
      if (entries.length !== 0) {
        criticalApparatus.push({
          lemma: mainText,
          start: mainTextIndexFrom,
          end: mainTextIndexTo,
          entries: entries
        })
      }
    })
    // profiler.stop()

    return {
      baseWitnessIndex: baseWitnessIndex,
      mainTextTokens: generatedMainText.mainTextTokens,
      criticalApparatus: criticalApparatus
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

  /**
   * Generates an apparatus entry of the given type with the given variant array and sigla
   *
   * @param entries
   * @param variantArray
   * @param apparatusType
   * @returns {*}
   * @private
   */
  _genApparatusEntryFromArray (entries, variantArray, apparatusType) {
    variantArray.forEach( (variant) => {
      entries.push({
        type: apparatusType,
        witnessData: variant.witnessDataArray,
        text: variant.text
      })
    })
    return entries
  }

  getWitnessTokensFromReferenceRow(ctData, witnessIndex) {
    return ctData['collationMatrix'][witnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : TokenType.EMPTY } : ctData['witnesses'][witnessIndex]['tokens'][tokenRef] )
  }


  _getRowTextFromGroupMatrix(matrix, rowNumber) {
    let thisObject = this
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