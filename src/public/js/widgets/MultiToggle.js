/*
 *  Copyright (C) 2020 Universität zu Köln
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
 *
 *  Widget that allows the user to choose one of a number of options with toggled buttons
 *  and emits an even when a new option is active
 *
 */

import {OptionsChecker} from '@thomas-inst/optionschecker'

export const optionChange = 'toggle'

const defaultHoverClass = 'multitoggle-hover'
const defaultOnClass = 'multitoggle-on'
const defaultButtonClass = 'multitoggle-btn'
const defaultButtonDiv = 'multitoggle-btn-div'
const titleClass = 'multitoggle-title'

export class MultiToggle {

  constructor (options) {

    let optionsDefinition = {
      containerSelector : { type: 'string', required: true},
      title: { type: 'string', required: false, default: ''},
      onClass: { type: 'string', required: false, default: defaultOnClass},
      buttonClass: {type: 'string', required: false, default: defaultButtonClass},
      hoverClass: {type: 'string', required: false, default: defaultHoverClass},
      buttonDef: { type: 'Array', required: true},
      wrapButtonsInDiv: { type: 'boolean', required: false, default: false},
      buttonsDivClass: {type: 'string', required: false, default: defaultButtonDiv},
      initialOption: { type: 'string', required:false, default: ''},
      onToggle : {
        type: 'function',
        required: false,
        default: null
      },
    }

    let buttonDefDefinition = {
       label: { type: 'string', required:true},
       name: { type: 'string', required: true},
       helpText: { type: 'string', required: false, default: ''}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "MultiToggle"})
    this.options = oc.getCleanOptions(options)

    // check button definitions
    if (this.options.buttonDef.length < 2) {
      console.error('Less than two buttons defined in multi toggle')
    }

    this.buttonDef = this.options.buttonDef.map( (def, i) => {
      let checker = new OptionsChecker({optionsDefinition: buttonDefDefinition, context: `MultiToggle Button Def ${i}`})
      return checker.getCleanOptions(def)
    })

    if (this.options.initialOption === '') {
      this.currentOptionIndex = 0
    } else {
      this.currentOptionIndex = this.buttonDef.findIndex( def => { return def.name === this.options.initialOption})
    }

    this.container = $(this.options.containerSelector)
    this.container.html(this.getWidgetHtml())
    // save button elements
    this.buttonDef = this.buttonDef.map( (def, i) => {
      def.element = $(this.getButtonSelectorWithIndex(i))
      return def
    })
    //console.log(this.buttonDef)

    this.buttonDef.forEach( (def, i) => {
      def.element.on('click', this.genOnClickButton(i))
    })
  }


  getWidgetHtml() {

    let html = ''
    html += this.options.title !== '' ?  this._wrapInDiv(`<span class="${titleClass}">${this.options.title}</span>`) : ''
    html += this.buttonDef.map( (def, i) => {
      let buttonClasses = []
      buttonClasses.push(this.options.buttonClass)
      buttonClasses.push(this.options.buttonClass + '-' + i)
      if (i===this.currentOptionIndex) {
        buttonClasses.push(this.options.onClass)
      }
      return this._wrapInDiv(`<a href='#' class="${ buttonClasses.join(' ')}" title="${def.helpText}">${def.label}</a>`)
    }).join('')
    return html
  }

  _wrapInDiv(html) {
    if (this.options.wrapButtonsInDiv) {
      return `<div class="${this.options.buttonsDivClass}">${html}</div>`
    } else {
      return html
    }
  }

  genOnClickButton(index) {
    let thisObject = this
    return function(ev) {
      if (thisObject.currentOptionIndex === index) {
        // nothing to do
        return false
      }
      thisObject.buttonDef[thisObject.currentOptionIndex].element.removeClass(thisObject.options.onClass)
      let lastOption = thisObject.currentOptionIndex
      thisObject.currentOptionIndex = index
      thisObject.buttonDef[thisObject.currentOptionIndex].element.addClass(thisObject.options.onClass)
      thisObject.dispatchEvent(optionChange, {
        currentOption: thisObject.getOption(),
        previousOption: thisObject.buttonDef[lastOption].name })
      return false
    }
  }


  getOption() {
    return this.buttonDef[this.currentOptionIndex].name
  }

  getButtonSelector() {
    return `${this.options.containerSelector} .${this.options.buttonClass}`
  }

  getButtonSelectorWithIndex(i) {
    return `${this.options.containerSelector} .${this.options.buttonClass}-${i}`
  }


  dispatchEvent(eventName, data = {}){
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f)  {
    this.container.on(eventName, f)
  }

}
