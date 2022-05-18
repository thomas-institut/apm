/*
 *  Copyright (C) 2002 Universität zu Köln
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

/**
 * A generic collapsible panel consisting of a header, a show/collapse button and a panel div
 */



export class CollapsePanel {

  constructor (options) {

    let optionsDefinition = {
      containerSelector: { type: 'string'},  // required container selector
      title: {type: 'string'},
      headerElement: { type: 'string', default: 'h4'},
      headerClasses: {type: 'array', default: [] },
      contentClasses: { type: 'array', default: []},
      iconWhenShown: { type: 'string', default: '[-]'},
      iconWhenHidden: { type: 'string', default: '[+]'},
      content: { type: 'string', default: ''},
      initiallyShown: { type: 'boolean', default: true}
    }
    let oc = new OptionsChecker({
     optionsDefinition: optionsDefinition,
      context: 'CollapsePanelWidget'
    })
    this.options = oc.getCleanOptions(options)
    this.shown = this.options.initiallyShown
    this.containerSelector = this.options.containerSelector
    this.container = $(this.containerSelector)
    this.container.html(this.__getHtml())
    this.header = $(`${this.containerSelector} .cp-header`)
    this.titleSpan =  $(`${this.containerSelector} span.cp-title`)

    this.iconSpan = $(`${this.containerSelector} span.cp-icon`)
    this.contentDiv = $(`${this.containerSelector} div.cp-content`)
    $(`${this.containerSelector} .cp-a`).on('click', () => {
      this.toggle()
    })
  }

  toggle() {
    if (this.shown) {
      this.contentDiv.addClass('hidden')
      this.iconSpan.html(this.options.iconWhenHidden)
      this.shown = false
    } else {
      this.contentDiv.removeClass('hidden')
      this.iconSpan.html(this.options.iconWhenShown)
      this.shown = true
    }
  }

  setContent(content) {
    this.contentDiv.html(content)
  }

  __getHtml() {
    let icon = this.shown ? this.options.iconWhenShown : this.options.iconWhenHidden
    let hiddenClass = this.shown ? '' : 'hidden'
    return `<div class="cp-container">
        <${this.options.headerElement} class="cp-header ${this.options.headerClasses.join(' ')}">
            <span class="cp-title">${this.options.title}</span> 
            <a href="#" class="cp-a"><span class="cp-icon">${icon}</span></a> 
        </${this.options.headerElement}>
        <div class="cp-content ${this.options.contentClasses.join(' ')} ${hiddenClass}">${this.options.content}</div>
     </div>`
  }

}