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

import {OptionsChecker} from '@thomas-inst/optionschecker'

export const toggleEvent = 'toggle'

const defaultHoverClass = 'nicetoggle-hover'
const defaultOffClass = 'nicetoggle-off'
const defaultOnClass = 'nicetoggle-on'

const defaultOnIcon = 'ON'
const defaultOffIcon = 'OFF'

const buttonClass = 'nicetoggle-btn'
const titleClass = 'nicetoggle-title'

export class NiceToggle {

  constructor (options) {

    let optionsDefinition = {
      containerSelector : { type: 'string', required: true},
      title: { type: 'string', required: false, default: ''},
      onClass: { type: 'string', required: false, default: defaultOnClass},
      onPopoverText: { type: 'string', required: false, default: 'Click to turn OFF'},
      offClass: { type: 'string', required: false, default: defaultOffClass},
      offPopoverText: { type: 'string', required: false, default: 'Click to turn ON'},
      hoverClass: {type: 'string', required: false, default: defaultHoverClass},
      initialValue: { type: 'boolean', required: false, default: true},
      onToggle : {
        type: 'function',
        required: false,
        default: null
      },
      onIcon: {
        type: 'string',
        required: false,
        default : defaultOnIcon
      },
      offIcon: {
        type: 'string',
        required: false,
        default : defaultOffIcon
      }
    }
    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "NiceToggle"})
    this.options = oc.getCleanOptions(options)
    // console.log(`NiceToggle options`)
    // console.log(this.options)
    this.isOn = this.options.initialValue

    this.container = $(this.options.containerSelector)
    this.container.html(this.getWidgetHtml())
    $(this.getButtonSelector()).on('click', this.genOnClickButton())
    $(this.getButtonSelector()).on('mouseenter', this.genOnMouseEnterButton())
    $(this.getButtonSelector()).on('mouseleave', this.genOnMouseLeaveButton())
    if(this.isOn) {
      this.toggleOn(true)
    } else {
      this.toggleOff(true)
    }


  }

  genOnClickButton() {
    return () => {
      if (this.isOn) {
        this.toggleOff()
      } else {
        this.toggleOn()
      }
    }
  }
  genOnMouseEnterButton() {
    return ()=> {
      $(this.getButtonSelector()).addClass(this.options.hoverClass)
    }
  }

  genOnMouseLeaveButton() {
    return () => {
      $(this.getButtonSelector()).removeClass(this.options.hoverClass)
    }
  }

  getWidgetHtml() {
    let html = ''
    html += `<span class="${titleClass}">${this.options.title}</span>`
    html += `<span title="${this.options.onPopoverText}" class="${buttonClass} ${this.options.onClass}">${this.options.onIcon}</span>`
    return html
  }

  toggleOn(silent = false) {
    $(this.getButtonSelector()).attr('title', this.options.onPopoverText)
      .removeClass(this.options.offClass)
      .addClass(this.options.onClass)
      .html(this.options.onIcon)
    this.isOn = true
    if (!silent) {
      this.dispatchEvent(toggleEvent, { toggleStatus: this.getToggleStatus()})
    }

  }

  toggleOff(silent = false) {
    $(this.getButtonSelector()).attr('title', this.options.offPopoverText)
      .removeClass(this.options.onClass)
      .addClass(this.options.offClass)
      .html(this.options.offIcon)
    this.isOn = false
    if (!silent) {
      this.dispatchEvent(toggleEvent, { toggleStatus: this.getToggleStatus()})
    }
  }

  /**
   * Returns true if the toggle is on or false if
   * the toggle if off
   * @returns {boolean}
   */
  getToggleStatus() {
    return this.isOn
  }

  getButtonSelector() {
    return `${this.options.containerSelector} .${buttonClass}`
  }

  // getTitleSelector() {
  //   return `${this.options.containerSelector} .${titleClass}`
  // }

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
