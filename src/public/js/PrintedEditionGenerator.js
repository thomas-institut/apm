/*
 *  Copyright (C) 2020 Universität zu Köln
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
import { isPunctuationToken } from './toolbox/Util'
import { SequenceWithGroups } from './SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'
const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText'

const noGluePunctuation = '.,:;?!'
   + String.fromCodePoint(0x60C) // // Arabic comma
   + String.fromCodePoint(0x61F) // Arabic question mark


// Space widths
const SPACE_WIDTH_NORMAL = 'normal'


// Edition token types
const E_TOKEN_TYPE_GLUE = 'glue'
const E_TOKEN_TYPE_TEXT = 'text'


export class PrintedEditionGenerator {

  generateEdition(ctData, baseWitnessIndex = 0) {
    let profiler = new SimpleProfiler('generateEdition')
    let sigla = ctData['sigla']
    let language = ctData['lang'];
    let textDirection = 'ltr';
    if (language === 'ar' || language === 'he') {
      textDirection = 'rtl';
    }
    let mainTextInputTokens = this.getWitnessTokensFromReferenceRow(ctData, baseWitnessIndex)
    let generatedMainText = this.generateMainText(mainTextInputTokens)

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
        ctColumns.push(this.getCollationTableColumn(ctData, c))
        mainTextIndices.push(generatedMainText.ctToMainTextMap[c])
      }
      if (ctColumns.every( col => this.isCtTableColumnEmpty(col))) {
        return
      }

      let groupMatrix = new Matrix(ctColumns.length, ctColumns[0].length)
      groupMatrix.setFromArray(ctColumns)
      // a row in groupMatrix is one collation table column
      // this means that a groupMatrix column is a row in the CT
      if (mainTextIndices.every( i => i === -1)) {
        // Nothing on the main text for this token
        // First find the previous token index that is in the main text,
        // this is where the apparatus entry will appear
        let ctIndex = columnGroup.from
        while (ctIndex >= 0 && (
          generatedMainText.ctToMainTextMap[ctIndex] === -1 ||
          isPunctuationToken(generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctIndex]]['text'])) ) {
          ctIndex--
        }
        // a mainTextIndex of -1 means that the apparatus entry comes before the text, normally with the lesson 'pre'
        // in the printed edition
        let mainTextIndex = ctIndex < 0 ? -1 : generatedMainText.ctToMainTextMap[ctIndex]
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
            continue
          }
          this._addWitnessIndexToArray(additions, theText, witnessIndex)
        }
        let entries = this._genApparatusEntryFromArray([], additions, sigla, 'addition')
        if (entries.length !== 0) {
          criticalApparatus.push({
            start: mainTextIndex,
            end: mainTextIndex,
            entries:entries
          })
        }
        return
      }
      // There's main text, we need to find omissions and variants
      let mainText = this._getMainTextForGroup(columnGroup, mainTextInputTokens)
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
          this._addWitnessIndexToArray(groupOmissions, theText, witnessIndex)
          continue
        }
        if (theText !== mainText) {
          // variant
          this._addWitnessIndexToArray(groupVariants, theText, witnessIndex)
        }
      }
      let mainTextIndexFrom = generatedMainText.ctToMainTextMap[columnGroup.from]
      if (mainTextIndexFrom === -1) {
        // need to find first non-empty main text token in
        console.log('Finding non empty main text token forward')
        mainTextIndexFrom = this._findNonEmptyMainTextToken(columnGroup.from,
          generatedMainText.ctToMainTextMap, generatedMainText.mainTextTokens, true)
      }
      let mainTextIndexTo = generatedMainText.ctToMainTextMap[columnGroup.to]
      if (mainTextIndexTo === -1) {
        console.log(`Finding non empty main text token backwards from ${columnGroup.to}, from = ${columnGroup.from}`)
        mainTextIndexTo = this._findNonEmptyMainTextToken(columnGroup.to,
          generatedMainText.ctToMainTextMap, generatedMainText.mainTextTokens, false)
      }

      let entries =  this._genApparatusEntryFromArray([],groupOmissions, sigla, 'omission')
      entries = this._genApparatusEntryFromArray(entries,groupVariants, sigla, 'variant')
      if (entries.length !== 0) {
        criticalApparatus.push({
          mainText: mainText,
          start: mainTextIndexFrom,
          end: mainTextIndexTo,
          entries: entries
          })
      }
    })
    // Optimize apparatus
    // 1.

    console.log('Apparatus')
    console.log(criticalApparatus)

    profiler.stop()

    return {
      lang: language,
      baseWitnessIndex: baseWitnessIndex,
      mainTextTokens: generatedMainText.mainTextTokens,
      sigla: sigla,
      textDirection: textDirection,
      editionStyle: language,
      apparatusArray: [ criticalApparatus ],
      error: '',
      status: 'OK'
    }
  }

  _findNonEmptyMainTextToken(ctIndex, ctToMainTextMap, mainTextTokens, forward) {
    while (ctIndex >= 0 && ctIndex < ctToMainTextMap.length && (
      ctToMainTextMap[ctIndex] === -1 ||
      isPunctuationToken(mainTextTokens[ctToMainTextMap[ctIndex]]['text'])) ) {
      ctIndex = forward ? ctIndex + 1 : ctIndex -1
    }
    if (ctIndex < 0 || ctIndex >= ctToMainTextMap.length) {
      return -1
    }
    return ctToMainTextMap[ctIndex]
  }

  _getMainTextForGroup(group, mainTextInputTokens) {
    return mainTextInputTokens
      .filter( (t, i) => { return i>=group.from && i<=group.to}) // get group main text columns
      .map( (t) => {   // get text for each column
        if (t.tokenType === TokenType.EMPTY) { return ''}
        if (isPunctuationToken(t.text)) { return  ''}
        return t.text
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  _getGroupsFromCtData(ctData) {
    if (ctData['witnesses'].length === 0) {
      return []
    }
    let groupedColumns = ctData['groupedColumns'] === undefined ? [] : ctData['groupedColumns']
    let seq = new SequenceWithGroups(ctData['collationMatrix'][0].length, groupedColumns)
    return seq.getGroups()
  }

  _addWitnessIndexToArray(theArray, text, witnessIndex) {
    let textIndex = theArray.map( v => v.text ).indexOf(text)
    if (textIndex === -1) {
      theArray.push( { text:text, witnessIndices: [ witnessIndex]})
    } else {
      theArray[textIndex].witnessIndices.push(witnessIndex)
    }
  }

  _genApparatusEntryFromArray (entries, witnessArray, sigla, apparatusType) {

    const symbols = {
      addition: '+',
      omission: '-',
      variant: ''
    }
    witnessArray.forEach( (arrayElement) => {
      let siglaString = ''
      let details = []
      arrayElement.witnessIndices.forEach( (index) => {
        siglaString += sigla[index]
        if (details[index] === undefined) {
          details[index] = []
        }
        // TODO: fill some details
      })
      let apparatusEntrySymbol = symbols[apparatusType]
      let theText = apparatusType ==='omission' ? '' : arrayElement.text

      entries.push({
        type: apparatusType,
        witnesses: arrayElement.witnessIndices,
        details: details,
        text: arrayElement.text,
        markDown: `${apparatusEntrySymbol} ${theText} _${siglaString}_`
      })
    })

    return entries
  }

  getWitnessTokensFromReferenceRow(ctData, witnessIndex) {
    return ctData['collationMatrix'][witnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : TokenType.EMPTY } : ctData['witnesses'][witnessIndex]['tokens'][tokenRef] )
  }

  generateMainText(inputTokens) {
    let mainTextTokens = []
    let firstWordAdded = false
    let inputTokensToMainText = []
    let currentMainTextIndex = -1
    for(let inputIndex = 0; inputIndex < inputTokens.length; inputIndex++) {
      let inputToken = inputTokens[inputIndex]
      let tokenType = inputToken[INPUT_TOKEN_FIELD_TYPE]
      let tokenText = inputToken[INPUT_TOKEN_FIELD_TEXT]
      if (tokenType === TokenType.EMPTY){
        inputTokensToMainText.push(-1)
        continue
      }
      if (tokenType === TokenType.WHITESPACE) {
        inputTokensToMainText.push(-1)
        continue
      }
      let addGlue = true
      if (!firstWordAdded) {
        addGlue = false
      }
      if (tokenType===TokenType.PUNCTUATION && this.isNoGluePunctuation(tokenText)) {
        addGlue = false
      }
      if (addGlue) {
        currentMainTextIndex++
        mainTextTokens.push({
          type: E_TOKEN_TYPE_GLUE,
          space: SPACE_WIDTH_NORMAL,
        })
      }
      currentMainTextIndex++
      mainTextTokens.push({
        type: E_TOKEN_TYPE_TEXT,
        text: this.getTextFromInputToken(inputToken),
        collationTableIndex: inputIndex
      })
      firstWordAdded = true
      inputTokensToMainText.push(currentMainTextIndex)
    }
    return {
      mainTextTokens: mainTextTokens,
      ctToMainTextMap: inputTokensToMainText
    }
  }

  isNoGluePunctuation(char) {
    return noGluePunctuation.includes(char)
  }

  _getRowTextFromGroupMatrix(matrix, rowNumber) {
    let thisObject = this
    return matrix.getColumn(rowNumber)
      .map( (token) => {
        if (token.tokenType === TokenType.EMPTY) {
          return ''
        }
        let theText = thisObject.getTextFromInputToken(token)
        if (isPunctuationToken(theText)) {
          return ''
        }
        return theText
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }

  getTextFromInputToken(token){
    return token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] !== undefined ?
      token[INPUT_TOKEN_FIELD_NORMALIZED_TEXT] :
      token[INPUT_TOKEN_FIELD_TEXT]
  }

  getCollationTableColumn(ctData, col) {
    let column = [];
    ctData['collationMatrix'].forEach( (tokenRefs, row) => {
      let ref = tokenRefs[col]
      if (ref === -1) {
        column[row] = { tokenType: TokenType.EMPTY }
      } else {
        column[row] = ctData['witnesses'][row]['tokens'][ref]
      }
    })
    return column
  }

  isCtTableColumnEmpty(ctColumn) {
    return ctColumn.every( e => e.tokenType === TokenType.EMPTY)
  }
}