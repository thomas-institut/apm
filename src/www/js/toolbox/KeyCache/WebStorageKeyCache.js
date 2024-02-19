import { KeyCache } from './KeyCache'

export class WebStorageKeyCache extends KeyCache {

  /**
   * Constructs a WebStorageKeyCache
   * if sessionStorage is true, the browser's session
   * storage will be used, otherwise the (more permanent)
   * local storage will be used.
   * @param {string} type
   * @param dataId
   */
  constructor (type = 'session', dataId = '') {
    super(dataId)
    this.storage = type === 'session' ? window.sessionStorage : window.localStorage
  }


  storeItemObject (key, itemObject) {
      this.storage.setItem(key, JSON.stringify(itemObject))
  }

  getItemObject (key) {
    let val = this.storage.getItem(key)
    if (val === null) {
      return null
    }
    return JSON.parse(val);
  }

  deleteItemObject(key) {
    this.storage.removeItem(key)
  }

  getKeys () {
    let storageLength = this.storage.length
    let keys = []
    for (let i = 0; i < storageLength; i++) {
      keys.push(this.storage.key(i))
    }
    return keys
  }

}