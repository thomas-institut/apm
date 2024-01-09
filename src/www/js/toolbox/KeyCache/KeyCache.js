/*
 *  Copyright (C) 2021-23 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

/**
 * A generic cache with expiration times and dataId
 *
 * Each cache entry is tagged with an expiration date and a dataId
 * Only stored entries that match the given dataId and are not expired
 * are returned when querying the cache.
 *
 * Normally, descendant of this class only need to implement
 * the protected methods: storeItemObject, getItemObject,
 * deleteItemObject and getKeys
 */
export class KeyCache {

  /**
   *
   * @param {string} dataId
   */
  constructor (dataId = '') {
    this.cache = {};
    this.dataId = dataId;
  }

  /**
   * Stores a value for the given key.
   *
   * A time-to-live (ttl) in seconds can be given. After
   * that number of seconds the key/value pair will
   * no longer be accessible.
   *
   * @param {string}key
   * @param {any}data
   * @param {number}ttl
   */
  store(key, data, ttl = 0) {
    let now = this.now()
    this.storeItemObject(key, {
      data: data,
      dataId: this.dataId,
      expires: ttl > 0 ? now + ttl : -1,
      setAt: now
    })
  }

  /**
   * Retrieves an item from the cache.
   *
   * If the key is not defined in the cache, returns null
   *
   * @param key
   * @return {*|null}
   */
  retrieve(key) {
    let itemData = this.getItemObject(key)
    if (itemData === undefined || itemData === null)  {
      return null
    }
    if (itemData['dataId'] === this.dataId) {
      if (itemData.expires === -1) {
        return itemData.data
      }

      if (itemData.expires > this.now()) {
        return itemData.data
      }
    }

    // item is expired or its dataId does not math the cache's dataId, so completely delete it from cache
    this.delete(key)
    return null
  }

  /**
   * Deletes the item with the given key from the cache
   * @param {string} key
   */
  delete(key) {
    this.deleteItemObject(key)
  }

  /**
   * Deletes all expired items as well as all items
   * set before the given date and, if a dataId is given,
   * also items which do not have a matching
   *
   * @param before
   */
  cleanCache(before = -1) {
    let now = this.now();
    this.getKeys().forEach( (key) => {
      let itemObject = this.getItemObject(key)
      if (itemObject['dataId'] !== this.dataId) {
        this.delete(key);
      }
      if (itemObject.expires < now) {
        this.delete(key);
      }
      if (itemObject.setAt <= before) {
        this.delete(key);
      }
    })

  }

  now() {
    return Date.now() / 1000;
  }

  /**
   * Returns all the keys currently in the cache, including
   * keys for expired items
   * @return {string[]}
   * @protected
   */
  getKeys() {
    return Object.keys(this.cache);
  }

  /**
   * Returns the complete data object from the cache.
   *
   * @param {string} key
   * @return { {data, expires, setAt}}
   * @protected
   */
  getItemObject(key) {
    return this.cache[key];
  }

  /**
   *
   * @param {string}key
   * @param { {data, expires, setAt}}itemObject
   */
  storeItemObject(key, itemObject) {
    this.cache[key] = itemObject;
  }

  /**
   * Deletes the item object for the given key
   * @param {string}key
   * @protected
   */
  deleteItemObject(key) {
    delete this.cache[key];
  }

}