import {InternalCacheObject, KeyCache} from './KeyCache'

export class WebStorageKeyCache extends KeyCache {
  private storage: Storage;

  /**
   * Constructs a WebStorageKeyCache
   * if sessionStorage is true, the browser's session
   * storage will be used, otherwise the (more permanent)
   * local storage will be used.
   * @param {string} type
   * @param {string}dataId
   * @param {string}cachePrefix
   */
  constructor (type: string = 'session', dataId: string = '', cachePrefix: string = '') {
    super(dataId, cachePrefix)
    this.storage = type === 'session' ? window.sessionStorage : window.localStorage
  }

  async storeItemObject (key: string, itemObject : InternalCacheObject ):Promise<void> {
      this.storage.setItem(this.getRealKey(key), JSON.stringify(itemObject))
  }

  async getItemObject (key : string) : Promise<InternalCacheObject | null> {
    let val = this.storage.getItem(this.getRealKey(key))
    if (val === null) {
      return null
    }
    try {
      return JSON.parse(val);
    } catch (e) {
      console.log( `Error parsing value for key ${key}`, e, val);
      return null;
    }
  }

  async deleteItemObject(key: string): Promise<void> {
    this.storage.removeItem(this.getRealKey(key));
  }

  async getKeys() : Promise<string[]> {
    let storageLength = this.storage.length
    let realKeys = []
    for (let i = 0; i < storageLength; i++) {
      let key = this.storage.key(i);
      if (key !== null) {
        realKeys.push(key);
      }
    }
    return this.getKeysFromRealKeysArray(realKeys);
  }
}