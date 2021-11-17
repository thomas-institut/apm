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

import {CtDataUpdater} from './CtDataUpdater'
import * as CollationTableType from '../../constants/CollationTableType'
import * as ApparatusType from '../../constants/ApparatusType'

const defaultApparatus = [
  ApparatusType.CRITICUS,
  ApparatusType.FONTIUM,
  ApparatusType.COMPARATIVUS
]

export  class UpdaterToOnePointZero extends CtDataUpdater {

  constructor (options = {}) {
    super(options)
  }

  sourceSchemaVersion () {
    return '0'
  }

  targetSchemaVersion () {
    return '1.0'
  }

  update (sourceCtData) {
    let ctData =  super.update(sourceCtData)

    this.verbose && console.log(`Updating ctData from schema ${this.sourceSchemaVersion()} to ${this.targetSchemaVersion()}`)

    // use default ordering if ctData does not have one
    if (ctData['witnessOrder'] === undefined) {
      this.options.verbose && console.log('Providing default witnessOrder')
      ctData['witnessOrder'] = []
      for(let i=0; i < ctData['witnesses'].length; i++) {
        ctData['witnessOrder'][i] = i
      }
    }
    if (ctData['witnessOrder'].length !== ctData['witnesses'].length) {
      console.error('Not enough witnesses in witnessOrder')
      console.log(ctData['witnessOrder'])
    }
    // default type is collation table
    if (ctData['type'] === undefined) {
      ctData['type'] = CollationTableType.COLLATION_TABLE
    }

    // default column groups
    if (ctData['groupedColumns'] === undefined) {
      ctData['groupedColumns'] = []
    }

    // default sigla groups
    if (ctData['siglaGroups'] === undefined) {
      ctData['siglaGroups'] = []
    }

    // check normalization settings
    if (ctData['automaticNormalizationsApplied'] === undefined) {
      ctData['automaticNormalizationsApplied'] = []
    }

    // by default, the table is not archived
    if (ctData['archived']  === undefined) {
      ctData['archived'] = false
    }


    if (ctData['type'] === CollationTableType.EDITION) {
      // add default apparatuses for editions
      if (ctData['customApparatuses'] === undefined) {
        ctData['customApparatuses'] = []
      }
      defaultApparatus.forEach( (appType) => {
        let appIndex = ctData['customApparatuses'].map( (customApp) => { return customApp.type}).indexOf(appType)
        // console.log(`Found apparatus '${appType}' with index ${appIndex}`)
        if (appIndex === -1) {
          ctData['customApparatuses'].push( { type: appType, entries: []})
        }
      })

      // remove unused 'criticalApparatusCustomizations'
      delete ctData['criticalApparatusCustomizations']

      // update custom apparatuses
      // let editionWitness = ctData['witnesses'][ctData['editionWitnessIndex']]['tokens']
      ctData['customApparatuses'] = ctData['customApparatuses'].map( (apparatus) => {
        apparatus.entries = apparatus.entries.map((entry) => {

          // 1. Detect and fix bad lemmata due to a bug in v0.42.0 (31 Aug 2021)
          // NOT NEEDED in schema 1.0
          // let goodLemma = EditionMainTextGenerator.generatePlainText( editionWitness.filter( (token, i) => {
          //   return i>=entry.from && i<=entry.to
          // }))
          // if (entry['lemma'] !== goodLemma) {
          //   console.warn(`Found incorrect lemma '${entry['lemma']}' in custom apparatus for tokens ${entry.from} to ${entry.to}, should be '${goodLemma}'`)
          //   entry['lemma'] = goodLemma
          // }
          //console.log(`Processing entry ${apparatus.type} : ${i}`)
          // Add defaults custom preLemma, lemma, postLemma and separator if not present
          entry['preLemma'] = ''
          entry['lemma'] = ''
          entry['postLemma'] = ''
          entry['separator'] = ''

          // deleted unused section
          delete entry['section']

          return entry
        })
        return apparatus
      })

    }
    // done!
    ctData['schemaVersion'] = '1.0'
    return ctData
  }
}