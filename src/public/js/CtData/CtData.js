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

import * as WitnessTokenType from '../constants/WitnessTokenType'
import { SequenceWithGroups } from '../SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import * as CollationTableType from '../constants/CollationTableType'


/**
 * A collection of static methods to manipulate the CtData (= Collation Table Data)  structure
 */
export class CtData  {

  /**
   * Returns an array with the given witness tokens as they are laid out
   * in the collation table, replacing empty references with empty tokens
   *
   * @param ctData
   * @param witnessIndex number
   */
  static getCtWitnessTokens(ctData, witnessIndex) {
    return ctData['collationMatrix'][witnessIndex]
      .map( tokenRef => tokenRef === -1 ? { tokenType : WitnessTokenType.EMPTY } : ctData['witnesses'][witnessIndex]['tokens'][tokenRef])
  }

  static getCollationMatrix(ctData) {
    let rawCollationMatrix = ctData['collationMatrix']
    let m = new Matrix(rawCollationMatrix.length, rawCollationMatrix.length === 0 ? 0 : rawCollationMatrix[0].length, -1)
    rawCollationMatrix.forEach( (row, rowIndex) => {
      row.forEach( (ref, colIndex) => {
        m.setValue(rowIndex, colIndex, ref)
      })
    })
    return m
  }

  static insertColumnsAfter(ctData, col, numCols) {
    // 1. insert columns in collation table
    let collationMatrix = this.getCollationMatrix(ctData)
    if (collationMatrix.nRows === 0) {
      return
    }
    if (col >= collationMatrix.nCols) {
      return
    }
    let columnSequence = new SequenceWithGroups(collationMatrix.nCols, ctData['groupedColumns'])
    for (let i = 0; i < numCols; i++) {
      collationMatrix.addColumnAfter(col, -1)
      columnSequence.insertNumberAfter(col)
    }
    ctData['collationMatrix'] = _getRawCollationMatrixFromMatrix(collationMatrix)
    ctData['groupedColumns'] = columnSequence.getGroupedNumbers()


    // 2. insert empty tokens in edition witness
    let editionIndex = ctData['editionWitnessIndex']
    if (ctData['type'] === CollationTableType.EDITION) {

      for (let i = 0; i < numCols; i++) {
        ctData['witnesses'][editionIndex].tokens.splice(col + 1, 0, { tokenType: WitnessTokenType.EMPTY })
      }
    }
    // 3. fix references in collation matrix
    ctData['collationMatrix'][editionIndex] = ctData['collationMatrix'][editionIndex].map( (ref, i) => { return i})
    return ctData
  }

}

/**
 *
 * @param {Matrix} m
 * @private
 */
function _getRawCollationMatrixFromMatrix(m) {
  let rawMatrix = []

  for (let row = 0; row < m.nRows; row++) {
    let theRow = []
    for (let col = 0; col < m.nCols; col++) {
      theRow.push(m.getValue(row, col))
    }
    rawMatrix.push(theRow)
  }

  return rawMatrix
}