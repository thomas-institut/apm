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
 * A generic cache with expiration times and dataId.
 *
 * Each cache entry is tagged with an expiration date and a dataId
 * Only stored entries that match the given dataId and are not expired
 * are returned when querying the cache.
 *
 * Normally, descendant of this class only need to implement
 * the protected methods:
 * - storeItemObject
 * - getItemObject,
 * - deleteItemObject
 * - getKeys
 */

/**
 * Maximum TTL in the system
 */
const MaxTtl: number = 365 * 24 * 3600;

export interface InternalCacheObject {
  data: any;
  dataId: string;
  expires: number;
  setAt: number;
}

export class KeyCache {
  private readonly defaultDataId: string;
  private readonly cache: { [key: string] : InternalCacheObject };
  private readonly prefix: string;

  constructor (dataId: string = '', prefix: string = '') {
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
   * If the given dataId parameter is null, the default dataId is used.
   *
   * If the key already exists, the value will be replaced (independently of the ttl and dataId)
   *
   */
  public async store(key: string, data: any, ttl: number = 0, dataId: string | null = null) : Promise<void>{
    let now = this.now()
    await this.storeItemObject(key, {
      data: data,
      dataId: dataId ?? this.defaultDataId,
      expires: ttl > 0 ? now + ttl : -1,
      setAt: now
    })
  }

  protected getRealKey(key: string): string {
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
  public async retrieve(key: string, dataId: string | null = null): Promise<any | null> {
    let itemData = await this.getItemObject(key)
    if (itemData === undefined || itemData === null)  {
      return null
    }
    if (itemData.dataId === (dataId ?? this.defaultDataId)) {
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
    await this.delete(key)
    return null
  }

  /**
   * Deletes the item with the given key from the cache
   * @param {string} key
   */
  public async delete(key: string) : Promise<void> {
    await this.deleteItemObject(key)
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
  public async cleanCache(before = -1, ignoreDataIds: string[] = []): Promise<number> {
    let now = this.now();
    let removedItemCount = 0;
    for (const key of await this.getKeys()) {
      let itemObject = await this.getItemObject(key);
      if (itemObject === null) {
        removedItemCount++;
        await this.delete(key);
        break;
      }
      if (itemObject.dataId !== this.defaultDataId) {
        if (ignoreDataIds.indexOf(itemObject.dataId) === -1) {
          removedItemCount++;
          await this.delete(key);
        }
        break;
      }
      let expirationTime = itemObject.expires === -1 ? itemObject.setAt + MaxTtl : itemObject.expires;
      if (expirationTime < now) {
        removedItemCount++;
        await this.delete(key);
        break;
      }
      if (itemObject.setAt <= before) {
        removedItemCount++;
        await this.delete(key);
      }
    }
    return removedItemCount;

  }

  private now() : number {
    return Date.now() / 1000;
  }

  /**
   * Returns all the keys currently in the cache, including
   * keys for expired items
   */
  protected async getKeys(): Promise<string[]> {
   return this.getKeysFromRealKeysArray(Object.keys(this.cache));
  }

  protected getKeysFromRealKeysArray(realKeysArray : string[]): string[] {
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
   * @return { InternalCacheObject}
   */
  protected async getItemObject(key: string): Promise<InternalCacheObject | null> {
    return this.cache[this.getRealKey(key)];
  }

  /**
   *
   * @param {string}key
   * @param {InternalCacheObject}itemObject
   */
  protected async storeItemObject(key : string, itemObject: InternalCacheObject): Promise<void> {
    this.cache[this.getRealKey(key)] = itemObject;
  }

  /**
   * Deletes the item object for the given key
   * @param {string}key
   * @protected
   */
  protected async deleteItemObject(key: string): Promise<void> {
    delete this.cache[this.getRealKey(key)];
  }

}