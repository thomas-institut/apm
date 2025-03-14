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


import * as TranscriptionTokenType from '../Witness/WitnessTokenType.mjs'
import * as MyersDiff from '../toolbox/MyersDiff.mjs'
import {OptionsChecker} from '@thomas-inst/optionschecker'

export class WitnessDiffCalculator {

  constructor ( userOptions = {}) {
    let optionsDefinition = {
      verbose: {type: 'boolean', default: false},
      debug: {type: 'boolean', default: false}
      }
    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'WitnessDiffCalculator'})
    this.options = oc.getCleanOptions(userOptions)

    this.verbose = this.options.verbose
    this.debug = this.options.debug
    if (this.debug) {
      this.verbose = true
    }
  }

  getChangesBetweenWitnesses(ctRowIndex, ctRow, oldWitness, newWitness) {
    let changes = {}

    if (this.verbose) {
      console.groupCollapsed(`WitnessDiffCalculator : getChangesBetweenWitnesses (ctRowIndex = ${ctRowIndex})`)
      console.log('CtRow')
      console.log(ctRow)
      console.log('Old Witness')
      console.log(oldWitness)
      console.log('new Witness')
      console.log(newWitness)
    }

    // 1. Find changes in the tokens
    if (this.debug) {
      MyersDiff.setDebugMode()
    }
    let editScript = MyersDiff.calculate(oldWitness['tokens'], newWitness['tokens'], function(a,b) {
      if (a['tokenType'] === b['tokenType']) {
        switch(a['tokenType']) {
          case TranscriptionTokenType.WHITESPACE:
          case TranscriptionTokenType.EMPTY:
            // all whitespace and all empty tokens are equal
            return true

          case TranscriptionTokenType.PUNCTUATION:
            return a['text'] === b['text']

          case TranscriptionTokenType.WORD:
            if (a['text'] !== b['text']) {
              return false
            }
            return a['normalizedText'] === b['normalizedText'];

        }
      }
      return false
    })

    if (this.debug) {
      console.log('Edit Script')
      console.log(editScript)
    }
    changes.tokenConversionArray = []
    changes.nonCtChanges = []
    changes.ctChanges = []

    let lastCtColumn = -1
    let lastCtColumnTokenIndex = -1
    let lastDel = {}
    let state = 0

    for(let i=0; i < editScript.length; i++) {
      let scriptItem = editScript[i]
      // determine the FSM event
      let ctColIndex = ctRow.indexOf(scriptItem.index)
      let event = getFsmEvent(scriptItem, ctColIndex, newWitness['tokens'])
      if (this.debug) {
        console.log(`Event ${i}: ${event}, state ${state}, index ${scriptItem.index}, ctIndex ${ctColIndex}, seq ${scriptItem.seq}, lastCtColumn ${lastCtColumn}`)
      }


      // State Machine
      if (state === 0) {
        switch(event) {
          case 'KEEP-CT':
            changes.tokenConversionArray[scriptItem.index] = scriptItem.seq
            lastCtColumn = ctColIndex
            lastCtColumnTokenIndex = scriptItem.index
            break

          case 'KEEP':
            // TODO: is this necessary?
            changes.tokenConversionArray[scriptItem.index] = scriptItem.seq
            break

          case 'INS-CT':
            let change = {
              type: 'insertColAfter',
              row: ctRowIndex,
              afterCol: lastCtColumn,
              tokenIndexInNewWitness: scriptItem.seq,
              newToken: newWitness['tokens'][ scriptItem.seq],
              currentToken: oldWitness['tokens'][lastCtColumnTokenIndex]
            }
            if (lastCtColumn === -1) {
              change.afterCol = ctColIndex-1
              change.isStartOfWitness = true
              this.debug && console.log(`Inserting at the beginning of the witness, after CT column index ${change.afterCol}`)
            }

            if (this.debug) {
              console.log(`Pushing insertColAfter change`)
              console.log(change)
            }
            changes.ctChanges.push(change)
            break

          case 'INS':
            changes.nonCtChanges.push({
              type: 'insert',
              index: scriptItem.seq
            })
            break

          case 'DEL-CT':
            lastDel = scriptItem
            lastCtColumn = ctColIndex
            lastCtColumnTokenIndex = scriptItem.index
            if (this.debug) {
              console.log('-- lastDel')
              console.log(lastDel)
              console.log(`-- lastCtColumn: ${lastCtColumn}, lastCtColumnTokenIndex: ${lastCtColumnTokenIndex}`)
            }
            state = 1
            break

          case 'DEL':
            changes.tokenConversionArray[scriptItem.index] = -1
            changes.nonCtChanges.push({
              type: 'delete',
              index: scriptItem.index
            })
            break
        }
      } else if (state === 1) {
        switch(event) {
          case 'KEEP-CT':
            changes.tokenConversionArray[scriptItem.index] = scriptItem.seq
            let emptyCellChange = {
              type: 'emptyCell',
              row: ctRowIndex,
              col: lastCtColumn,
              currentToken: oldWitness['tokens'][lastCtColumnTokenIndex]
            }
            if (this.debug) {
              console.log(`Pushing change`)
              console.log(emptyCellChange)
            }
            changes.ctChanges.push(emptyCellChange)
            lastCtColumn = ctColIndex
            lastCtColumnTokenIndex = scriptItem.index
            state = 0
            break

          case 'KEEP':
            changes.tokenConversionArray[scriptItem.index] = scriptItem.seq
            break

          case 'INS-CT':
            changes.tokenConversionArray[lastDel.index] = scriptItem.seq
            let replaceChange ={
              type: 'replace',
              row: ctRowIndex,
              col: lastCtColumn,
              oldIndex: lastDel.index,
              newIndex: scriptItem.seq,
              currentToken: oldWitness['tokens'][lastDel.index],
              newToken: newWitness['tokens'][scriptItem.seq]
            }
            if (this.debug) {
              console.log(`Pushing replace change`)
              console.log(replaceChange)
            }
            changes.ctChanges.push(replaceChange)
            if (ctColIndex !== -1) {
              lastCtColumn = ctColIndex
            }

            lastCtColumnTokenIndex = scriptItem.index
            state = 0
            break

          case 'INS':
            changes.nonCtChanges.push({
              type: 'insert',
              index: scriptItem.seq
            })
            break

          case 'DEL-CT':
            changes.tokenConversionArray[lastDel.index] = -1
            let change = {
              type: 'emptyCell',
              row: ctRowIndex,
              col: lastCtColumn,
              currentToken: oldWitness['tokens'][lastDel.index]
            }
            if (this.debug) {
              console.log(`Pushing emptyCell change`)
              console.log(change)
            }
            changes.ctChanges.push(change)
            lastCtColumn = ctColIndex
            lastCtColumnTokenIndex = scriptItem.index
            lastDel = scriptItem
            break

          case 'DEL':
            changes.tokenConversionArray[lastDel.index] = -1
            changes.nonCtChanges.push({
              type: 'delete',
              index: scriptItem.index
            })
        }
      }
    }
    // no more scriptItem ===> 'END' event
    if (state === 1) {
      this.debug && console.log(`End of edit script, state = 1`)
      changes.tokenConversionArray[lastDel.index] = -1
      changes.ctChanges.push({
        type: 'emptyCell',
        row: ctRowIndex,
        col: lastCtColumn,
        currentToken: oldWitness['tokens'][lastDel.index]
      })
    }

    if (this.verbose) {
      console.groupEnd()
    }
    return changes
  }
}




function getFsmEvent(editScript, ctIndex, newTokens) {
  switch(editScript.command) {
    case 0:
      if (ctIndex === -1) {
        return 'KEEP'
      } else {
        return 'KEEP-CT'
      }

    case -1:
      if (ctIndex === -1) {
        return 'DEL'
      } else {
        return 'DEL-CT'
      }

    case 1:
      // only insert words into the collation table
      let newToken = newTokens[editScript.seq]
      if (newToken['tokenType'] === TranscriptionTokenType.WORD) {
        return 'INS-CT'
      } else {
        return 'INS'
      }
  }
}