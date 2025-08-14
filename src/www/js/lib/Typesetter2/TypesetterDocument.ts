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


import { TypesetterObject } from './TypesetterObject.js'
import { ObjectFactory } from './ObjectFactory.js'
import { TypesetterPage } from './TypesetterPage.js'

/**
 * A typesetter document: an array of pages with metadata
 */

export class TypesetterDocument extends TypesetterObject {
  /**
   * The nominal page width for the document
   */
  private width: number = 0;

  /**
   * The nominal page height for the document
   */
  private height: number = 0;
  /**
   * The document's pages
   */

  private pages: TypesetterPage[] = [];

  setPages(pages: TypesetterPage[]) {
    this.pages = pages
  }

  getPageCount(): number {
    return this.pages.length
  }

  getPage(pageIndex: number): TypesetterPage {
    if (pageIndex >= this.getPageCount()) {
      throw new Error(`Invalid page index ${pageIndex}`)
    }
    return this.pages[pageIndex]
  }

  getPages(): TypesetterPage[] {
    return this.pages
  }

  setDimensionsFromPages() {
    if (this.getPageCount() === 0) {
      this.width = 0
      this.height = 0
    } else {
      // for the moment, just copy from the first page
      let firstPage = this.getPage(0)
      this.width = firstPage.getWidth()
      this.height = firstPage.getHeight()
    }
  }

  getExportObject () {
    let obj = super.getExportObject()
    obj.class = 'TypesetterDocument'
    obj.width = this.width
    obj.height = this.height
    obj.pages = this.pages.map( (page) => { return page.getExportObject()})
    return obj
  }

  setFromObject (object: any, mergeValues: boolean): this {
    super.setFromObject(object, mergeValues)
    const template = {  width: 0, height: 0}
    this.copyValues(template, object, mergeValues)
    if (object['pages'] !== undefined && Array.isArray(object['pages'])) {
      this.pages = []
      object['pages'].forEach( (pageObject, i) => {
        let newPage = ObjectFactory.fromObject(pageObject)
        if (newPage instanceof TypesetterPage) {
          this.pages.push(newPage)
        } else {
          console.error(`Non typesetter page found at index ${i} in input object's pages field`)
          console.log(pageObject)
          throw new Error('Non typesetter item found trying to set from Object')
        }
      })
    }
    return this
  }
}
