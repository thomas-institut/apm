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

import {OptionalPropsRequired} from "@/toolbox/OptionalProps";
import {TabSpec} from "@/MultiPanelUI/MultiPanelUI";


interface BootstrapTabGeneratorOptions {
  id: string,
  tabs: TabSpec[],
  order?: number[],
  activeTabId?: string
  mode?: string;
}

/**
 * Helper class to generate a Bootstrap4 html code for a set of tabs and content
 */
export class BootstrapTabGenerator {
  private readonly id: string;
  private order: number[];
  private activeTabId: string;
  private readonly tabSpecs: Required<TabSpec>[];
  private readonly mode: string;


  constructor (options: BootstrapTabGeneratorOptions) {

    const defaults: OptionalPropsRequired<BootstrapTabGeneratorOptions> = {
      activeTabId: '',
      mode: '',
      order: []
    }

    const cleanOptions: Required<BootstrapTabGeneratorOptions> = { ...defaults, ...options };
    this.id = cleanOptions.id
    this.tabSpecs = []
    this.order = cleanOptions.order
    this.activeTabId = cleanOptions.activeTabId

    cleanOptions.tabs.forEach( (tab) => {
      const tabSpecDefaults: OptionalPropsRequired<TabSpec> = { linkTitle: '', contentClasses: [], linkClasses: [], visible: true};
      this.tabSpecs.push({...tabSpecDefaults, ...tab})
    })

    if (this.order.length === 0) {
      //console.log(`Generating default order`)
      this.order = this.tabSpecs.map( (_tab, index) => { return index})
    }

    if (this.activeTabId === '') {
      this.activeTabId = this.tabSpecs[this.order[0]].id
    }

    this.mode = cleanOptions.mode
  }

  setOrder(newOrder: number[]) {
    if (newOrder.length !== this.order.length) {
      return
    }
    this.order = newOrder
  }

  setActiveTab(tabId: string) {
    this.activeTabId = tabId
  }

  getActiveTab() {
    return this.activeTabId
  }

  getTabIds() {
    return this.order.map( index => this.tabSpecs[index].id)
  }

  async generateHtml() {
    return this.generateTabListHtml() + await this.generateTabContentHtml()
  }

  getTabListId() {
    return this.id
  }

  getTabLinkId(tabId: string) {
    return tabId + '-tab'
  }

  getTabContentDivId() {
    return this.id + `-content`
  }

  generateTabListHtml() {
    let activeTabId = this.activeTabId
    return  `<ul class="nav nav-tabs" id="${this.getTabListId()}" role="tablist">` +
      this.order.map( (index) => {
        let tab = this.tabSpecs[index]
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

  async generateTabContentHtml() {
    let activeTabId = this.activeTabId;
    let mode = this.mode;
    let html = '';
    for (let i = 0; i < this.tabSpecs.length; i++) {
      let tab = this.tabSpecs[i];
      let contentClasses = ['tab-pane']
      if (tab.contentClasses.length > 0) {
        contentClasses = contentClasses.concat(tab.contentClasses)
      }
      let visible = false
      if (tab.id === activeTabId) {
        contentClasses.push('active')
        visible = true
      }
      let tabContent = await tab.content(tab.id, mode, visible)
      html += `<div class="${contentClasses.join(' ')}" id="${tab.id}" role="tabpanel" aria-labelledby="${tab.id}-tab">
    ${tabContent}</div>`
    }

    return `<div class="tab-content" id="${this.getTabContentDivId()}">${html}</div>`
  }
}