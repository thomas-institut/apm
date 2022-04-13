/*
 *  Copyright (C) 2022 Universität zu Köln
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


import { ObjectWithMetadata } from './ObjectWithMetadata.mjs'

/**
 * A typesetter document: an array of pages with metadata
 */

export class TypesetterDocument extends ObjectWithMetadata {
  constructor () {
    super()

    /**
     * The nominal page width for the document
     * @type {number}
     */
    this.width = 0

    /**
     * The nominal page height for the document
     * @type {number}
     */
    this.height = 0

    /**
     * The document's pages
     * @type {TypesetterPage[]}
     */
    this.pages = []
  }

  /**
   *
   * @param {TypesetterPage[]}pages
   */
  setPages(pages) {
    this.pages = pages
  }

  getPageCount() {
    return this.pages.length
  }

  getPage(pageIndex) {
    if (pageIndex >= this.getPageCount()) {
      throw new Error(`Invalid page index ${pageIndex}`)
    }
    return this.pages[pageIndex]
  }

  getPages() {
    return this.pages
  }

  setDimensionsFromPages() {
    if (this.getPageCount() === 0) {
      this.width = 0
      this.height = 0
    }
    // for the moment, just copy from the first page
    let firstPage = this.getPage(0)
    this.width = firstPage.width
    this.height = firstPage.height
  }

  getExportObject () {
    let obj = super.getExportObject()
    obj.class = 'Document'
    obj.width = this.width
    obj.height = this.height
    obj.pages = this.pages.map( (page) => { return page.getExportObject()})
    return obj
  }
}
