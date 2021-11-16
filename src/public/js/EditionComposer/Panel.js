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

import {OptionsChecker} from '@thomas-inst/optionschecker'

/**
 * A panel inside the MultiUI interface
 *
 */
export class Panel {

  constructor (options = {}) {
    let optionsSpec = {
      verbose: { type: 'boolean', default: false},
      containerSelector: { type: 'string', required: true}
    }
    let oc= new OptionsChecker({optionsDefinition: optionsSpec, context:  'Panel'})
    let cleanOptions = oc.getCleanOptions(options)

    this.verbose = cleanOptions.verbose
    this.containerSelector = cleanOptions.containerSelector
    this.visible = false
    this.mode = ''
  }

  postRender(id, mode, visible) {
    this.visible = visible
    this.mode = mode
  }

  onResize(visible) {
    this.visible = visible
  }

  onShown() {
    this.visible = true
  }
  onHidden() {
    this.visible = false
  }
  getContentClasses() {
    return []
  }

  generateHtml(tabId, mode, visible) {
    this.visible = visible
    this.mode = mode
    return `Panel id ${tabId}, mode ${mode}, ${visible ? 'visible' : 'hidden'}`
  }

  getContainerSelector() {
    return this.containerSelector
  }

}