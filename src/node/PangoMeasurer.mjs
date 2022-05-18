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


import { TextBoxMeasurer } from '../www/js/Typesetter2/TextBoxMeasurer.mjs'
import {resolvedPromise} from '../www/js/toolbox/FunctionUtil.mjs'
import {exec} from 'node:child_process'

const pythonMeasurer =  '../python/text-measurer.py'

export class PangoMeasurer extends TextBoxMeasurer {

  constructor () {
    super()
    this.heightCache = new Map()
    this.widthCache = new Map()
    this.cacheHits = 0
    this.realMeasurements = 0
    this.debug = false
  }

  getStats() {
    return { cacheHits: this.cacheHits, realMeasurements: this.realMeasurements}
  }

  /**
   *
   * @param {TextBox}textBox
   * @private
   */
  __getCacheKeyForTextBox(textBox) {
    return `${textBox.getText()}${textBox.getFontFamily()}${textBox.getFontSize()}${textBox.getFontWeight()}${textBox.getFontStyle()}`
  }

  getBoxHeight (textBox) {
    let cacheKey = this.__getCacheKeyForTextBox(textBox)
    if (this.heightCache.has(cacheKey)) {
      this.debug && console.log(`Getting height from cache`)
      this.cacheHits++
      return resolvedPromise(this.heightCache.get(cacheKey))
    }
    this.realMeasurements++
    return new Promise ( (resolve) => {
      this.__getPangoMeasurements(textBox).then ( (measurements) => {
        this.debug && console.log(`Saving w=${measurements.width}, h=${ measurements.baseline} in cache with key '${cacheKey}'`)
        this.debug && console.log(`baseline / fontsize = ${measurements.baseline / textBox.getFontSize()}`)
        this.debug && console.log(`height / fontsize = ${measurements.height / textBox.getFontSize()}`)
        this.widthCache.set(cacheKey, measurements.width)
        this.heightCache.set(cacheKey, measurements.baseline)

        resolve(measurements.baseline)
      })
    })
  }

  getBoxWidth (textBox) {
    let cacheKey = this.__getCacheKeyForTextBox(textBox)
    if (this.widthCache.has(cacheKey)) {
      this.debug && console.log(`Getting width from cache`)
      this.cacheHits++
      return resolvedPromise(this.widthCache.get(cacheKey))
    }
    return new Promise ( (resolve) => {
      this.realMeasurements++
      this.__getPangoMeasurements(textBox).then ( (measurements) => {
        this.widthCache.set(cacheKey, measurements.width)
        this.heightCache.set(cacheKey, measurements.baseline)
        this.debug && console.log(`baseline / fontsize = ${measurements.baseline / textBox.getFontSize()}`)
        this.debug && console.log(`height / fontsize = ${measurements.height / textBox.getFontSize()}`)
        this.debug && console.log(`Saving w=${measurements.width}, h=${ measurements.baseline} in cache with key '${cacheKey}'`)
        resolve(measurements.width)
      })
    })
  }

  __getPangoMeasurements(textBox) {
    let data = {
      text: textBox.getText(),
      fontFamily: textBox.getFontFamily(),
      fontSize: textBox.getFontSize()
    }

    let jsonString = JSON.stringify(data)
    //console.log(`Sending json to python: "${jsonString}"`)
    return new Promise ( (resolve, reject) => {

      let child = exec(pythonMeasurer, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`)
          reject(error)
          return
        }
        if (stderr !== '') {
          console.log(`Got stderr from python measurer: ${stderr}`)
        }

        let pythonData = JSON.parse(stdout)
        //console.log(`Got data from python: ${stdout}`)
        resolve( { width: pythonData['measurements']['width'], height: pythonData['measurements']['baseline']})
      })
      child.stdin.write(jsonString)
      child.stdin.end()
    })
  }
}