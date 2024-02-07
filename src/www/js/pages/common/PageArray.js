

export class PageArray {

  /**
   * Creates an array of pageInfo objects from a document page
   * object from the server
   *
   * @param pageObject
   * @param {string}orderBy
   * @param {boolean}asc
   * @return {*[]}
   */
  static getPageArray(pageObject, orderBy = '', asc = true) {
    let pageArray = []
    Object.keys(pageObject).forEach( (pageKey) => {
      pageArray.push(pageObject[pageKey])
    })
    if (orderBy === '') {
      return pageArray
    }
    let allowedOrderKeys = [ 'sequence', 'pageNumber', 'imageNumber']
    if (allowedOrderKeys.indexOf(orderBy) !== -1) {
      return pageArray.sort( (a, b) => {
        if (asc) {
          return a[orderBy] > b[orderBy]
        }
        return a[orderBy] < b[orderBy]
      })
    }
    console.warn(`Invalid order key '${orderBy}'`)
    return pageArray
  }
}