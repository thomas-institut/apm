export class Panel {

  constructor (options = {}) {
    this.verbose = false
    if (options.verbose !== undefined && typeof options.verbose === 'boolean') {
      this.verbose = options.verbose
    }
  }

  postRender() {}
  onResize() {}
  getContentClasses() {
    return []
  }
  generateHtml() {
    return 'Panel'
  }

}