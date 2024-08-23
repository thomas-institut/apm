import { afterWrite } from '@popperjs/core'
import { wait } from './FunctionUtil.mjs'

const MaxLockWaitTime = 2000;

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
    this.defaultTtl = defaultTtl;
    this.locks = [];
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
    return new Promise( async (resolve, reject) => {
      if (forceActualFetch) {
        this.cache.delete(key)
      }
      // Wait for current fetch operation to end
      let tickSize = 100;
      let ticksToWait = MaxLockWaitTime / tickSize;
      let ticksPassed = 0;
      while (this.locks.includes(key) && ticksPassed < ticksToWait) {
        await wait(tickSize);
        ticksPassed++;
      }
      let cachedData = this.cache.retrieve(key)
      if (cachedData !== null) {
        this.debug && console.log(`Data for '${key}' in cache, returning cached data (waited ${tickSize * ticksPassed} ms)`);
        resolve(cachedData);
        return;
      }


      let startTime;
      if (this.verbose) {
        startTime = Date.now();
      }
      this.verbose && console.log(`Doing actual fetch for '${key}' at ${startTime / 1000}`);
      this.locks.push(key);
      fetcher().then((data) => {
        this.debug && console.log(`Got data for '${key}' in ${Date.now() - startTime} ms`);
        let actualTtl = ttl === -1 ? this.defaultTtl : ttl;
        this.debug && console.log(`Actual ttl for '${key}' is ${actualTtl}`);
        if (actualTtl > 0) {
          this.cache.store(key, data, actualTtl);
        }
        let lockIndex = this.locks.indexOf(key);
        if (lockIndex !== -1) {
          this.locks.splice(lockIndex,1);
        }
        resolve(data);
      }).catch((e) => { this.debug && console.groupEnd(); reject(e)});
    })
  }


}