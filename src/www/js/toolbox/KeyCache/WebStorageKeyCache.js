import { KeyCache } from './KeyCache'

export class WebStorageKeyCache extends KeyCache {

  /**
   * Constructs a WebStorageKeyCache
   * if sessionStorage is true, the browser's session
   * storage will be used, otherwise the (more permanent)
   * local storage will be used.
   * @param {string} type
   * @param {string}dataId
   * @param {string}cachePrefix
   */
  constructor (type = 'session', dataId = '', cachePrefix = '') {
    super(dataId, cachePrefix)
    this.storage = type === 'session' ? window.sessionStorage : window.localStorage
  }

  storeItemObject (key, itemObject) {
      this.storage.setItem(this.getRealKey(key), JSON.stringify(itemObject))
  }

  getItemObject (key) {
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

  deleteItemObject(key) {
    this.storage.removeItem(this.getRealKey(key));
  }

  getKeys () {
    let storageLength = this.storage.length
    let realKeys = []
    for (let i = 0; i < storageLength; i++) {
      realKeys.push(this.storage.key(i))
    }
    return this.getKeysFromRealKeysArray(realKeys);
  }
}