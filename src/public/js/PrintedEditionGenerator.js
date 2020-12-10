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

    // GROUPS APPARATUS
    let columnGroups = this._getGroupsFromCtData(ctData)
    let criticalApparatus = []
    let groupsCriticalApparatus = []
    columnGroups.forEach( (columnGroup, cgNumber) => {

      let ctColumns = []
      let mainTextIndices = []
      for (let c = columnGroup.from; c<= columnGroup.to; c++) {
        ctColumns.push(this.getCollationTableColumn(ctData, c))
        mainTextIndices.push(generatedMainText.ctToMainTextMap[c])
      }
      if (ctColumns.every( col => this.isCtTableColumnEmpty(col))) {
        return
      }


        console.log(`Processing columnGroup ${cgNumber}, from  ${columnGroup.from} to ${columnGroup.to}`)
        console.log(`  ${ctColumns.length} columns in group`)



      let groupMatrix = new Matrix(ctColumns.length, ctColumns[0].length)
      groupMatrix.setFromArray(ctColumns)
      // a row in groupMatrix is one collation table column
      // this means that a groupMatrix column is a row in the CT
      if (mainTextIndices.every( i => i === -1)) {

        //console.log(`Processing columnGroup ${cgNumber}, from  ${columnGroup.from} to ${columnGroup.to}`)
        //console.log(`  ${ctColumns.length} columns in group`)
        //console.log(`  no main text in any of the group's columns, finding additions`)

        // nothing on the main text for this token:
        //      find the previous token index that is in the main text,
        //      this is where the apparatus entry will appear
        let ctIndex = columnGroup.from
        //console.log(`Finding main text index for apparatus entry, starting with ${ctIndex}`)
        while (ctIndex >= 0 && (
          generatedMainText.ctToMainTextMap[ctIndex] === -1 ||
          isPunctuationToken(generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctIndex]]['text'])) ) {
          ctIndex--
        }
        //console.log(`... result: ctIndex = ${ctIndex}`)
        let mainTextIndex = ctIndex < 0 ? -1 : generatedMainText.ctToMainTextMap[ctIndex]
        // collect additions
        let groupAdditions = []
        for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
          if (witnessIndex === baseWitnessIndex) {
            // ignore base witness
            continue
          }
          let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex)
          if (theText === '') {
            // ignore empty text
            continue
          }
          this._addWitnessIndexToArray(groupAdditions, theText, witnessIndex)
        }
        groupsCriticalApparatus = groupsCriticalApparatus.concat(
          this.generateSimpleApparatusEntriesFromArray(groupAdditions, mainTextIndex, mainTextIndex, generatedMainText, sigla, 'addition'))
        return
      }


      let mainText = this._getMainTextForGroup(columnGroup, mainTextInputTokens)
      if (mainText === '') {
        // ignore empty text (normally main text consisting only of punctuation)
        return
      }
      if (ctColumns.length > 1) {
        console.log(`  Finding omissions and variants`)
        console.log(`Group main text: '${mainText}'`)
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
      let mainTextIndexTo = generatedMainText.ctToMainTextMap[columnGroup.to]
      groupsCriticalApparatus = groupsCriticalApparatus.concat(
        this.generateSimpleApparatusEntriesFromArray(groupOmissions, mainTextIndexFrom,mainTextIndexTo, generatedMainText, sigla, 'omission'))
      groupsCriticalApparatus = groupsCriticalApparatus.concat(
        this.generateSimpleApparatusEntriesFromArray(groupVariants, mainTextIndexFrom, mainTextIndexTo, generatedMainText, sigla, 'variant'))
    })

    //
    // NORMAL APPARATUS
    //

    generatedMainText.ctToMainTextMap.forEach( (mainTextIndex, ctColumnNumber) => {
      let ctColumn = this.getCollationTableColumn(ctData, ctColumnNumber)
      if (this.isCtTableColumnEmpty(ctColumn)) {
        // ignore empty columns
        return
      }

      if (mainTextIndex === -1) {
        // nothing on the main text for this token:
        //      find the previous token index that is in the main text,
        //      this is where the apparatus entry will appear
        let ctIndex = ctColumnNumber
        while (ctIndex >= 0 && (
            generatedMainText.ctToMainTextMap[ctIndex] === -1 ||
            isPunctuationToken(generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctIndex]]['text'])) ) {
              ctIndex--
        }
        if (ctIndex < 0) {
          ctIndex = -1
        }
        mainTextIndex = ctIndex < 0 ? -1 : generatedMainText.ctToMainTextMap[ctIndex]

        // collect additions
        let additions = []
        ctColumn.forEach( (ctToken, witnessIndex) => {
          if (witnessIndex === baseWitnessIndex ||ctToken['tokenType'] === TokenType.EMPTY || isPunctuationToken(ctToken['text']) ) {
            // ignore baseWitness, empty tokens and punctuation
            return
          }
          this._addWitnessIndexToArray(additions, ctToken['text'], witnessIndex)
        })

        criticalApparatus = criticalApparatus.concat(
          this.generateSimpleApparatusEntriesFromArray(additions, mainTextIndex, mainTextIndex, generatedMainText, sigla, 'addition'))
        return
      }

      // token in main text
      // collect variants and omissions
      let mainText = generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctColumnNumber]]['text']
      let variants = []
      let omissions = []
      if (!isPunctuationToken(mainText)) {
        ctColumn.forEach( (ctToken, ctWitnessIndex) => {
          if (ctWitnessIndex === baseWitnessIndex) {
            return
          }
          if (ctToken.tokenType === TokenType.EMPTY) {
            // omission
            this._addWitnessIndexToArray(omissions, ctToken['text'], ctWitnessIndex)
            return
          }
          let ctTokenText = this.getTextFromInputToken(ctToken)
          if (!isPunctuationToken(ctTokenText) && ctTokenText !== mainText) {
            // variant
            this._addWitnessIndexToArray(variants, ctTokenText, ctWitnessIndex)
          }
        })
      }

      // generate entries
      criticalApparatus = criticalApparatus.concat(
        this.generateSimpleApparatusEntriesFromArray(omissions, mainTextIndex, mainTextIndex, generatedMainText, sigla, 'omission'),
        this.generateSimpleApparatusEntriesFromArray(variants, mainTextIndex, mainTextIndex, generatedMainText, sigla, 'variant')
      )

      // TODO: optimize apparatus
    })
    console.log('Apparatus (normal)')
    console.log(criticalApparatus)
    console.log('Apparatus (GROUPS)')
    console.log(groupsCriticalApparatus)

    profiler.stop()

    return {
      baseWitnessIndex: baseWitnessIndex,
      mainTextTokens: generatedMainText.mainTextTokens,
      sigla: sigla,
      textDirection: textDirection,
      editionStyle: language,
      apparatusArray: [ groupsCriticalApparatus ],
      error: '',
      status: 'OK'
    }

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

  generateSimpleApparatusEntriesFromArray ( theArray, mainTextIndexFrom, mainTextIndexTo, generatedMainText, sigla, apparatusType) {
    let criticalApparatus = []
    const symbols = {
      addition: '+',
      omission: '-',
      variant: ''
    }
    theArray.forEach( (arrayElement) => {
      let siglaString = ''
      let details = []
      arrayElement.witnessIndices.forEach( (index) => {
        //additionAbbreviations.push(sigla[index])
        siglaString += sigla[index]
        if (details[index] === undefined) {
          details[index] = []
        }
        //details[index].push(... some detail ....) // TODO: fill details!
      })
      let apparatusEntrySymbol = symbols[apparatusType]
      let theText = apparatusType ==='omission' ? '' : arrayElement.text

      criticalApparatus.push({
        start: mainTextIndexFrom,
        end: mainTextIndexTo,
        type: apparatusType,
        sigla: arrayElement.witnessIndices,
        details: details,
        text: arrayElement.text,
        markDown: `${apparatusEntrySymbol} ${theText} _${siglaString}_`
      })
    })
    return criticalApparatus
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