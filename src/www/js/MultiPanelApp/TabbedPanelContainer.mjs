import { ParentContainer } from './ParentContainer.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Component } from './Component.mjs'
import { DivContainer } from './DivContainer.mjs'
import { MP_APP_CLASS } from './MultiPanelApp.mjs'

export class TabbedPanelContainer extends ParentContainer {


  constructor (options) {
    super([])

    let oc = new OptionsChecker({
      context: 'TabbedPanelContainer',
      optionsDefinition: {
        id: {
          type: 'string',
          required: true
        },
        debug: {
          type: 'boolean',
          default: false
        },
        tabs: {
          type: 'array',
          required: true,
          elementDefinition: {
            type: 'object',
            objectClass: Component
          }
        }
      }
    })

    let cleanOptions = oc.getCleanOptions(options)

    this.id = cleanOptions.id
    this.debug = cleanOptions.debug
    cleanOptions.tabs.forEach((tabComponent) => {
      this.addChildContainer(new DivContainer(tabComponent))
    })
    this.visibleChildIndex = 0

    this.debug && console.log(`Panel '${this.id}': initialized with ${this.children.length} tabs(s)`)
    this.debug && console.log(this.children)
  }

  getHtml () {
    return `<div class="mpui-tabbed-panel" style="display: grid; grid-template-rows: auto 1fr">
        ${this.getTabHeaderHtml()}
        ${this.getContentDivHtml()}
        </div>`
  }

  getTabHeaderHtml() {
    let tabs = this.children.map( (childContainer, index) => {
      let classes = ["mpui-tab", `mpui-tab-${this.id}-${index}`]
      if (index === this.visibleChildIndex) {
        classes.push(`mpui-active-tab`)
      }
      return `<div class="${classes.join(' ')}"><a href="" class="mpui-tab-${this.id}-${index}-a">${childContainer.getComponents()[0].getTitle()}</a></div>`
    }).join('')
    return `<div class="mpui-tab-header" style="display: flex; flex-direction: row">${tabs}</div>`
  }

  getContentDivHtml() {
    let childrenHtml = this.children.map( (childContainer, index) => {
      if (index !== this.visibleChildIndex) {
        childContainer.withExtraClasses([MP_APP_CLASS.HIDDEN])
      }
      return childContainer.getHtml()
    }).join('')
    return `<div>${childrenHtml}</div>`
  }

}