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

import * as TokenType from './constants/WitnessTokenType'
import { strIsPunctuation } from './toolbox/Util.mjs'
import { SequenceWithGroups } from './SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import {ApparatusCommon} from './EditionComposer/ApparatusCommon'
import * as ApparatusEntryType from './Edition/SubEntryType'
import * as ApparatusType from './Edition/ApparatusType'
import * as WitnessTokenType from './constants/WitnessTokenType'
import * as SubEntrySource from './Edition/SubEntrySource'
import { CtData } from './CtData/CtData'
import { Apparatus } from './Edition/Apparatus'
import { LocationInSection } from './Edition/LocationInSection'
import { ApparatusSubEntry } from './Edition/ApparatusSubEntry'
import { FmtTextFactory } from './FmtText/FmtTextFactory'
import { ApparatusEntry } from './Edition/ApparatusEntry'



export class CriticalApparatusGenerator {

  constructor (options = {}) {
    this.verbose = options.verbose === undefined ? true : options.verbose
  }

  /**
   *
   * @param {object} ctData
   * @param {number} baseWitnessIndex
   * @param {MainTextSection[]} mainText
   * @return {Apparatus}
   */
  generateCriticalApparatusFromCtData(ctData, baseWitnessIndex, mainText) {

    // 1. Construct an array with main text tokens: a map of the base witness' row in the collation
    //    table exchanging the references for the actual tokens and filling the null references with empty tokens
    let baseWitnessTokens = CtData.getCtWitnessTokens(ctData, baseWitnessIndex)
    let ctIndexToMainTextMap = CriticalApparatusGenerator.calcCtIndexToMainTextMap(baseWitnessTokens.length, mainText)
    // Supporting only one section for now
    let section = [0]

    let columnGroups = this._getGroupsFromCtData(ctData)
    // TODO: detect a series of empty main text tokens at the beginning of the text and create a group with them
    //  this group would only be added if the user has not already created it or created groups that contain it
    //  entirely (for example: a user might have decided to include the first few words of the main text in
    //  a group together with the empty main text columns so that the apparatus indicate initial variants
    let entries = []
    columnGroups.forEach( (columnGroup) => {
      let ctColumns = []
      //let mainTextIndices = []
      for (let ctColNumber = columnGroup.from; ctColNumber <= columnGroup.to; ctColNumber++) {
        ctColumns.push(ApparatusCommon.getCollationTableColumn(ctData, ctColNumber))
      }

      if (ctColumns.every( col => this._isCtTableColumnEmpty(col))) {
        // skip groups consisting of only empty columns
        this.verbose && console.log(`Group ${columnGroup.from}-${columnGroup.to} consists of empty columns, skipping.`)
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

        while (ctIndex >= 0 && ( baseWitnessTokens[ctIndex].type === WitnessTokenType.EMPTY ||
          strIsPunctuation(baseWitnessTokens[ctIndex].text)) ) {
          ctIndex--
        }

        // a ctIndex of -1 means that the apparatus entry comes before the text, normally with the lemma 'pre'
        // in the printed edition
        // TODO: what would happen if an edition is composed of multiple sections
        // ATTENTION: assuming there's only one section
        let mainTextIndex = ctIndex < 0 ? -1 : ctIndexToMainTextMap[ctIndex].textIndex
        // collect additions
        let additions = []
        for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
          if (witnessIndex === baseWitnessIndex) {
            // ignore base witness
            continue
          }
          let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, true)
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
        let subEntries = this._buildSubEntryArrayFromVariantArrayNew(additions, ApparatusEntryType.ADDITION)


        if (subEntries.length !== 0) {
          let entry = new ApparatusEntry()
          entry.from = mainTextIndex
          entry.to = mainTextIndex
          entry.section = section
          entry.lemma = mainTextIndex !== -1 ? ApparatusCommon.getNormalizedTextFromInputToken(baseWitnessTokens[ctIndex]) : 'pre'
          entry.subEntries = subEntries
          // other info
          entry.ctGroup = columnGroup
          entries.push(entry)
        }
        return
      }
      // 2. There's main text in the group, we need to find omissions and variants
      let normalizedGroupMainText = ApparatusCommon.getMainTextForGroup(columnGroup, baseWitnessTokens, true)
      if (normalizedGroupMainText === '') {
        this.verbose && console.log(`Group ${columnGroup.from}-${columnGroup.to} has empty text, skipping.`)
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
        let normalizedWitnessText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, true)
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
          this._addWitnessDataToVariantArray(groupVariants, this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, false), witnessData)
        }
      }
      let mainTextIndexFrom = ctIndexToMainTextMap[columnGroup.from].textIndex
      if (mainTextIndexFrom === -1) {
        // need to find first non-empty main text token in
        //console.log('Finding non empty main text token forward')
        mainTextIndexFrom = this._findNonEmptyMainTextToken(columnGroup.from, ctIndexToMainTextMap, baseWitnessTokens, true)
      }
      let mainTextIndexTo = ctIndexToMainTextMap[columnGroup.to].textIndex
      if (mainTextIndexTo === -1) {
        //console.log(`Finding non empty main text token backwards from ${columnGroup.to}, from = ${columnGroup.from}`)
        mainTextIndexTo = this._findNonEmptyMainTextToken(columnGroup.to, ctIndexToMainTextMap, baseWitnessTokens, false)
      }

      let subEntries =  this._buildSubEntryArrayFromVariantArrayNew(groupOmissions, ApparatusEntryType.OMISSION)
        .concat(this._buildSubEntryArrayFromVariantArrayNew(groupVariants, ApparatusEntryType.VARIANT))
      if (subEntries.length !== 0) {
        let entry = new ApparatusEntry()
        entry.from = mainTextIndexFrom
        entry.to = mainTextIndexTo
        entry.section = section
        entry.lemma = ApparatusCommon.getMainTextForGroup(columnGroup, baseWitnessTokens, false)
        entry.subEntries = subEntries
        // other info
        entry.ctGroup = columnGroup
        entries.push(entry)
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

  /**
   *
   * @param {number} ctIndex
   * @param {LocationInSection[]} ctIndexToMainTextMap
   * @param {*[]} baseWitnessTokens
   * @param {boolean}forward
   * @return {number}
   * @private
   */
   _findNonEmptyMainTextToken(ctIndex, ctIndexToMainTextMap, baseWitnessTokens, forward) {
    while (ctIndex >= 0 && ctIndex < ctIndexToMainTextMap.length && (
      ctIndexToMainTextMap[ctIndex].isNull()  ||
      strIsPunctuation(baseWitnessTokens[ctIndex]['text'])) ) {
      ctIndex = forward ? ctIndex + 1 : ctIndex -1
    }
    if (ctIndex < 0 || ctIndex >= ctIndexToMainTextMap.length) {
      return -1
    }
    return ctIndexToMainTextMap[ctIndex].textIndex
  }

  _optimizeEntries(entries) {
    // 1. group sub-entries that belong to the same CT columns
    let optimizedEntries = []
    entries.forEach( entry => {
      let index = findRangeInEntries(optimizedEntries, entry.from, entry.to)
      if (index === -1) {
        optimizedEntries.push(entry)
      } else {
        optimizedEntries[index].subEntries = optimizedEntries[index].subEntries.concat(entry.subEntries)
      }
    })
    return optimizedEntries
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

  // _buildSubEntryArrayFromVariantArray(variantArray, subEntryType) {
  //   return variantArray.map( (v) => {
  //     return {
  //       type: subEntryType,
  //       witnessData: v.witnessDataArray,
  //       text: v.text
  //     }
  //   })
  // }

  _buildSubEntryArrayFromVariantArrayNew(variantArray, subEntryType) {
    return variantArray.map( (v) => {
      let subEntry = new ApparatusSubEntry()
      subEntry.type = subEntryType
      subEntry.fmtText = FmtTextFactory.fromAnything(v.text)
      subEntry.witnessData = v.witnessDataArray
      subEntry.source = SubEntrySource.AUTO
      return subEntry
    })
  }


  _getRowTextFromGroupMatrix(matrix, rowNumber, normalized = true) {
    return matrix.getColumn(rowNumber)
      .map( (token) => {
        if (token.tokenType === TokenType.EMPTY) {
          return ''
        }
        let theText = normalized ? ApparatusCommon.getNormalizedTextFromInputToken(token) : token['text']
        if (strIsPunctuation(theText)) {
          return ''
        }
        return theText
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  _isCtTableColumnEmpty(ctColumn) {
    return ctColumn.every( e => e.tokenType === TokenType.EMPTY)
  }

  _isCtRowEmpty(ctColumnArray, rowIndex) {
    return ctColumnArray.map( col => col[rowIndex]).every( token => { return token.tokenType === WitnessTokenType.EMPTY})
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


  /**
   * @param {number} ctRowLength
   * @param {MainTextSection[]} mainTextSections
   */
  static calcCtIndexToMainTextMap(ctRowLength, mainTextSections) {
    // TODO: test this with complex section trees
    let theMap = []
    // 1. fill the map with null references
    for (let i = 0; i < ctRowLength; i++) {
      theMap.push(new LocationInSection())
    }

    function visitSection(sectionLocation, section) {
      // Collect info from text tokens
      section.text.forEach( (textToken, textIndex) => {
        if (textToken.collationTableIndex !== -1) {
          theMap[textToken.collationTableIndex] = new LocationInSection(sectionLocation, textIndex)
        }
      })
      // visit every subsection
      section.subSections.forEach( (subSection, subSectionIndex) => {
        visitSection( sectionLocation.concat([subSectionIndex]), subSection)
      })
    }
    mainTextSections.forEach( (s, i) => {
      visitSection([i], s)
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
