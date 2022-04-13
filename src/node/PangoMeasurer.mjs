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


import { TextBoxMeasurer } from '../public/js/Typesetter2/TextBoxMeasurer.mjs'
import {resolvedPromise} from '../public/js/toolbox/FunctionUtil.mjs'
import {exec} from 'node:child_process'

const pythonMeasurer =  '../python/text-measurer.py'

export class PangoMeasurer extends TextBoxMeasurer {

  constructor () {
    super()
    this.heightCache = new Map()
    this.widthCache = new Map()
    this.cacheHits = 0
    this.realMeasurements = 0
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
    return `${textBox.getText()}-${textBox.getFontFamily()}-${textBox.getFontSize()}`
  }

  getBoxHeight (item) {
    let cacheKey = this.__getCacheKeyForTextBox(item)
    if (this.heightCache.has(cacheKey)) {
      //console.log(`Getting height from cache`)
      this.cacheHits++
      return resolvedPromise(this.heightCache.get(cacheKey))
    }
    this.realMeasurements++
    return new Promise ( (resolve) => {
      this.__getPangoMeasurements(item).then ( (measurements) => {
        this.widthCache.set(cacheKey, measurements.width)
        this.heightCache.set(cacheKey, measurements.height)
        console.log(measurements)
        resolve(measurements.height)
      })
    })
  }

  getBoxWidth (item) {
    let cacheKey = this.__getCacheKeyForTextBox(item)
    if (this.widthCache.has(cacheKey)) {
      //console.log(`Getting width from cache`)
      this.cacheHits++
      return resolvedPromise(this.widthCache.get(cacheKey))
    }
    return new Promise ( (resolve) => {
      this.realMeasurements++
      this.__getPangoMeasurements(item).then ( (measurements) => {
        this.widthCache.set(cacheKey, measurements.width)
        this.heightCache.set(cacheKey, measurements.height)
        //console.log(measurements)
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