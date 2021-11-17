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

import { CtData } from '../CtData'
import { CtDataCleaner } from './CtDataCleaner'


export class CleanerOnePointOne extends CtDataCleaner{

  constructor(options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '1.1'
  }

  /**
   * Normalizes a ctData object fixing minor inconsistencies and creating empty data for all required
   * object members.
   *
   * This function basically makes any ctData object in the system conform to the latest version.
   *
   *
   * @param ctData
   * @return {*}
   */
  getCleanCtData(ctData) {
    this.ctData = super.getCleanCtData(ctData)

    // // fix -1 references in edition witness
    // if (this.ctData['type'] === CollationTableType.EDITION) {
    //   this.ctData = this.fixEditionWitnessReferences(this.ctData)
    // }
    // // consistency check
    // this.checkAndFixCollationTableConsistency()

    // this may not be necessary
    this.ctData = CtData.fixFmtText(this.ctData)

    return this.ctData
  }

  // fixEditionWitnessReferences(ctData) {
  //   this.verbose && console.log(`Checking for -1 references in edition witness`)
  //
  //   let editionWitnessIndex = ctData['editionWitnessIndex']
  //   if (editionWitnessIndex === undefined) {
  //     // not an edition, nothing to do
  //     return ctData
  //   }
  //   let editionWitnessTokens = ctData.witnesses[editionWitnessIndex]['tokens']
  //   let ctEditionRow = ctData.collationMatrix[editionWitnessIndex]
  //
  //   let foundNullRef = false
  //   let newEditionWitnessTokens = ctEditionRow.map ( (ref, i) => {
  //     if (ref === -1) {
  //       this.debug && console.log(`Adding empty token in edition witness at column ${i}`)
  //       foundNullRef = true
  //       return { 'tokenClass':  TokenClass.EDITION, 'tokenType': TranscriptionTokenType.EMPTY, 'text': ''}
  //     }
  //     return editionWitnessTokens[ref]
  //   })
  //
  //   if (foundNullRef) {
  //     let newCtEditionRow = ctEditionRow.map( (ref, i) => {
  //       return i
  //     })
  //     ctData.witnesses[editionWitnessIndex]['tokens'] = newEditionWitnessTokens
  //     ctData.collationMatrix[editionWitnessIndex] = newCtEditionRow
  //
  //   } else {
  //     this.verbose && console.log('...all good, none found')
  //   }
  //   return ctData
  // }
  //
  // checkAndFixCollationTableConsistency() {
  //   this.verbose && console.log(`Checking collation table consistency`)
  //   let inconsistenciesFound = false
  //   for (let wIndex = 0; wIndex < this.ctData['witnesses'].length; wIndex++) {
  //     let ctRow = this.ctData['witnessOrder'].indexOf(wIndex)
  //     let title = this.ctData['witnessTitles'][wIndex]
  //     let errorsFound = false
  //     if (this.ctData['type'] === CollationTableType.EDITION && wIndex === this.ctData['editionWitnessIndex']) {
  //       this.debug && console.log(`... edition witness, skipping`)
  //       continue
  //     }
  //     let ctMatrix = new Matrix(0,0,-1)
  //     ctMatrix.setFromArray(this.ctData['collationMatrix'])
  //     let row = ctMatrix.getRow(wIndex);
  //     let lastTokenInCt = -1
  //     let lastGoodCtCol = -1
  //     this.ctData['witnesses'][wIndex]['tokens'].forEach( (t, i) => {
  //       if (t.tokenType === TranscriptionTokenType.WORD) {
  //         let ctIndex = row.indexOf(i)
  //         if (ctIndex === -1) {
  //           errorsFound = true
  //           inconsistenciesFound = true
  //           console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
  //           console.log(`- text token ${i} not in collation table, text = '${t.text}', last token in CT: ${lastTokenInCt} @ col ${lastGoodCtCol+1}`)
  //           // fix it!
  //           let nextNullRefIndex = this.findNextNullRefInArray(row, lastGoodCtCol)
  //           if (nextNullRefIndex === -1) {
  //             console.log(`--- No room for token in CT, need to add a new column (not implemented yet)`)
  //           } else {
  //             // shift may be needed
  //             let nColsToShift = nextNullRefIndex - lastGoodCtCol - 1
  //             for (let c = 0; c < nColsToShift; c++) {
  //               ctMatrix.setValue(wIndex, nextNullRefIndex-c, ctMatrix.getValue(wIndex, nextNullRefIndex-c-1))
  //             }
  //             ctMatrix.setValue(wIndex,lastGoodCtCol+1, i)
  //             row = ctMatrix.getRow(wIndex)
  //             lastGoodCtCol = lastGoodCtCol+1
  //             lastTokenInCt = i
  //             console.log(`--- Fixed, ${ nColsToShift !== 0 ? 'shifted ' + nColsToShift + ' cols' : ' no shift needed'}, token now in ct col ${lastGoodCtCol+1}`)
  //           }
  //         } else {
  //           lastTokenInCt = i
  //           lastGoodCtCol = ctIndex
  //         }
  //       }
  //     })
  //     // check that tokens in CT are in the right order
  //     let lastTokenRef = -1
  //     let lastColumn = -1
  //     let columnsInWrongOrder = false
  //     row = ctMatrix.getRow(wIndex)
  //     row.forEach( (tokenRef,ctIndex) => {
  //       if (tokenRef === -1) {
  //         return
  //       }
  //       if (tokenRef <= lastTokenRef) {
  //         console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
  //         console.log(` - Token at column ${ctIndex+1} is in the wrong order, ref = ${tokenRef}, last ref = ${lastTokenRef} at col ${lastColumn+1}`)
  //         columnsInWrongOrder = true
  //       }
  //       lastTokenRef = tokenRef
  //       lastColumn = ctIndex
  //     })
  //     if (columnsInWrongOrder) {
  //       errorsFound = true
  //       inconsistenciesFound = true
  //       // re-order the columns
  //       let orderedTokenRefs = row.filter( (ref) => {return ref!==-1}).sort( (a,b) => {
  //         if (a>b) {
  //           return 1
  //         }
  //         if (a < b) {
  //           return -1
  //         }
  //         return  0
  //       })
  //       // console.log(`Sorted refs`)
  //       // console.log(orderedTokenRefs)
  //       let goodRefIndex = -1
  //       row.forEach( (ref, i) => {
  //         if (ref === -1) {
  //           ctMatrix.setValue(wIndex, i, -1)
  //         } else {
  //           goodRefIndex++
  //           ctMatrix.setValue(wIndex, i, orderedTokenRefs[goodRefIndex])
  //         }
  //       })
  //       console.log(`-- Order problems fixed`)
  //       // console.log(`Original row`)
  //       // console.log(row)
  //       // console.log(`Fixed row`)
  //       // console.log(ctMatrix.getRow(wIndex))
  //     }
  //     if (errorsFound) {
  //       // replace fixed collation table
  //       this.ctData['collationMatrix'] = this.matrixToArray(ctMatrix)
  //     } else {
  //       this.debug && console.log(`... no problems found`)
  //     }
  //   }
  //   if (inconsistenciesFound) {
  //     this.verbose && console.log(`... finished, inconsistencies fixed.`)
  //   } else {
  //     this.verbose &&  console.log(`... all good, no inconsistencies found`)
  //   }
  // }

  // matrixToArray(matrix) {
  //   let theArray = []
  //   for (let i = 0; i < matrix.nRows; i++) {
  //     theArray[i] = matrix.getRow(i)
  //   }
  //   return theArray
  // }
  //
  // findNextNullRefInArray(theArray, startingIndex) {
  //   for (let i = startingIndex; i < theArray.length; i++) {
  //     if (theArray[i] === -1) {
  //       return i
  //     }
  //   }
  //   return -1
  // }


}