import { ComponentContainer } from './ComponentContainer.mjs'

export class DivContainer extends ComponentContainer {

  /**
   *
   * @param {Component} component
   */
  constructor (component) {
    super(component)
  }

  getHtml() {
    return `<div class="${this.component.getContainerClasses().join(' ')}">${this.component.getHtml()}</div>`
  }

  postRender () {
    return this.component.postRender()
  }

}