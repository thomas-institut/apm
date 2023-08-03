import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'

/**
 * An abstract container that can hold one or more components
 */
export class Container {

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

}