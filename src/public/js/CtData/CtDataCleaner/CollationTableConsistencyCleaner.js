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


import { CtDataCleaner } from './CtDataCleaner'
import { deepCopy } from '../../toolbox/Util.mjs'
import * as CollationTableType from '../../constants/CollationTableType'
import { Matrix } from '@thomas-inst/matrix'
import * as TranscriptionTokenType from '../../Witness/WitnessTokenType'

export class CollationTableConsistencyCleaner extends CtDataCleaner {


  constructor (options) {
    super(options)
    this._resetRuntimeInfo()
  }

  _resetRuntimeInfo() {
    this.errors = []
  }
  
  getCleanCtData (sourceCtData) {
    let ctData = deepCopy(sourceCtData)
    return this.checkAndFixCollationTableConsistency(ctData)
  }

  checkAndFixCollationTableConsistency(ctData) {
    this.verbose && console.log(`Checking collation table consistency`)
    this._resetRuntimeInfo()
    let inconsistenciesFound = false
    for (let wIndex = 0; wIndex < ctData['witnesses'].length; wIndex++) {
      let ctRow = ctData['witnessOrder'].indexOf(wIndex)
      let title = ctData['witnessTitles'][wIndex]
      let errorsFound = false
      if (ctData['type'] === CollationTableType.EDITION && wIndex === ctData['editionWitnessIndex']) {
        this.debug && console.log(`... edition witness, skipping`)
        continue
      }
      let ctMatrix = new Matrix(0,0,-1)
      ctMatrix.setFromArray(ctData['collationMatrix'])
      let row = ctMatrix.getRow(wIndex);
      let lastTokenInCt = -1
      let lastGoodCtCol = -1
      ctData['witnesses'][wIndex]['tokens'].forEach( (t, i) => {
        if (t.tokenType === TranscriptionTokenType.WORD) {
          let ctIndex = row.indexOf(i)
          if (ctIndex === -1) {
            errorsFound = true
            inconsistenciesFound = true
            let errorTitle = `Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`
            let errorDescription = `Text token ${i} not in collation table, text = '${t.text}', last token in CT: ${lastTokenInCt} @ col ${lastGoodCtCol+1}`
            this.errors.push(`${errorTitle} : ${errorDescription}`)
            console.warn(errorTitle)
            console.log(` - ${errorDescription}`)
            // fix it!
            let nextNullRefIndex = this.findNextNullRefInArray(row, lastGoodCtCol)
            if (nextNullRefIndex === -1) {
              console.log(`--- No room for token in CT, need to add a new column (not implemented yet)`)
            } else {
              // shift may be needed
              let nColsToShift = nextNullRefIndex - lastGoodCtCol - 1
              for (let c = 0; c < nColsToShift; c++) {
                ctMatrix.setValue(wIndex, nextNullRefIndex-c, ctMatrix.getValue(wIndex, nextNullRefIndex-c-1))
              }
              ctMatrix.setValue(wIndex,lastGoodCtCol+1, i)
              row = ctMatrix.getRow(wIndex)
              lastGoodCtCol = lastGoodCtCol+1
              lastTokenInCt = i
              console.log(`--- Fixed, ${ nColsToShift !== 0 ? 'shifted ' + nColsToShift + ' cols' : ' no shift needed'}, token now in ct col ${lastGoodCtCol+1}`)
            }
          } else {
            lastTokenInCt = i
            lastGoodCtCol = ctIndex
          }
        }
      })
      // check that tokens in CT are in the right order
      let lastTokenRef = -1
      let lastColumn = -1
      let columnsInWrongOrder = false
      row = ctMatrix.getRow(wIndex)
      row.forEach( (tokenRef,ctIndex) => {
        if (tokenRef === -1) {
          return
        }
        if (tokenRef <= lastTokenRef) {
          let errorTitle = `Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`
          let errorDescription = `Token at column ${ctIndex+1} is in the wrong order, ref = ${tokenRef}, last ref = ${lastTokenRef} at col ${lastColumn+1}`
          this.errors.push(`${errorTitle} : ${errorDescription}`)
          console.warn(errorTitle)
          console.log(` - ${errorDescription}`)
          columnsInWrongOrder = true
        }
        lastTokenRef = tokenRef
        lastColumn = ctIndex
      })
      if (columnsInWrongOrder) {
        errorsFound = true
        inconsistenciesFound = true
        // re-order the columns
        let orderedTokenRefs = row.filter( (ref) => {return ref!==-1}).sort( (a,b) => {
          if (a>b) {
            return 1
          }
          if (a < b) {
            return -1
          }
          return  0
        })
        // console.log(`Sorted refs`)
        // console.log(orderedTokenRefs)
        let goodRefIndex = -1
        row.forEach( (ref, i) => {
          if (ref === -1) {
            ctMatrix.setValue(wIndex, i, -1)
          } else {
            goodRefIndex++
            ctMatrix.setValue(wIndex, i, orderedTokenRefs[goodRefIndex])
          }
        })
        console.log(`-- Order problems fixed`)
        this.debug && console.log(`Original row`)
        this.debug && console.log(row)
        this.debug && console.log(`Fixed row`)
        this.debug && console.log(ctMatrix.getRow(wIndex))
      }
      if (errorsFound) {
        // replace fixed collation table
        ctData['collationMatrix'] = this.matrixToArray(ctMatrix)
      } else {
        this.debug && console.log(`... no problems found`)
      }
    }
    if (inconsistenciesFound) {
      this.verbose && console.log(`... finished, inconsistencies fixed.`)
    } else {
      this.verbose &&  console.log(`... all good, no inconsistencies found`)
    }
    return ctData
  }

  getErrors() {
    return this.errors
  }

  matrixToArray(matrix) {
    let theArray = []
    for (let i = 0; i < matrix.nRows; i++) {
      theArray[i] = matrix.getRow(i)
    }
    return theArray
  }

  findNextNullRefInArray(theArray, startingIndex) {
    for (let i = startingIndex; i < theArray.length; i++) {
      if (theArray[i] === -1) {
        return i
      }
    }
    return -1
  }

}