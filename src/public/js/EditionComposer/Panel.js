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