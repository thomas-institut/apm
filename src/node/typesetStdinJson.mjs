/*
 *  Copyright (C) 2022 Universität zu Köln
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

import {ObjectFactory} from '../public/js/Typesetter2/ObjectFactory.mjs'
import { PangoMeasurerNodeGTK } from './PangoMeasurerNodeGTK.mjs'
import {SimpleTypesetter} from '../public/js/Typesetter2/SimpleTypesetter.mjs'

if (process.argv.length < 3) {
  console.log(`Usage: node typesetStdinJson.mjs outputFileName`)
  process.exit(0)
}
let outputFileName = process.argv[2]

let inputJson = fs.readFileSync(process.stdin.fd).toString()

let data

try {
  data = JSON.parse(inputJson)
}catch (e) {
  console.log(`Error parsing input JSON, error: '${e.toString()}'`)
  process.exit(0)
}

if (data.options === undefined) {
  console.log(`No options found in input`)
  process.exit(0)
}

// console.log(`Options`)
// console.log(data.options)

if (data.mainTextList === undefined) {
  console.log(`No main text list found in input`)
  process.exit(0)
}

let mainTextList

try {
  mainTextList = ObjectFactory.fromObject(data.mainTextList)
} catch (e) {
  console.log(`Error building typesetter object from input main text list: '${e.toString()}'`)
  process.exit(0)
}

data.options.textBoxMeasurer = new PangoMeasurerNodeGTK()
let typesetterExec = new SimpleTypesetter(data.options)

let start = hrtime.bigint()
typesetterExec.typeset(mainTextList).then( (r) => {
  let end = hrtime.bigint()
  console.log(`Typeset done in ${Number(end-start)/1000000} ms`)
  let exportData = JSON.stringify(r.getExportObject())

  fs.writeFile(outputFileName, exportData, err => {
    if (err) {
      console.log(`Error writing outfile: '${err}'`)
    }
    process.exit(1)
  })
})











