import { deepCopy } from './Util.mjs'

export class KeyStore {

  constructor () {
    this.storage = {}
  }

  static clone(keyStore) {
    let copy = new KeyStore()
    copy.storage = deepCopy(keyStore.storage)
    return copy
  }
  /**
   *
   * @param {string}key
   * @param {object|string|number}someThing
   */
  add(key, someThing) {
    this.storage[key] = someThing
    return this
  }

  /**
   *
   * @param {string}key
   * @return {any}
   */
  get(key) {
    return this.storage[key]
  }

  has(key) {
    return this.storage.hasOwnProperty(key)
  }


  /**
   *
   * @param {string}key
   * @return {boolean}
   */
  delete(key) {
    delete this.storage[key]
  }

}