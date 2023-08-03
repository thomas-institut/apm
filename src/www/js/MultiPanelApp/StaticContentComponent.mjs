import { Component } from './Component.mjs'

export class StaticContentComponent extends Component {

  /**
   *
   * @param {string}id
   * @param {string}content
   * @param additionalClasses
   */
  constructor (id, content='', additionalClasses = []) {
    super(id)
    this.content = content
    this.title = `Static ${id}`
    this._additionalClasses = additionalClasses
  }

  withContent(newContent) {
    this.content = newContent
    return this
  }

  getContainerClasses () {
    let classes = super.getContainerClasses()
    classes.push(...this._additionalClasses)
    return classes
  }

  getHtml () {
    return this.content
  }


}