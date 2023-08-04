import { Container } from './Container.mjs'
import { allTrue } from '../toolbox/ArrayUtil.mjs'

/**
 * A container that holds other containers but no
 * component directly
 */
export class ParentContainer extends Container {

  /**
   *
   * @param {Container[]}containers
   */
  constructor (containers = []) {
    super()
    this.children = containers
  }

  /**
   *
   * @param {Container}container
   */
  addChildContainer(container) {
    this.children.push(container)
  }

  getComponents () {
    let components = []
    this.children.forEach( (container) => {
      components.push(...container.getComponents())
    })
    return components
  }

  getHtml () {
    // just the children's html put together
    return this.children.map( (childContainer) => {
      return childContainer.getHtml()
    }).join('')
  }

  preRender() {
    return new Promise( async (resolve) => {
      let promises = this.children.map( (childContainer) => {
        return childContainer.preRender()
      })
      let results = await Promise.all(promises)
      resolve(allTrue(results))
    })
  }

  /**
   *
   * @return {Promise<boolean>}
   */
  renderChildren() {
    return new Promise( async (resolve) => {
      let promises = this.children.map( (childContainer) => {
        return childContainer.render()
      })
      let results = await Promise.all(promises)
      resolve(allTrue(results))
    })
  }

  postRender () {
    return new Promise( async (resolve) => {
      let promises = this.children.map( (childContainer) => {
        return childContainer.postRender()
      })
      let results = await Promise.all(promises)
      resolve(allTrue(results))
    })
  }

  onResize () {
    // call the onResize method in all children
    return new Promise( async (resolve) => {
      let promises = this.children.map( (childContainer) => {
        return childContainer.onResize()
      })
      let results = await Promise.all(promises)
      resolve(allTrue(results))
    })

  }

}