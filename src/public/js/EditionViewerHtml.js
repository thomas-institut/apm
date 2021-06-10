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

import {OptionsChecker } from '@thomas-inst/optionschecker'
import { getTypesettingInfo} from './BrowserTypesettingCalculations'
import * as TokenType from './constants/TokenType'
import { NumeralStyles } from './NumeralStyles'

const noGluePunctuation = '.,:;?!'
  + String.fromCodePoint(0x60C) // // Arabic comma
  + String.fromCodePoint(0x61F) // Arabic question mark


const doubleBar = String.fromCodePoint(0x2016)
// Space widths
const SPACE_WIDTH_NORMAL = 'normal'


// Edition token types
const E_TOKEN_TYPE_GLUE = 'glue'
const E_TOKEN_TYPE_TEXT = 'text'


export class EditionViewerHtml {

  constructor (userOptions) {

    let optionsDefinition = {
      containerSelector: { type: 'string' },
      ctData: { type: 'object' },
      apparatusArray: { type: 'Array', default: [] },
      mainTextTokens: { type: 'Array' }
    }

    let oc = new OptionsChecker(optionsDefinition, 'EditionViewer')
    this.options = oc.getCleanOptions(userOptions)

    // console.log(`EditionViewerHtml constructed with the following clean options array:`)
    // console.log(this.options)

    this.container = $(this.options.containerSelector)
    this.lang = this.options.ctData['lang']

    this.container.addClass('htmlEdition')
      .html(`Waiting to render`)

  }



  renderMainText() {
    let mainTextTokensWithSpaceObject = this._generateMainTextWithSpaces(this.options.mainTextTokens)
    let mainTextHtml = this._generateMainTextHtml(mainTextTokensWithSpaceObject)
    let html = `<div class="main-text text-${this.lang}">`
    html += mainTextHtml
    html += `</div>`
    html += `<div class="apparatuses"></div>`
    this.container.html(html)
    console.log(`Main text rendered`)
  }


  renderApparatuses() {
    const timeOut = 100
    let thisObject = this
    setTimeout(() => {
      let mainTextTokensWithTypesettingInfo =
        getTypesettingInfo(thisObject.options.containerSelector, 'main-text-token-', thisObject.options.mainTextTokens)

      console.log(`Typesetting info`)
      console.log(mainTextTokensWithTypesettingInfo)

      let html = ''
      let lastLine = ''
      thisObject.options.apparatusArray.forEach( (apparatus, i) => {
        html += `<div class="apparatus apparatus-${i} apparatus-${apparatus.type} text-${thisObject.options.ctData['lang']}">`
        apparatus.entries.forEach( (apparatusEntry, aeIndex) => {
          html += `<span class="apparatus-entry apparatus-entry-${i}-${aeIndex}">`
          let currentLine = thisObject._getLineNumberString(apparatusEntry, mainTextTokensWithTypesettingInfo)
          let lineHtml = `&nbsp;${doubleBar}&nbsp;`
          if (currentLine !== lastLine) {
             lineHtml = `<b>${currentLine}</b>`
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
        html += `</div>`
      })

      $(`${thisObject.options.containerSelector} div.apparatuses`).html(html)

      $(`${thisObject.options.containerSelector} div.apparatuses .lemma`)
        .off()
        .on('mouseenter', thisObject._genOnMouseEnterLemma())
        .on('mouseleave', thisObject._genOnMouseLeaveLemma())
    }, timeOut)
  }

  _genOnMouseEnterLemma() {
    let thisObject = this
    return (ev) => {
      let currentTarget = $(ev.currentTarget)
      let lemmaIndex = thisObject.getLemmaIndexFromElement(currentTarget)
      currentTarget.addClass('hover')

      thisObject._getMainTextTokensIndicesFromLemmaIndex(lemmaIndex).forEach( (index) => {
        $(`${thisObject.options.containerSelector} .main-text-token-${index}`).addClass('hover')
      })


    }
  }

  _genOnMouseLeaveLemma() {
    let thisObject = this
    return (ev) => {
      let currentTarget = $(ev.currentTarget)
      let lemmaIndex = thisObject.getLemmaIndexFromElement(currentTarget)
      currentTarget.removeClass('hover')
      thisObject._getMainTextTokensIndicesFromLemmaIndex(lemmaIndex).forEach( (index) => {
        $(`${thisObject.options.containerSelector} .main-text-token-${index}`).removeClass('hover')
      })


    }
  }

  _getMainTextTokensIndicesFromLemmaIndex(lemmaIndex) {
    let entry = this.options.apparatusArray[lemmaIndex[0]].entries[lemmaIndex[1]]
    let tokenIndices = []
    for (let x = entry.start; x <= entry.end; x++) {
      tokenIndices.push(x)
    }
    return tokenIndices
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

  _generateMainTextHtml(mainTextTokensWithSpaceObject) {
    return mainTextTokensWithSpaceObject.mainTextTokensWithSpace.map( (token, i) => {
      if (token.type=== E_TOKEN_TYPE_GLUE) {
        return ' '
      }
      let classes = [ 'main-text-token', `main-text-token-${mainTextTokensWithSpaceObject.tokensWithSpaceToMainTextTokensMap[i]}`]
      return `<span class="${classes.join(' ')} ">${token.text}</span>`
    }).join('')
  }

  _getSiglaHtmlFromWitnessDataArray(witnessData) {
    return witnessData.map( (wd) => { return this.options.ctData['sigla'][wd.witnessIndex]}).join('')
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

  getLemmaIndexFromElement(element) {
    let thIndex = -1
    let classes = this.getClassList(element)
    for(const theClass of classes) {
      // TODO: use class constant in regex
      if (theClass.search(/^lemma-/) !== -1) {
        thIndex = theClass.replace('lemma-', '').split('-')
        break
      }
    }
    return thIndex
  }

  getClassList(element) {
    if (element.attr('class') === undefined) {
      return []
    }
    return element.attr("class").split(/\s+/)
  }
}