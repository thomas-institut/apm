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


/**
 * Generates a CSV string from the collation table
 * @returns {string}
 */
export function generateCsvStringFromCtData(ctData, showNormalizations) {
  let sep = ','
  let titles = ctData['witnessTitles']
  let numWitnesses = ctData['witnesses'].length
  let collationMatrix = ctData['collationMatrix']
  let order = ctData['witnessOrder']

  let output = ''
  for (let i=0; i < numWitnesses; i++) {
    let witnessIndex = order[i]
    let title = titles[witnessIndex]
    output += title + sep
    let ctRefRow = collationMatrix[witnessIndex]
    for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
      let tokenRef = ctRefRow[tkRefIndex]
      let tokenCsvRep = ''
      if (tokenRef !== -1 ) {
        let token = ctData.witnesses[witnessIndex].tokens[tokenRef]
        tokenCsvRep = getCsvRepresentationForToken(token, showNormalizations)
      }
      output += tokenCsvRep + sep
    }
    output += "\n"
  }
  return output
}

function getCsvRepresentationForToken(tkn, showNormalizations) {
  if (tkn.empty) {
    return ''
  }
  let text = tkn.text
  if (showNormalizations) {
    text = tkn['norm']
  }
  return '"' + text + '"'
}
