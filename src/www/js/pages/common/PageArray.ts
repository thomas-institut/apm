import {OverkillPageInfoItem} from "@/pages/DocPage";


export class PageArray {

  /**
   * Creates an array of pageInfo objects from a document page
   * object from the server
   *
   */
  static getPageArray(pageObject: Record<number, OverkillPageInfoItem>, orderBy = '', asc = true): OverkillPageInfoItem[] {
    let pageArray: OverkillPageInfoItem[] = []
    Object.keys(pageObject).forEach( (pageKey) => {
      pageArray.push(pageObject[Number(pageKey)])
    })
    if (orderBy === '') {
      return pageArray
    }
    let allowedOrderKeys = [ 'sequence', 'pageNumber', 'imageNumber']
    if (allowedOrderKeys.indexOf(orderBy) !== -1) {
      return pageArray.sort( (a, b) => {
        if (asc) {
          // @ts-ignore
          return a[orderBy] - b[orderBy]
        }
        // @ts-ignore
        return b[orderBy] - b[orderBy]
      })
    }
    console.warn(`Invalid order key '${orderBy}'`)
    return pageArray
  }
}