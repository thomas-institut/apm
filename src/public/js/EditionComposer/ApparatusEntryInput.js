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
import { ConfirmDialog } from '../pages/common/ConfirmDialog'
import { doNothing } from '../toolbox/FunctionUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { ApparatusCommon } from './ApparatusCommon'
import { EntryFreeTextEditorFull } from './EntryFreeTextEditorFull'
import { varsAreEqual } from '../toolbox/ArrayUtil'
import { FmtTextFactory} from '../FmtText/FmtTextFactory'

// TODO: support adding/editing multiple custom entries

const updateEntryLabel = 'Update Apparatus'

export const userCancelledReason = 'User Cancelled'

export class ApparatusEntryInput {

  constructor (options ) {

    let optionsSpec = {
      apparatuses: { type: 'array', required: true},
      lang: { type: 'string', required: true},
      lemma: { type: 'NonEmptyString', required: true},
      selectedApparatusIndex: { type: 'number', default: 0},
      sigla: { type: 'array', required: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: "Apparatus Entry Input"})
    this.options = oc.getCleanOptions(options)
    console.log(this.options)

    this.apparatuses = this.options.apparatuses.map( (app) => {
      let newApp = app
      let customEntries = app.currentEntries.filter( e => e.type === 'custom')
      newApp.currentEntries = app.currentEntries.filter( (entry) => {
        return entry.type !== 'custom'
      })
      newApp.customEntry = FmtTextFactory.fromString('')
      newApp.newCustomEntry = true
      if (customEntries.length !== 0) {
        newApp.customEntry = customEntries[0].fmtText
        newApp.newCustomEntry = false
      }
      return newApp
    })

    console.log(this.apparatuses)


    this.dialog = new ConfirmDialog({
      title: 'Apparatus Entry',
      acceptButtonLabel: updateEntryLabel,
      body: this._genBodyHtml(),
      acceptFunction: doNothing,
      cancelFunction: doNothing,
      reuseDialog: true
    })

    this.dialog.hideAcceptButton()

    this.freeTextEditor = new EntryFreeTextEditorFull({
      containerSelector: '#free-text-entry-div',
      lang: this.options.lang,
      onChange: () =>  { this._updateAcceptButton() },
      debug: true
    })
    this.apparatusSelect = $('#apparatus-select')
    this.apparatusSelect.val(this.options.selectedApparatusIndex)
    this.apparatusSelect.on('change', () => {
      let selectedAppIndex = this.apparatusSelect.val() * 1  // force it to be a number!
      this._showSelectedApparatusInDialog(selectedAppIndex)
      this.freeTextEditor.setText(this.apparatuses[selectedAppIndex].customEntry)
      this._updateAcceptButton()
    })

    this.apparatuses.forEach( (app, apparatusIndex) => {
      app.currentEntries.forEach( (entry, subEntryIndex) => {
        $(`#aei-sub-entry-${apparatusIndex}-${subEntryIndex}`).on('change', () => {
          // console.log(`Change of value in check box for apparatus ${apparatusIndex}, sub entry ${subEntryIndex}`)
          this._updateAcceptButton()
        })
      })
    })
  }

  _updateAcceptButton() {
    let selectedAppIndex = this.apparatusSelect.val() * 1
    let changeInCheckboxes = false

    this.apparatuses[selectedAppIndex].currentEntries.forEach( (se, sei) => {
      if ($(`#aei-sub-entry-${selectedAppIndex}-${sei}`).prop('checked') !== se.enabled) {
        // console.log(`Change in checkboxes: apparatus ${selectedAppIndex} : entry ${sei}`)
        changeInCheckboxes = true
      }
    })

    let textInEditor = this.freeTextEditor.getFmtText()
    if (varsAreEqual(textInEditor,this.apparatuses[selectedAppIndex].customEntry) && !changeInCheckboxes) {
      // console.log(`Hiding accept button`)
      this.dialog.hideAcceptButton()
    } else {
      // console.log(`Showing accept button`)
      // console.log(`Text in editor`)
      // console.log(textInEditor)
      // console.log(`Current custom entry`)
      console.log(this.apparatuses[selectedAppIndex].customEntry)
      this.dialog.showAcceptButton()
    }
  }

  /**
   *
   * @param {number} appIndex
   * @private
   */
  _showSelectedApparatusInDialog(appIndex) {
    let dialogSelector = this.dialog.getSelector()
    this.apparatuses.forEach( (app, ai) => {
      let checkboxFormGroup =  $(`${dialogSelector} div.sub-entry-app-${ai}`)
      if (ai === appIndex) {
        checkboxFormGroup.removeClass('hidden')
      } else {
        checkboxFormGroup.addClass('hidden')
      }
    })
    this.freeTextEditor.setText(this.apparatuses[appIndex].customEntry)
  }

  getEntry() {
    return new Promise( (resolve, reject) => {
      this.dialog.setCancelFunction( () => {
        this.dialog.destroy()
        reject(userCancelledReason)
      })

      this.dialog.setAcceptFunction( () => {
        let apparatusIndex = this.apparatusSelect.val()
        let changesInCheckboxes = false
        let enabledArray = []
        this.apparatuses[apparatusIndex].currentEntries.forEach( (subEntry, sei) => {
          let checkBoxEnabled = $(`#aei-sub-entry-${apparatusIndex}-${sei}`).prop('checked')
          // console.log(`Checkbox ${apparatusIndex}:${sei} : ${checkBoxEnabled}`)
          enabledArray.push(checkBoxEnabled)
          if (checkBoxEnabled !== subEntry.enabled) {
            changesInCheckboxes = true
          }
        })
        this.dialog.destroy()
        resolve({
          apparatus: this.apparatuses[this.apparatusSelect.val()].name,
          apparatusIndex: apparatusIndex,
          text: this.freeTextEditor.getFmtText(),
          isNew: this.apparatuses[this.apparatusSelect.val()].newCustomEntry,
          changesInEnabledEntries: changesInCheckboxes,
          enabledEntriesArray: enabledArray
          })
      })
      this.dialog.show()
      this._showSelectedApparatusInDialog(this.options.selectedApparatusIndex)
    })
  }

  _genBodyHtml() {
      return `<h1 class="lemma text-${this.options.lang}">${this.options.lemma}</h1>
<form"\>
    <div class="form-group row">
        <label for="apparatus-select" class="col-sm-2 col-form-label">Apparatus:</label>
       <div class="col-sm-10">
        <select class="form-control" id="apparatus-select">
            ${this.apparatuses.map( (a, ai) => { return `<option value="${ai}" ${this.options.selectedApparatusIndex===ai ? 'selected': ''}>${a.title}</option>`}).join('')}
        </select>
        </div>
    </div>
    <div class="form-group text-${this.options.lang}">
        ${ this.apparatuses.map( (app, ai) => {
          return app.currentEntries.map( (subEntry, sei) => {
            let checkedString = subEntry.enabled ? 'checked' : ''
            return `<div class="form-check sub-entry-app-${ai}"><input class="form-check-input text-${this.options.lang}" type="checkbox" value="" ${checkedString} id="aei-sub-entry-${ai}-${sei}">
       <label class="form-check-label" for="aei-subtentry-${ai}-${sei}"> ${ApparatusCommon.genSubEntryHtmlContent(this.options.lang, subEntry, this.options.sigla )}
</label>
</div>`
          }).join('')
      }).join('')}
</div>

    <div class="form-group row">
        <label for="free-text-entry" class="col-sm-2 col-form-label">Custom Entry:</label>
        <div class="col-sm-10">
            <div id="free-text-entry-div"></div>
        </div>
    </div>
</form>`
  }

}