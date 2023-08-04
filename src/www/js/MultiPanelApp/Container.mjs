import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'

/**
 * An abstract container that can hold one or more components
 */
export class Container {

  constructor () {
    this.extraClasses = []
    this.style = ''
  }
  /**
   *
   * @return {Component[]}
   */
  getComponents() {
    return []
  }

  /**
   * Pre-renders the container.
   * MUST call the onPreRender() function for all the components
   * @return {Promise<boolean>}
   */
  preRender() {
    return resolvedPromise(true)
  }

  /**
   * Renders the container.
   * @return {Promise<boolean>}
   */
  render() {
    return resolvedPromise(true)
  }

  /**
   * Pre-renders the container.
   * MUST call the postRender() function for all the components
   * @return {Promise<boolean>}
   */
  postRender() {
    return resolvedPromise(true)
  }

  /**
   * Returns the html skeleton for the container
   * @return {string}
   */
  getHtml() {
    return ''
  }


  /**
   * Adds a list of classes to the container
   * @param {string[]}extraClasses
   * @return {Container}
   */
  withExtraClasses(extraClasses) {
    this.extraClasses = extraClasses
    return this
  }

  /**
   *
   * @param {string}styleString
   * @return {Container}
   */
  withStyle(styleString) {
    this.style = styleString
    return this
  }

  onResize() {
    return resolvedPromise(true)
  }

}