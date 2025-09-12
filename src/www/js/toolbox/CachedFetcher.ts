import {AsyncKeyCache} from "./KeyCache/AsyncKeyCache";
import {KeyCache} from "@/toolbox/KeyCache/KeyCache";

export class CachedFetcher {
  private cache: AsyncKeyCache | KeyCache;
  private debug: boolean;
  private readonly verbose: boolean;
  private readonly defaultTtl: number;

  constructor(cache: AsyncKeyCache | KeyCache, defaultTtl: number = 0) {
    this.cache = cache;
    this.debug = false;
    this.verbose = true;
    this.defaultTtl = defaultTtl;
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
  fetch(key: string, fetcher: () => Promise<any>, forceActualFetch: boolean = false, ttl: number = -1): Promise<any> {
    return navigator.locks.request(key, {mode: 'exclusive'}, async () => {
      if (forceActualFetch) {
        await this.cache.delete(key);
      }
      let cachedData = await this.cache.retrieve(key);
      if (cachedData !== null) {
        // this.verbose && console.log(`Got cached data for '${key}'`);
        return cachedData;
      }
      let startTime = Date.now();
      this.debug && console.log(`Doing actual fetch for '${key}'`);
      const data = await fetcher();
      this.verbose && console.log(`Got data for '${key}' in ${Date.now() - startTime} ms`);
      let actualTtl = ttl === -1 ? this.defaultTtl : ttl;
      if (actualTtl > 0) {
        await this.cache.store(key, data, actualTtl);
      }
      return data;
    });
  }
}