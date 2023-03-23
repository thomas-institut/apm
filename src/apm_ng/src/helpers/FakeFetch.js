

export class FakeFetch {

  /**
   *
   * @param {number}timeOut
   * @param {Object|array}fakeData
   */
  static fetch(timeOut, fakeData) {
    return new Promise ( (resolve) => {
      setTimeout( () => {
       resolve(fakeData)
      }, timeOut)
    })
  }

  static generateFakeFetcher(timeOut, fakeData) {
    return () => {
      return this.fetch(timeOut, fakeData)
    }
  }
}