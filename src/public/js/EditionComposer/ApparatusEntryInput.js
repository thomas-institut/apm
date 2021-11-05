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
import { ConfirmDialog, EXTRA_LARGE_DIALOG } from '../pages/common/ConfirmDialog'
import { doNothing } from '../toolbox/FunctionUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { ApparatusCommon } from './ApparatusCommon'
import { EditionFreeTextEditor } from './EditionFreeTextEditor'
import { varsAreEqual } from '../toolbox/ArrayUtil'
import { FmtTextFactory} from '../FmtText/FmtTextFactory'
import { MultiToggle } from '../widgets/MultiToggle'
import { deepCopy } from '../toolbox/Util.mjs'

// TODO: support adding/editing multiple custom entries

const updateEntryLabel = 'Update Apparatus'
const maxEntryTextWordsToShow = 10

export const userCancelledReason = 'User Cancelled'

export class ApparatusEntryInput {

  constructor (options ) {

    let optionsSpec = {
      apparatuses: { type: 'array', required: true},
      lang: { type: 'string', required: true},
      entryText: { type: 'NonEmptyString', required: true},
      ctIndexFrom: { type: 'number',  required: true},
      ctIndexTo: { type: 'number', required: true},
      selectedApparatusIndex: { type: 'number', default: 0},
      sigla: { type: 'array', required: true}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: "Apparatus Entry Input"})
    this.options = oc.getCleanOptions(options)
    console.log(this.options)

    // Build apparatus objects, these will be updated with user input and
    // the one for the current shown apparatus will be returned in this.getEntry()
    this.apparatuses = this.options.apparatuses.map( (app) => {
      let newApp = deepCopy(app)
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
      // Faking pre, post, lemma and separator for now
      // TODO: make this for real
      newApp.preLemma = newApp.preLemma === '' ? 'auto' : newApp.preLemma
      newApp.lemma = 'auto'
      newApp.postLemma = 'auto'
      newApp.separator = 'auto'
      return newApp
    })

    console.log(this.apparatuses)

    // Create dialog
    this.dialog = new ConfirmDialog({
      title: 'Apparatus Entry',
      acceptButtonLabel: updateEntryLabel,
      size: EXTRA_LARGE_DIALOG,
      body: this._genBodyHtml(),
      acceptFunction: doNothing,
      cancelFunction: doNothing,
      reuseDialog: true
    })

    this.dialog.hideAcceptButton()

    // Init free text editor
    this.freeTextEditor = new EditionFreeTextEditor({
      containerSelector: '#free-text-entry-div',
      lang: this.options.lang,
      onChange: () =>  { this._updateAcceptButton() },
      debug: false
    })

    // Init preLemma toggle and entry
    this.preLemmaToggle= new MultiToggle({
      containerSelector: '#pre-lemma-div',
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [
        { label: 'Auto', name: 'auto', helpText: 'Let APM generate pre-lemma text'},
        { label: '<i>ante</i>', name: 'ante', helpText: "Standard word 'ante'"},
        { label: '<i>post</i>', name: 'post', helpText: "Standard word 'post'"},
        { label: 'Custom', name: 'custom', helpText: "Enter custom pre-lemma text"},
      ]
    })

    $('#pre-lemma-div').append('<div id="pre-lemma-custom-text-entry-div">Custom text here</div>')
    this.preLemmaToggle.on('toggle', (ev) => {
      let selectedAppIndex = this.apparatusSelect.val() * 1
      let newOption = ev.detail.currentOption
      this.apparatuses[selectedAppIndex].preLemma = newOption
      console.log(`Setting pre lemma for apparatus ${selectedAppIndex} to '${newOption}'`)
      this._showPreLemmaInDialog(newOption)
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

  /**
   *
   * @param {string}option
   * @private
   */
  _showPreLemmaInDialog(option) {
    this.preLemmaToggle.setOptionByName(option, false)
    if (option === 'custom') {
      $('#pre-lemma-custom-text-entry-div').removeClass('hidden')
    } else {
      $('#pre-lemma-custom-text-entry-div').addClass('hidden')
    }
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
    this._showPreLemmaInDialog(this.apparatuses[appIndex].preLemma)
  }

  /**
   *
   * @param {string} text
   * @param {number} numWords
   * @private
   */
  _getEntryTextToShow(text, numWords) {
    if (numWords <= 0) {
      return text
    }

    let words = text.split(' ')
    if (words.length > numWords) {
      return `${words.slice(0, numWords).join(' ')} <em>...${words.length - numWords -1} more words... </em> ${words[words.length-1]}`
    }
    return text
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
        let currentApparatus = this.apparatuses[this.apparatusSelect.val()]
        resolve({
          apparatus: currentApparatus.name,
          apparatusIndex: apparatusIndex,
          text: this.freeTextEditor.getFmtText(),
          isNew: currentApparatus.newCustomEntry,
          changesInEnabledEntries: changesInCheckboxes,
          enabledEntriesArray: enabledArray,
          preLemma: currentApparatus.preLemma === 'auto' ? '' : currentApparatus.preLemma
          })
      })
      this.dialog.show()
      this._showSelectedApparatusInDialog(this.options.selectedApparatusIndex)
    })
  }

  _genBodyHtml() {
    let ctColumnsText = `${this.options.ctIndexFrom+1}&ndash;${this.options.ctIndexTo+1}`
    if (this.options.ctIndexFrom === this.options.ctIndexTo) {
      ctColumnsText = `${this.options.ctIndexFrom+1}`
    }

      return `<form>
<div class="entry-header">
    <div class="form-group row">
        <div class="col-sm-2">Edition Text:</div>
        <div class="col-sm-10 entry-text text-${this.options.lang}">
            ${this._getEntryTextToShow(this.options.entryText, maxEntryTextWordsToShow)}
        </div>
    </div>
    <div class="form-group row">
        <div class="col-sm-2">Collation Table:</div>
        <div class="col-sm-10">
            ${ctColumnsText}
        </div>
    </div>
    </div>
    
    <div class="form-group row">
        <label for="apparatus-select" class="col-sm-2 col-form-label">Apparatus:</label>
       <div class="col-sm-10">
        <select class="form-control" id="apparatus-select">
            ${this.apparatuses.map( (a, ai) => { return `<option value="${ai}" ${this.options.selectedApparatusIndex===ai ? 'selected': ''}>${a.title}</option>`}).join('')}
        </select>
        </div>
    </div>
    <div class="form-group row">
    <label class="col-sm-2 col-form-label">Automatic Entries:</label>
    <div class="col-sm-10 auto-entries text-${this.options.lang}">
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
</div>

    <div class="form-group row">
        <label for="pre-lemma-div" class="col-sm-2 col-form-label">Pre Lemma:</label>
        <div class="col-sm-10 aei-multitoggle-div" id="pre-lemma-div">
        </div>
    </div>
    
    <div class="form-group row">
        <label for="lemma-div" class="col-sm-2 col-form-label">Lemma:</label>
        <div class="col-sm-10 lemma-div">
           auto | force-dash | ellipsis | custom
        </div>
    </div>
    
    <div class="form-group row">
        <label for="post-lemma-div" class="col-sm-2 col-form-label">Post Lemma:</label>
        <div class="col-sm-10 post-lemma-div">
           auto | custom
        </div>
    </div>
    
    <div class="form-group row">
        <label for="separator-div" class="col-sm-2 col-form-label">Separator:</label>
        <div class="col-sm-10 post-lemma-div">
           auto | off | custom
        </div>
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