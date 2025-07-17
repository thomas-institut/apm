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

import * as TokenType from '../../Witness/WitnessTokenType.mjs'
import { SequenceWithGroups } from '../SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import {ApparatusCommon} from '../../EditionComposer/ApparatusCommon.js'
import * as SubEntryType from '../SubEntryType.mjs'
import * as ApparatusType from '../../constants/ApparatusType'
import * as WitnessTokenType from '../../Witness/WitnessTokenType.mjs'
import * as SubEntrySource from '../SubEntrySource.mjs'
import { CtData } from '../../CtData/CtData'
import { Apparatus } from '../Apparatus'
import { ApparatusSubEntry } from '../ApparatusSubEntry.mjs'
import { FmtTextFactory } from '../../FmtText/FmtTextFactory.mjs'
import { ApparatusEntry } from '../ApparatusEntry.mjs'


import { Punctuation} from '../../defaults/Punctuation.mjs'

import {WitnessDataItem} from '../WitnessDataItem.mjs'

export class CriticalApparatusGenerator {

  constructor (options = {}) {
    this.verbose = options.verbose === undefined ? true : options.verbose
  }

  /**
   *
   * @param {CtDataInterface} ctData
   * @param {number} baseWitnessIndex
   * @param {MainTextToken[]} mainText
   * @return {Apparatus}
   */
  generateCriticalApparatusFromCtData (ctData, baseWitnessIndex, mainText) {

    // 1. Construct an array with main text tokens: a map of the base witness' row in the collation
    //    table exchanging the references for the actual tokens and filling the null references with empty tokens
    let baseWitnessTokens = CtData.getCtWitnessTokens(ctData, baseWitnessIndex)
    // console.log(`Base witness tokens`)
    // console.log(baseWitnessTokens)
    let ctIndexToMainTextMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens.length, mainText)
    // console.log(`ctIndexToMainTextMap`)
    // console.log(ctIndexToMainTextMap)

    let excludedWitnesses = ctData['excludeFromAutoCriticalApparatus'] ?? [];

    let lang = ctData['lang']

    let columnGroups = this._getGroupsFromCtData(ctData)
    // TODO: detect a series of empty main text tokens at the beginning of the text and create a group with them
    //  this group would only be added if the user has not already created it or created groups that contain it
    //  entirely (for example: a user might have decided to include the first few words of the main text in
    //  a group together with the empty main text columns so that the apparatus indicate initial variants
    let entries = []
    columnGroups.forEach((columnGroup) => {
      let ctColumns = []
      //let mainTextIndices = []
      for (let ctColNumber = columnGroup.from; ctColNumber <= columnGroup.to; ctColNumber++) {
        ctColumns.push(ApparatusCommon.getCollationTableColumn(ctData, ctColNumber))
      }

      if (ctColumns.every(col => this._isCtTableColumnEmpty(col))) {
        // skip groups consisting of only empty columns
        // this.verbose && console.log(`Group ${columnGroup.from}-${columnGroup.to} consists of empty columns, skipping.`)
        return
      }

      let groupMatrix = new Matrix(ctColumns.length, ctColumns[0].length)
      groupMatrix.setFromArray(ctColumns)
      // a row in groupMatrix is one collation table column
      // this means that a groupMatrix column is a row in the CT
      // if (mainTextIndices.every( i => i === -1)) {
      if (this._isCtRowEmpty(ctColumns, baseWitnessIndex)) {
         // this.verbose && console.log(`No base witness text for group ${columnGroup.from}-${columnGroup.to}`)
        // First find the previous index for which there is a word in the base witness,
        // the  sub-entries, one or more additions, will be associated with it
        let ctIndex = columnGroup.from

        let foundIndex = false
        while (!foundIndex) {
          if (ctIndex < 0) {
            foundIndex = true
            continue
          }
          if (baseWitnessTokens[ctIndex].tokenType === WitnessTokenType.EMPTY) {
            ctIndex--
            continue
          }
          if (baseWitnessTokens[ctIndex].text !== undefined && Punctuation.stringIsAllPunctuation(baseWitnessTokens[ctIndex].text, lang)){
            ctIndex--
            continue
          }
          foundIndex = true
        }
        // while (ctIndex >= 0 && (baseWitnessTokens[ctIndex].type === WitnessTokenType.EMPTY ||
        //   Punctuation.stringIsAllPunctuation(baseWitnessTokens[ctIndex].text, lang))) {
        //    this.verbose && console.log(`No luck with index ${ctIndex}, will try ${ctIndex-1} next`)
        //   ctIndex--
        // }

        // a ctIndex of -1 means that the apparatus entry comes before the text
        let mainTextIndex = ctIndex < 0 ? -1 : ctIndexToMainTextMap[ctIndex]
        if (mainTextIndex === undefined) {
          console.warn(`Main text index undefined for ctIndex ${ctIndex}`)
          console.log(columnGroup)
        }
        // collect additions
        let additions = []
        for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
          if (witnessIndex === baseWitnessIndex || excludedWitnesses.indexOf(witnessIndex) !== -1) {
            // ignore base witness and excluded witnesses
            continue
          }
          let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, false, lang)
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
        let subEntries = this._buildSubEntryArrayFromVariantArrayNew(additions, SubEntryType.ADDITION)

        if (subEntries.length !== 0) {
          let entry = new ApparatusEntry()
          entry.from = mainTextIndex
          entry.to = mainTextIndex
          // TODO: deal with 'pre' entries properly, the lemma text should be the first word in the text
          //entry.lemmaText = mainTextIndex !== -1 ? ApparatusCommon.getNormalizedTextFromInputToken(baseWitnessTokens[ctIndex]) : 'pre'
          entry.lemmaText = mainTextIndex !== -1 ? baseWitnessTokens[ctIndex]['text'] : 'pre'
          entry.subEntries = subEntries
          // other info
          entry.metadata.add('ctGroup', columnGroup)
          entries.push(entry)
          //console.log(`Adding entry, there are now ${entries.length} in the critical apparatus`)
        }
        return
      }
      // 2. There's main text in the group, we need to find omissions and variants
      let normalizedGroupMainText = ApparatusCommon.getMainTextForGroup(columnGroup, baseWitnessTokens, true, lang)
      if (normalizedGroupMainText === '') {
        // this.verbose && console.log(`Group ${columnGroup.from}-${columnGroup.to} has empty text, skipping.`)
        // ignore empty string (normally main text consisting only of punctuation)
        return
      }
      // Check for main text that should not be processed
      // if (WitnessTokenStringParser.isNumberingLabel(normalizedGroupMainText)) {
      //   console.log(`Main text ${normalizedGroupMainText} is a numbering label`)
      //   return
      // }
      let groupVariants = []
      let groupOmissions = []

      for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
        // inspect every witness
        if (witnessIndex === baseWitnessIndex || excludedWitnesses.indexOf(witnessIndex) !== -1) {
          // ignore base witness and excluded witnesses
          continue
        }
        let normalizedWitnessText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, true, lang)
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
          this._addWitnessDataToVariantArray(groupVariants, this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, false, lang), witnessData)
        }
      }
      let mainTextIndexFrom = ctIndexToMainTextMap[columnGroup.from]
      if (mainTextIndexFrom === undefined) {
        console.warn(`Main text index 'from' undefined for ctIndex ${columnGroup.from}`)
        console.log(columnGroup)
      }
      if (mainTextIndexFrom === -1) {
        // need to find first non-empty main text token in
        //console.log('Finding non empty main text token forward')
        mainTextIndexFrom = CtData.findNonEmptyMainTextToken(columnGroup.from, ctIndexToMainTextMap, baseWitnessTokens, true, lang)
      }
      let mainTextIndexTo = ctIndexToMainTextMap[columnGroup.to]
      if (mainTextIndexTo === undefined) {
        console.warn(`Main text index 'to' undefined for ctIndex ${columnGroup.to}`)
        console.log(columnGroup)
      }
      if (mainTextIndexTo === -1) {
        //console.log(`Finding non-empty main text token backwards from ${columnGroup.to}, from = ${columnGroup.from}`)
        mainTextIndexTo = CtData.findNonEmptyMainTextToken(columnGroup.to, ctIndexToMainTextMap, baseWitnessTokens, false, lang)
        //console.log(`  result: ${mainTextIndexTo}`)
      }

      let subEntries = this._buildSubEntryArrayFromVariantArrayNew(groupVariants, SubEntryType.VARIANT)
        .concat(this._buildSubEntryArrayFromVariantArrayNew(groupOmissions, SubEntryType.OMISSION))
      if (subEntries.length !== 0) {
        let entry = new ApparatusEntry()
        entry.from = mainTextIndexFrom
        entry.to = mainTextIndexTo
        entry.lemmaText = ApparatusCommon.getMainTextForGroup(columnGroup, baseWitnessTokens, false, lang)
        entry.subEntries = subEntries
        // other info
        entry.metadata.add('ctGroup', columnGroup)
        entries.push(entry)
        //console.log(`Adding entry, there are now ${entries.length} in the critical apparatus`)
      }
    })

    let apparatus = new Apparatus()
    apparatus.type = ApparatusType.CRITICUS

    // Optimize apparatus
    apparatus.entries = this._optimizeEntries(entries)

    // extra info
    apparatus.rawEntries = entries

    return apparatus
  }
  _optimizeEntries (entries) {
    // 1. group sub-entries that belong to the same CT columns
    let optimizedEntries = []
    entries.forEach(entry => {
      let index = findRangeInEntries(optimizedEntries, entry.from, entry.to)
      if (index === -1) {
        optimizedEntries.push(entry)
      } else {
        optimizedEntries[index].subEntries = optimizedEntries[index].subEntries.concat(entry.subEntries)
      }
    })
    return optimizedEntries
  }

  _getGroupsFromCtData (ctData) {
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
  _addWitnessDataToVariantArray (theArray, text, witnessData) {
    let textIndex = theArray.map(v => v.text).indexOf(text)
    if (textIndex === -1) {
      // the text is not in the array, create a new element
      theArray.push({ text: text, witnessDataArray: [witnessData] })
    } else {
      // add the witness index to the appropriate element
      theArray[textIndex].witnessDataArray.push(witnessData)
    }
  }

  _buildSubEntryArrayFromVariantArrayNew (variantArray, subEntryType) {
    return variantArray.map((v) => {
      let subEntry = new ApparatusSubEntry()
      subEntry.type = subEntryType
      subEntry.fmtText = FmtTextFactory.fromAnything(v.text)
      subEntry.witnessData = v.witnessDataArray
      subEntry.source = SubEntrySource.AUTO
      return subEntry
    })
  }

  _getRowTextFromGroupMatrix (matrix, rowNumber, normalized = true, lang = '') {
    return matrix.getColumn(rowNumber)
      .map((token) => {
        if (token.tokenType === TokenType.EMPTY) {
          return ''
        }
        let theText = normalized ? ApparatusCommon.getNormalizedTextFromInputToken(token) : token['text']
        if (Punctuation.stringIsAllPunctuation(theText, lang)) {
          return ''
        }
        return theText
      })
      .filter(t => t !== '')   // filter out empty text
      .join(' ')
  }

  _isCtTableColumnEmpty (ctColumn) {
    return ctColumn.every(e => e.tokenType === TokenType.EMPTY)
  }

  _isCtRowEmpty (ctColumnArray, rowIndex) {
    return ctColumnArray.map(col => col[rowIndex]).every(token => { return token.tokenType === WitnessTokenType.EMPTY})
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
  createWitnessData (witnessIndex, hand = 0, location = '') {
    let data = new WitnessDataItem()
    data.setWitnessIndex(witnessIndex).setHand(hand)
    data.location = location
    data.forceHandDisplay = false
    return data
  }

  /**
   * @param {number} ctRowLength
   * @param {MainTextToken[]}mainText
   * @return {number[]}
   */
  static calcCtIndexToMainTextMap (ctRowLength, mainText) {
    let theMap = []
    for (let i = 0; i < ctRowLength; i++) {
      theMap[i] = -1
    }
    mainText.forEach((textToken, textIndex) => {
      if (textToken.editionWitnessTokenIndex !== -1) {
        theMap[textToken.editionWitnessTokenIndex] = textIndex
      }
    })
    return theMap
  }

}

function findRangeInEntries(theArray, from, to) {
  let found = false
  let index = -1
  theArray.forEach( (entry, i) => {
    if (!found && entry.from === from && entry.to === to) {
      found = true
      index = i
    }
  })
  return index
}
