/**
 * The collation table panel in the EditorComposer.
 *
 *  - Collation table manipulation: moving, grouping, normalizations
 */
import { Panel } from './Panel'

export class CollationTablePanel extends Panel{
  constructor (options = {}) {
    super(options)
    this.visible = true
    this.contentGenerated = false
  }

  generateHtml (tabId, mode, visible) {
    this.visible = visible
    this.contentGenerated = visible
    if (visible) {
      this.verbose && console.log(`CT panel content generated on generateHtml call`)
    }
    return visible ? this._generateHtmlVisible() : this._generateHtmlHidden()
  }

  onShown () {
    this.visible = true
    if (!this.contentGenerated) {
      this.contentGenerated = true
      this.verbose && console.log(`Generating CT panel content on tab shown`)
      this.reDraw(this._generateHtmlVisible())
    }
  }

  onHidden () {
    this.verbose && console.log(`CT panel hidden`)
    this.visible = false
  }

  _generateHtmlVisible() {
    return `The Collation table will be here`
  }

  _generateHtmlHidden() {
    return `Waiting to be shown to generate content`
  }

}