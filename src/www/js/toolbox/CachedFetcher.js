
import { SimpleLockManager } from './SimpleLockManager'

export class CachedFetcher {

  /**
   *
   * @param {KeyCache}cache
   * @param {number} defaultTtl if 0, no caching is done by default
   * @param lockManager
   */
  constructor (cache, defaultTtl = 0, lockManager = null) {
    this.cache = cache
    this.debug = false;
    this.verbose = true;
    this.defaultTtl = defaultTtl;
    this.lockManager = lockManager ?? new SimpleLockManager();
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
    return new Promise(async (resolve, reject) => {

      await this.lockManager.getLock(key);
      if (forceActualFetch) {
        this.cache.delete(key)
      }
      let cachedData = this.cache.retrieve(key)
      if (cachedData !== null) {
        this.lockManager.releaseLock(key);
        resolve(cachedData);
        return;
      }

      let startTime;
      if (this.verbose) {
        startTime = Date.now();
      }
      this.verbose && console.log(`Doing actual fetch for '${key}' at ${startTime / 1000}`);
      fetcher().then((data) => {
        this.debug && console.log(`Got data for '${key}' in ${Date.now() - startTime} ms`);
        let actualTtl = ttl === -1 ? this.defaultTtl : ttl;
        this.debug && console.log(`Actual ttl for '${key}' is ${actualTtl}`);
        if (actualTtl > 0) {
          this.cache.store(key, data, actualTtl);
        }
        this.lockManager.releaseLock(key);
        resolve(data);
      }).catch((e) => {
        this.lockManager.releaseLock(key);
        reject(e)
      });
    });
  }
}