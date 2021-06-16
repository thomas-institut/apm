/*
 *  Copyright (C) 2021 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


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