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
import { doNothing } from '../toolbox/FunctionUtil'

/**
 * A one-line editor for free text
 */
export class EntryFreeTextEditor {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EntryFreeTextEditor',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        lang: { type: 'string', required: true},
        verbose: { type: 'boolean', default: false},
        debug: { type: 'boolean', default: false},
        initialText: { type: 'string', default: ''},
        onChange: { type: 'function', default: doNothing}
      }
    })

    let cleanOptions = oc.getCleanOptions(options)

    this.lang = cleanOptions.lang
    this.verbose =  cleanOptions.verbose
    this.debug = cleanOptions.debug
    if (this.debug) {
      this.verbose = true
    }
    this.containerSelector = cleanOptions.containerSelector
    this.container = $(cleanOptions.containerSelector)
    this.container.html(this._getHtml())
    this.editorField = $(`${this.containerSelector} .editor-field`)
    this.onChange = cleanOptions.onChange

    this.setText(cleanOptions.initialText)
    this.editorField.on('keyup', () => {
      this.onChange(this.getText())
    })
  }

  getText() {
    return this.editorField.val()
  }

  /**
   *
   * @param {string} newText
   */
  setText(newText) {
    this.editorField.val(newText)
  }

  _getHtml() {
    return `<input type="text" class="text-${this.lang} editor-field">`
  }
}