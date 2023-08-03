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
    let allClasses = this.component.getContainerClasses()
    allClasses.push(...this.extraClasses)
    let styleHtml = ''
    if (this.style !== '') {
      styleHtml = `style="${this.style}"`
    }
    return `<div class="${allClasses.join(' ')}" ${styleHtml}>${this.component.getHtml()}</div>`
  }

  postRender () {
    return this.component.postRender()
  }

}