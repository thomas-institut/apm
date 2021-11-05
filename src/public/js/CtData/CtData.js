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

import * as WitnessTokenType from '../Witness/WitnessTokenType'
import { SequenceWithGroups } from '../Edition/SequenceWithGroups'
import { Matrix } from '@thomas-inst/matrix'
import * as CollationTableType from '../constants/CollationTableType'
import { ApparatusSubEntry } from '../Edition/ApparatusSubEntry'
import * as SubEntryType from '../Edition/SubEntryType'
import { FmtTextFactory } from '../FmtText/FmtTextFactory'
import { ApparatusEntry } from '../Edition/ApparatusEntry'
import { FmtText } from '../FmtText/FmtText'
import {FmtTextToken} from '../FmtText/FmtTextToken'
import { deepCopy } from '../toolbox/Util.mjs'
import * as TranscriptionTokenType from '../Witness/WitnessTokenType'
import * as NormalizationSource from '../constants/NormalizationSource'
import * as WitnessType from '../Witness/WitnessTokenClass'



/*
 A collection of static methods to manipulate the CtData (= Collation Table Data)  structure

  CtData := {
    customApparatuses: CustomApparatus[]
  }

 CustomApparatus := {
  type: string
  entries: CustomApparatusEntry
 }

  CustomApparatusEntry = same as ApparatusEntry, but from and to refer to the collation table, not to the main text
     additionally, a custom apparatus entry can be a command to disable an automatically generated entry

      {
      type: 'disableAuto'
      hash: number, an Int32 hash that identifies an automatically generated entry
      }

 */

export class CtData  {

  static copyFromObject(ctDataObject) {
    // console.log(`Copying ctData`)
    let ctData = deepCopy(ctDataObject)
    // console.log(ctData)
    ctData = this.fixFmtText(ctData)
    return ctData
  }

  static fixFmtText(ctData) {
    // fix FmtText
    for (let i = 0; i < ctData['customApparatuses'].length; i++) {
      // console.log(`Custom apparatus ${i}`)
      for (let entryN = 0; entryN < ctData['customApparatuses'][i]['entries'].length; entryN++) {
        // console.log(`Entry ${entryN}`)
        for (let subEntryN = 0; subEntryN < ctData['customApparatuses'][i]['entries'][entryN]['subEntries'].length ; subEntryN++) {
          // console.log(`Sub entry ${subEntryN}`)
          if (ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText !== undefined) {
            // this is a custom entry, other types do not have a fmtText
            ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText =
              FmtTextFactory.fromAnything(ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText)
          }

        }
      }
    }

    return ctData
  }

  static reportCustomEntries(ctData) {
    let noProblems = true
    for (let i = 0; i < ctData['customApparatuses'].length; i++) {
      // console.log(`Custom apparatus ${i}`)
      for (let entryN = 0; entryN < ctData['customApparatuses'][i]['entries'].length; entryN++) {
        // console.log(`Entry ${entryN}`)
        for (let subEntryN = 0; subEntryN < ctData['customApparatuses'][i]['entries'][entryN]['subEntries'].length ; subEntryN++) {
          // console.log(`Sub entry ${subEntryN}`)
          if (ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText !== undefined) {
            // this is a custom entry, other types do not have a fmtText
            if (!Array.isArray(ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText) ) {
              console.log(`Custom apparatus ${i}, entry ${entryN}, sub entry ${subEntryN}: fmtText is not an array `)
              noProblems = false
            } else {
              for (let k = 0; k < ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText.length; k++) {
                if (!ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText[k] instanceof FmtTextToken) {
                  console.log(`Custom apparatus ${i}, entry ${entryN}, sub entry ${subEntryN}, fmtText[${k}] is not a FmtTextToken `)
                  console.log(ctData['customApparatuses'][i]['entries'][entryN]['subEntries'][subEntryN].fmtText[k])
                  noProblems = false
                }
              }
            }
          }
        }
      }
    }
    if (noProblems) {
      console.log(`All custom entries in ctData have proper FmtText type`)
    }
  }

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
    if (numCols <= 0) {
      // nothing to do
      return ctData
    }
    // 1. insert columns in collation table
    let collationMatrix = this.getCollationMatrix(ctData)
    if (collationMatrix.nRows === 0) {
      return ctData
    }
    if (col >= collationMatrix.nCols) {
      return ctData
    }
    let columnSequence = new SequenceWithGroups(collationMatrix.nCols, ctData['groupedColumns'])
    for (let i = 0; i < numCols; i++) {
      collationMatrix.addColumnAfter(col, -1)
      columnSequence.insertNumberAfter(col)
    }
    ctData['collationMatrix'] = _getRawCollationMatrixFromMatrix(collationMatrix)
    ctData['groupedColumns'] = columnSequence.getGroupedNumbers()

    if (ctData['type'] === CollationTableType.EDITION) {
      // 2. insert empty tokens in edition witness
      let editionIndex = ctData['editionWitnessIndex']
      for (let i = 0; i < numCols; i++) {
        ctData['witnesses'][editionIndex].tokens.splice(col + 1, 0,
          { tokenClass: 'edition',  tokenType: WitnessTokenType.EMPTY, text: "" })
      }
      // 3. fix references in collation matrix
      ctData['collationMatrix'][editionIndex] = ctData['collationMatrix'][editionIndex].map( (ref, i) => { return i})

      // 4. fix references in custom apparatuses
      ctData['customApparatuses'] = this.fixReferencesInCustomApparatusesAfterColumnAdd(ctData, col, numCols)
    }

    return ctData
  }

  static fixReferencesInCustomApparatusesAfterColumnAdd(ctData, col, numCols) {
    return ctData['customApparatuses'].map ( (app) => {
      let newApp = deepCopy(app)
      newApp.entries = app.entries.map( (entry) => {
        let newEntry = deepCopy(entry)
        if (entry.from > col) {
          console.log(`Shifting entry from=${entry.from}, new from = ${entry.from + numCols}`)
        }
        newEntry.from = entry.from > col ? entry.from + numCols : entry.from
        newEntry.to = entry.to > col ? entry.to + numCols : entry.to
        return newEntry
      })
      return newApp
    })
  }

  /**
   * Adds a custom text apparatus entry to an apparatus
   * @param {object} ctData
   * @param {string} apparatusType
   * @param {number} ctFrom
   * @param {number} ctTo
   * @param {string} lemma
   * @param newEntryObject
   */
  static addCustomApparatusTextSubEntry(ctData, apparatusType, ctFrom, ctTo, lemma, newEntryObject) {
    let apparatusIndex = this.getCustomApparatusEntryIndexFromType(ctData, apparatusType)
    if (apparatusIndex === -1) {
      console.warn(`Tried to add an apparatus entry to unknown apparatus ${apparatusType}`)
      return ctData
    }
    let currentEntryIndex = this.getCustomApparatusEntryIndexForCtRange(ctData, apparatusType, ctFrom, ctTo)
    let newSubEntry = new ApparatusSubEntry()
    newSubEntry.type = SubEntryType.CUSTOM
    newSubEntry.fmtText = FmtTextFactory.fromAnything(newEntryObject.text)
    newSubEntry.plainText = FmtText.getPlainText(newSubEntry.fmtText)
    if (currentEntryIndex === -1) {
      let newEntry = new ApparatusEntry()
      newEntry.from = ctFrom
      newEntry.to = ctTo
      newEntry.lemma = lemma
      newEntry.preLemma = newEntryObject.preLemma
      newEntry.section = [ 0 ]
      newEntry.subEntries = [ newSubEntry]
      ctData['customApparatuses'][apparatusIndex].entries.push(newEntry)
    } else {
      ctData['customApparatuses'][apparatusIndex].entries[currentEntryIndex].subEntries.push(newSubEntry)
    }
    return ctData
  }

  /**
   * Deletes all custom apparatus text sub entries for the given CT range
   * @param ctData
   * @param apparatusType
   * @param ctFrom
   * @param ctTo
   */
  static deleteCustomApparatusTextSubEntries(ctData, apparatusType, ctFrom, ctTo) {
    let apparatusIndex = this.getCustomApparatusEntryIndexFromType(ctData, apparatusType)
    if (apparatusIndex === -1) {
      console.warn(`Tried to delete custom apparatus entries from unknown apparatus ${apparatusType}`)
      return ctData
    }
    let currentEntryIndex = this.getCustomApparatusEntryIndexForCtRange(ctData, apparatusType, ctFrom, ctTo)
    if (currentEntryIndex === -1) {
      console.log(`No entries to delete`)
      return ctData
    }
    ctData['customApparatuses'][apparatusIndex].entries[currentEntryIndex].subEntries =
      ctData['customApparatuses'][apparatusIndex].entries[currentEntryIndex].subEntries.filter( se => se.type !=='custom')

    if (ctData['customApparatuses'][apparatusIndex].entries[currentEntryIndex].subEntries.length === 0) {
      // the whole entry is not needed
      ctData['customApparatuses'][apparatusIndex].entries.splice(currentEntryIndex, 1)
    }
    return ctData
  }

  /**
   *
   * @param {object} ctData
   * @param {string} apparatusType
   * @param {number} ctFrom
   * @param {number} ctTo
   * @param {string} subEntryHash
   * @param {boolean} enabled
   * @param {string} lemma
   * @return {*}
   */
  static changeEnableStatusForSubEntry(ctData, apparatusType, ctFrom, ctTo, subEntryHash, enabled, lemma) {
    let apparatusIndex = this.getCustomApparatusEntryIndexFromType(ctData, apparatusType)
    if (apparatusIndex === -1) {
      console.warn(`Tried to disable custom apparatus entries from unknown apparatus ${apparatusType}`)
      return ctData
    }
    let entryIndex = this.getCustomApparatusEntryIndexForCtRange(ctData, apparatusType, ctFrom, ctTo)
    if (entryIndex === -1) {
      if (enabled) {
        // nothing to do
        return ctData
      }
      // create a new entry to add the disable sub entry
      let newEntry = new ApparatusEntry()
      newEntry.from = ctFrom
      newEntry.to = ctTo
      newEntry.lemma = lemma
      newEntry.section = [ 0 ]
      ctData['customApparatuses'][apparatusIndex].entries.push(newEntry)
      entryIndex = ctData['customApparatuses'][apparatusIndex].entries.length - 1
    }

    let subEntryIndex = -1
    ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.forEach( (subEntry, i) => {
      if (subEntry.type === SubEntryType.DISABLE && subEntry.hash === subEntryHash) {
        subEntryIndex = i
      }
    })

    if (subEntryIndex === -1) {
      if (!enabled) {
        ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.push( {
          type: SubEntryType.DISABLE,
          hash: subEntryHash,

        })
      }
      // nothing to do if the entry needs to be enabled
    } else {
      if (enabled) {
        // remove the custom disable sub entry
        ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.splice(subEntryIndex, 1)
        if (ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.length === 0) {
          // this entry is not needed any more
          ctData['customApparatuses'][apparatusIndex].entries.splice(entryIndex, 1)
        }
      }
      // there's already a disable entry, so nothing to do if needs to be disabled
    }
    return ctData
  }


  static getCustomApparatusEntryIndexFromType(ctData, apparatusType) {
    return ctData['customApparatuses'].map( (app) => { return app.type}).indexOf(apparatusType)
  }

  static getCustomApparatusEntryIndexForCtRange(ctData, apparatusType, ctFrom, ctTo) {

    let apparatusIndex = this.getCustomApparatusEntryIndexFromType(ctData, apparatusType)
    if (apparatusIndex === -1) {
      return -1
    }

    let index = -1

    ctData['customApparatuses'][apparatusIndex].entries.forEach( (entry, entryIndex) => {
      // ignore 'section'
      if (entry['from'] === ctFrom && entry['to'] === ctTo) {
        index = entryIndex
      }
    })
    return index
  }


  static applyAutomaticNormalizations(ctData, normalizerRegister, normalizationsToApply) {

    ctData['automaticNormalizationsApplied'] = normalizationsToApply

    for (let i = 0; i < ctData['witnesses'].length; i++) {
      ctData['witnesses'][i]['tokens'] = this.applyNormalizationsToWitnessTokens(ctData['witnesses'][i]['tokens'], normalizerRegister, normalizationsToApply)
    }
    return ctData
  }

  static applyNormalizationsToWitnessTokens(tokens, normalizerRegister, normalizationsToApply) {
    let normalizationsSourcesToOverwrite = [
      NormalizationSource.AUTOMATIC_COLLATION,
      NormalizationSource.COLLATION_EDITOR_AUTOMATIC
    ]
    return tokens.map ( (token) => {
      if (token['tokenType'] === TranscriptionTokenType.WORD) {
        if (normalizationsToApply.length !== 0) {
          // overwrite normalizations with newly calculated ones
          if (token['normalizationSource'] === undefined ||  // no normalization in token
            (token['normalizedText'] === '' && token['normalizationSource'] === '') || // no normalization in token, 2nd possibility
            normalizationsSourcesToOverwrite.indexOf(token['normalizationSource']) !== -1) { // normalization in token is in normalizationSourcesToOverwrite
            let normalizedText = normalizerRegister.applyNormalizerList(normalizationsToApply, token['text'])
            if (normalizedText === token['text']) {
              //no changes
              return token
            }
            let newToken = deepCopy(token)
            newToken['normalizedText'] = normalizedText
            newToken['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC
            return newToken
          }
          // normalization in token no in normalizationSourcesToOverwrite: no changes
          return token
        } else {
          // no normalizations to apply
          // => remove automatic normalizations
          let newToken = deepCopy(token)
          if (token['normalizedText'] !== undefined &&
            normalizationsSourcesToOverwrite.indexOf(token['normalizationSource']) !== -1) {
            // => remove automatic normalizations if normalization source in token is in normalizationSourcesToOverwrite
            newToken['normalizedText'] = undefined
            newToken['normalizationSource'] = undefined
          }
          return newToken
        }
      } else {
        // non word token, no changes
        return token
      }
    })
  }

  /**
   * Returns an array with the non-token item indices for each witness in ctData
   * @param ctData
   * @return {*[]}
   */
  static calculateAggregatedNonTokenItemIndexes(ctData) {
    let indexes = []
    for (let witnessIndex = 0; witnessIndex < ctData['witnesses'].length; witnessIndex++) {
      let tokenRefs = ctData['collationMatrix'][witnessIndex]
      let witness = ctData['witnesses'][witnessIndex]
      indexes[witnessIndex] = this.aggregateNonTokenItemIndexes(witness, tokenRefs)
    }
    return indexes
  }

  static aggregateNonTokenItemIndexes(witnessData, tokenRefArray) {
    if (witnessData['witnessType'] !== WitnessType.FULL_TX) {
      return[]
    }
    let rawNonTokenItemIndexes = witnessData['nonTokenItemIndexes']
    let numTokens = witnessData['tokens'].length

    let resultingArray = []

    // aggregate post
    let aggregatedPost = []
    for (let i = numTokens -1; i >= 0; i--) {
      let tokenPost = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['post'] !== undefined) {
        tokenPost = rawNonTokenItemIndexes[i]['post']
      }
      aggregatedPost = aggregatedPost.concat(tokenPost)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i] = { post: aggregatedPost }
        aggregatedPost = []
      }
    }

    // aggregate pre
    let aggregatedPre = []
    for (let i = 0; i < numTokens; i++ ) {
      let tokenPre = []
      if (rawNonTokenItemIndexes[i] !== undefined && rawNonTokenItemIndexes[i]['pre'] !== undefined) {
        tokenPre = rawNonTokenItemIndexes[i]['pre']
      }
      aggregatedPre = aggregatedPre.concat(tokenPre)
      let tokenIndexRef = tokenRefArray.indexOf(i)
      if (tokenIndexRef !== -1) {
        // token i is in the collation table!
        resultingArray[i]['pre'] = aggregatedPre
        aggregatedPre = []
      }
    }
    return resultingArray
  }

  static getCtIndexForWitnessTokenIndex(ctData, witnessIndex, witnessTokenIndex) {
      return ctData['collationMatrix'][witnessIndex].indexOf(witnessTokenIndex)
  }

  static getCtIndexForEditionWitnessTokenIndex(ctData, editionTokenIndex) {
    if (ctData['type'] !== 'edition') {
      return -1
    }
    return this.getCtIndexForWitnessTokenIndex(ctData, ctData['editionWitnessIndex'], editionTokenIndex)
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

