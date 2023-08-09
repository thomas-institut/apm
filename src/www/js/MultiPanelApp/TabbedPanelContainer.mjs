import { ParentContainer } from './ParentContainer.mjs'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Component } from './Component.mjs'
import { DivContainer } from './DivContainer.mjs'
import { MP_APP_CLASS } from './MultiPanelApp.mjs'

const activeTabClass = 'mpui-tab-active'

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
    return `<div class="mpui-tabbed-panel" style="display: grid; grid-template-rows: auto 1fr; height: 100%; width: 100$">
        ${this.getTabHeaderHtml()}
        ${this.getContentDivHtml()}
        </div>`
  }

  postRender () {
    return new Promise( resolve => {
      this.children.forEach( (childContainer, index) => {
        $(`.${this.getTabDivClass(index)}-a`).on('click', this.genOnClickTabLink(index))
      })
    })
  }

  genOnClickTabLink(index) {
    return (event) => {
      event.preventDefault()
      if (index === this.visibleChildIndex) {
        return
      }
      console.log(`Click on inactive tab ${this.id}:${index}`)
      $(`.${this.getTabContentDivClass(this.visibleChildIndex)}`).addClass(MP_APP_CLASS.HIDDEN)
      $(`.${this.getTabDivClass(this.visibleChildIndex)}`).removeClass(activeTabClass)
      $(`.${this.getTabContentDivClass(index)}`).removeClass(MP_APP_CLASS.HIDDEN)
      $(`.${this.getTabDivClass(index)}`).addClass(activeTabClass)
      this.visibleChildIndex = index
    }
  }

  getTabContentDivClass(tabIndex) {
    return this.children[tabIndex].getComponents()[0].getContainerIdClass()
  }

  /**
   * @param {number}tabIndex
   * @return {string}
   * @private
   */
  getTabDivClass(tabIndex) {
    return `mpui-tab-${this.id}-${tabIndex}`
  }



  getTabHeaderHtml() {
    let tabs = this.children.map( (childContainer, index) => {
      let classes = ["mpui-tab", this.getTabDivClass(index)]
      if (index === this.visibleChildIndex) {
        classes.push(activeTabClass)
      }
      return `<div class="${classes.join(' ')}"><a href="" class="mpui-tab-${this.id}-${index}-a">${childContainer.getComponents()[0].getTitle()}</a></div>`
    }).join('')
    return `<div class="mpui-tab-header" style="display: flex; flex-direction: row">${tabs}</div>`
  }

  getContentDivHtml() {
    let childrenHtml = this.children.map( (childContainer, index) => {
      let extraClasses = [ `mpui-frame`]
      if (index !== this.visibleChildIndex) {
        extraClasses.push(MP_APP_CLASS.HIDDEN)
      }
      childContainer.withExtraClasses(extraClasses)
      return childContainer.getHtml()
    }).join('')
    return `<div>${childrenHtml}</div>`
  }

}