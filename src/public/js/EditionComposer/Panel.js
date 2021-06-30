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

export class Panel {

  constructor (options = {}) {
    let optionsSpec = {
      verbose: { type: 'boolean', default: false},
      containerSelector: { type: 'string', required: true}
    }
    let oc= new OptionsChecker(optionsSpec, 'Panel')
    let cleanOptions = oc.getCleanOptions(options)

    this.verbose = cleanOptions.verbose
    this.containerSelector = cleanOptions.containerSelector

  }

  postRender(id, mode, visible) {
    //this.verbose && console.log(`Post render tab ${id}, mode ${mode}, visible = ${visible}`)
  }

  onResize(visible) {
    //this.verbose && console.log(`Resizing '${this.containerSelector}', visible = ${visible}`)
  }

  onShown() {}
  onHidden() {}
  getContentClasses() {
    return []
  }

  generateHtml(tabId, mode, visible) {
    return `Panel id ${tabId}, mode ${mode}, ${visible ? 'visible' : 'hidden'}`
  }

  reDraw(html) {
    this.verbose && console.log(`Redrawing panel`)
    if (this.containerSelector !== undefined) {
      $(this.containerSelector).html(html)
    }
  }


}