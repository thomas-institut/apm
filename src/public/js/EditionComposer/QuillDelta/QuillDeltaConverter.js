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


import { OptionsChecker } from '@thomas-inst/optionschecker'

export class QuillDeltaConverter {

  constructor (options) {
    let optionsSpec = {
      verbose: { type: 'boolean', default: false},
      debug: { type: 'boolean', default: false},
      ignoreParagraphs: { type: 'boolean', default: true}
    }
    let oc= new OptionsChecker({optionsDefinition: optionsSpec, context:  'QuillDeltaConverter'})
    let cleanOptions = oc.getCleanOptions(options)
    this.verbose = cleanOptions.verbose
    this.debug = cleanOptions.debug
    if (this.debug) {
      this.verbose = true
    }
  }

  toFmtText(quillDelta) {
    return []
  }

}