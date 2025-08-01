import { DIRECTION } from './MultiPanelApp.mjs'

export class PanelController {

  /**
   *
   * @param {string}style
   * @param {Component}panel
   * @param {string}direction
   */
  constructor (style, panel, direction = DIRECTION.VERTICAL) {
    this.style = style
    this.panel = panel
    this.direction = direction
    this.visible = true
    this.currentHeight = 0
    this.currentWidth = 0
    this.containerSelector = ''
    this.container = null
    this.rendered = false
  }

  getStyle() {
    return this.style
  }


  getDirection() {
    return this.direction
  }

  setContainerSelector(selector) {
    this.containerSelector = selector
    this.container = null
  }

  getContainerClasses() {
    return this.panel.getContainerClasses()
  }

  renderPanel() {
    if (!this.visible) {
      return Promise.resolve(true)
    }
    if (this.container === null) {
      this.container = $(this.containerSelector)
    }
    return new Promise( async (resolve) => {
      this.container.html(this.panel.getHtml(this.direction))
      this.rendered = true
      resolve(await this.panel.postRender(this.container, this.direction))
    })
  }

  async setDirection(direction, silent = false) {
    if (silent) {
      this.direction = direction
      return Promise.resolve(true)
    }
    let result = await this.panel.onDirectionChange(this.container, direction)
    if (!result) {
      return this.renderPanel()
    }
    return Promise.resolve(true)
  }

  async resize(){
    let newHeight = this.container.height()
    let newWidth = this.container.width()
    let result = await this.panel.onResize(this.container, this.direction, this.currentWidth, this.currentHeight, newWidth, newHeight)
    this.currentHeight = newHeight
    this.currentWidth = newWidth
    if (!result) {
      return this.renderPanel()
    }
    return Promise.resolve(true)
  }

  show() {
    this.visible = true
    return this.panel.onShow(this.container, this.direction)
  }

  hide() {
    this.visible = false
    return this.panel.onHide()
  }


}