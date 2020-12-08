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

    let criticalApparatus = []
    generatedMainText.ctToMainTextMap.forEach( (mainTextIndex, ctColumn) => {
      //console.log(`Processing ctToMainTextMap. ctColumm = ${ctColumn}, mainTextIndex = ${mainTextIndex}`)
      let column = this.getCollationTableColumn(ctData, ctColumn)
      if (mainTextIndex === -1) {
        // nothing on the main text for this token:
        //      find the previous token index that is in the main text,
        //      this is where the apparatus entry will appear
        let ctIndex = ctColumn
        while (ctIndex >= 0 &&
            generatedMainText.ctToMainTextMap[ctIndex] === -1 ||
            isPunctuationToken(generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctIndex]]['text']) ) {
              ctIndex--
        }
        if (ctIndex < 0) {
          ctIndex = -1
        }
        mainTextIndex = generatedMainText.ctToMainTextMap[ctIndex]

        // collect variants in the row
        let additions = []
        column.forEach( (ctToken, witnessIndex) => {
          if (witnessIndex === baseWitnessIndex) {
            return
          }
          if (ctToken['tokenType'] === TokenType.EMPTY) {
            return
          }
          let additionIndex = additions.map( (a) => { a.text }).indexOf(ctToken['text'])
          if ( additionIndex === -1){
            additions.push( { text: ctToken['text'], witnessIndices: [ witnessIndex ]})
          } else {
            additions[additionIndex].witnessIndices.push(witnessIndex)
          }
        })
        criticalApparatus = criticalApparatus.concat(
          this.generateSimpleApparatusEntriesFromArray(additions, mainTextIndex, generatedMainText, sigla, 'addition'))
        return
      }
      // token in main text
      // collect variants and omissions

      let mainText = generatedMainText.mainTextTokens[generatedMainText.ctToMainTextMap[ctColumn]]['text']
      let variants = []
      let omissions = []
      if (!isPunctuationToken(mainText)) {
        column.forEach( (ctToken, ctWitnessIndex) => {
          if (ctWitnessIndex === baseWitnessIndex) {
            return
          }
          if (ctToken.tokenType === TokenType.EMPTY) {
            // omission
            let omissionIndex = omissions.map( o => o.text ).indexOf(ctToken['text'])
            if (omissionIndex === -1) {
              omissions.push( { text: ctToken['text'], witnessIndices: [ ctWitnessIndex]})
            } else {
              omissions[omissionIndex].witnessIndices.push(ctWitnessIndex)
            }
            return
          }
          let ctTokenText = this.getTextFromInputToken(ctToken)
          if (ctTokenText !== mainText) {
            // variant
            // console.log(`Found variant '${ctTokenText}', mainTextIndex: ${mainTextIndex}, text='${mainText}', ctColumn = ${ctColumn} `)
            // console.log(ctToken)
            let variantIndex = variants.map( v => v.text ).indexOf(ctToken['text'])
            if (variantIndex === -1) {
              variants.push( { text: ctToken['text'], witnessIndices: [ ctWitnessIndex]})
            } else {
              variants[variantIndex].witnessIndices.push(ctWitnessIndex)
            }
          }
        })
      }

      // generate entries
      criticalApparatus = criticalApparatus.concat(
        this.generateSimpleApparatusEntriesFromArray(omissions, mainTextIndex, generatedMainText, sigla, 'omission'),
        this.generateSimpleApparatusEntriesFromArray(variants, mainTextIndex, generatedMainText, sigla, 'variant')
      )
    })
    profiler.stop()

    return {
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

  generateSimpleApparatusEntriesFromArray ( theArray, mainTextIndex, generatedMainText, sigla, apparatusType) {
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
      //let entryMainTextIndex = mainTextIndex === -1 ? mainTextIndex : generatedMainText.ctToMainTextMap[mainTextIndex]
      let apparatusEntrySymbol = symbols[apparatusType]
      let theText = apparatusType ==='omission' ? '' : arrayElement.text

      criticalApparatus.push({
        start: mainTextIndex,
        end: mainTextIndex,
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
          //otherIndex: -1
        })
      }
      currentMainTextIndex++
      mainTextTokens.push({
        type: E_TOKEN_TYPE_TEXT,
        text: this.getTextFromInputToken(inputToken),
        collationTableIndex: inputIndex,
        //otherIndex: inputIndex
      })
      firstWordAdded = true
      inputTokensToMainText.push(currentMainTextIndex)
    }
    //console.log(`inputTokensToMainText has ${inputTokensToMainText.length} elements`)
    //console.log('Main text tokens')
    //console.log(mainTextTokens)
    return {
      mainTextTokens: mainTextTokens,
      ctToMainTextMap: inputTokensToMainText
    }
  }

  isNoGluePunctuation(char) {
    return noGluePunctuation.includes(char)
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
}