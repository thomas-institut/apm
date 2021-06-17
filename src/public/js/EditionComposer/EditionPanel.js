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
import { Panel } from './Panel'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { CriticalApparatusGenerator } from '../CriticalApparatusGenerator'
import { getIdFromClasses, maximizeElementHeightInParent } from '../toolbox/UserInterfaceUtil'
import {getTypesettingInfo} from '../BrowserTypesettingCalculations'
import { wait } from '../toolbox/FunctionUtil'
import { MultiToggle } from '../widgets/MultiToggle'
import { BootstrapTabGenerator } from '../multi-panel-ui/BootstrapTabGenerator'
import { capitalizeFirstLetter } from '../toolbox/Util.mjs'
import * as ApparatusType from '../constants/ApparatusType'
import { EditableTextField } from '../widgets/EditableTextField'
import { ApparatusEntryInput } from './ApparatusEntryInput'
import { ApparatusCommon } from './ApparatusCommon'

const noGluePunctuation = '.,:;?!'
  + String.fromCodePoint(0x60C) // // Arabic comma
  + String.fromCodePoint(0x61F) // Arabic question mark


const doubleVerticalLine = String.fromCodePoint(0x2016)
const verticalLine = String.fromCodePoint(0x007c)

// Space widths
const SPACE_WIDTH_NORMAL = 'normal'


// Edition token types
const E_TOKEN_TYPE_GLUE = 'glue'
const E_TOKEN_TYPE_TEXT = 'text'

const EDIT_MODE_OFF = 'off'
const EDIT_MODE_TEXT = 'text'
const EDIT_MODE_APPARATUS = 'apparatus'

const typesetInfoDelay = 200

const icons = {
  addEntry: '<i class="bi bi-plus-lg"></i>'
}

export class EditionPanel extends Panel{

  constructor (options = {}) {
    super(options)
    let optionsDefinition = {
      containerSelector: { type: 'string' },
      ctData: { type: 'object' }
    }

    let oc = new OptionsChecker(optionsDefinition, 'Edition Panel')
    this.options = oc.getCleanOptions(options)
    this.ctData = this.options.ctData
    this.upToDate = false
    this.mainTextTokens = []
    this.apparatusArray = []
    this.lang = this.options.ctData['lang']
    this.lastMode = ''
    this.alreadyShown = false
    this.apparatusLineSeparator = doubleVerticalLine
    this.entrySeparator = verticalLine
    this.currentEditMode = 'off'
    this.editingTextToken = false
    this.originalTokenText = '__null__'
    this.tokenBeingEdited = -1
    this.textTokenEditor = null
    this.selection = { from: -1, to: -1}
    this.selecting = false
    this.cursorInToken = false
    this.tokenIndexOne = -1
    this.tokenIndexTwo = -1
  }

  _recalculateCriticalApparatusIfNeeded() {
    if (!this.upToDate) {
      let apparatusGenerator = new CriticalApparatusGenerator()
      let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatus(this.ctData)
      this.mainTextTokens = generatedCriticalApparatus['mainTextTokens']
      this.apparatusArray = [ { type: ApparatusType.CRITICUS, entries: generatedCriticalApparatus['criticalApparatus']} ].concat(
        this.ctData['customApparatuses']
      )
      this.upToDate = true
    }
  }

  generateHtml (tabId, mode, visible) {
    if (!visible) {
      if (mode !== this.lastMode) {
        this.alreadyShown = false
      }
      return `Waiting to be shown to generate content`
    }
    this.alreadyShown = true
    this._recalculateCriticalApparatusIfNeeded()
    let mainTextTokensWithSpaceObject = this._generateMainTextWithSpaces(this.mainTextTokens)
    let mainTextHtml = this._generateMainTextHtml(mainTextTokensWithSpaceObject)
    return `${this._getToolbarHtml()}
<div class="panel-content-area">
    <div class="main-text text-${this.lang}">${mainTextHtml}</div>
    <div class="content-divider"></div>
    <div class="apparatuses direction-${this._getTextDirection()}">... Apparatus coming soon ...</div>
</div>`
  }

  _getToolbarHtml() {
    return `<div class="panel-toolbar">
        <div class="panel-toolbar-group">
            <div class="panel-toolbar-group" id="edition-panel-mode-toggle"></div>
            <div class="panel-toolbar-group apparatus-toolbar">
                <div class="panel-toolbar-item">
                    <a class="add-entry-btn tb-button hidden" href="#" title="Add custom apparatus entry">${icons.addEntry}</a>
                </div>
            </div>
        </div>
    </div>`
  }

  getContentClasses () {
    return [ 'htmlEdition']
  }

  onResize () {
    if (!this.alreadyShown) {
      this.verbose && console.log(`Edition panel resize but not shown yet, nothing to do`)
      return
    }
    this.verbose && console.log(`Resize edition pane`)
    let containerSelector = this.options.containerSelector
    let panelContentDiv = $(`${containerSelector} .panel-content-area`)
    let toolbarDiv = $(`${containerSelector} .panel-toolbar`)

    maximizeElementHeightInParent(panelContentDiv, $(containerSelector), toolbarDiv.outerHeight())
    this.verbose && console.log(`Resize: about to update apparatuses`)
    let thisObject = this
    this._updateApparatusesDiv()
      .then( () => {
          let apparatusTabsHeight = $('#apparatus-tabs').outerHeight()
          let apparatusesDiv = $(`${containerSelector} .apparatuses`)
          thisObject.apparatusArray.forEach( (apparatus, index) => {
            // this.verbose && console.log(`Maximizing apparatus ${index}`)
            maximizeElementHeightInParent($(`#apparatus-${index}-div`), apparatusesDiv, apparatusTabsHeight)
          })
      })
     .finally( () => { thisObject.verbose && console.log(`Done resizing`)})

  }

  onShown () {
    this.verbose && console.log(`Edition Panel shown`)
    let thisObject = this
    if (!this.alreadyShown) {
      this.alreadyShown = true
      this.reDraw(this.generateHtml('', '', true))
      this._updateApparatusesDiv()
        .then( () => { thisObject.verbose && console.log(`Finished generating edition panel on shown`) })
    }
  }

  postRender (id, mode, visible) {
    this.verbose && console.log(`Post render edition pane`)
    this.onResize()
    let thisObject = this
    this.modeToggle = new MultiToggle({
      containerSelector: '#edition-panel-mode-toggle',
      title: '',
      buttonClass: 'tb-button',
      initialOption: this.currentEditMode,
        wrapButtonsInDiv: true,
        buttonsDivClass: 'panel-toolbar-item',
        buttonDef: [
          { label: 'Edit Off', name: EDIT_MODE_OFF, helpText: 'Turn off editing'},
          { label: 'Main Text', name: EDIT_MODE_TEXT, helpText: 'Edit main text'},
          { label: 'Apparatus', name: EDIT_MODE_APPARATUS, helpText: 'Add/Edit apparatus entries'},
        ]

    })
    this.modeToggle.on('toggle',  (ev) => {
      thisObject.currentEditMode = ev.detail.currentOption
      thisObject.verbose && console.log(`Edit mode changed to ${thisObject.currentEditMode}`)
      if (thisObject.editingTextToken) {
        thisObject._stopEditingMainText(thisObject.originalTokenText)
      }
      thisObject._clearSelection()
    })
    this._eleAddEntryButton().on('click', this._genOnClickAddEntryButton())
    this._setupMainTextDivEventHandlers()
  }

  _getLemmaFromSelection() {
    if (this.isSelectionEmpty()) {
      return ''
    }
    let lemma = ''
    for (let i=this.selection.from; i <= this.selection.to; i++) {
      lemma += $(`${this.options.containerSelector} .main-text-token-${i}`).text() + ' '
    }
    return lemma
  }

  _genOnClickAddEntryButton() {
    let thisObject = this
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      thisObject.verbose && console.log(`Click on add entry button`)
      let aei = new ApparatusEntryInput({
        apparatuses:[ { name: 'criticus', title: 'Criticus'}, { name: 'fontium', title: 'Fontium'}],
        lemma: this._getLemmaFromSelection(),
        lang: this.lang
      })
      aei.getEntry().then( (newEntry) => {
        thisObject.verbose && console.log(`Got new entry`)
        thisObject.verbose && console.log(newEntry)
      }).catch( (reason) => {
        thisObject.verbose && console.log(`FAIL: ${reason}`)
      })
    }
  }

  _setupMainTextDivEventHandlers() {
    $(`${this.options.containerSelector} .main-text`)
      .on('click', this._genOnClickMainTextDiv())
      .on('mousedown', this._genOnMouseDownMainTextDiv())
      .on('mouseup', this._genOnMouseUpMainTextDiv())
      .on('mouseleave', this._genOnMouseLeaveDiv())
    $(`${this.options.containerSelector} span.main-text-token`)
      .on('click', this._genOnClickMainTextToken())
      .on('mousedown', this._genOnMouseDownMainTextToken())
      .on('mouseup', this._genOnMouseUpMainTexToken())
      .on('mouseenter', this._genOnMouseEnterToken())
      .on('mouseleave', this._genOnMouseLeaveToken())
  }

  _genOnMouseDownMainTextDiv() {
    let thisObject = this
    return (ev) => {

      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      this._stopSelecting()
      this._clearSelection()
    }
  }

  _genOnMouseUpMainTextDiv() {
    let thisObject = this
    return (ev) => {
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // thisObject.verbose && console.log(`Mouse up on main text div`)
      if (thisObject.cursorInToken) {
        return
      }
      if (thisObject.selecting) {
        thisObject._stopSelecting()
        thisObject._clearSelection()
      }
    }
  }


  _genOnClickMainTextDiv() {
    let thisObject = this
    return (ev) => {
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      // thisObject.verbose && console.log(`Click on main text div`)
    }
  }

  _genOnClickMainTextToken() {
    return (ev) => {
      ev.stopPropagation()
    }
  }

  _genOnMouseDownMainTextToken() {
    // TODO: deal with right mouse click
    let thisObject = this
    return (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      let tokenIndex = getIdFromClasses($(ev.target), 'main-text-token-')
      if (thisObject.editingTextToken) {
        return
      }
      switch(thisObject.currentEditMode) {
        case EDIT_MODE_TEXT:
          thisObject.verbose && console.log(`Click on main text token ${tokenIndex} in main text edit mode`)
          let tokenSelector = `.main-text-token-${tokenIndex}`
          thisObject.originalTokenText = $(tokenSelector).text()
          thisObject.tokenBeingEdited = tokenIndex
          thisObject.textTokenEditor = new EditableTextField({
            containerSelector:  tokenSelector,
            initialText: thisObject.originalTokenText,
            startInEditMode: true
          })
          thisObject.textTokenEditor.on('confirm', (ev) => {
            let newText = ev.detail.newText
            console.log(`Confirming editing, new text = '${newText}'`)
            // TODO: actually change the token in ctData and trigger updates in other panels
            thisObject._stopEditingMainText(newText)
          }).on('cancel', () => {
            console.log(`Canceling edit`)
            thisObject._stopEditingMainText(thisObject.originalTokenText)
          })
          thisObject.editingTextToken = true
          break

        case EDIT_MODE_APPARATUS:
          // thisObject.verbose && console.log(`Mouse down on main text ${tokenIndex} token in apparatus edit mode`)
          thisObject._setSelection(tokenIndex, tokenIndex)
          thisObject.tokenIndexOne = tokenIndex
          thisObject._showSelectionInBrowser()
          thisObject._processNewSelection()
          thisObject._startSelecting()
          break
      }
    }
  }

  _stopEditingMainText(text) {
    if (this.editingTextToken)  {
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

  _eleAddEntryButton() {
    return $(`${this.options.containerSelector} a.add-entry-btn`)
  }

  _processNewSelection() {
    this.verbose && console.log(`New selection: ${this.selection.from} -> ${this.selection.to}`)
    let addEntryButton = this._eleAddEntryButton()
    if (this.isSelectionEmpty()) {
      addEntryButton.addClass('hidden')
    } else {
      addEntryButton.removeClass('hidden')
    }
  }

  isSelectionEmpty() {
    return this.selection.from === -1
  }

  _clearSelectionInBrowser() {
    $(`${this.options.containerSelector} .main-text-token`).removeClass('token-selected')
    $(`${this.options.containerSelector} .whitespace`).removeClass('token-selected')
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
      $(`${this.options.containerSelector} .main-text-token-${i}`).addClass('token-selected')
      if (i !== this.selection.to) {
        $(`${this.options.containerSelector} .whitespace-token-${i}`).addClass('token-selected')
      }
    }
  }

  _genOnMouseLeaveDiv() {
    let thisObject = this
    return () => {
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      // thisObject.verbose && console.log(`Mouse leave main text div, selecting = ${thisObject.selecting}`)
      if (thisObject.selecting) {
        thisObject._stopSelecting()
      }
    }
  }

  _genOnMouseLeaveToken() {
    let thisObject = this
    return (ev) => {
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.stopPropagation()
      thisObject.cursorInToken = false
    }
  }

  _genOnMouseEnterToken() {
    let thisObject = this
    return (ev) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      thisObject.cursorInToken = true
      if (thisObject.selecting) {
        this.tokenIndexTwo =  getIdFromClasses($(ev.target), 'main-text-token-')
        // console.log(`Mouse enter on token ${thisObject.tokenIndexTwo} while selecting`)
        thisObject._setSelection(thisObject.tokenIndexOne, thisObject.tokenIndexTwo)
        thisObject._showSelectionInBrowser()
        thisObject._processNewSelection()
      }
    }
  }

  _genOnMouseUpMainTexToken() {
    let thisObject = this
    return (ev) => {
      if (thisObject.currentEditMode !== EDIT_MODE_APPARATUS) {
        return
      }
      ev.preventDefault()
      ev.stopPropagation()
      let tokenIndex = getIdFromClasses($(ev.target), 'main-text-token-')
      // thisObject.verbose && console.log(`Mouse up on main text ${tokenIndex} token in apparatus edit mode`)
      if (tokenIndex === -1) {
        console.log(`Mouse up on a token -1`)
        return
      }

      thisObject.tokenIndexTwo = tokenIndex
      if (!thisObject._selectionsAreEqual(thisObject.selection, thisObject._createSelection(thisObject.tokenIndexOne, thisObject.tokenIndexTwo))) {
        thisObject._setSelection(thisObject.tokenIndexOne, thisObject.tokenIndexTwo)
        thisObject._showSelectionInBrowser()
        thisObject._processNewSelection()
      }
      thisObject._stopSelecting()

    }
  }

  _getTextDirection() {
    if (this.lang === 'he' || this.lang === 'ar') {
      return 'rtl'
    }
    return 'ltr'
  }

  _generateMainTextWithSpaces(mainTextTokens) {
    let mainTextTokensWithSpace = []
    let firstWordAdded = false
    let inputTokensToMainText = []
    let currentMainTextIndex = -1
    for(let i = 0; i < mainTextTokens.length; i++) {
      let mainTextToken = mainTextTokens[i]
      let tokenType = mainTextToken['type']

      if (tokenType !== 'text'){
        inputTokensToMainText.push(-1)
        continue
      }
      let tokenText = mainTextToken['text']
      if (tokenText === undefined) {
        inputTokensToMainText.push(-1)
        console.warn(`Found main text token with no text at index ${i}`)
        continue
      }

      let addGlue = true
      if (!firstWordAdded) {
        addGlue = false
      }
      if (noGluePunctuation.includes(tokenText)) {
        addGlue = false
      }
      if (addGlue) {
        currentMainTextIndex++
        mainTextTokensWithSpace.push({
          type: E_TOKEN_TYPE_GLUE,
          space: SPACE_WIDTH_NORMAL,
        })
        inputTokensToMainText.push(-1)
      }
      currentMainTextIndex++
      mainTextTokensWithSpace.push(mainTextToken)
      firstWordAdded = true
      inputTokensToMainText.push(i)
    }
    return {
      mainTextTokensWithSpace: mainTextTokensWithSpace,
      tokensWithSpaceToMainTextTokensMap: inputTokensToMainText
    }
  }

  _updateApparatusesDiv() {
    let thisObject = this
    return wait(typesetInfoDelay).then( () => {
      thisObject.verbose && console.log(`Updating apparatuses div`)
      let apparatusesDiv = $(`${thisObject.options.containerSelector} div.apparatuses`)
      if (!thisObject.upToDate) {
        console.warn(`Trying to generate apparatuses html with out of date edition`)
        apparatusesDiv.html( 'Apparatuses coming soon...')
        return
      }
      let mainTextTokensWithTypesettingInfo =
        getTypesettingInfo(this.options.containerSelector, 'main-text-token-', this.mainTextTokens)
      this.verbose && console.log(`Typesetting info`)
      this.verbose && console.log(mainTextTokensWithTypesettingInfo)
      this._drawLineNumbers(mainTextTokensWithTypesettingInfo)
      apparatusesDiv.html(thisObject._generateApparatusesHtml(mainTextTokensWithTypesettingInfo))
    })
  }

  _generateMainTextHtml(mainTextTokensWithSpaceObject) {
    let lastTokenIndex = -1
    return mainTextTokensWithSpaceObject.mainTextTokensWithSpace.map( (token, i) => {
      if (token.type=== E_TOKEN_TYPE_GLUE) {
        if (lastTokenIndex !== -1) {
          return `<span class="whitespace whitespace-token-${lastTokenIndex}"> </span>`
        }
        return ''
      }
      let tokenIndex = mainTextTokensWithSpaceObject.tokensWithSpaceToMainTextTokensMap[i]
      let classes = [ 'main-text-token', `main-text-token-${tokenIndex}`, `ct-index-${token.collationTableIndex}`]
      lastTokenIndex = tokenIndex
      return `<span class="${classes.join(' ')} ">${token.text}</span>`
    }).join('')
  }

  _drawLineNumbers(mainTextTokensWithTypesettingInfo) {

    let lineFrequency = 5
    let mainTexDiv =  $(`${this.options.containerSelector} .main-text`)
    let lineHeight = this.lang === 'la' ? "1em" : "1.5em"

    let offsetY = mainTexDiv.offset().top
    let margin = this.lang === 'la' ? 'left' : 'right'
    let posX = margin === 'left' ? 50 : 50
    let thisObject = this
    let lineNumberOverlays =  mainTextTokensWithTypesettingInfo.lineMap
      .filter( (lineSpec) => { return lineSpec.line === 1 || (lineSpec.line % lineFrequency === 0)})
      .map( (lineSpec) => {
        let posY = lineSpec.pY - offsetY
        let lineString = ApparatusCommon.getNumberString(lineSpec.line, this.lang)
        return `<div class="line-number text-${thisObject.lang}" style="position: absolute; top: ${posY}px; ${margin}: ${posX}px; line-height: ${lineHeight}">${lineString}</div>`
      })
      .join('')

    $('#main-text-line-numbers').remove()
    mainTexDiv.append(`<div id="main-text-line-numbers">${lineNumberOverlays}</div>`)
  }

  _generateApparatusesHtml(mainTextTokensWithTypesettingInfo) {
    let html = ''
    let lastLine = ''
    let thisObject = this
    let tabGen = new BootstrapTabGenerator({
      id: 'apparatus-tabs',
      tabs: this.apparatusArray.map( (apparatus, i) => {
        let tabTitle = thisObject._getTitleForApparatusType(apparatus.type)
        return {
          id: `apparatus-${i}-div`,
          title: tabTitle,
          linkTitle: `Click to see apparatus ${thisObject._getTitleForApparatusType(apparatus.type)}`,
          contentClasses: [ 'apparatus',`apparatus-${i}`, `text-${thisObject.lang}`],
          content: () => {
            html = ''
            thisObject.verbose && console.log(`Generating html for apparatus ${tabTitle}`)
            thisObject.verbose && console.log(apparatus)
            apparatus.entries.forEach( (apparatusEntry, aeIndex) => {
              html += `<span class="apparatus-entry apparatus-entry-${i}-${aeIndex}">`
              let currentLine = thisObject._getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo)
              let lineHtml = `&nbsp;${thisObject.entrySeparator}&nbsp;`
              if (currentLine !== lastLine) {
                let lineSep = aeIndex !== 0 ? `${thisObject.apparatusLineSeparator}&nbsp;` : ''
                lineHtml = `${lineSep}<b class="apparatus-line-number">${currentLine}</b>`
                lastLine = currentLine
              }
              html +=  `${lineHtml} <span class="lemma lemma-${i}-${aeIndex}">${apparatusEntry.lemma}</span>] `
              apparatusEntry.subEntries.forEach( (subEntry, subEntryIndex) => {
                html+= `<span class="sub-entry sub-entry-${subEntryIndex}">
                            ${ApparatusCommon.genSubEntryHtmlContent(thisObject.lang, subEntry, thisObject.ctData['sigla'])}
                        </span>&nbsp;&nbsp;&nbsp;`
              })
              html += '</span>'
            })
            if (html === '') {
              html = `<i>... empty ...</i>`
            }
            return html
          }
        }
      })
    })

    return tabGen.generateHtml()
  }

  _getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo) {
    if (mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.start] === undefined) {
      // before the main text
      return ApparatusCommon.getNumberString(1, this.lang)
    }

    let startLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.start].lineNumber
    let endLine = startLine
    if (mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.end] === undefined) {
      endLine = '???'
    }
    endLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.end].lineNumber
    if (startLine === endLine) {
      return  ApparatusCommon.getNumberString(startLine, this.lang)
    }
    return `${ApparatusCommon.getNumberString(startLine, this.lang)}-${ApparatusCommon.getNumberString(endLine, this.lang)}`
  }


  _getTitleForApparatusType(type) {
    return 'Apparatus ' + capitalizeFirstLetter(type)
  }



}