/*
 *  Copyright (C) 2022-23 Universität zu Köln
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
 * Typesets the JSON given in stdin
 */
//
import process from 'node:process'
import fs from 'node:fs'
import { hrtime } from 'node:process'

import {ObjectFactory} from '../www/js/Typesetter2/ObjectFactory.mjs'
import {PangoMeasurerNodeGTK} from './PangoMeasurerNodeGTK.mjs'
import {BasicTypesetter} from '../www/js/Typesetter2/BasicTypesetter.mjs'
import {EditionTypesetting} from '../www/js/Edition/EditionTypesetting.mjs'
import {resolvedPromise} from '../www/js/toolbox/FunctionUtil.mjs'
import { SystemStyleSheet } from '../www/js/Typesetter2/Style/SystemStyleSheet.mjs'

const debug = true

if (process.argv.length < 3) {
  console.log(`Usage: node typesetStdinJson.mjs outputFileName`)
  process.exit(0)
}
let outputFileName = process.argv[2]

let inputJson = fs.readFileSync(process.stdin.fd).toString()

let data

let info = { error: false, errorMsg: ''}

try {
  data = JSON.parse(inputJson)
}catch (e) {
  exitWithError(`Error parsing input JSON, error: '${e.toString()}'`)
}

if (data.options === undefined) {
  exitWithError(`No options found in input`)
}

if (data.mainTextList === undefined) {
  exitWithError(`No main text list found in input`)
}

let mainTextList

try {
  mainTextList = ObjectFactory.fromObject(data.mainTextList)
} catch (e) {
  exitWithError(`Error building typesetter object from input main text list: '${e.toString()}'`)
}


data.options.textBoxMeasurer = new PangoMeasurerNodeGTK()

if (data.helperOptions !== undefined) {
  debug && console.log(`Helper options given, so this is an edition!`)
  // debug && console.log(`Extra data`)
  // debug && console.log(data.extraData)
  data.helperOptions.textBoxMeasurer = data.options.textBoxMeasurer
  // debug && console.log(data.helperOptions, data.helperOptions.styleId)
  debug && console.log(`Edition lang: '${data.helperOptions.edition.lang}', style Id = ${data.helperOptions.styleId}`)
  data.helperOptions.editionStyleSheet = SystemStyleSheet.getStyleSheet(data.helperOptions.edition.lang, data.helperOptions.styleId)
  let editionTypesettingHelper = new EditionTypesetting(data.helperOptions)
  data.options.getApparatusListToTypeset = (mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine) => {
    return editionTypesettingHelper.generateApparatusVerticalListToTypeset(mainTextVerticalList, apparatus, lineFrom, lineTo, resetFirstLine)
  }
    data.options.preTypesetApparatuses = () => {
    editionTypesettingHelper.resetExtractedMetadataInfo()
    return resolvedPromise(true)
  }

  data.options.getMarginaliaForLineRange =  (lineFrom, lineTo) =>{
    return editionTypesettingHelper.getMarginaliaForLineRange(lineFrom, lineTo)
  }
}

let typesetter = new BasicTypesetter(data.options)

let start = hrtime.bigint()
typesetter.typeset(mainTextList, data.extraData).then( (r) => {
  let end = hrtime.bigint()
  info.stats = getStats()
  info.stats.processingTime = Number(end-start)/1000000
  let exportData = JSON.stringify(r.getExportObject())

  fs.writeFile(outputFileName, exportData, err => {
    if (err) {
      console.log(`Error writing outfile: '${err}'`)
    }
    exitNormally()
  })
})

function getStats() {
  return {
    measurer: 'PangoGtk',
    measurerStats: data.options.textBoxMeasurer.getStats()
  }
}


function exitWithError(errorMsg) {
  info.error = true
  info.errorMsg = errorMsg
  console.log(JSON.stringify(info))
  process.exit(0)
}

function exitNormally() {
  console.log(JSON.stringify(info))
  process.exit(1)
}









