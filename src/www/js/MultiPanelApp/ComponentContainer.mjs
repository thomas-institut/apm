import { Container } from './Container.mjs'

export class ComponentContainer extends Container {

  /**
   *
   * @param {Component} component
   */
  constructor (component) {
    super()
    /**
     *
     * @type {Component}
     */
    this.component = component
  }

  getComponents () {
    return [ this.component]
  }

}