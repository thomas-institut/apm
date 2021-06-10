import * as CollationTableType from '../constants/CollationTableType'
import * as TokenType from '../constants/TokenType'
import { Matrix } from '@thomas-inst/matrix'
import * as TokenClass from '../constants/CollationTableType'
import {OptionsChecker} from '@thomas-inst/optionschecker'



export class CtDataCleaner {

  constructor(options = {}) {
    let optionsSpec = {
      verbose: { type: 'bool', default: false}
    }
    let oc = new OptionsChecker(optionsSpec, 'CtDataCleaner')
    this.options = oc.getCleanOptions(options)
  }


  getCleanCollationData(ctData) {
    this.ctData = ctData
    // use default ordering if ctData does not have one
    if (this.ctData['witnessOrder'] === undefined) {
      this.options.verbose && console.log('Providing default witnessOrder')
      this.ctData['witnessOrder'] = []
      for(let i=0; i < this.ctData['witnesses'].length; i++) {
        this.ctData['witnessOrder'][i] = i
      }
    }
    if (this.ctData['witnessOrder'].length !== this.ctData['witnesses'].length) {
      console.error('Not enough witnesses in witnessOrder')
      console.log(this.ctData['witnessOrder'])
    }
    // default type is collation table
    if (this.ctData['type'] === undefined) {
      this.ctData['type'] = CollationTableType.COLLATION_TABLE
    }
    // default groups (none), if data do not have them
    if (this.ctData['groupedColumns'] === undefined) {
      this.ctData['groupedColumns'] = []
    }


    if (this.ctData['type'] === CollationTableType.EDITION) {
      // add default apparatuses for editions
      if (this.ctData['customApparatuses'] === undefined) {
        this.ctData['customApparatuses'] = [ {
          type: 'fontium',
          entries: []
        }]
      }
      // add empty critical apparatus customizations list
      if (this.ctData['criticalApparatusCustomizations'] === undefined) {
        this.ctData['criticalApparatusCustomizations'] = []
      }
    }


    // check normalization settings
    if (this.ctData['automaticNormalizationsApplied'] === undefined) {
      this.ctData['automaticNormalizationsApplied'] = []
    }

    // by default, the table is not archived
    if (this.ctData['archived']  === undefined) {
      this.ctData['archived'] = false
    }

    // fix -1 references in edition witness
    if (this.ctData['type'] === CollationTableType.EDITION) {
      this.fixEditionWitnessReferences()
    }
    // consistency check
    this.checkAndFixCollationTableConsistency()

    return this.ctData
  }


  fixEditionWitnessReferences() {
    this.options.verbose && console.log(`Checking for -1 references in edition witness`)

    let editionWitnessIndex = this.ctData['editionWitnessIndex']
    if (editionWitnessIndex === undefined) {
      // not an edition, nothing to do
      return
    }
    let editionWitnessTokens = this.ctData.witnesses[editionWitnessIndex]['tokens']
    let ctEditionRow = this.ctData.collationMatrix[editionWitnessIndex]

    let foundNullRef = false
    let newEditionWitnessTokens = ctEditionRow.map ( (ref, i) => {
      if (ref === -1) {
        console.log(`Adding empty token in edition witness at column ${i}`)
        foundNullRef = true
        return { 'tokenClass':  TokenClass.EDITION, 'tokenType': TokenType.EMPTY, 'text': ''}
      }
      return editionWitnessTokens[ref]
    })

    if (foundNullRef) {
      let newCtEditionRow = ctEditionRow.map( (ref, i) => {
        return i
      })
      this.ctData.witnesses[editionWitnessIndex]['tokens'] = newEditionWitnessTokens
      this.ctData.collationMatrix[editionWitnessIndex] = newCtEditionRow

    } else {
      this.options.verbose && console.log('...all good, none found')
    }
  }

  checkAndFixCollationTableConsistency() {
    this.options.verbose && console.log(`Checking collation table consistency`)
    let inconsistenciesFound = false
    for (let wIndex = 0; wIndex < this.ctData['witnesses'].length; wIndex++) {
      let ctRow = this.ctData['witnessOrder'].indexOf(wIndex)
      let title = this.ctData['witnessTitles'][wIndex]
      let errorsFound = false
      if (this.ctData['type'] === CollationTableType.EDITION && wIndex === this.ctData['editionWitnessIndex']) {
        this.options.verbose && console.log(`... edition witness, skipping`)
        continue
      }
      let ctMatrix = new Matrix(0,0,-1)
      ctMatrix.setFromArray(this.ctData['collationMatrix'])
      let row = ctMatrix.getRow(wIndex);
      let lastTokenInCt = -1
      let lastGoodCtCol = -1
      this.ctData['witnesses'][wIndex]['tokens'].forEach( (t, i) => {
        if (t.tokenType === TokenType.WORD) {
          let ctIndex = row.indexOf(i)
          if (ctIndex === -1) {
            errorsFound = true
            inconsistenciesFound = true
            console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
            console.log(`- text token ${i} not in collation table, text = '${t.text}', last token in CT: ${lastTokenInCt} @ col ${lastGoodCtCol+1}`)
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
          console.warn(`Inconsistency in witness ${wIndex} (${title}), ctRow = ${ctRow}`)
          console.log(` - Token at column ${ctIndex+1} is in the wrong order, ref = ${tokenRef}, last ref = ${lastTokenRef} at col ${lastColumn+1}`)
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
        // console.log(`Original row`)
        // console.log(row)
        // console.log(`Fixed row`)
        // console.log(ctMatrix.getRow(wIndex))
      }
      if (errorsFound) {
        // replace fixed collation table
        this.ctData['collationMatrix'] = this.matrixToArray(ctMatrix)
      } else {
        this.options.verbose && console.log(`... no problems found`)
      }
    }
    if (inconsistenciesFound) {
      this.options.verbose && console.log(`... finished, inconsistencies fixed.`)
    } else {
      this.options.verbose &&  console.log(`... all good, no inconsistencies found`)
    }
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