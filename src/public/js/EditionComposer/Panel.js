export class Panel {

  constructor (options = {}) {
    this.verbose = false
    if (options.verbose !== undefined && typeof options.verbose === 'boolean') {
      this.verbose = options.verbose
    }
    this.options = options
  }

  postRender(id, mode, visible) {
    this.verbose && console.log(`Post render tab ${id}, mode ${mode}, ${visible ? 'visible' : 'hidden'}`)
  }
  onResize() {}
  onShown() {}
  onHidden() {}
  getContentClasses() {
    return []
  }

  generateHtml(tabId, visible) {
    return `Panel id ${tabId}, ${visible ? 'visible' : 'hidden'}`
  }

  reDraw(html) {
    this.verbose && console.log(`Redrawing panel`)
    if (this.options.containerSelector !== undefined) {
      $(this.options.containerSelector).html(html)
    }
  }


}