

export class CachedFetcher {

  /**
   *
   * @param {KeyCache}cache
   * @param {number}defaultTtl
   */
  constructor (cache, defaultTtl = 0) {
    this.cache = cache
    this.debug = false;
    this.verbose = true;
    this.defaultTtl = defaultTtl
  }

  /**
   * Fetches the given key. If it's not in the cache or if forceActualFetch is true
   * performs the actual fetch and stores the value with the given TTL.
   *
   * If TTL is -1, the default TTL is used.
   *
   * @param {string}key
   * @param {function}fetcher
   * @param {boolean} forceActualFetch
   * @param {number} ttl
   * @return { Promise<{}>}
   */
  fetch( key, fetcher, forceActualFetch = false , ttl = -1) {
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
      this.verbose && console.log(`Doing actual fetch for '${key}'`)
      fetcher().then( (data) => {
        let actualTtl = ttl === -1 ? this.defaultTtl : ttl
        if (actualTtl > 0) {
          this.cache.store(key, data, actualTtl)
        }
        resolve(data)
      }).catch( (e) => { reject(e)})
    })
  }


}