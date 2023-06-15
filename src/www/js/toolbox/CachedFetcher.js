

export class CachedFetcher {

  /**
   *
   * @param {KeyCache}cache
   */
  constructor (cache) {
    this.cache = cache
    this.debug = true
  }

  /**
   *
   * @param {string}key
   * @param {function}fetcher
   * @param forceActualFetch
   */
  fetch( key, fetcher, forceActualFetch = false ) {
    return new Promise( (resolve, reject) => {
      if (forceActualFetch) {
        this.cache.delete(key)
      }
      let cachedData = this.cache.retrieve(key)
      if (cachedData !== null) {
        this.debug && console.log(`Data for '${key}' in cache, returning cached data`)
        resolve(cachedData)
        return
      }
      this.debug && console.log(`Doing actual fetch for '${key}'`)
      fetcher().then( (data) => {
        this.cache.store(key, data)
        resolve(data)
      }).catch( (e) => { reject(e)})
    })
  }


}