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

import { Panel } from './Panel'
import { doNothingPromise } from '../toolbox/FunctionUtil.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { deepCopy } from '../toolbox/Util.mjs'

/**
 * A panel with tech support tools
 */



export class TechSupportPanel extends Panel {

  constructor (options) {
    super(options)
    let optionsSpec = {
      active: { type: 'boolean', default:false},
      ctData: { type: 'object' },

    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'Admin Panel'})
    this.options = oc.getCleanOptions(options)
    this.active = this.options.active
    this.ctData = deepCopy(this.options.ctData)

  }


  generateHtml(tabId, mode, visible) {
    return `<h3>Tech Support</h3>
       <h4>CT Data</h4>
       <p>Custom Apparatuses</p>
       <p><textarea class="ct-data" rows="30" cols="80">${this.__getCustomApparatusesJson()}</textarea></p>
`
  }

  __getCustomApparatusesJson() {
    return JSON.stringify(this.ctData['customApparatuses'], null, 2)
  }

  setActive(active) {
    this.active = active
  }


  updateData(ctData) {
    if (this.active) {
      this.ctData = deepCopy(ctData)
    }
  }


}