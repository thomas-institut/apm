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
import Inline from 'quill/blots/inline'

import { FmtTextFactory } from '@/lib/FmtText/FmtTextFactory'
import { isRtl } from '@/toolbox/Util.ts'

import { toolbarCharactersDefinition} from './ToolbarCharactersDefinition'
import Quill from '../QuillLoader'
import Small from './QuillBlots/Small'
import Superscript from './QuillBlots/Superscript'
import NumberingLabel from './QuillBlots/NumberingLabel'
import { QuillDeltaRenderer } from './QuillDelta/QuillDeltaRenderer'
import { GenericQuillDeltaConverter } from './QuillDelta/GenericQuillDeltaConverter'


const simpleFormats = [
  'bold',
  'italic',
  'numberingLabel'
  // 'small',
  // 'superscript'
]


Inline.order = [
  'cursor', 'inline',   // Must be lower
  'underline', 'strike', 'italic', 'bold', 'numberingLabel', 'script',
  'link', 'code'        // Must be higher
];

const headingDepth = 3

const formatButtons = {
  bold: { icon: '<i class="bi bi-type-bold"></i>' , title: 'Bold'},
  italic: { icon: '<i class="bi bi-type-italic"></i>' , title: 'Italic'},
  numberingLabel:  { icon: '<small class="fte-icon">x.y</small>' , title: 'Numbering Label'}
  // small: { icon: '<small class="fte-icon">S</small>', title: 'Small Font'},
  // superscript: { icon: '<small class="fte-icon">x<sup>2</sup>', title: 'Superscript'}
}

const headingIcons = [
  '',
  '<span class="mte-icon">H<sub>1</sub></span>',
  '<span class="mte-icon">H<sub>2</sub></span>',
  '<span class="mte-icon">H<sub>3</sub></span>'
]

const toolbarSeparator = '<span class="mte-tb-sep">&nbsp;</span>'

/**
 * A one-line editor for free text
 */
export class EditionMainTextEditor {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'EditorMainTextEditor',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        lang: { type: 'string', required: true},
        verbose: { type: 'boolean', default: false},
        debug: { type: 'boolean', default: false},
        initialText: { type: 'array', default: []},
        onChange: { type: 'function', default: () => {}}
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
        numberingLabel: (attr) => { attr.numberingLabel = true; return attr}
      },
      defaultTextAttrObject: { numberingLabel: false},
      defaultGlueAttrObject: {} // for some reason, putting any attribute in glue messes everything up!
    })
    this.quillDeltaConverter = new GenericQuillDeltaConverter({
      verbose: this.verbose,
      debug: false,
      ignoreParagraphs: false,
      attrToClassTranslators: {
        numberingLabel: (value, classList) => {
          // console.log(`Attr to class `)
          if (value) {
            classList = 'numberingLabel'
          }
          return classList
        }
      }
    })



    this.setText(cleanOptions.initialText)
    this.quillEditor.on('text-change', () => {
      this.onChange(this.getText())
    })

    simpleFormats.forEach( (fmt) => {
      let btnSelector = this._getBtnSelectorFormat(fmt)
      $(btnSelector).on('click', this._genOnClickFormat(fmt, this.quillEditor, btnSelector))
    })

    for (let i = 0; i < headingDepth; i++) {
      $(this._getBtnSelectorHeading(i+1)).on('click', this._genOnClickHeadingButton(i+1, this.quillEditor))
    }

    Object.keys(toolbarCharactersDefinition[this.lang]).forEach( (key) => {
      let btnSelector = this._getBtnSelectorCharacter(key)
      $(btnSelector).on('click', this._genOnClickCharacter(key, this.quillEditor))
    })

    this.quillEditor.on('selection-change', (range, oldRange, source) => {
      if (range === null) {
        this.debug && console.log(`Editor out of focus`)
        return
      }
      if (oldRange === null) {
        oldRange = { index: -1, length: -1}
      }
      // this.debug && console.log(`Selection change from ${oldRange.index}:${oldRange.length} to ${range.index}:${range.length}, source ${source}`)
      let currentFormat = this.quillEditor.getFormat()
      simpleFormats.forEach( (fmt) => {
        setButtonState($(this._getBtnSelectorFormat(fmt)), currentFormat[fmt])
      })
      for (let i = 0; i < headingDepth; i++) {
        setButtonState($(this._getBtnSelectorHeading(i+1)), currentFormat.header === i+1)
      }
    })
  }

  getText() {
    return this.quillEditor.getText()
  }

  getQuillDelta() {
    return this.quillEditor.getContents()
  }

  getFmtText() {
    // this.debug && console.log(`Current Quill Delta`)
    // this.debug && console.log(this.getQuillDelta())
    return this.quillDeltaConverter.toFmtText(this.getQuillDelta())
  }

  /**
   *
   * @param {string|FmtTextToken[]} newText
   * @param {boolean} silent
   */
  setText(newText, silent = false) {
    this.debug && console.log(`Setting text`)
    this.debug && console.log(newText)
    let newDelta = this.quillDeltaRenderer.render(FmtTextFactory.fromAnything(newText))
    this.debug && console.log(`Setting text with new delta`)
    this.debug && console.log(newDelta)
    let source = silent ? 'silent' : 'api'
    this.quillEditor.setContents(newDelta, source)
  }

  _getBtnSelectorFormat(format) {
    return `${this.containerSelector} .${format}-btn`
  }

  _getBtnSelectorCharacter(characterKey) {
    return `${this.containerSelector} .${characterKey}-btn`
  }



  _getBtnSelectorHeading(headingNumber) {
    return `${this.containerSelector} .heading${headingNumber}-btn`
  }

  _genOnClickFormat(format, quill, buttonSelector) {
    return (ev) => {
      ev.preventDefault()
      let currentFormat = quill.getFormat()
      let currentState = false
      if (currentFormat[format] !== undefined) {
        currentState = currentFormat[format]
      }
      // console.log(`Click on format ${format}`)
      // console.log(`Current state: ${currentState}`)
      let btn = $(buttonSelector)
      quill.format(format, !currentState)
      currentState = !currentState
      setButtonState(btn, currentState)
    }
  }

  _genOnClickCharacter(characterKey, quill) {
    return (ev) => {
      ev.preventDefault()
      let range = quill.getSelection()
      if (range === null) {
        return
      }
      quill.deleteText(range.index, range.length)
      quill.insertText(range.index, toolbarCharactersDefinition[this.lang][characterKey].character)
    }
   }

  _genOnClickHeadingButton(headingNumber, quill) {
    return (ev) => {
      ev.preventDefault()
      let currentFormat = quill.getFormat()
      let currentHeading = currentFormat['header'] !== undefined ? currentFormat['header'] : -1
      if (currentHeading === headingNumber) {
        // turn off heading
        this.verbose && console.log(`Turning off heading ${currentHeading}`)
        quill.format('header', false)
        setButtonState($(this._getBtnSelectorHeading(currentHeading)), false)
      } else {
        this.verbose && console.log(`Setting heading ${headingNumber}`)
        quill.format('header', headingNumber)
        for (let i = 0; i < headingDepth; i++) {
          let buttonState = headingNumber === i+1
          setButtonState($(this._getBtnSelectorHeading(i+1)), buttonState)
        }
      }
    }
  }


  _getHtml() {

    let buttonsHtml = simpleFormats
      .map( (fmt) => {
        return `<button class="${fmt}-btn" title="${formatButtons[fmt].title}">${formatButtons[fmt].icon}</button>`
      })
      .join('')
    let headingButtonsHtml = ''
    for (let i=0;i < headingDepth; i++) {
      headingButtonsHtml += `<button class="heading${i+1}-btn" title="Heading ${i+1}">${headingIcons[i+1]}</button>`
    }

    let characterButtonsHtml = Object.keys(toolbarCharactersDefinition[this.lang]).map( (key) => {
      let btnDef = toolbarCharactersDefinition[this.lang][key]
      let char = isRtl(this.lang) && btnDef['rtlVersion'] !== undefined ? btnDef['rtlVersion'] : btnDef.character
      return `<button class="${key}-btn" title="${btnDef.title}">${char}</button>`
    }).join('')
    return `<div class="fte-toolbar text-${this.lang}">${buttonsHtml}${toolbarSeparator}${headingButtonsHtml}${toolbarSeparator}${characterButtonsHtml}</div>
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

// Initialization
Quill.register({
  'formats/small' : Small,
  'formats/superscript' : Superscript,
  'formats/numberingLabel': NumberingLabel
}, true)