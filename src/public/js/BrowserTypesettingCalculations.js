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


export function getTypesettingInfo(containerSelector, classPrefix, tokens) {
  let yPositions = []
  let tokensWithInfo = tokens.map( (t, i) => {
    let span = $(`${containerSelector} .${classPrefix}${i}`)
    let position = span.offset()
    let pY = position.top
    yPositions.push(pY)
    t.x = position.left
    t.y = pY
    return t
  })

  let uniqueYPositions = yPositions.filter((v, i, a) => a.indexOf(v) === i).sort( (a,b) => { return a > b ? 1 : 0})
  let lineMap = calculateYPositionToLineMap(yPositions)
  let tokensWithFullInfo = tokensWithInfo.map( (t, i) => {
    t.lineNumber = getLineNumber(t.y, lineMap)
    return t
  })
  return { yPositions: uniqueYPositions, tokens: tokensWithFullInfo, lineMap: lineMap }

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
