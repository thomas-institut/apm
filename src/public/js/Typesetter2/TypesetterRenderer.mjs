import { HORIZONTAL } from './TypesetterItemDirection.mjs'

export class TypesetterRenderer {


  renderHorizontalList(list, shiftX=0, shiftY=0) {

  }

  renderVerticalList(list, shiftX=0, shiftY=0) {

  }

  /**
   *
   * @param {TypesetterPage}page
   */
  renderPage(page) {
    page.getLists().forEach( (list) => {
      if (list.getDirection() === HORIZONTAL) {
        this.renderHorizontalList(list)
      } else {
        this.renderVerticalList(list)
      }
    })
  }

}