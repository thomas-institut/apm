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
 * Edition  Panel.
 *
 *  - Edition text and apparatus manipulation in a printed edition type user interface
 */

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { getSingleIntIdFromClasses} from '../toolbox/UserInterfaceUtil'
import {getTypesettingInfo} from '../Typesetter/BrowserTypesettingCalculations'
import { doNothing, wait } from '../toolbox/FunctionUtil'
import { MultiToggle } from '../widgets/MultiToggle'
import { EditableTextField } from '../widgets/EditableTextField'
import { ApparatusCommon } from './ApparatusCommon'
import * as EditionMainTextTokenType from '../Edition/MainTextTokenType'
import { Edition } from '../Edition/Edition'
import { HtmlRenderer } from '../FmtText/Renderer/HtmlRenderer'
import { PanelWithToolbar } from './PanelWithToolbar'
import { arraysAreEqual, prettyPrintArray, pushArray, varsAreEqual } from '../toolbox/ArrayUtil'
import { CtData } from '../CtData/CtData'

import {FmtTextFactory} from '../FmtText/FmtTextFactory'
import {FmtTextTokenFactory} from '../FmtText/FmtTextTokenFactory'
import { capitalizeFirstLetter, deepCopy } from '../toolbox/Util.mjs'
import { EditionMainTextEditor } from './EditionMainTextEditor'
import { WitnessTokenStringParser } from '../toolbox/WitnessTokenStringParser'
import * as MyersDiff from '../toolbox/MyersDiff.mjs'
import * as WitnessTokenType from '../Witness/WitnessTokenType'

const EDIT_MODE_OFF = 'off'
const EDIT_MODE_TEXT = 'text'
const EDIT_MODE_APPARATUS = 'apparatus'
const EDIT_MODE_TEXT_BETA = 'text_beta'

const typesetInfoDelay = 200

const betaEditorDivId = 'text-editor-beta'
const betaEditorInfoDiv = 'text-editor-info'

const icons = {
  addEntry: '<i class="bi bi-plus-lg"></i>',
  commitEdit: '<i class="bi bi-check-lg"></i>',
  revertEdit: '<i class="bi bi-arrow-counterclockwise"></i>'
}

export class MainTextPanel extends PanelWithToolbar {

  constructor (options = {}) {
    super(options)
    let optionsDefinition = {
      ctData: { type: 'object' },
      edition: { type: 'object', objectClass: Edition },
      apparatusPanels: { type: 'array' },
      onError: { type: 'function', default: doNothing},
      onConfirmMainTextEdit: {
        // function to call when the user edits a main text token
        //  (mainTextTokenIndex, newText) => boolean,  if false, no changes are made to the displayed text
        type: 'function',
        default: (section, tokenIndex, newText) => {
          console.log(`Confirming edit of main text token ${tokenIndex} in section ${prettyPrintArray(section)} with new text '${newText}'`)
          return true
        }
      },
      onCtDataChange: { type: 'function', default: doNothing},
      editionWitnessTokenNormalizer: { type: 'function', default: (token) => { return token}},
      editApparatusEntry : {
        // function that opens an apparatus entry editor, provided by EditionComposer
        type: 'function',
        default: (apparatusIndex, mainTextFrom, mainTextTo) => { console.log(`Edit apparatus ${apparatusIndex}, from ${mainTextFrom} to ${mainTextTo}`)}
      }
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  'Main Text Panel'})
    this.options = oc.getCleanOptions(options)
    this.ctData = CtData.copyFromObject(this.options.ctData)
    this.edition = this.options.edition
    this.lang = this.options.ctData['lang']
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
    this.currentEditMode = EDIT_MODE_OFF
    this.editingTextToken = false
    this.originalTokenText = '__null__'
    this.tokenBeingEdited = -1
    this.textTokenEditor = null
    this.selection = { from: -1, to: -1 }
    this.selecting = false
    this.cursorInToken = false
    this.tokenIndexOne = -1
    this.tokenIndexTwo = -1
    this.lastTypesetinfo = null

    this.htmlRenderer = new HtmlRenderer({})
  }

  /**
   *
   * @param {object} ctData
   * @param {Edition} edition
   */
  updateData(ctData, edition) {
    this.ctData = CtData.copyFromObject(ctData)
    this.edition = edition

    this.options.apparatusPanels.forEach( (ap) => {
      ap.updateData(ctData, edition)
    })

    if (this.visible) {
      $(this.getContentAreaSelector()).html(this.generateContentHtml('', '', true))
      this._setupMainTextDivEventHandlers()
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
      this._updateLineNumbersAndApparatuses()
        .then( () => { this.verbose && console.log(`Finished showing edition on update data`) })
    } else {
      // use current typeset info if already calculated
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      if (this.lastTypesetinfo === null) {
        // typeset info not calculated, just get one even if it's incorrect

        this._updateLineNumbersAndApparatuses()
          .then( () => { this.verbose && console.log(`Finished showing edition on update data`) })
      } else {
        this.options.apparatusPanels.forEach( (p) => { p.updateApparatus(this.lastTypesetinfo)})
      }
    }

  }

  generateToolbarHtml (tabId, visible) {

    let apparatusLinks = this.edition.apparatuses.map( (app, index) => {
      return `<a class="dropdown-item add-entry-apparatus-${index}" href="">${capitalizeFirstLetter(app.type)}</a>`
    }).join('')

    return `<div class="panel-toolbar-group">
            <div class="panel-toolbar-group" id="edition-panel-mode-toggle"></div>
            <div class="panel-toolbar-group apparatus-toolbar">
               <div class="panel-toolbar-item add-entry-dropdown hidden">
                  <div class="dropdown">
                     <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="add-entry-dropdown" data-toggle="dropdown" aria-expanded="false">
                            ${icons.addEntry}
                     </button>
                     <div class="dropdown-menu" aria-labelledby="add-entry-dropdown">${apparatusLinks}</div>
                  </div>
               </div>
            </div>
            <div class="panel-toolbar-group text-edit-toolbar">
                <div class="panel-toolbar-item text-edit-revert">
                    <a class="tb-button text-edit-revert-btn" title="Revert Changes">${icons.revertEdit}</a>
                </div>
                <div class="panel-toolbar-item text-edit-commit">
                    <a class="tb-button text-edit-commit-btn" title="Commit Changes">${icons.commitEdit}</a>
                </div>
            </div>
        </div>`
  }

  generateContentHtml (tabId, mode, visible) {
    if (!visible) {
      // if (mode !== this.lastMode) {
        this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      // }
      return `Waiting to be shown to generate content`
    }
    // this.verbose && console.log(`Generating html for main text panel`)
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
    return this._generateMainTextHtml()
  }

  getContentAreaClasses () {
    return super.getContentAreaClasses().concat([ 'main-text', `text-${this.lang}`, `mode-${this.currentEditMode}`])
  }

  onResize (visible) {
    super.onResize(visible)
    if (!visible) {
      // force redraw on the next onShown event
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true
      return
    }
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      // the main text is not typeset properly yet, just wait until the next onShown event
      this.verbose && console.log(`Edition panel resize but not shown yet, nothing to do`)
      return
    }
    // the panel is visible and the main text is drawn in the content area
    switch(this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this.verbose && console.log(`Resize: about to update apparatuses`)
        this._updateLineNumbersAndApparatuses()
          .then( () => { this.verbose && console.log(`Done resizing`)})
        break

      case EDIT_MODE_TEXT_BETA:
        //console.log(`Resize in beta editor mode, nothing to do`)
        break

      default:
        console.error(`Unknown edit mode ${this.currentEditMode} on resize`)
    }

  }

  onShown () {
    super.onShown()
    //this.verbose && console.log(`Edition Panel shown`)
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false
      $(this.getContentAreaSelector()).html(this.generateContentHtml('', '', true))
      switch(this.currentEditMode) {
        case EDIT_MODE_OFF:
        case EDIT_MODE_TEXT:
        case EDIT_MODE_APPARATUS:
          this._setupMainTextDivEventHandlers()
          this._updateLineNumbersAndApparatuses()
            .then( () => { this.verbose && console.log(`Finished generating edition panel on shown`) })
          break

        case EDIT_MODE_TEXT_BETA:
          this.verbose && console.log(`Beta editor shown`)
          break

        default:
          console.error(`Unknown edit mode ${this.currentEditMode}`)
      }
    }
  }

  /**
   * Highlights the main text that corresponds to the given lemma index
   * @param {string} apparatusType
   * @param {number[]}lemmaIndex
   * @param {boolean} on
   */
  highlightTextForLemma(apparatusType, lemmaIndex, on) {
    // ignore section index for now
    // TODO: support multiple sections

    if (lemmaIndex.length < 2) {
      return
    }
    let theIndex = lemmaIndex[1]
    let appIndex  = this.edition.apparatuses.map ( (app) => { return app.type}).indexOf(apparatusType)
    if (appIndex === -1) {
      console.warn(`Asked to highlight text for nonexistent apparatus: ${apparatusType}`)
      return
    }

    let entry = this.edition.apparatuses[appIndex].entries[theIndex]
    if (entry === undefined) {
      console.warn(`Asked to highlight text for nonexistent entry ${apparatusType} : [0, ${theIndex}]`)
      return
    }

    for (let i = entry.from; i <= entry.to; i++) {
      let textElement = $(`${this.containerSelector} .main-text-token-${i}`)
      if (on) {
        textElement.addClass('token-highlighted')
      } else {
        textElement.removeClass('token-highlighted')
      }
    }


  }



  postRender (id, mode, visible) {
    this.verbose && console.log(`Post render main text panel, visible = ${visible}`)
    this.onResize(visible)
    this.modeToggle = new MultiToggle({
      containerSelector: '#edition-panel-mode-toggle',
      title: 'Edit: ',
      buttonClass: 'tb-button',
      initialOption: this.currentEditMode,
      wrapButtonsInDiv: true,
      buttonsDivClass: 'panel-toolbar-item',
      buttonDef: [
        { label: 'Off', name: EDIT_MODE_OFF, helpText: 'Turn off editing' },
        { label: 'Text', name: EDIT_MODE_TEXT, helpText: 'Edit main text' },
        { label: 'Apparatus', name: EDIT_MODE_APPARATUS, helpText: 'Add/Edit apparatus entries' },
        { label: 'Text<sup>BETA</sup>', name: EDIT_MODE_TEXT_BETA, helpText: 'Edit main text (beta)' }
      ]

    })
    this.modeToggle.on('toggle', (ev) => {
      let previousEditMode = this.currentEditMode
      let newEditMode = ev.detail.currentOption
      this._changeEditMode(newEditMode, previousEditMode)
    })
    this.edition.apparatuses.forEach((app, index) => {
      $(`${this.containerSelector} .add-entry-apparatus-${index}`).on('click', this._genOnClickAddEntryButton(index))
    })
    // this._eleAddEntryButton().on('click', this._genOnClickAddEntryButton())
    switch (this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this._setupMainTextDivEventHandlers()
        break

      case EDIT_MODE_TEXT_BETA:
        this.verbose && console.log(`Post render beta mode`)
        break

    }

    this.textEditCommitDiv = $(`${this.containerSelector} div.text-edit-commit`)
    this.textEditRevertDiv = $(`${this.containerSelector} div.text-edit-revert`)

    this.textEditCommitDiv.addClass('hidden')
    this.textEditRevertDiv.addClass('hidden')
  }




  _changeEditMode(newEditMode, previousEditMode) {
    this.verbose && console.log(`Edit mode changed from ${previousEditMode} to ${newEditMode}`)

    if (this.editingTextToken) {
      this._stopEditingMainText(this.originalTokenText)
    }
    this._clearSelection()
    $(this.getContentAreaSelector()).removeClass(`mode-${previousEditMode}`).addClass(`mode-${newEditMode}`)

    switch(newEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        this.currentEditMode = newEditMode
        if (previousEditMode === EDIT_MODE_TEXT_BETA) {
          $(this.getContentAreaSelector()).html(this._getMainTextHtmlVersion())
          this._setupMainTextDivEventHandlers()
          this._updateLineNumbersAndApparatuses().then( () => { this.verbose && console.log(`Finished switching mode to ${this.currentEditMode}`)})
          this.textEditRevertDiv.addClass('hidden')
          this.textEditCommitDiv.addClass('hidden')
        }
        break

      case EDIT_MODE_TEXT_BETA:
        this.currentEditMode = newEditMode
        this._setupTextEditMode()

        break

      default:
        console.error(`Unknown edit mode ${newEditMode}`)
    }
  }

  _setupTextEditMode() {
    $(this.getContentAreaSelector()).html(this._getMainTextBetaEditor())
    this.freeTextEditor = new EditionMainTextEditor({
      containerSelector: `#${betaEditorDivId}`,
      lang: this.lang,
      onChange: this._genOnChangeMainTextFreeTextEditor(),
      debug: false
    })

    this.freeTextEditor.setText( this._convertMainTextToFmtText(), true)
    this.betaEditorInfoDiv = $(`#${betaEditorInfoDiv}`).html('No changes')
    this.commitedFreeText = deepCopy(this.freeTextEditor.getFmtText())
    $(`${this.containerSelector} a.text-edit-revert-btn`).on('click', this._genOnClickTextEditRevertChanges())
    $(`${this.containerSelector} a.text-edit-commit-btn`).on('click', this._genOnClickTextEditCommitChanges())
    this.verbose && console.log(`Now in beta mode`)
  }

  __getWitnessTokenHtml(token) {
    if (token === null || token === undefined || token.type === WitnessTokenType.EMPTY) {
      return ''
    }

    if (token.type === WitnessTokenType.WHITESPACE) {
      return ' '
    }

    if (token.fmtText !== undefined) {
      return this.htmlRenderer.render(token.fmtText)
    }
    return token.text
  }

  _genMainTextWithChanges(currentWitnessTokens, changeList) {

    const replaceSign = "<span class=replace-sign'>|</span>"
    let html = ''

    let preAdditions = changeList.filter( (change) => { return change.index === -1})
    preAdditions.forEach( (change) => {
      if (change.change !== 'add') {
        console.warn(`Found a change before the first CT column that is not an addition`)
        console.log(change)
      } else {
        html += `<span class='added'>${this.__getWitnessTokenHtml(change.newToken)}</span> `
      }
    })

    currentWitnessTokens.forEach ( (token, index) => {
      let changesForToken = changeList.filter( (change) => {
        return change.index === index
      })
      if (changesForToken.length === 0) {
        html += `${this.__getWitnessTokenHtml(token)} `
      } else {
        if (changesForToken.filter( (change) => { return change.change === 'replace' || change.change === 'delete'}).length === 0) {
          // the token is neither replaced nor deleted
          html += `${this.__getWitnessTokenHtml(token)} `
        }

        changesForToken.forEach( (change) => {
          switch(change.change) {
            case 'replace':
              if (token.text === change.newToken.text) {
                // a change in format only
                html += `<span class="replacement">${this.__getWitnessTokenHtml(change.newToken)}</span> `
              } else {
                html += `<span class='replaced'>${this.__getWitnessTokenHtml(token)}</span>${replaceSign}<span class="replacement">${this.__getWitnessTokenHtml(change.newToken)}</span> `
              }
              break

            case 'delete':
              html += `<span class='deleted'>${this.__getWitnessTokenHtml(token)}</span> `
              break

            case 'add':
              html += `<span class='added'>${this.__getWitnessTokenHtml(change.newToken)}</span> `
          }
        })
      }



    })
    return html
  }

  _genOnChangeMainTextFreeTextEditor() {
    return () => {
      if (!varsAreEqual(this.commitedFreeText, this.freeTextEditor.getFmtText())) {
        this.textEditRevertDiv.removeClass('hidden')
        this.textEditCommitDiv.removeClass('hidden')
        console.log(`Changes in editor`)
        let newFmtText = this.freeTextEditor.getFmtText()
        let currentWitnessTokens = this.ctData['witnesses'][this.ctData['editionWitnessIndex']].tokens
        let witnessTokens = this.__fmtTextToEditionWitnessTokens(newFmtText)
        console.log(`Witness tokens from editor`)
        console.log(witnessTokens)

        let changes = this._getChangesInBetaEditor(currentWitnessTokens, witnessTokens)
        console.log(changes)
        let changeListHtml = changes.map( (change) => {
          switch( change.change) {
            case 'replace':
              return `${change.index+1}: ${this.__getWitnessTokenHtml(change.currentToken)} &rarr; ${this.__getWitnessTokenHtml(change.newToken)}`

            case 'add':
              if (change.index === -1) {
                return `0: <em>add</em> ${this.__getWitnessTokenHtml(change.newToken)}`
              }
              return ` ${change.index+1}: ${this.__getWitnessTokenHtml(change.currentToken)} <em>add</em> ${this.__getWitnessTokenHtml(change.newToken)}`

            case 'delete':
              return `${change.index+1}: ${this.__getWitnessTokenHtml(change.currentToken)} &rarr; <em>empty</em>`
          }
        }).map( (changeHtml) => { return `<li>${changeHtml}</li>`}).join('')
        let mainTextWithChangesHtml = this._genMainTextWithChanges(currentWitnessTokens, changes)
        this.betaEditorInfoDiv.removeClass('hidden').html(`<h4>Revised Text</h4><div class="main-text-with-changes">${mainTextWithChangesHtml}</div><h4>Collation Table Changes</h4><ul>${changeListHtml}</ul>`)

      } else {
        this.textEditRevertDiv.addClass('hidden')
        this.textEditCommitDiv.addClass('hidden')
        this.betaEditorInfoDiv.html('No changes')
      }
    }
  }

  _genOnClickTextEditRevertChanges() {
    return () => {
      this.verbose && console.log(`Reverting changes in text editor`)
      this.freeTextEditor.setText( this.commitedFreeText, true)
      this.textEditRevertDiv.addClass('hidden')
      this.textEditCommitDiv.addClass('hidden')
      this.betaEditorInfoDiv.html('No changes')
    }
  }

  _getChangesInBetaEditor(currentWitnessTokens, newWitnessTokens) {
    currentWitnessTokens = currentWitnessTokens
      .map( (token, index) => {
        // keep the original index
        token['originalIndex'] = index
        return token
      })
      .filter ( (token) => {
        return token.tokenType !== 'empty'
      })

    let editScript = this.__getEditScript(currentWitnessTokens, newWitnessTokens)
    return this.__getChangeList(currentWitnessTokens, newWitnessTokens, editScript)
  }

  _genOnClickTextEditCommitChanges() {
    return () => {
      this.verbose && console.log(`Committing changes`)
      let newFmtText = this.freeTextEditor.getFmtText()
      if (varsAreEqual(this.commitedFreeText, newFmtText)) {
        this.verbose && console.log(`No changes, nothing to do`)
        this.textEditRevertDiv.addClass('hidden')
        this.textEditCommitDiv.addClass('hidden')
        return
      }
      this.verbose && console.log(`There are changes, now it's almost for real`)
    }
  }

  __getChangeList(oldTokens, newTokens, editScript) {

    let state = 0
    let changeList = []
    let lastKeptOrReplaced = -1
    let deleteStack = []


    editScript.forEach( (editScriptItem) => {
      switch (state) {
        case 0:
          switch (editScriptItem.command) {
            case 0:
              // nothing to do
              // this.verbose && console.log(`KEEP command in edit script (state = 0)`)
              // this.verbose && console.log(editScriptItem)
              lastKeptOrReplaced = editScriptItem.index
              break

            case 1:
              // addition
              this.verbose && console.log(`ADD command in edit script (state = 0)`)
              this.verbose && console.log(editScriptItem)
              changeList.push({
                change: 'add',
                index: lastKeptOrReplaced,
                currentToken: lastKeptOrReplaced >=0 ? oldTokens[lastKeptOrReplaced] : null,
                index2: editScriptItem.seq,
                newToken: newTokens[editScriptItem.seq]
              })
              break

            case -1:
              // a delete, but it could be a replace
              this.verbose && console.log(`DEL command in edit script (state = 0)`)
              this.verbose && console.log(editScriptItem)
              this.verbose && console.log(`-- adding item to the empty deleteStack`)
              deleteStack.push(editScriptItem.index)
              state = 1
              break
          }
          break

        case 1:
          switch (editScriptItem.command) {
            case 0:
              // a keep command
              this.verbose && console.log(`KEEP command in edit script (state = 1)`)
              this.verbose && console.log(editScriptItem)
              this.verbose && console.log(`-- emptying deleteStack, which has ${deleteStack.length} item(s)`)
              while (deleteStack.length > 0) {
                let deleteIndex = deleteStack.pop()
                changeList.push({
                  change: 'delete',
                  index: oldTokens[deleteIndex].originalIndex,
                  currentToken: oldTokens[deleteIndex]})
              }
              lastKeptOrReplaced = editScriptItem.index
              state = 0
              break

            case -1:
              // another delete, previous command was a delete, but will keep
              // looking for a replace
              this.verbose && console.log(`DEL command in edit script (state = 1)`)
              this.verbose && console.log(editScriptItem)
              deleteStack.push(editScriptItem.index)
              this.verbose && console.log(`-- adding index to the deleteStack, which now has ${deleteStack.length} items`)
              break

            case 1:
              // an ADD, match it with the first delete in the stack
              this.verbose && console.log(`ADD command in edit script (state = 1)`)
              this.verbose && console.log(editScriptItem)
              this.verbose && console.log(`-- this is a REPLACE actually`)
              let firstDeletedIndex = deleteStack.shift()
              changeList.push({
                change: 'replace',
                index: oldTokens[firstDeletedIndex].originalIndex,
                currentToken: oldTokens[firstDeletedIndex],
                index2: editScriptItem.seq,
                newToken: newTokens[editScriptItem.seq]
              })
              lastKeptOrReplaced = firstDeletedIndex
              if (deleteStack.length === 0) {
                this.verbose && console.log(`-- deleteStack is now empty`)
                state = 0
              } else {
                this.verbose && console.log(`-- deleteStack still has ${deleteStack.length} item(s)`)
              }
              break
          }
      }
    })
    // empty the deleteStack
    if (deleteStack.length > 0) {
      this.verbose && console.log(`End of script with non-empty deleteStack, flushing ${deleteStack.length} item(s)`)
      while (deleteStack.length > 0) {
        let deleteIndex = deleteStack.pop()
        changeList.push({
          change: 'delete',
          index: oldTokens[deleteIndex].originalIndex,
          currentToken: oldTokens[deleteIndex]})
      }
    }

    // now fix the indexes to make them correspond to the original token array
    changeList = changeList.map ( (change) => {
      if (change.index !== -1) {
        change.index = change.currentToken.originalIndex
      }
      return change
    })

    return changeList
  }

  __getEditScript(oldTokens, newTokens) {
    const attributesToCompare = [ 'fontWeight', 'fontStyle']
    return MyersDiff.calculate(oldTokens, newTokens, function(a,b) {
      let areEqual = true
      if (a.tokenType !== b.tokenType) {
        return false
      }
      if (a.text !== b.text) {
        return false
      }
      if (a.fmtText === undefined && b.fmtText === undefined) {
        return true
      }

      if (a.fmtText === undefined && b.fmtText !== undefined) {
        return false
      }
      if (a.fmtText !== undefined && b.fmtText === undefined) {
        return false
      }

      if (a.fmtText !== undefined && b.fmtText !== undefined) {
        if (!arraysAreEqual(a.fmtText, b.fmtText, (x, y) => {
          let fmtTokensAreEqual = true
          attributesToCompare.forEach((attribute) => {
            if (x[attribute] !== y[attribute]) {
              fmtTokensAreEqual = false
            }
          })
        })) {
          return false
        }
      }
      return true
    })
  }

  __fmtTextToEditionWitnessTokens(fmtText) {
    const attributesToCopy = [ 'fontWeight', 'fontStyle']
    let witnessTokens = []
    fmtText.forEach( (fmtTextToken) => {
      if (fmtTextToken.type !== 'text') {
        // ignore all non text tokens
        return
      }

      let tmpWitnessTokens = WitnessTokenStringParser.parse(fmtTextToken.text).map( (witnessToken) => {
        let hasFormats = false
        let tokenFmtTokens = FmtTextFactory.fromString(witnessToken.text).map( (token) => {
          attributesToCopy.forEach( (attribute) => {
            if (fmtTextToken[attribute] !== undefined && fmtTextToken[attribute]!== '' ) {
              hasFormats = true
              token[attribute] = fmtTextToken[attribute]
            }
          })
          return token
        })

        if (hasFormats) {
          // only add fmtText when there is a format!
          witnessToken.fmtText = tokenFmtTokens
        }

        return witnessToken
      })

      pushArray(witnessTokens, tmpWitnessTokens)
    })
    return witnessTokens.map( (token) => {
      token.tokenClass = 'edition'
      // apply normalizations
      token = this.options.editionWitnessTokenNormalizer(token)
      return token
    })
  }



  _getLemmaFromSelection() {
    if (this.isSelectionEmpty()) {
      return ''
    }
    let lemma = this.edition.mainText.filter( (token, i) => {
      return i>=this.selection.from && i<=this.selection.to
    }).map ( (token) => { return token.getPlainText()}).join('')
    this.verbose && console.log(`Lemma from selection ${this.selection.from}-${this.selection.to}: '${lemma}'`)
    return lemma
    // let lemma = ''
    // for (let i=this.selection.from; i <= this.selection.to; i++) {
    //   lemma += $(`${this.containerSelector} .main-text-token-${i}`).text() + ' '
    // }
    // return removeExtraWhiteSpace(lemma)
  }

  _genOnClickAddEntryButton(appIndex) {
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      this.verbose && console.log(`Click on add entry button for apparatus ${appIndex}`)

      let entryText = this._getLemmaFromSelection()
      let from = this.selection.from
      let to = this.selection.to
      this.verbose && console.log(`Selection ${from} to ${to}, '${entryText}'`)

      this.options.editApparatusEntry(appIndex, from, to)
      this._eleAddEntryDropdownButton().dropdown('hide')

    }
  }

  _setupMainTextDivEventHandlers() {
    $(`${this.containerSelector} .main-text`)
      .off()
      .on('click', this._genOnClickMainTextDiv())
      .on('mousedown', this._genOnMouseDownMainTextDiv())
      .on('mouseup', this._genOnMouseUpMainTextDiv())
      .on('mouseleave', this._genOnMouseLeaveDiv())
    $(`${this.containerSelector} span.main-text-token`)
      .off()
      .on('click', this._genOnClickMainTextToken())
      .on('mousedown', this._genOnMouseDownMainTextToken())
      .on('mouseup', this._genOnMouseUpMainTexToken())
      .on('mouseenter', this._genOnMouseEnterToken())
      .on('mouseleave', this._genOnMouseLeaveToken())
  }

  _genOnMouseDownMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      this._stopSelecting()
      this._clearSelection()
    }
  }

  _genOnMouseUpMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // this.verbose && console.log(`Mouse up on main text div`)
      if (this.cursorInToken) {
        return
      }
      if (this.selecting) {
        this._stopSelecting()
        this._clearSelection()
      }
    }
  }


  _genOnClickMainTextDiv() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // this.verbose && console.log(`Click on main text div`)
    }
  }

  _genOnClickMainTextToken() {
    return (ev) => {
      ev.stopPropagation()
    }
  }

  _genOnMouseDownMainTextToken() {
    // TODO: deal with right mouse click
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (this.editingTextToken) {
        return
      }
      let tokenIndex = getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
      if ($(ev.target).hasClass('whitespace')) {
        return
      }
      switch(this.currentEditMode) {
        case EDIT_MODE_TEXT:
          this.verbose && console.log(`Click on main text token ${tokenIndex} in main text edit mode`)
          let tokenSelector = `.main-text-token-${tokenIndex}`
          this.originalTokenText = $(tokenSelector).text()
          this.verbose && console.log(`Text to edit: '${this.originalTokenText}'`)
          this.tokenBeingEdited = tokenIndex
          this.textTokenEditor = new EditableTextField({
            containerSelector:  tokenSelector,
            initialText: this.originalTokenText,
            minTextFormSize: 2,
            startInEditMode: true
          })
          this.textTokenEditor.on('confirm', (ev) => {
            let newText = ev.detail.newText
            // It should be assumed that newText is a valid edit (cell validation should have taken care of wrong edits).
            // Even if newText would simply replace the current main text token, it can be the case that there is a change
            // in the lines, so there should always be a regeneration of the edition, a redrawing of the main text
            // and an update to the apparatuses.
            if (this.options.onConfirmMainTextEdit(tokenIndex, newText)) {
              this.verbose && console.log(`Confirming editing, new text = '${newText}'`)
              this._stopEditingMainText(newText)
              this._redrawMainText()
              this._setupMainTextDivEventHandlers()
              this._updateLineNumbersAndApparatuses().then( () => {
                this.verbose && console.log(`Main text redrawn`)
              })
            } else {
              this.verbose && console.log(`Change to main text not accepted`)
              // TODO: indicate this error in some way in the UI, although it should NEVER happen
              this._stopEditingMainText(this.originalTokenText)
            }
          }).on('cancel', () => {
            this.verbose && console.log(`Canceling edit`)
            this._stopEditingMainText(this.originalTokenText)
          })
          this.editingTextToken = true
          break

        case EDIT_MODE_APPARATUS:
          // this.verbose && console.log(`Mouse down on main text ${tokenIndex} token in apparatus edit mode`)
          this._setSelection(tokenIndex, tokenIndex)
          this.tokenIndexOne = tokenIndex
          this._showSelectionInBrowser()
          this._processNewSelection()
          this._startSelecting()
          break
      }
    }
  }

  _stopEditingMainText(text) {
    if (this.editingTextToken)  {
      this.verbose && console.log(`Stopping editing token ${this.tokenBeingEdited}`)
      this.textTokenEditor.destroy()
      let tokenSelector = `.main-text-token-${this.tokenBeingEdited}`
      this.tokenBeingEdited = -1
      this.originalTokenText = '__null__'
      this.editingTextToken = false
      $(tokenSelector).html(text)
        .on('click', this._genOnClickMainTextToken())
        .on('mousedown', this._genOnMouseDownMainTextToken())
        .on('mouseup', this._genOnMouseUpMainTexToken())
        .on('mouseenter', this._genOnMouseEnterToken())
        .on('mouseleave', this._genOnMouseLeaveToken())
    }
  }

  _startSelecting() {
    this.selecting = true
  }

  _stopSelecting() {
    this.selecting = false
  }

  _eleAddEntryDropdownButton() {
    return $(`${this.containerSelector} .add-entry-dropdown`)
  }

  _processNewSelection() {
    let addEntryDropdownButton = this._eleAddEntryDropdownButton()
    if (this.isSelectionEmpty()) {
      addEntryDropdownButton.addClass('hidden')
    } else {
      addEntryDropdownButton.removeClass('hidden')
    }
  }

  isSelectionEmpty() {
    return this.selection.from === -1
  }

  _clearSelectionInBrowser() {
    $(`${this.containerSelector} .main-text-token`).removeClass('token-selected')
  }

  _clearSelection() {
    if (this._selectionsAreEqual(this.selection, this._createSelection(-1, -1))) {
      return
    }
    this._setSelection(-1, -1)
    this._clearSelectionInBrowser()
    this._processNewSelection()
  }


  _setSelection(token1, token2) {
    this.selection = this._createSelection(token1, token2)
  }

  _selectionsAreEqual(sel1, sel2) {
    return sel1.from === sel2.from && sel1.to === sel2.to
  }

  _createSelection(token1, token2) {
    return {
      from: Math.min(token1, token2),
      to: Math.max(token1, token2)
    }
  }

  _showSelectionInBrowser() {
    this._clearSelectionInBrowser()
    for (let i=this.selection.from; i <=this.selection.to; i++) {
      $(`${this.containerSelector} .main-text-token-${i}`).addClass('token-selected')
    }
  }

  _genOnMouseLeaveDiv() {
    return () => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      // this.verbose && console.log(`Mouse leave main text div, selecting = ${this.selecting}`)
      if (this.selecting) {
        this._stopSelecting()
      }
    }
  }

  _genOnMouseLeaveToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.stopPropagation()
      this.cursorInToken = false
    }
  }

  _genOnMouseEnterToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      this.cursorInToken = true
      if (this.selecting) {
        this.tokenIndexTwo =  getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
        // console.log(`Mouse enter on token ${this.tokenIndexTwo} while selecting`)
        this._setSelection(this.tokenIndexOne, this.tokenIndexTwo)
        this._showSelectionInBrowser()
        this._processNewSelection()
      }
    }
  }

  /**
   *
   * @returns {(function(): void)|*}
   * @private
   */
  _genOnMouseUpMainTexToken() {
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      if ($(ev.target).hasClass('whitespace')) {
        return
      }
      let tokenIndex = getSingleIntIdFromClasses($(ev.target), 'main-text-token-')
      // this.verbose && console.log(`Mouse up on main text ${tokenIndex} token in apparatus edit mode`)
      if (tokenIndex === -1) {
        this.verbose && console.log(`Mouse up on a token -1`)
        return
      }

      this.tokenIndexTwo = tokenIndex
      if (!this._selectionsAreEqual(this.selection, this._createSelection(this.tokenIndexOne, this.tokenIndexTwo))) {
        this._setSelection(this.tokenIndexOne, this.tokenIndexTwo)
        this._showSelectionInBrowser()
        this._processNewSelection()
      }
      this._stopSelecting()

    }
  }

  _updateLineNumbersAndApparatuses() {
    return wait(typesetInfoDelay).then( () => {
      this.verbose && console.log(`Updating apparatuses div`)
      this.lastTypesetinfo = getTypesettingInfo(this.containerSelector, 'main-text-token-', this.edition.mainText)
      this._drawLineNumbers(this.lastTypesetinfo)
      this.options.apparatusPanels.forEach( (p) => { p.updateApparatus(this.lastTypesetinfo)})
    })
  }

  _redrawMainText() {
    $(this.getContentAreaSelector()).html(this._generateMainTextHtml())
  }

  _generateMainTextHtml() {
    switch(this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_TEXT:
      case EDIT_MODE_APPARATUS:
        return this._getMainTextHtmlVersion()

      case EDIT_MODE_TEXT_BETA:
        return  this._getMainTextBetaEditor()

      default:
         return `Error: unknown edit mode: ${this.currentEditMode}`
    }
  }

  /**
   *
   * @return {[]}
   * @private
   */
  _convertMainTextToFmtText() {
    this.debug && console.log(`Converting Main Text to Fmt Text`)
    this.debug && console.log( this.edition.mainText)
    let tokens = this.edition.mainText.map( (token) => {
      switch (token.type) {
        case EditionMainTextTokenType.GLUE:
          return FmtTextTokenFactory.normalSpace()

        case EditionMainTextTokenType.TEXT:
          return token.fmtText

        default:
          return []
      }
    })
    let theFmtText =  FmtTextFactory.fromAnything(tokens)
    this.debug && console.log(`Fmt Text:`)
    this.debug && console.log(theFmtText)
    return theFmtText
  }

  _getMainTextBetaEditor() {
    return `<div id="${betaEditorDivId}">Editor will be here</div><div id="${betaEditorInfoDiv}">Info will be here </div>`
  }

  _getMainTextHtmlVersion() {
    let fmtTextRenderer = new HtmlRenderer({plainMode : true })
    let classes = []
    return this.edition.mainText.map( (token, i) => {
      switch(token.type) {
        case EditionMainTextTokenType.GLUE:
          classes = [ 'main-text-token', `main-text-token-${i}`, 'whitespace']
          return `<span class="${classes.join(' ')}"> </span>`

        case EditionMainTextTokenType.TEXT:
          let ctIndex = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, token.editionWitnessTokenIndex)
          classes = [ 'main-text-token', `main-text-token-${i}`, `ct-index-${ctIndex}`]
          return `<span class="${classes.join(' ')} ">${fmtTextRenderer.render(token.fmtText)}</span>`

        default:
          return ''
      }
    }).join('')
  }

  _drawLineNumbers(mainTextTokensWithTypesettingInfo) {

    let lineFrequency = 5
    let mainTexDiv =  $(`${this.containerSelector} .main-text`)
    // let lineHeight = this.lang === 'la' ? "1em" : "1.5em"

    let fontBaseLineRatio = 0.920
    let lineNumberFontSizeFactor = 0.8
    let fontLineHeightFactor = 1.13
    // TODO: find this programmatically
    let mainTextFontSize = 18

    let offsetY = mainTexDiv.offset().top
    let margin = this.lang === 'la' ? 'left' : 'right'
    let posX = margin === 'left' ? 50 : 50
    let lineNumberOverlays =  mainTextTokensWithTypesettingInfo.lineMap
      .filter( (lineSpec) => { return lineSpec.line === 1 || (lineSpec.line % lineFrequency === 0)})
      .map( (lineSpec) => {
        let posY = lineSpec.pY - offsetY
        if (this.lang === 'la') {
          // TODO: do this for the other languages
          let lineOffset = mainTextFontSize*fontBaseLineRatio*(1-lineNumberFontSizeFactor)
          posY = lineSpec.pY - offsetY + lineOffset
          // console.log(`Line number for line ${lineSpec.line}: pY = ${lineSpec.pY}, offset = ${lineOffset}`)
        }

        let lineString = ApparatusCommon.getNumberString(lineSpec.line, this.lang)
        return `<div class="line-number text-${this.lang}" style="position: absolute; 
top: ${posY}px; ${margin}: ${posX}px; line-height: ${fontLineHeightFactor}em;
font-size: ${ mainTextFontSize*lineNumberFontSizeFactor}px;">${lineString}</div>`
      })
      .join('')

    $('#main-text-line-numbers').remove()
    mainTexDiv.append(`<div id="main-text-line-numbers">${lineNumberOverlays}</div>`)
  }
}