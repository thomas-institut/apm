import { TextBoxMeasurer } from '../public/js/Typesetter2/TextBoxMeasurer.mjs'
import {resolvedPromise} from '../public/js/toolbox/FunctionUtil.mjs'
import {exec} from 'node:child_process'

const pythonMeasurer =  '../python/text-measurer.py'

export class PangoMeasurer extends TextBoxMeasurer {

  constructor () {
    super()
    this.heightCache = new Map()
    this.widthCache = new Map()
  }

  getBoxHeight (item) {
    if (this.heightCache.has(item)) {
      //console.log(`Getting height from cache`)
      return resolvedPromise(this.heightCache.get(item))
    }
    return new Promise ( (resolve) => {
      this.__getPangoMeasurements(item).then ( (measurements) => {
        this.widthCache.set(item, measurements.width)
        this.heightCache.set(item, measurements.height)
        console.log(measurements)
        resolve(measurements.height)
      })
    })
  }

  getBoxWidth (item) {
    if (this.widthCache.has(item)) {
      //console.log(`Getting width from cache`)
      return resolvedPromise(this.widthCache.get(item))
    }
    return new Promise ( (resolve) => {
      this.__getPangoMeasurements(item).then ( (measurements) => {
        this.widthCache.set(item, measurements.width)
        this.heightCache.set(item, measurements.height)
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