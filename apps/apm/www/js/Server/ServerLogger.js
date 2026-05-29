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

import { OptionsChecker } from '@thomas-inst/optionschecker'

export const SEVERITY_ERROR = 'error'
export const SEVERITY_INFO = 'info'
export const SEVERITY_DEBUG = 'debug'
export const SEVERITY_WARNING = 'warning'


export class ServerLogger {

  constructor (options) {
    let optionsDefinition = {
      module: { type:'string', required: true},
      apiCallUrl: { type: 'string', required: true},
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "EditionComposer"})
    this.options = oc.getCleanOptions(options)

    this.module = this.options.module
    this.subModule = this.options.subModule
  }

  /**
   *
   * @param {string}subModule
   * @param {string}severity
   * @param {string}description
   * @param {object}data
   */
  log(subModule, severity, description, data = {}) {
    let apiCallData = {
      module: this.module,
      subModule: subModule,
      severity: severity,
      description: description,
      data: data
    }

    $.post(this.options.apiCallUrl, { data: JSON.stringify(apiCallData)}).done( () =>{
      console.log(`All good from server`)
    }).fail( (resp) => {
      console.log(`Failed to log to server`)
      console.log(resp)
    })
  }

  /**
   *
   * @param {string} subModule
   * @param {string}description
   * @param {object}data
   */
  error(subModule, description, data = {}) {
    this.log( subModule, SEVERITY_ERROR, description, data)
  }

  /**
   *
   * @param {string} subModule
   * @param {string}description
   * @param {object}data
   */
  warning(subModule, description, data = {}) {
    this.log( subModule, SEVERITY_WARNING, description, data)
  }

  /**
   *
   * @param {string} subModule
   * @param {string}description
   * @param {object}data
   */
  info(subModule, description, data = {}) {
    this.log(subModule, SEVERITY_INFO, description, data)
  }

  /**
   *
   * @param {string} subModule
   * @param {string}description
   * @param {object}data
   */
  debug(subModule, description, data = {}) {
    this.log(subModule, SEVERITY_DEBUG, description, data)
  }

}