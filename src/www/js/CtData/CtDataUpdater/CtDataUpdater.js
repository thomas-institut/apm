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

import { deepCopy } from '../../toolbox/Util.mjs'

/**
 * Base class for updater process
 */


export class CtDataUpdater {


  constructor (options = {}) {
    this.verbose = options.verbose === undefined ? false : options.verbose
    this.debug =  options.debug === undefined ? false : options.debug

    if (this.debug) {
      this.verbose = true
    }
  }

  /**
   * Returns the CtData schema version this updater can update from
   * @return {string}
   */
  sourceSchemaVersion() {
    return ''
  }

  targetSchemaVersion() {
    return ''
  }


  /**
   *
   * @param {object} sourceCtData
   * @return {*}
   */
  update(sourceCtData) {
    if (sourceCtData['schemaVersion'] === undefined) {
      throw new Error('CtData does not have an schema version defined')
    }

    if (sourceCtData['schemaVersion'] !== this.sourceSchemaVersion()) {
      throw new Error(`Cannot convert from schema version ${sourceCtData['sourceSchemaVersion']}, expected version ${this.sourceSchemaVersion()}`)
    }


    return deepCopy(sourceCtData)
  }

}