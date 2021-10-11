/*
 *  Copyright (C) 2019 Universität zu Köln
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

import { Matrix } from '@thomas-inst/matrix'
import * as ArrayUtil from '../../toolbox/ArrayUtil.js'

/**
 * Generates a matrix with all the textual variants in all columns ranked
 * @param refMatrix matrix of references (i.e., from a collation table)
 * @param witnesses array of witnesses
 * @param witnessOrder  array that maps the row indexes in refMatrix to the indexes in the witnesses array;  order[refMatrixRow] = witnessIndex
 * @param refWitness if other than -1, the variant for this witness will have the highest rank
 * @returns {Matrix}
 */
export function genVariantsMatrix(refMatrix, witnesses, witnessOrder, refWitness = -1) {
  let variantMatrix = new Matrix(refMatrix.nRows, refMatrix.nCols)

  for (let col=0; col < refMatrix.nCols; col++) {
    let refCol = refMatrix.getColumn(col)
    let textCol = []
    let referenceString = ''
    for(let row=0; row < refMatrix.nRows; row++) {
      let ref = refCol[row]
      if (ref === undefined) {
        console.error(`Found undefined reference in collation table, row ${row}, col ${col}, ref ${ref}`)
      }
      //console.log('row ' + row + ' col ' + col + ' ref ' +  ref)
      if (ref=== -1) {
        textCol.push('')
        continue
      }
      let witnessIndex = witnessOrder[row]
      let witness = witnesses[witnessIndex]
      if (witness.tokens[ref] === undefined) {
        console.error(`Found undefined token for reference, witness ${witnessIndex}, row ${row}, col ${col}, ref ${ref}`)
      }
      let rowText = witness.tokens[ref].text
      if (witness.tokens[ref]['normalizedText'] !== undefined) {
        rowText = witness.tokens[ref]['normalizedText']
      }
      if (witnessIndex === refWitness) {
        referenceString = rowText
      }

      textCol.push(rowText)

    }

    let debug = false
    // if (col === 792 || col === 793) {
    //   console.log(`Col ${col} `)
    //   debug = true
    // }

    let ranks = rankVariants(textCol, referenceString, debug)
    for(let row=0; row < refMatrix.nRows; row++) {
      variantMatrix.setValue(row, col, ranks[row])
    }

  }
  return variantMatrix
}


/**
 * compares two arrays of arrays to see if they're equal
 * @param matrix1
 * @param matrix2
 */
export function collationMatricesAreEqual(matrix1, matrix2) {
  return ArrayUtil.arraysAreEqual(matrix1, matrix2, function(a,b){return a===b}, 2)
}

/**
 *
 * @param stringArray
 * @param referenceString
 * @param debug
 * @return {*[]}
 */
function rankVariants(stringArray, referenceString, debug = false) {

  debug && console.log(`Ranking Variants `)
  debug && console.log(stringArray)
  debug && console.log(`Reference string: '${referenceString}'`)
  const someVeryLargeNumber = 999888777
  let countsByString = []
  for(const text of stringArray) {
    if (text === '') {
      continue
    }
    if (countsByString[text] === undefined) {
      countsByString[text] = text === referenceString ? someVeryLargeNumber : 1
    } else {
      countsByString[text]++
    }
  }

  let countArray = []

  for(const aKey of Object.keys(countsByString)) {
    countArray.push({ text: aKey, count: countsByString[aKey]})
  }
  countArray.sort((a,b) => { return b['count'] - a['count']})
  debug && console.log(`Count array:`)
  debug && console.log(countArray)

  let rankObject = {}
  countArray.forEach( (countObject, i) => { rankObject[countObject.text] = i })

  let ranks = []
  for(const text of stringArray) {
    if (text === '') {
      ranks.push(someVeryLargeNumber)
      continue
    }
    ranks.push(rankObject[text])
  }
  return ranks
}