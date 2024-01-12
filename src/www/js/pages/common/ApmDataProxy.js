/*
 *  Copyright (C) 2023 Universität zu Köln
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


import { KeyCache } from '../../toolbox/KeyCache/KeyCache'
import { WebStorageKeyCache } from '../../toolbox/KeyCache/WebStorageKeyCache'
import { CachedFetcher } from '../../toolbox/CachedFetcher'
import { urlGen } from './SiteUrlGen'


const cachePrefix = 'apm';

const shortTtl = 60 // 1 minute
const mediumTtl = 3600; // 1 hour
const longTtl = 24 * 3600; // 24 hours


const typeNames = {
  'mss': 'Manuscript',
  'print': 'Print'
}

const langNames = {
  'ar': 'Arabic',
  'la': 'Latin',
  'he' : 'Hebrew',
  'jrb': 'Judeo Arabic'
}

/**
 * Class to wrap most API calls to the APM and provide caching
 * for different types of data
 */
export class ApmDataProxy {

  /**
   *
   * @param {string}cacheDataId
   */
  constructor (cacheDataId) {
    this.cacheDataId = cacheDataId;
    this.caches = {
      memory: new KeyCache(),
      session: new WebStorageKeyCache('session', this.cacheDataId),
      local: new WebStorageKeyCache('local', this.cacheDataId)
    }

    this.cachedFetcher = new CachedFetcher(this.caches.memory);
  }

  async getPersonEssentialData(personId) {
    return await this.getApmEntityData('Person', 'essential',  personId, 'session');
  }

  async getWorkData(workDareId) {
    return await this.getApmEntityData('Work', '', workDareId, 'local');
  }

  async getDocTypeName(type) {
    return typeNames[type];
  }

  async getLangName(lang) {
    return langNames[lang];
  }


  async getAvailablePageTypes() {
    return await this.getAlmostStaticData('pageTypes', urlGen.apiGetPageTypes());
  }


  async getAlmostStaticData(name, url) {
    let cacheKey = `${cachePrefix}-${name}`;
    let cache = this.caches['local'];
    let data = cache.retrieve(cacheKey);
    if (data !== null) {
      return data;
    }
    let serverData = await this.get(url, true);
    cache.store(cacheKey, serverData, longTtl)
    return serverData
  }

  /**
   *
   * @param {number}pageId
   * @param {string}foliation
   * @param {number}type
   * @param {string}lang
   * @return {Promise<void>}
   */
  async savePageSettings(pageId, foliation, type, lang) {
    return this.post(urlGen.apiUpdatePageSettings(pageId), {
      foliation: foliation,
      type: type,
      lang: lang
    }, true)
  }


  /**
   *
   * @param {string}url
   * @param {string} method
   * @param {{}}payload
   * @param {boolean}forceActualFetch
   * @param {boolean}useRawData
   * @return {Promise<{}>}
   */
  fetch(url, method = 'GET', payload = [] , forceActualFetch = false, useRawData = false) {
    let key = encodeURI(url)
    return this.cachedFetcher.fetch(key, () => {
      switch(method) {
        case 'GET':
          return $.get(url)

        case 'POST':
          if (useRawData) {
            return $.post(url, payload)
          }
          return $.post(url, {data: JSON.stringify(payload)})
      }

    }, forceActualFetch)
  }

  /**
   * Post to the APM server.
   * @param {string}url
   * @param {{}}payload
   * @param {boolean}useRawData
   * @return {Promise<{}>}
   */
  post(url, payload, useRawData = false) {
    return this.fetch(url, 'POST', payload, true, useRawData)
  }

  /**
   *
   * @param {string} url
   * @param {boolean}forceActualFecth
   * @return {Promise<{}>}
   */
  get(url, forceActualFecth = true) {
    return this.fetch(url, 'GET', [], forceActualFecth)
  }


  /**
   *
   * @param {string} entityType
   * @param {string} dataType
   * @param {string|number}entityId
   * @param {string}cacheName
   * @return {Promise<any>}
   * @private
   */
  getApmEntityData(entityType, dataType, entityId, cacheName = 'session') {
    return new Promise ( (resolve, reject) => {
      let getUrl = '';
      switch(entityType) {
        case 'Person':
          if (dataType === 'essential') {
            getUrl =  urlGen.apiPersonGetEssentialData(entityId);
          } else {
            reject(`Invalid data type for Perso data: ${dataType}`)
          }
          break;

        case 'Work':
          getUrl = urlGen.apiWorkGetInfo(entityId);
          break
      }
      if (getUrl === '') {
        reject(`Invalid entity type ${entityType} : ${dataType}`)
      }
      let cacheKey = this.getCacheKey(entityType, dataType, entityId);
      let cache = this.caches[cacheName];
      let cachedInfo = cache.retrieve(cacheKey);
      if (cachedInfo !== null) {
        resolve(cachedInfo);
        return;
      }
      console.log(`Cache key ${cacheKey} not found, getting data from server`)
      this.get( getUrl, true).then( (serverData) => {
        let dataToStore = null
        switch(entityType) {
          case 'Person':
            dataToStore = this.getPersonDataToStoreFromServerData(serverData)
            break

          case 'Work':
            dataToStore  = this.getWorkDataToStoreFromServerData(serverData)
            break
        }
        cache.store(cacheKey, dataToStore, longTtl);
        resolve(dataToStore);
      }).catch( (e) => {
        reject(e);
      });
    })
  }

  /**
   *
   * @param serverData
   * @return {{name, id, username}}
   * @private
   */
  getPersonDataToStoreFromServerData(serverData) {
    return serverData
  }

  /**
   *
   * @param serverData
   * @return {{id, dareId, authorId, title}}
   * @private
   */
  getWorkDataToStoreFromServerData(serverData) {
    return {
      id: serverData['id'],
      dareId: serverData['dare_id'],
      authorId: serverData['author_id'],
      authorTid: serverData['author_tid'],
      title: serverData['title']
    }
  }

  /**
   *
   * @param {string}entityType
   * @param {string}dataType
   * @param {int}entityId
   * @param {string}attribute
   * @return {string}
   * @private
   */
  getCacheKey(entityType, dataType, entityId, attribute = '') {
    if (dataType === '') {
      dataType = 'default';
    }
    return `${cachePrefix}-${entityType}-${dataType}-${entityId}${attribute === '' ? '' : '-' + attribute}`;
  }



}