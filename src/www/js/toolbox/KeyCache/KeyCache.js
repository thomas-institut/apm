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

/**
 * Maximum TTL in the system
 *
 * @type {number}
 */
const MaxTtl = 7 * 24 * 3600;

export class KeyCache {

  /**
   *
   * @param {string} dataId
   * @param {string} prefix
   */
  constructor (dataId = '', prefix = '') {
    this.cache = {};
    this.defaultDataId = dataId;
    this.prefix = prefix;
  }

  /**
   * Stores a value for the given key.
   *
   * A time-to-live (ttl) in seconds can be given. After
   * that number of seconds the key/value pair will
   * no longer be accessible.
   *
   * If the given dataId parameter is null, the default dataId is used,
   * o
   *
   * @param {string}key
   * @param {any}data
   * @param {number}ttl
   * @param {string|null}dataId
   */
  store(key, data, ttl = 0, dataId = null) {
    let now = this.now()
    this.storeItemObject(key, {
      data: data,
      dataId: dataId ?? this.defaultDataId,
      expires: ttl > 0 ? now + ttl : -1,
      setAt: now
    })
  }

  getRealKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Retrieves an item from the cache.
   *
   * Returns null if the key is not defined in the cache, the stored data is expired or
   * the stored data's dataId does not match the given dataId (or the default dataId if the
   * given one is null)
   *
   * @param {string }key
   * @param {string | null} dataId
   * @return {*|null}
   */
  retrieve(key, dataId = null) {
    let itemData = this.getItemObject(key)
    if (itemData === undefined || itemData === null)  {
      return null
    }
    if (itemData['dataId'] === (dataId ?? this.defaultDataId)) {
      if (itemData.expires === -1) {
        // enforce max ttl
        let realExpirationTime = itemData.setAt + MaxTtl;
        if (realExpirationTime > this.now()) {
          return itemData.data
        }
      } else {
        if (itemData.expires > this.now()) {
          return itemData.data
        }
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
   * also items which do not have a matching.
   *
   * Returns the number of removed items
   *
   * @param before
   * @param ignoreDataIds array of dataIds to ignore
   * @return {number}
   */
  cleanCache(before = -1, ignoreDataIds = []) {
    let now = this.now();
    let removedItemCount = 0;
    this.getKeys().forEach( (key) => {
      let itemObject = this.getItemObject(key);
      if (itemObject === null) {
        removedItemCount++;
        this.delete(key);
        return;
      }
      if (itemObject['dataId'] !== this.defaultDataId) {
        if (ignoreDataIds.indexOf(itemObject['dataId']) === -1) {
          removedItemCount++;
          this.delete(key);
        }
        return;
      }
      let expirationTime = itemObject.expires === -1 ? itemObject.setAt + MaxTtl : itemObject.expires;
      if (expirationTime < now) {
        removedItemCount++;
        this.delete(key);
        return;
      }
      if (itemObject.setAt <= before) {
        removedItemCount++;
        this.delete(key);
      }
    })
    return removedItemCount;

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
   return this.getKeysFromRealKeysArray(Object.keys(this.cache));
  }

  getKeysFromRealKeysArray(realKeysArray) {
    let prefixLength = this.prefix.length;
    return realKeysArray.filter( (realKey) => {
      return realKey.substring(0, prefixLength) === this.prefix;
    }).map( (realKey) => {
      return realKey.substring(prefixLength);
    });
  }

  /**
   * Returns the complete data object from the cache.
   *
   * @param {string} key
   * @return { {data, expires, setAt}}
   * @protected
   */
  getItemObject(key) {
    return this.cache[this.getRealKey(key)];
  }

  /**
   *
   * @param {string}key
   * @param { {data, expires, setAt}}itemObject
   */
  storeItemObject(key, itemObject) {
    this.cache[this.getRealKey(key)] = itemObject;
  }

  /**
   * Deletes the item object for the given key
   * @param {string}key
   * @protected
   */
  deleteItemObject(key) {
    delete this.cache[this.getRealKey(key)];
  }

}