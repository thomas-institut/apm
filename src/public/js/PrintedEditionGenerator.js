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
import { isPunctuationToken } from './toolbox/Util.mjs'
import { SequenceWithGroups } from './SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import * as NormalizationSource from './constants/NormalizationSource'
import { ApparatusCommon } from './EditionComposer/ApparatusCommon'
import text from 'quill/blots/text'

const INPUT_TOKEN_FIELD_TYPE = 'tokenType'
const INPUT_TOKEN_FIELD_TEXT = 'text'


const noGluePunctuation = '.,:;?!'
   + String.fromCodePoint(0x60C) // // Arabic comma
   + String.fromCodePoint(0x61F) // Arabic question mark


// Space widths
const SPACE_WIDTH_NORMAL = 'normal'


// Edition token types
const E_TOKEN_TYPE_GLUE = 'glue'
const E_TOKEN_TYPE_TEXT = 'text'

const ENTRY_TYPE_ADDITION = 'addition'
const ENTRY_TYPE_OMISSION = 'omission'
const ENTRY_TYPE_VARIANT = 'variant'


export class PrintedEditionGenerator {

  generateEdition(ctData, baseWitnessIndex = 0) {

    // let profiler = new SimpleProfiler('generateEdition')
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
        ctColumns.push(ApparatusCommon.getCollationTableColumn(ctData, c))
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
        // 1. Nothing on the main text for this token
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
          let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, false)
          if (theText === '') {
            // ignore empty witness text
            continue
          }
          this._addWitnessIndexToVariantArray(additions, theText, witnessIndex)
        }
        let entries = this._genApparatusEntryFromArray([], additions, sigla, ENTRY_TYPE_ADDITION, language)
        if (entries.length !== 0) {
          criticalApparatus.push({
            start: mainTextIndex,
            end: mainTextIndex,
            entries:entries
          })
        }
        return
      }
      // 2. There's main text, we need to find omissions and variants
      let normalizedMainText = ApparatusCommon.getMainTextForGroup(columnGroup, mainTextInputTokens)
      if (normalizedMainText === '') {
        // ignore empty string (normally main text consisting only of punctuation)
        return
      }
      // console.log(`Processing main text: '${normalizedMainText}'`)
      let groupVariants = []
      let groupOmissions = []

      for (let witnessIndex = 0; witnessIndex < ctColumns[0].length; witnessIndex++) {
        // inspect every witness
        if (witnessIndex === baseWitnessIndex) {
          // ignore base witness
          continue
        }
        let theNormalizedText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, true)
        let theText = this._getRowTextFromGroupMatrix(groupMatrix, witnessIndex, false)
        if (theNormalizedText === '') {
          // omission
          this._addWitnessIndexToVariantArray(groupOmissions, theText, witnessIndex)
          continue
        }
        if (theNormalizedText !== normalizedMainText) {
          // variant
          this._addWitnessIndexToVariantArray(groupVariants, theText, witnessIndex)
        }
      }
      let mainTextIndexFrom = generatedMainText.ctToMainTextMap[columnGroup.from]
      if (mainTextIndexFrom === -1) {
        // need to find first non-empty main text token in
        // console.log('Finding non empty main text token forward')
        mainTextIndexFrom = ApparatusCommon.findNonEmptyMainTextToken(columnGroup.from,
          generatedMainText.ctToMainTextMap, generatedMainText.mainTextTokens, true)
      }
      let mainTextIndexTo = generatedMainText.ctToMainTextMap[columnGroup.to]
      if (mainTextIndexTo === -1) {
        // console.log(`Finding non empty main text token backwards from ${columnGroup.to}, from = ${columnGroup.from}`)
        mainTextIndexTo = ApparatusCommon.findNonEmptyMainTextToken(columnGroup.to,
          generatedMainText.ctToMainTextMap, generatedMainText.mainTextTokens, false)
      }

      let entries =  this._genApparatusEntryFromArray([],groupOmissions, sigla, ENTRY_TYPE_OMISSION, language)
      entries = this._genApparatusEntryFromArray(entries, groupVariants, sigla, ENTRY_TYPE_VARIANT, language)
      if (entries.length !== 0) {
        criticalApparatus.push({
          mainText: normalizedMainText,
          start: mainTextIndexFrom,
          end: mainTextIndexTo,
          entries: entries
          })
      }
    })
    // Optimize apparatus
    // 1.

    // console.log('Apparatus')
    // console.log(criticalApparatus)

    // profiler.stop()

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
   *   {  text: 'someText', witnessIndices: [ i1, i2, ... ]}
   *
   * This method simply places the given witness index in the element with the given
   * text or creates such an element if the text is not in any element of the array
   *
   * @param theArray
   * @param text
   * @param witnessIndex
   * @private
   */
  _addWitnessIndexToVariantArray(theArray, text, witnessIndex) {
    let textIndex = theArray.map( v => v.text ).indexOf(text)
    if (textIndex === -1) {
      // the text is not in the array, create a new element
      theArray.push( { text:text, witnessIndices: [ witnessIndex]})
    } else {
      // add the witness index to the appropriate element
      theArray[textIndex].witnessIndices.push(witnessIndex)
    }
  }

  /**
   * Generates an apparatus entry of the given type with the given variant array and sigla
   *
   * @param entries
   * @param variantArray
   * @param sigla
   * @param apparatusType
   * @param style: controls the look of the generated entries, normally just the language
   * @returns {*}
   * @private
   */
  _genApparatusEntryFromArray (entries, variantArray, sigla, apparatusType, style) {
    const symbols = {
      addition: '+',
      omission: '-',
      variant: ''
    }
    variantArray.forEach( (variant) => {
      let siglaString = ''
      let details = []
      variant.witnessIndices.forEach( (index) => {
        siglaString += sigla[index]
        if (details[index] === undefined) {
          details[index] = []
        }
        // TODO: add hand details
      })
      let apparatusEntrySymbol = symbols[apparatusType]
      let theText = apparatusType ==='omission' ? '' : variant.text

      let typesetterTokens = []

      switch (style) {
        case 'la':
          switch (apparatusType) {
            case ENTRY_TYPE_OMISSION:
              typesetterTokens = ApparatusCommon.genOmissionEntryLatin(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_ADDITION:
              typesetterTokens = ApparatusCommon.genAdditionEntryLatin(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_VARIANT:
              typesetterTokens = ApparatusCommon.genVariantEntryLatin(theText, variant.witnessIndices, sigla)
              break
          }
          break

        case 'he':
          switch(apparatusType) {
            case ENTRY_TYPE_OMISSION:
              typesetterTokens = ApparatusCommon.genOmissionEntryHebrew(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_ADDITION:
              typesetterTokens = ApparatusCommon.genAdditionEntryHebrew(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_VARIANT:
              typesetterTokens = ApparatusCommon.genVariantEntryHebrew(theText, variant.witnessIndices, sigla)
              break
          }
          break

        case 'ar':
          switch(apparatusType) {
            case ENTRY_TYPE_OMISSION:
              typesetterTokens = ApparatusCommon.genOmissionEntryArabic(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_ADDITION:
              typesetterTokens = ApparatusCommon.genAdditionEntryArabic(theText, variant.witnessIndices, sigla)
              break

            case ENTRY_TYPE_VARIANT:
              typesetterTokens = ApparatusCommon.genVariantEntryArabic(theText, variant.witnessIndices, sigla)
              break
          }
          break

      }


      entries.push({
        type: apparatusType,
        witnesses: variant.witnessIndices,
        details: details,
        text: variant.text,
        markDown: `${apparatusEntrySymbol} ${theText} _${siglaString}_`,
        typesetterTokens: typesetterTokens
      })
    })

    return entries
  }


  getWitnessTokensFromReferenceRow(ctData, witnessIndex) {
    return ctData['collationMatrix'][witnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : TokenType.EMPTY } : ctData['witnesses'][witnessIndex]['tokens'][tokenRef] )
  }

  /**
   *
   * @param inputTokens { []}
   * @param normalized {boolean}
   * @returns {{mainTextTokens: [], ctToMainTextMap: []}}
   */
  generateMainText(inputTokens, normalized = true) {
    let mainTextTokens = []
    let firstWordAdded = false
    let inputTokensToMainText = []
    let currentMainTextIndex = -1
    let normalizationsToIgnore = [ NormalizationSource.AUTOMATIC_COLLATION, NormalizationSource.COLLATION_EDITOR_AUTOMATIC]
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
        text: ApparatusCommon.getNormalizedTextFromInputToken(inputToken, normalizationsToIgnore),
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

  _getRowTextFromGroupMatrix(matrix, rowNumber, normalized = true) {
    let thisObject = this
    return matrix.getColumn(rowNumber)
      .map( (token) => {
        if (token.tokenType === TokenType.EMPTY) {
          return ''
        }

        let theText = normalized ? ApparatusCommon.getNormalizedTextFromInputToken(token) : thisObject.getTextFromInputToken(token)
        if (isPunctuationToken(theText)) {
          return ''
        }
        return theText
      })
      .filter( t => t !== '')   // filter out empty text
      .join(' ')
  }


 getTextFromInputToken(token) {
    return token[INPUT_TOKEN_FIELD_TEXT]
 }

  isCtTableColumnEmpty(ctColumn) {
    return ctColumn.every( e => e.tokenType === TokenType.EMPTY)
  }
}