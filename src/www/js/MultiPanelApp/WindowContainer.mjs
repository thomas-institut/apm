import { ParentContainer } from './ParentContainer.mjs'
import { allTrue } from '../toolbox/ArrayUtil.mjs'

export class WindowContainer extends ParentContainer {

  /**
   *
   * @param domWindow
   * @param {Container[]}childrenContainers
   */
  constructor (domWindow, childrenContainers=[]) {
    super(childrenContainers)
    this.isMain = true
    if (domWindow === null) {
      this.domWindow = window
    } else {
      this.domWindow = domWindow
      this.domWindow.document.write(this.getSecondaryWindowSkeletonHtml())
      this.isMain = false
    }
  }

  /**
   * Renders the window
   * @return {Promise<boolean>}
   */
  async render () {
    return new Promise( async (resolve) => {
      // console.log(`Pre-rendering window`)
      let result = await this.preRender()
      if (!result) {
        resolve(false)
      }
      if (this.isMain) {
        $('body').html(this.getHtml())
      } else {
        this.domWindow.document.body.innerHTML = this.getHtml()
      }
      result = await this.renderChildren()
      if (!result) {
        resolve(false)
      }
      resolve(await this.postRender())
    })
  }

  addStyles(styleString) {
    let ss = this.domWindow.document.createElement("style")
    ss.innerText = styleString
    this.domWindow.document.head.appendChild(ss)
  }

  setTitle(title) {
    this.domWindow.document.title = title
  }

  getDomWindow() {
    return this.domWindow
  }

  getSecondaryWindowSkeletonHtml() {
    return `<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>`
  }

}