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


import { StringCounter } from '../toolbox/StringCounter.mjs'
import * as MainTexTokenType from '../Edition/MainTextTokenType.mjs'
import { pushArray } from '../toolbox/ArrayUtil.mjs'

export function getTypesettingInfo(containerSelector, classPrefix, tokens) {
  let yPositions = []
  let tokensWithInfo = tokens.map( (token, i) => {
    if (token.type === MainTexTokenType.PARAGRAPH_END) {
      return token
    }
    let span = $(`${containerSelector} .${classPrefix}${i}`)
    let position = span.offset()
    let pY = position.top
    yPositions.push(pY)
    token.x = position.left
    token.y = pY
    return token
  })

  let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
  let lineMap = calculateYPositionToLineMap(yPositions)
  let tokensWithLineNumbers = tokensWithInfo.map( (t) => {
    t.lineNumber = getLineNumber(t.y, lineMap)
    return t
  })
  // get the occurrence number in each line
  let currentLine = -1
  let tokensWithOccurrencesInfo = []
  let occurrenceInLineCounter = new StringCounter()
  let currentLineTokens = []
  tokensWithLineNumbers.forEach( (t) => {
    if (t.lineNumber !== currentLine) {
      currentLineTokens = currentLineTokens.map( (t) => {
        if (t.type === MainTexTokenType.TEXT) {
          t.numberOfOccurrencesInLine = occurrenceInLineCounter.getCount(t.getPlainText())
        }
        return t
      })
      pushArray(tokensWithOccurrencesInfo, currentLineTokens)
      occurrenceInLineCounter.reset()
      currentLineTokens = []
      currentLine = t.lineNumber
    }
    if (t.type === MainTexTokenType.TEXT ) {
      let text = t.getPlainText()
      occurrenceInLineCounter.addString(text)
      t.occurrenceInLine = occurrenceInLineCounter.getCount(text)
    }
    currentLineTokens.push(t)
  })
  if (currentLineTokens.length > 0) {
    currentLineTokens = currentLineTokens.map( (t) => {
      if (t.type === MainTexTokenType.TEXT) {
        t.numberOfOccurrencesInLine = occurrenceInLineCounter.getCount(t.getPlainText())
      }
      return t
    })
    pushArray(tokensWithOccurrencesInfo, currentLineTokens)
  }



  return { yPositions: uniqueYPositions, tokens: tokensWithOccurrencesInfo, lineMap: lineMap }

}

function getLineNumber(y, lineMap) {
  for(let i = 0; i < lineMap.length; i++) {
    if (y === lineMap[i].pY) {
      return lineMap[i].line
    }
  }
  return -1
}

function calculateYPositionToLineMap(yPositions, textSizeInPixels = 16) {
  let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
  let halfTextSize = textSizeInPixels / 2
  let currentYPosition = -1000
  let currentLine = 0
  let yPositionToLineMap = []
  for (let i = 0; i < uniqueYPositions.length; i++) {
    if (uniqueYPositions[i] > (currentYPosition + halfTextSize)) {
      currentYPosition = uniqueYPositions[i]
      currentLine++
    }
    yPositionToLineMap.push({ pY: uniqueYPositions[i], line: currentLine})
  }
  return yPositionToLineMap
}
