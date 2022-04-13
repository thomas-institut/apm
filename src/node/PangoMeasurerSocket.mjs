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

import { PangoMeasurer } from './PangoMeasurer.mjs'
import * as net from 'node:net'
import { hrtime } from 'node:process'

const host = '127.0.0.1'
const port = 12345

export class PangoMeasurerSocket extends PangoMeasurer {

  constructor () {
    super()
    this.socket = null
    this.receivedData = []
    this.debug = false
    this.readStartTime = -1
  }

  setDebug(debug) {
    this.debug = debug
  }


  destroy() {
    let commandObject = {
      command: 'end',
      data: {}
    }
    let jsonStr = JSON.stringify(commandObject)
    this.socket.write(jsonStr, () => {
      this.socket.destroy()
      this.socket = null
    })
  }

  init(timeOutInMs = 1000) {
    this.socket = new net.Socket()
    this.debug && console.log(`Socket created, status: ${this.socket.readyState} `)
    this.socket.on('connect', () => {
      this.debug &&  console.log(`Socket is connected`)
      this.receivedData = []
    })
    this.socket.on('data', (data) => {
      this.debug && console.log(`Got data from socket`)
      this.debug && console.log(data.toString())
      // if (this.readStartTime !== -1) {
      //   let end = hrtime.bigint()
      //   console.log(`Data received in  ${Number(end-this.readStartTime)/1000}µs`)
      // }
      this.receivedData.push(data.toString())
    })
    this.debug && console.log(`Connecting to ${host}:${port}`)
    this.socket.connect({ port: port,host: host })
    return new Promise( (resolve, reject) => {
      let ticks = 0
      let intervalTimer = setInterval( () => {
        if (this.socket.readyState === 'open') {
          resolve('')
          clearTimeout(intervalTimer)
          return
        }
        ticks++
        if (ticks > (timeOutInMs / 10)) {
          clearTimeout(intervalTimer)
          reject('Time out initialing Pango socket measurer')
        }
      }, 10)
    })
  }

  __readData(timeOutInMs = 1000) {
      return new Promise( (resolve, reject) => {

        if (this.socket.readyState !== 'open') {
          this.debug && console.log(`Socket not ready`)
          reject('Socket not ready')
          return
        }
        if (this.receivedData.length > 1) {
          console.log(`Data is already there, no waiting`)
          resolve(this.receivedData.shift())
          return
        }
        let timedOut = false
        let timer = setTimeout( () => {
          timedOut = true
        }, timeOutInMs)

        let poll =  () => {
          if (this.receivedData.length > 0) {
            clearTimeout(timer)
            resolve(this.receivedData.shift())
            return
          }
          if (timedOut) {
            reject('Timed out')
            return
          }
          setImmediate( poll)
        }
        poll()
      })
  }

  __getPangoMeasurements(textBox) {
    let data = {
      text: textBox.getText(),
      fontFamily: textBox.getFontFamily(),
      fontSize: textBox.getFontSize()
    }
    let commandObject = {
      command: 'measure',
      data: data
    }
    let jsonStr = JSON.stringify(commandObject)
    return new Promise( (resolve, reject) => {
      if (this.socket.readyState !== 'open') {
        this.debug &&  console.log(`Socket not ready`)
        reject('Socket not ready')
        return
      }
      this.debug && console.log(`Writing data to socket`)
      this.socket.write(jsonStr, () => {
        // data is out, wait for response
        this.debug && console.log(`Finished writing data, waiting for answer`)
        this.readStartTime = hrtime.bigint()
        this.__readData().then( (data) => {
          let responseObject = JSON.parse(data.toString())
          if (responseObject.status !== 'OK') {
            this.debug && console.log(responseObject)
            reject(`Python server error: ${responseObject.status}`)
            return
          }
          this.debug && console.log(`Response from server`)
          this.debug && console.log(responseObject['result'])
          resolve( { width: responseObject['result']['width'], height: responseObject['result']['baseline']})
        })
      })
    })
  }
}