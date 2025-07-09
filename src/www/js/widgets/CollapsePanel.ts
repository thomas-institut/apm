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


import $ from 'jquery';
import { OptionsChecker } from '@thomas-inst/optionschecker'
import {resolvedPromise} from "../toolbox/FunctionUtil";


/**
 * A generic collapsible panel consisting of a header, a show/collapse button and a panel div
 */


export class CollapsePanel {

  options: any = {};
  debug = false;
  shown = false;
  containerSelector = '';
  container: JQuery = $();
  header: JQuery = $();
  titleSpan: JQuery = $();
  iconSpan : JQuery = $();
  headerLink: JQuery = $();
  contentDiv: JQuery = $();

  constructor (options: any) {
    let optionsDefinition = {
      containerSelector: { type: 'string'},  // required container selector
      title: {type: 'string'},
      headerElement: { type: 'string', default: 'h4'},
      headerClasses: {type: 'array', default: [] },
      contentClasses: { type: 'array', default: []},
      iconWhenShown: { type: 'string', default: '[-]'},
      iconWhenHidden: { type: 'string', default: '[+]'},
      expandLinkTitle: { type: 'string', default: 'Click to expand'},
      collapseLinkTitle: { type: 'string', default: 'Click to collapse'},
      iconAtEnd: { type: 'boolean', default: true},
      content: { type: 'string', default: ''},
      initiallyShown: { type: 'boolean', default: true},
      // function that will be called when the panel is shown
      // should return a promise
      onShow: { type: 'function', default: (panelObject: any) : Promise<boolean> => {
          panelObject.debug && console.log(`Showing panel with selector '${panelObject.getContainerSelector()}'`)
          return resolvedPromise(true)
        }},
      // function that will be called when the panel is hidden
      onHide:
        { type: 'function', default: (panelObject : any) : Promise<boolean> => {
            panelObject.debug && console.log(`Hiding panel with selector '${panelObject.getContainerSelector()}'`)
            return resolvedPromise(true)
          }},
      debug: { type: 'boolean', default: false}
    }
    let oc = new OptionsChecker({
      optionsDefinition: optionsDefinition,
      context: 'CollapsePanelWidget'
    });
    this.options = oc.getCleanOptions(options)
    this.debug = this.options.debug
    // this.debug && console.log(`Collapse Panel Options`)
    // this.debug && console.log(options)
    // this.debug && console.log(this.options)
    this.shown = this.options.initiallyShown
    this.containerSelector = this.options.containerSelector
    this.container = $(this.containerSelector)
    this.container.html(this.__getHtml())
    this.header = $(`${this.containerSelector} .cp-header`)
    this.titleSpan =  $(`${this.containerSelector} span.cp-title`)

    this.iconSpan = $(`${this.containerSelector} span.cp-icon`)
    this.headerLink = $(`${this.containerSelector} a.cp-a`)
    this.contentDiv = $(`${this.containerSelector} div.cp-content`)
    $(`${this.containerSelector} .cp-a`).on('click', (ev) => {
      ev.preventDefault();
      this.toggle()
    })
  }

  toggle() : void {
    if (this.shown) {
      this.contentDiv.addClass('hidden')
      this.iconSpan.html(this.options.iconWhenHidden)
      this.headerLink.attr('title', this.options.expandLinkTitle)
      this.shown = false
      this.options.onHide(this)
    } else {
      this.contentDiv.removeClass('hidden')
      this.iconSpan.html(this.options.iconWhenShown)
      this.headerLink.attr('title', this.options.collapseLinkTitle)
      this.shown = true
      this.options.onShow(this)
    }
  }

  setContent(content : string) : void {
    this.contentDiv.html(content)
  }

  getContainerSelector() : string {
    return this.containerSelector
  }

  __getHtml() : string {
    let icon = this.shown ? this.options.iconWhenShown : this.options.iconWhenHidden
    let linkTitle = this.shown ? this.options.collapseLinkTitle: this.options.expandLinkTitle
    let iconLink = `<a href="#" class="cp-a" title="${linkTitle}"><span class="cp-icon">${icon}</span></a>`
    let hiddenClass = this.shown ? '' : 'hidden'
    return `<div class="cp-container">
        <${this.options.headerElement} class="cp-header ${this.options.headerClasses.join(' ')}">
            ${!this.options.iconAtEnd ? iconLink : ''}
            <span class="cp-title">${this.options.title}</span> 
            ${this.options.iconAtEnd ? iconLink : ''}
        </${this.options.headerElement}>
        <div class="cp-content ${this.options.contentClasses.join(' ')} ${hiddenClass}">${this.options.content}</div>
     </div>`
  }

}