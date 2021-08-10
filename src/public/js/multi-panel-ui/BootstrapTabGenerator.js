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

import {OptionsChecker} from '@thomas-inst/optionschecker'
// import {prettyPrintArray} from '../toolbox/ArrayUtil'

/**
 * Helper class to generate a Bootstrap4 html code for a set of tabs and content
 */
export class BootstrapTabGenerator {

  constructor (options) {
    let optionsSpec = {
      id: {
        // the id of the tab list
        type: 'NonEmptyString',
        required: true
      },
      tabs: {
        // an array of tab specifications
        type: 'Array',
        required: true
      },
      order: {
        // the order of the tabs as an array of indexes referring to the tab array given in options.tabs
        type: 'Array',
        default: []
      },
      activeTabId: {
        // the id of the active tab, if empty, the first tab will be the active one
        type: 'string',
        default: ''
      },
      mode: {
        // a string to be passed to each tab's html generator
        type: 'string',
        default: ''
      }
    }

    let tabOptionsSpec = {
      id: {
        // the id that will be used for the tab content div
        type: 'NonEmptyString',
        required: true
      },
      title: {
        // the title of the tab to be shown in the tab list
        type: 'NonEmptyString',
        required: true
      },
      linkTitle: {
        // the title of the tab link, which the browser will show as a tooltip when hovering over the tab
        // if empty, the generator will use the a message using the tab title
        type: 'string',
        default: ''
      },
      content: {
        // a function to generate the tab's html content
        //  (tabId, visible, mode) => string
        type: 'function',
        required: true
      },
      contentClasses: {
        // a list of classes to be applied to the tab content div
        type: 'array',
        default: []
      },
      linkClasses: {
        // a list of classes to be applied to the tab's link
        type: 'array',
        default: []
      }
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Bootstrap Tab Manager'})

    let cleanOptions = oc.getCleanOptions(options)
    this.id = cleanOptions.id
    this.tabs = []
    this.order = cleanOptions.order
    this.activeTabId = cleanOptions.activeTabId

    cleanOptions.tabs.forEach( (tab, index) => {
      let toc = new OptionsChecker({optionsDefinition: tabOptionsSpec, context: `Bootstrap Tab Manager, tab ${index}`})
      this.tabs.push(toc.getCleanOptions(tab))
    })

    if (this.order.length === 0) {
      //console.log(`Generating default order`)
      this.order = this.tabs.map( (tab, index) => { return index})
    }

    if (this.activeTabId === '') {
      this.activeTabId = this.tabs[this.order[0]].id
    }

    this.mode = cleanOptions.mode
  }

  setOrder(newOrder) {
    if (newOrder.length !== this.order.length) {
      return
    }
    this.order = newOrder
  }

  setActiveTab(tabId) {
    this.activeTabId = tabId
  }

  getActiveTab() {
    return this.activeTabId
  }

  getTabIds() {
    return this.order.map( index => this.tabs[index].id)
  }

  generateHtml() {
    return this.generateTabListHtml() + this.generateTabContentHtml()
  }

  getTabListId() {
    return this.id
  }

  getTabLinkId(tabId) {
    return tabId + '-tab'
  }

  getTabContentDivId() {
    return this.id + `-content`
  }

  generateTabListHtml() {
    let activeTabId = this.activeTabId
    return  `<ul class="nav nav-tabs" id="${this.getTabListId()}" role="tablist">` +
      this.order.map( (index) => {
        let tab = this.tabs[index]
        let linkClasses = [ 'nav-link']
        if (tab.id === activeTabId) {
          linkClasses.push('active')
        }
        let linkTitle = tab.linkTitle === '' ? `Click to show ${tab.title}` : tab.linkTitle
        tab.linkClasses.forEach( (linkClass) => { linkClasses.push(linkClass)})
        return `<li class="nav-item" role="presentation">
<a class="${linkClasses.join(' ')}" id="${this.getTabLinkId(tab.id)}" data-toggle="tab" href="#${tab.id}" role="tab" 
aria-controls="${tab.id}" title="${linkTitle}" aria-selected="${tab.id === activeTabId ? 'true' : 'false'}">${tab.title} </a>
</li>`
      }).join('') +
      '</ul>'
  }

  generateTabContentHtml() {
    let activeTabId = this.activeTabId
    let mode = this.mode
    return `<div class="tab-content" id="${this.getTabContentDivId()}">` +
    this.tabs.map( (tab) => {
      let contentClasses = ['tab-pane']
      if (tab.contentClasses !== []) {
        contentClasses = contentClasses.concat(tab.contentClasses)
      }
      let visible = false
      if (tab.id === activeTabId) {
        contentClasses.push('active')
        visible = true
      }
      return `<div class="${contentClasses.join(' ')}" id="${tab.id}" role="tabpanel" aria-labelledby="${tab.id}-tab">
${tab.content(tab.id, mode, visible)}
</div>`
    }).join('') +
    '</div>'
  }
}