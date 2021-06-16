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



/**
 * Takes cares of presenting a dialog to the user and getting an apparatus entry
 */
import { ConfirmDialog } from '../ConfirmDialog'
import { doNothing } from '../toolbox/FunctionUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'

export class ApparatusEntryInput {

  constructor (options ) {

    let optionsSpec = {
      apparatuses: { type: 'array', required: true},
      lang: { type: 'string', required: true},
      lemma: { type: 'NonEmptyString', required: true},
      currentEntry: {type: 'string', default: ''}
    }

    let oc = new OptionsChecker(optionsSpec, "Apparatus Entry Input")
    this.options = oc.getCleanOptions(options)

    this.dialog = new ConfirmDialog({
      title: 'Apparatus Entry',
      acceptButtonLabel: 'Add Entry',
      body: this._genBodyHtml(),
      acceptFunction: doNothing,
      cancelFunction: doNothing,
      reuseDialog: true
    })

    this.dialog.hideAcceptButton()
    let thisObject = this
    this.textEntry = $('#free-text-entry')
    this.apparatusSelect = $('#apparatus-select')
    this.textEntry.on('keyup', () => {
      if (thisObject.textEntry.val() === '') {
        thisObject.dialog.hideAcceptButton()
      } else {
        thisObject.dialog.showAcceptButton()
      }
    })
  }

  getEntry() {
    let thisObject = this
    return new Promise( (resolve, reject) => {
      thisObject.dialog.setCancelFunction( () => {
        thisObject.dialog.destroy()
        reject('User cancelled')
      })

      thisObject.dialog.setAcceptFunction( () => {
        thisObject.dialog.destroy()
        resolve({
          apparatus: thisObject.apparatusSelect.val(),
          text:  thisObject.textEntry.val()
          })
      })
      thisObject.dialog.show()
    })
  }

  _genBodyHtml() {
      return `<h1 class="lemma text-${this.options.lang}">${this.options.lemma}</h1>
<form>
    <div class="form-group row">
        <label for="apparatus-select" class="col-sm-2 col-form-label">Apparatus:</label>
       <div class="col-sm-10">
        <select class="form-control" id="apparatus-select">
            ${this.options.apparatuses.map( (a) => { return `<option value="${a.name}">${a.title}</option>`}).join('')}
        </select>
        </div>
    </div>
    <div class="form-group">
        <label for="free-text-entry">Entry:</label>
        <input type="text" class="form-control text-${this.options.lang}" id="free-text-entry">${this.options.currentEntry}</input>
    </div>
</form>`
  }

}