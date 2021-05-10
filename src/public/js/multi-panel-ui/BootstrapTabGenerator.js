
import {OptionsChecker} from '@thomas-inst/optionschecker'
import {prettyPrintArray} from '../toolbox/ArrayUtil'

export class BootstrapTabGenerator {
  constructor (options) {
    let optionsSpec = {
      id: { type: 'NonEmptyString', required: true},
      order: { type: 'Array', default: []},
      tabs: { type: 'Array', required: true},
      activeTabId: { type: 'string', default: ''}
    }

    let tabOptionsSpec = {
      id: { type: 'NonEmptyString', required: true},
      title: { type: 'NonEmptyString', required: true},
      linkTitle: { type: 'string', default: ''},
      content: { type: 'function', required: true},  // TODO: change to 'StringOrFunction'
      contentClasses: { type: 'array', default: []},
      linkClasses: { type: 'array', default: []}
    }

    let oc = new OptionsChecker(optionsSpec, 'Bootstrap Tab Manager')

    let cleanOptions = oc.getCleanOptions(options)
    this.id = cleanOptions.id
    this.tabs = []
    this.order = cleanOptions.order
    this.activeTabId = cleanOptions.activeTabId



    cleanOptions.tabs.forEach( (tab, index) => {
      let toc = new OptionsChecker(tabOptionsSpec, `Bootstrap Tab Manager, tab ${index}`)
      this.tabs.push(toc.getCleanOptions(tab))
    })

    if (this.order.length === 0) {
      console.log(`Generating default order`)
      this.order = this.tabs.map( (tab, index) => { return index})
    }

    if (this.activeTabId === '') {
      this.activeTabId = this.tabs[0].id
    }

  }

  setOrder(newOrder) {
    if (newOrder.length !== this.order.length) {
      return
    }
    this.order = newOrder
  }

  setActive(tabId) {
    this.activeTabId = tabId
  }

  getActive() {
    return this.activeTabId
  }

  getTabIds() {
    return this.order.map( index => this.tabs[index].id)
  }

  generateHtml() {
    return  this.generateTabListHtml() + this.generateTabContentHtml()
  }

  generateTabListHtml() {
    let id = this.id
    let activeTabId = this.activeTabId
    return  `<ul class="nav nav-tabs" id="${id}" role="tablist">` +
      this.order.map( (index) => {
        let tab = this.tabs[index]
        let linkClasses = [ 'nav-link']
        if (tab.id === activeTabId) {
          linkClasses.push('active')
        }
        let linkTitle = tab.linkTitle === '' ? `Click to show ${tab.title}` : tab.linkTitle
        tab.linkClasses.forEach( (linkClass) => { linkClasses.push(linkClass)})
        return `<li class="nav-item" role="presentation">
<a class="${linkClasses.join(' ')}" id="${tab.id}-tab" data-toggle="tab" href="#${tab.id}" role="tab" 
aria-controls="${tab.id}" title="${linkTitle}" aria-selected="${tab.id === activeTabId ? 'true' : 'false'}">${tab.title} </a>
</li>`
      }).join('') +
      '</ul>'
  }

  generateTabContentHtml() {
    let id = this.id
    let activeTabId = this.activeTabId
    return `<div class="tab-content" id="${id}-content">` +
    this.tabs.map( (tab) => {
      let contentClasses = [ 'tab-pane']
      if (tab.contentClasses !== []) {
        contentClasses = contentClasses.concat(tab.contentClasses)
      }
      if (tab.id === activeTabId) {
        contentClasses.push('active')
      }
      return `<div class="${contentClasses.join(' ')}" id="${tab.id}" role="tabpanel" aria-labelledby="${tab.id}-tab">${tab.content()}</div>`
    }).join('') +
    '</div>'
  }
}