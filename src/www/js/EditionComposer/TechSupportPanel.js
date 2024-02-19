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

import { Panel } from '../MultiPanelUI/Panel'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { deepCopy } from '../toolbox/Util.mjs'
import { JSONEditor } from 'vanilla-jsoneditor'
import { MultiToggle } from '../widgets/MultiToggle'

/**
 * A panel with tech support tools
 */



export class TechSupportPanel extends Panel {

  constructor (options) {
    super(options)
    let optionsSpec = {
      active: { type: 'boolean', default:false},
      ctData: { type: 'object' },
      edition: { type: 'object'}
    }
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'Admin Panel'})
    this.options = oc.getCleanOptions(options)
    this.active = this.options.active
    this.ctData = deepCopy(this.options.ctData)
    this.edition = deepCopy(this.options.edition)
    this.typesetEdition = null
    this.jsonEditor = null

  }


  async generateHtml(tabId, mode, visible) {
    return `<h3>Tech Support</h3>
       <div class="panel-toolbar"><div class="panel-toolbar-group data-view-toggle"></div></div>
       <div id="json-editor-div"></div>`
  }

  postRender (id, mode, visible) {
    super.postRender(id, mode, visible)
    this.jsonEditor = new JSONEditor({
      target: document.getElementById('json-editor-div'),
      props: {
        content: { text: JSON.stringify(this.ctData)},
        readOnly: true
      }
    })
    this.dataViewToggle = new MultiToggle({
      containerSelector: 'div.data-view-toggle',
      title: '',
      buttonClass: 'dv-button',
      initialOption: 'ctData',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'panel-toolbar-item',
      buttonDef: [
        { label: 'CT Data', name: 'ctData', helpText: 'CT Data' },
        { label: 'Edition', name: 'edition', helpText: 'Generated edition' },
        { label: 'Typeset Edition', name: 'typesetEdition', helpText: 'Typeset edition' }
      ]
    })
    this.dataViewToggle.on('toggle', ()=>{
      this.loadEditor(this.dataViewToggle.getOption())
    })
  }


  setActive(active) {
    this.active = active
  }

  /**
   * Loads standard data into the JSON editor
   * @param {string}dataName
   * @private
   */
  loadEditor(dataName) {
    switch(dataName) {
      case 'ctData':
        this.jsonEditor.set( { text: JSON.stringify(this.ctData)})
        break

      case 'edition':
        this.jsonEditor.set( { text: JSON.stringify(this.edition)})
        break

      case 'typesetEdition':
        this.jsonEditor.set( { text: JSON.stringify(this.typesetEdition)})
        break
    }
  }

  updateTypesetEdition(typesetEdition) {
    this.typesetEdition = deepCopy(typesetEdition)
    if (this.jsonEditor !== null) {
      this.loadEditor(this.dataViewToggle.getOption())
    }
  }


  updateData(ctData, edition) {
    if (this.active) {
      this.ctData = deepCopy(ctData)
      this.edition = deepCopy(edition)
      if (this.jsonEditor !== null) {
        this.loadEditor(this.dataViewToggle.getOption())
      }
    }
  }


}