/**
 * Edition  Panel.
 *
 *  - Edition text and apparatus manipulation in a printed edition type user interface
 */
import { Panel } from './Panel'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import { CriticalApparatusGenerator } from '../CriticalApparatusGenerator'
import { maximizeElementHeightInParent} from '../toolbox/UserInterfaceUtil'
import {getTypesettingInfo} from '../BrowserTypesettingCalculations'
import { wait } from '../toolbox/FunctionUtil'
import { NumeralStyles } from '../NumeralStyles'
import { MultiToggle } from '../widgets/MultiToggle'
import { BootstrapTabGenerator } from '../multi-panel-ui/BootstrapTabGenerator'
import { capitalizeFirstLetter } from '../toolbox/Util.mjs'
import * as ApparatusType from '../constants/ApparatusType'
import { CRITICUS } from '../constants/ApparatusType'

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

const typesetInfoDelay = 200

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
  }

  _recalculateCriticalApparatusIfNeeded() {
    if (!this.upToDate) {
      let apparatusGenerator = new CriticalApparatusGenerator()
      let generatedCriticalApparatus = apparatusGenerator.generateCriticalApparatus(this.ctData, this.ctData['witnessOrder'][0])
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
    return `<div class="panel-toolbar"><div class="panel-toolbar-group" id="edition-panel-mode-toggle"></div></div>`
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
            this.verbose && console.log(`Maximizing apparatus ${index}`)
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
    this.modeToggle = new MultiToggle({
      containerSelector: '#edition-panel-mode-toggle',
      title: '',
      buttonClass: 'tb-button',
      initialOption: this.currentEditMode,
        wrapButtonsInDiv: true,
        buttonsDivClass: 'panel-toolbar-item',
        buttonDef: [
          { label: 'Edit Off', name: 'off', helpText: 'Turn off editing'},
          { label: 'Main Text', name: 'text', helpText: 'Edit main text'},
          { label: 'Apparatus', name: 'apparatus', helpText: 'Add/Edit apparatus entries'},
        ],
      onToggle: (ev) => {
        // TODO: implement onToggle
        console.log(`Edition Panel edit mode changed`)
      }
    })
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
      $(`${thisObject.options.containerSelector} div.apparatuses`).html(thisObject._generateApparatusesHtml())
    })
  }

  _generateMainTextHtml(mainTextTokensWithSpaceObject) {
    return mainTextTokensWithSpaceObject.mainTextTokensWithSpace.map( (token, i) => {
      if (token.type=== E_TOKEN_TYPE_GLUE) {
        return ' '
      }
      let classes = [ 'main-text-token', `main-text-token-${mainTextTokensWithSpaceObject.tokensWithSpaceToMainTextTokensMap[i]}`]
      return `<span class="${classes.join(' ')} ">${token.text}</span>`
    }).join('')
  }

  _generateApparatusesHtml() {
    if (!this.upToDate) {
      console.warn(`Trying to generate apparatuses html with out of date edition`)
      return 'Apparatuses coming soon...'
    }
    let mainTextTokensWithTypesettingInfo =
      getTypesettingInfo(this.options.containerSelector, 'main-text-token-', this.mainTextTokens)

    // this.verbose && console.log(`Typesetting info`)
    // this.verbose && console.log(mainTextTokensWithTypesettingInfo)

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
          contentClasses: [ 'apparatus',`apparatus-${i}`, `text-${thisObject.ctData['lang']}`],
          content: () => {
            html = ''
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
              apparatusEntry.entries.forEach( (subEntry, subEntryIndex) => {
                let subEntryTitle = ''
                if (subEntry.type === 'addition') {
                  subEntryTitle =  '+'
                }
                if (subEntry.type === 'omission') {
                  subEntryTitle = '-'
                }
                html+=  `<span class="sub-entry sub-entry-${subEntryIndex}">${subEntryTitle} ${subEntry.text} ${thisObject._getSiglaHtmlFromWitnessDataArray(subEntry.witnessData)}</span>`
                html += '&nbsp;&nbsp;&nbsp;'
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

  _getNumberString(n) {
    if (this.lang === 'ar') {
      return NumeralStyles.toDecimalArabic(n)
    }
    return NumeralStyles.toDecimalWestern(n)
  }


  _getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo) {
    if (mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.start] === undefined) {
      // before the main text
      return this._getNumberString(1)
    }

    let startLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.start].lineNumber
    let endLine = startLine
    if (mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.end] === undefined) {
      endLine = '???'
    }
    endLine = mainTextTokensWithTypesettingInfo.tokens[apparatusEntry.end].lineNumber
    if (startLine === endLine) {
      return this._getNumberString(startLine)
    }
    return `${this._getNumberString(startLine)}-${this._getNumberString(endLine)}`
  }

  _getSiglaHtmlFromWitnessDataArray(witnessData) {
    return witnessData.map( (wd) => { return this.options.ctData['sigla'][wd.witnessIndex]}).join('')
  }

  _getTitleForApparatusType(type) {
    return 'Apparatus ' + capitalizeFirstLetter(type)
  }



}