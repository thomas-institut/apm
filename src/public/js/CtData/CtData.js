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

// cleaners
import { CleanerZero } from './CtDataCleaner/CleanerZero'
import { CleanerOnePointZero } from './CtDataCleaner/CleanerOnePointZero'
import { CleanerOnePointOne } from './CtDataCleaner/CleanerOnePointOne'
// updaters
import { UpdaterToOnePointZero } from './CtDataUpdater/UpdaterToOnePointZero'
import { UpdaterToOnePointOne } from './CtDataUpdater/UpdaterToOnePointOne'
import { pushArray, uniq } from '../toolbox/ArrayUtil'




/*
 A collection of static methods to manipulate the CtData  structure
 */



const schemaVersions = [ '0', '1.0', '1.1']


export class CtData  {

  /**
   * Returns the pageIds used in every witness in ctData
   * @param ctData
   */
  static getPageIds(ctData) {
    return ctData['witnesses'].map( (witness) => {
      if (witness['witnessType'] !== 'fullTx') {
        return []
      }
      return uniq(witness['items'].map ( (item) => { return item.address.pageId}).sort())
    })
  }


  static getCleanAndUpdatedCtData(sourceCtData, verbose = true, debug = false) {

    function getCleanerForSchemaVersion(sourceSchemaVersion, verbose, debug) {
      switch(sourceSchemaVersion) {
        case '0':
          return new CleanerZero({verbose: verbose, debug: debug})
        case '1.0':
           return new CleanerOnePointZero({ verbose: verbose, debug: debug})
        case '1.1':
          return new CleanerOnePointOne({ verbose: verbose, debug: debug})
        default:
          throw new Error(`Invalid source schema ${sourceSchemaVersion} requested`)
      }
    }

    function getUpdaterForTargetSchemaVersion(targetSchemaVersion, verbose, debug) {
      switch(targetSchemaVersion) {
        case '1.0':
          return new UpdaterToOnePointZero({verbose: verbose, debug: debug})

        case '1.1':
          return new UpdaterToOnePointOne({verbose: verbose, debug: debug})

        default:
          throw new Error(`Invalid target schema ${targetSchemaVersion} requested`)
      }
    }

    if (sourceCtData['schemaVersion'] === undefined) {
      sourceCtData['schemaVersion'] = '0'
    }
    if (debug) {
      verbose = true
    }

    let currentSchemaVersionIndex = schemaVersions.indexOf(sourceCtData['schemaVersion'])
    if (currentSchemaVersionIndex === -1) {
      throw new Error(`Invalid CtData schema version found: ${sourceCtData['schemaVersion']}`)
    }
    let ctData = sourceCtData
    while (currentSchemaVersionIndex < schemaVersions.length) {
      // clean the data
      let cleaner = getCleanerForSchemaVersion(ctData['schemaVersion'], verbose, debug)
      ctData = cleaner.getCleanCtData(ctData)
      if (currentSchemaVersionIndex !== schemaVersions.length -1) {
        // not the latest schema version, so update
        let updater = getUpdaterForTargetSchemaVersion(schemaVersions[currentSchemaVersionIndex+1], verbose, debug)
        ctData = updater.update(ctData)
      }
      currentSchemaVersionIndex++
    }

    return ctData

  }

  /**
   * Returns a copy of a CtDataObject
   * @param {object} ctDataObject
   * @return {object}
   */
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

  /**
   * Updates ctData with the given entry, which is normally produced by the apparatus entry editor
   * in EditionComposer's ApparatusPanel
   * @param ctData
   * @param apparatusType
   * @param {object}editedEntry
   */
  static updateCustomApparatuses(ctData, apparatusType, editedEntry) {
    console.log(`Updating customs apparatuses for apparatus '${apparatusType}'`)
    console.log(editedEntry)

    // First, lets get the right apparatus
    let apparatusIndex = ctData['customApparatuses'].map( (app) => {return app.type}).indexOf(apparatusType)

    if (apparatusIndex === -1) {
      throw new Error(`Unknown apparatus type ${apparatusType}`)
    }

    let customApparatus = ctData['customApparatuses'][apparatusIndex]

    let newEntry = {
      from: editedEntry.from,
      to: editedEntry.to,
      preLemma: editedEntry.preLemma,
      lemma: editedEntry.lemma,
      postLemma: editedEntry.postLemma,
      separator: editedEntry.separator
    }
    // new entry, first get the auto subEntries that disable something
    newEntry.subEntries = editedEntry.subEntries.filter( (subEntry) => { return subEntry.type === 'auto' && subEntry.enabled === false})
    // add fullCustom subEntries with some text in it

    pushArray(newEntry.subEntries, editedEntry.subEntries.filter( (subEntry) => {
      return subEntry.type === 'fullCustom' && subEntry.enabled === true && subEntry.fmtText.length !== 0}))

    console.log(`New Entry`)
    console.log(newEntry)

    // Does the entry exist already?
    let entryIndex = customApparatus.entries.map( (entry) => {return `${entry.from}-${entry.to}`}).indexOf(`${editedEntry.from}-${editedEntry.to}`)
    console.log(`Entry Index: ${entryIndex}`)

    // Is this an entry that actually changes anything?
    if (this.isEntryEqualToDefault(newEntry)) {
      console.log(`New entry is equal to default`)
      if (entryIndex !== -1) {
        console.log(`Deleting entry that is now equal to default`)
        ctData['customApparatuses'][apparatusIndex].entries = ctData['customApparatuses'][apparatusIndex].entries.filter( (entry, index) => {
          return index !== entryIndex
        })
      }
    } else {
      if (entryIndex === -1) {
        console.log(`Adding new entry`)
        ctData['customApparatuses'][apparatusIndex].entries.push(newEntry)
      } else {
        console.log(`Replacing existing entry ${entryIndex}`)
        ctData['customApparatuses'][apparatusIndex].entries[entryIndex] = newEntry
      }
    }

    return ctData
  }

  static isEntryEqualToDefault(entry) {
    if (entry.subEntries.length !== 0) {
      return false
    }
    let vars = ['preLemma', 'lemma', 'postLemma', 'separator']
    for (let i=0; i<vars.length; i++) {
      if (entry[vars[i]] !== '') {
        return false
      }
    }
    return true
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
   * Updates the custom apparatus indexes after a shift in the edition witness tokens
   * @param {object}ctData
   * @param {number}fromCol
   * @param {number}toCol
   * @param {number}numCols
   * @param {string}direction
   * @returns {*}
   */
  static fixReferencesInCustomApparatusesAfterEditionWitnessCellShift(ctData, fromCol, toCol, numCols, direction) {

    console.log(`Fixing custom apparatus references after cell shift: ${fromCol}-${toCol}, by ${numCols} cols, ${direction}`)
    return ctData['customApparatuses'].map ( (app) => {
      let newApp = deepCopy(app)
      let shift = numCols
      if (direction === 'left') {
        shift = -shift;
      }
      // make sure fromCol <= toCol
      if (fromCol > toCol) {
        let tmp = fromCol
        fromCol = toCol
        toCol = tmp
      }

      newApp.entries = app.entries.map( (entry, i ) => {
        let newEntry = deepCopy(entry)
        newEntry.from = entry.from
        if (entry.from >= fromCol && entry.from <= toCol) {
          newEntry.from = entry.from + shift
          console.log(`Shifting app. ${app.type} entry ${i} 'from' index: ${entry.from} by ${shift} to ${newEntry.from}`)
        }
        newEntry.to = entry.to
        if (entry.to >= fromCol && entry.to <= toCol) {
          newEntry.to = entry.to + shift
          console.log(`Shifting app. ${app.type} entry ${i} 'to' index: ${entry.to} by ${shift} to ${newEntry.to}`)
        }
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
    newSubEntry.type = SubEntryType.FULL_CUSTOM
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
      ctData['customApparatuses'][apparatusIndex].entries.push(newEntry)
      entryIndex = ctData['customApparatuses'][apparatusIndex].entries.length - 1
    }

    let subEntryIndex = -1
    ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.forEach( (subEntry, i) => {
      if (subEntry.type === SubEntryType.AUTO && subEntry.hash === subEntryHash) {
        subEntryIndex = i
      }
    })

    if (subEntryIndex === -1) {
      if (!enabled) {
        ctData['customApparatuses'][apparatusIndex].entries[entryIndex].subEntries.push( {
          type: SubEntryType.AUTO,
          enabled: false,
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

