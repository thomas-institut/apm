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


// Browser app to display the APM log


import { JsonDetector } from '../toolbox/JsonDetector'

const webSocketUrl = 'ws://localhost:8080/'

const logClass = 'log-entry'
const errorClass = 'error'

export class ApmLogPage {

  constructor () {
    $('div.content').html(this.__genContentHtml())
    this.connected = false
    this.run()
  }

  run() {
    this.ws = new WebSocket(webSocketUrl);
    this.ws.onmessage = this.genOnMessage()
    this.ws.onopen = this.genOnOpen()
    this.ws.onclose = this.genOnClose()
    this.ws.onerror = this.genOnError()
  }

  __genContentHtml() {
    return `<h1>APM Log</h1>
    <p class="connection-status disconnected">Disconnected</p>
    <p class="tip">Remember to start the websocket application (and the SSH tunnel if working remotely)</p>
    <h5>Live Log</h5>
    <div class="live-log"></div>`
  }

  genOnMessage() {
    return (event) => {
      let dataFields = event.data.split(' ')
      let messageType = dataFields[0]
      switch(messageType) {
        case 'LIVE':
          //this.__log(event.data, [logClass])
          let timeStamp = dataFields[1].replace(/^\[|]$/gm, '')
          let moduleFields = dataFields[2].split('.')
          let module = moduleFields[0]
          let level = moduleFields[1].replace(/:$/,'')
          let logEntry = dataFields.slice(3).join(' ')
          let jsonItems = JsonDetector.getJsonItems(logEntry)
          if (jsonItems.length !== 0) {
            logEntry = logEntry.slice(0, jsonItems[0].startIndex)
          }
          console.groupCollapsed(`LOG entry: ${timeStamp},  ${module},  ${level}`)
          console.log(`TEXT: ${logEntry}`)
          let jsonItemsHtml = jsonItems.map( (item, i) => {
            let data = JSON.parse(item.jsonString)
            console.log(`DATA ${i}`)
            console.log(data)
            return `<p class="log-json-item log-json-item-${i}">${item.jsonString}</p>`
          }).join('')
          console.groupEnd()

          this.__log(`<div class="log-entry-header">
                    <span class="timestamp">${timeStamp}</span>
                    <span class="module">${module}</span>
                    <span class="log-level">${level}</span>
                 </div>
                 <div class="log-content">
                  <p class="log-message">${logEntry}</p>
                  ${jsonItemsHtml}
                 </div>`,
            [ 'log-entry', module.toLowerCase(), level.toLowerCase()])
          break

        case 'SERVER':
          $('p.connection-status').html(`Connected to server <b>${dataFields[1]}</b>`)
          break

        default:
          console.log(`Received unsupported data from server`)
          console.log(event.data)
      }


    }
  }

  genOnOpen() {
    return () => {
      this.connected = true
      $('p.connection-status').html('Connected').addClass('connected').removeClass('disconnected')
      $('p.tip').html('')
      this.ws.send('server')
    }
  }

  genOnClose() {
    return () => {
      this.connected = false
      $('p.connection-status').html('Disconnected').addClass('disconnected').removeClass('connected')
    }
  }

  genOnError() {
    return (event) => {
      this.__log(`ERROR: ${event.data}`, [errorClass])
    }
  }

  /**
   *
   * @param {string}content
   * @param {string[]}contentClasses
   * @private
   */
  __log(content, contentClasses= []) {
    $('div.content div.live-log').prepend(`<div class="${contentClasses.join(' ')}">${content}</div>`)
  }
}


// Load as global variable so that it can be referenced in the Twig template
window.ApmLogPage = ApmLogPage