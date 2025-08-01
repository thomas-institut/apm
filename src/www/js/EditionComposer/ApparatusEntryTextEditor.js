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
import { doNothing } from '../toolbox/FunctionUtil.mjs'
import {toolbarCharacters} from '../defaults/ToolbarCharacters'

import Quill from '../QuillLoader'
import Small from './QuillBlots/Small'
import Superscript from './QuillBlots/Superscript'
import Sigla from './QuillBlots/Sigla'
import { QuillDeltaRenderer } from '../FmtText/Renderer/QuillDeltaRenderer'
import { CustomApparatusQuillDeltaConverter } from './QuillDelta/CustomApparatusQuillDeltaConverter'
import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import { FmtTextUtil } from '../FmtText/FmtTextUtil.mjs'
import { isRtl, removeWhiteSpace } from '../toolbox/Util.mjs'

const toolbarSeparator = '<span class="mte-tb-sep">&nbsp;</span>'

const simpleFormats = [
  'bold',
  'italic',
  'small',
  'superscript',
//  'sigla'
]


const buttons = {
  bold: { icon: '<i class="bi bi-type-bold"></i>' , title: 'Bold'},
  italic: { icon: '<i class="bi bi-type-italic"></i>' , title: 'Italic'},
  small: { icon: '<small class="fte-icon">S</small>', title: 'Small Font'},
  superscript: { icon: '<small class="fte-icon">x<sup>2</sup>', title: 'Superscript'},
  //sigla: { icon: '<span class="fte-icon">Sig</span>', title: 'Sigla'},
}

/**
 * A one-line editor for free text
 */
export class ApparatusEntryTextEditor {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EntryFreeTextEditor',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        lang: { type: 'string', required: true},
        verbose: { type: 'boolean', default: false},
        debug: { type: 'boolean', default: false},
        initialText: { type: 'array', default: []},
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
    this.quillEditor = new Quill(`${this.containerSelector} .fte-editor`,{})
    this.onChange = cleanOptions.onChange
    this.quillDeltaRenderer = new QuillDeltaRenderer({
      classToAttrTranslators: {
        sigla: (attr) => { attr.sigla = true; return attr}
      }
    })

    this.setText(cleanOptions.initialText)
    this.quillEditor.on('text-change', () => {
      this.onChange(this.getText())
    })

    simpleFormats.forEach( (fmt) => {
      let btnSelector = this._getBtnSelector(fmt)
      $(btnSelector).on('click', this._genOnClickFormat(fmt, this.quillEditor, btnSelector))
    })

    Object.keys(toolbarCharacters[this.lang]).forEach( (key) => {
      let btnSelector = this._getBtnSelectorCharacter(key)
      $(btnSelector).on('click', this._genOnClickCharacterButton(key, this.quillEditor))
    })

    this.quillEditor.on('selection-change', (range, oldRange, source) => {
      if (range === null) {
        this.debug && console.log(`Editor out of focus`)
        return
      }
      if (oldRange === null) {
        oldRange = { index: -1, length: -1}
      }
      this.debug && console.log(`Selection change from ${oldRange.index}:${oldRange.length} to ${range.index}:${range.length}, source ${source}`)
      let currentFormat = this.quillEditor.getFormat()
      this.debug && console.log(`Current format`)
      this.debug && console.log(currentFormat)
      simpleFormats.forEach( (fmt) => {
        setButtonState($(this._getBtnSelector(fmt)), currentFormat[fmt])
      })
    })
  }

  getText() {
    return this.quillEditor.getText()
  }


  getQuillDelta() {
    return this.quillEditor.getContents()
  }

  getFmtText() {
    let fmtText = CustomApparatusQuillDeltaConverter.toFmtText(this.getQuillDelta())
    if (removeWhiteSpace(FmtTextUtil.getPlainText(fmtText)) === '' ) {
      // only white space, report no text
      return []
    }
    return fmtText
  }

  /**
   *
   * @param {string|FmtTextToken[]} newText
   * @param {boolean} silent
   */
  setText(newText, silent = false) {
    let newDelta = this.quillDeltaRenderer.render(FmtTextFactory.fromAnything(newText))
    // this.debug && console.log(`Setting text with new delta`)
    // this.debug && console.log(newDelta)
    let source = silent ? 'silent' : 'api'
    this.quillEditor.setContents(newDelta, source)
  }

  _getBtnSelector(format) {
    return `${this.containerSelector} .${format}-btn`
  }

  _getBtnSelectorCharacter(characterKey) {
    return `${this.containerSelector} .${characterKey}-btn`
  }


  _genOnClickCharacterButton(key, quill) {
    return (ev) => {
      ev.preventDefault()
      let range = quill.getSelection()
      if (range === null) {
        return
      }
      quill.deleteText(range.index, range.length)
      quill.insertText(range.index, toolbarCharacters[this.lang][key].character)
    }
  }

  _genOnClickFormat(format, quill, buttonSelector) {
    return (ev) => {
      ev.preventDefault()
      this.debug && console.log(`Click on '${format}' button`)
      let currentFormat = quill.getFormat()
      let currentState = currentFormat[format]
      if (currentState === undefined) {
        currentState = false
      }
      this.debug && console.log(`Current format state: ${currentState}`)
      let btn = $(buttonSelector)
      quill.format(format, !currentState)
      currentState = !currentState
      setButtonState(btn, currentState)
    }
  }


  _getHtml() {
    let buttonsHtml = simpleFormats
      .map( (fmt) => {
        return `<button class="${fmt}-btn" title="${buttons[fmt].title}">${buttons[fmt].icon}</button>`
      })
      .join('')

    let characterButtonsHtml = Object.keys(toolbarCharacters[this.lang]).map( (key) => {
      let btnDef = toolbarCharacters[this.lang][key]
      let char = isRtl(this.lang) && btnDef['rtlVersion'] !== undefined ? btnDef['rtlVersion'] : btnDef.character
      return `<button class="${key}-btn" title="${btnDef.title}">${char}</button>`
    }).join('')
    return `<div class="fte-toolbar text-${this.lang}">${buttonsHtml}${toolbarSeparator}${characterButtonsHtml}</div>
<div class="fte-editor text-${this.lang}"></div>`
  }
}


function setButtonState(btn, state) {
  if (state) {
    btn.addClass('on')
  } else {
    btn.removeClass('on')
  }
}

// Initialize Quill extra blots
Quill.register({
  'formats/small' : Small,
  'formats/superscript' : Superscript,
  'formats/sigla': Sigla
}, true)