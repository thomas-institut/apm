/**
 * A user-provided panel that can be used to interact with MultiPanelApp
 *
 * Implementations of this class should let handling of visibility and rendering
 * to the multi panel UI controller.
 */
import { resolvedPromise } from '../toolbox/FunctionUtil.mjs'
import { MP_APP_CLASS } from './MultiPanelApp.mjs'

export class Component {

  /**
   *
   * @param {string} id
   */
  constructor (id) {
    /**
     * A string the uniquely identifies the component
     * within the app.
     * @type {string}
     */
    this.id = id
    /**
     * The title of the component that will be used if
     * displayed in a tabbed panel or on its own window.
     * @type {string}
     */
    this.title = 'Generic Component'


    /**
     * The component's direction.
     * It's up to the component to interpret this value for display purposes
     * MultiPanelApp will inform the component of changes between 'horizontal' and
     * 'vertical' direction with onDirectionChange()
     * @type {string}
     */
    this.direction = ''
    this.hasBeenRendered = false
  }

  getId() {
    return this.id
  }

  getTitle() {
    return this.title
  }

  /**
   *
   * @param {string}title
   * @return {Component}
   */
  withTitle(title) {
    this.title = title
    return this
  }

  getContainerIdClass() {
    return `${MP_APP_CLASS.component}-${this.id}`
  }


  /**
   * Returns the html for the component in the current component state.
   * It will be called whenever the component needs to be rendered completely.
   * @return {string}
   */
  getHtml() {
    return `${this.id}: ${this.getTitle()}`
  }

  /**
   * Returns an array of classes that will be assigned to the component's container div
   * @return {string[]}
   */
  getContainerClasses() {
    return [ MP_APP_CLASS.component, this.getContainerIdClass() ]
  }

  /**
   * A function to be called before the component will be rendered on screen.
   * This gives the component an opportunity, for example, to delete event handlers
   * @return {Promise<boolean>}
   */
  preRender() {
    this.hasBeenRendered = false
    return resolvedPromise(true)
  }

  /**
   * A function to be called after the component has been rendered on screen.
   * Normally, this is where the component sets up its event handlers
   * @return {Promise<boolean>}
   */
  postRender() {
    this.hasBeenRendered = true
    return resolvedPromise(true)
  }

  /**
   * A function to be called when the panel has become visible on screen
   * from previously being hidden
   * @return {Promise<boolean>}
   */
  onShow() {
    return resolvedPromise(true)
  }

  /**
   * A function to be called when the panel has become invisible on screen
   * from previously being visible.
   * @return {Promise<boolean>}
   */
  onHide() {
    return resolvedPromise(true)
  }

  /**
   * A function to be called when the panel is resized.
   * @return {Promise<boolean>}
   */
  onResize() {
    return resolvedPromise(true)
  }

  /**
   * A function to be called when the panel has changed direction
   * If the function resolves to false, the panel will be re-rendered
   * @param {string}newDirection
   * @return {Promise<boolean>}
   */
  onDirectionChange(newDirection) {
    this.direction = newDirection
    return resolvedPromise(true)
  }


}