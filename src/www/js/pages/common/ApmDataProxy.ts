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


import {KeyCache} from '@/toolbox/KeyCache/KeyCache';
import {WebStorageKeyCache} from '@/toolbox/KeyCache/WebStorageKeyCache';
import {CachedFetcher} from '@/toolbox/CachedFetcher';
import {urlGen} from './SiteUrlGen';
import {wait} from '@/toolbox/wait';
import {SimpleLockManager} from '@/toolbox/SimpleLockManager';
import * as Entity from '../../constants/Entity';
import {EntityDataInterface} from "../../../schema/Schema";
import {WitnessUpdateData} from "@/Api/Interfaces/WitnessUpdates";
import {IndexedDbKeyCache} from "@/toolbox/KeyCache/IndexedDbKeyCache";
import {ApiCollationTable_versionInfo} from "@/Api/DataSchema/ApiCollationTable_versionInfo";
import {ApiCollationTable_auto} from "@/Api/DataSchema/ApiCollationTable_auto";
import {
  ApiCollationTable_convertToEdition, ApiCollationTable_convertToEdition_input
} from "@/Api/DataSchema/ApiCollationTable_convertToEdition";

const TtlOneMinute = 60; // 1 minute
const TtlOneHour = 3600; // 1 hour
const TtlOneDay = 24 * 3600; // 24 hours

const CachePrefix = 'ApmData:';

const CleaningDelayInSeconds = 1;

const EntityTypeCacheKeyPrefix = 'EntityType';
const EntityDataCacheKeyPrefix = 'EntityData';

const MaxSystemEntityId = 10000000;


export interface DataProxyError {
  errorType: 'http' | 'authentication' | 'method' | 'network' | 'other';
  httpStatus: number;
  message: string;
}

export interface PdfUrlResponse {
  url: string | null;
  errorMsg?: string;
}


interface Caches {
  memory: KeyCache;
  session: WebStorageKeyCache;
  local: WebStorageKeyCache;
  longTerm: IndexedDbKeyCache;
}

type CacheNames = 'memory' | 'session' | 'local' | 'longTerm';

/**
 * Class to wrap most API calls to the APM and provide caching
 * for different types of data
 */
export class ApmDataProxy {
  private readonly cacheDataId: string;
  private readonly caches: Caches;
  private readonly lockManager: SimpleLockManager;
  private readonly localCacheLockManager: SimpleLockManager;
  private readonly cachedFetcher: CachedFetcher;
  private readonly localCachedFetcher: CachedFetcher;
  private readonly ignoreDataIds: string[] = [];

  private useBearerAuthentication: boolean = false;

  /**
   *
   * @param {string}cacheDataId
   * @param ignoreDataIds list of dataIds to ignore when cleaning
   */
  constructor(cacheDataId: string, ignoreDataIds: string[] = []) {
    this.cacheDataId = cacheDataId;
    this.lockManager = new SimpleLockManager();
    this.localCacheLockManager = new SimpleLockManager();
    this.caches = {
      memory: new KeyCache(),
      session: new WebStorageKeyCache('session', this.cacheDataId, CachePrefix),
      local: new WebStorageKeyCache('local', this.cacheDataId, CachePrefix),
      longTerm: new IndexedDbKeyCache('ApmData', this.cacheDataId)
    };
    this.cachedFetcher = new CachedFetcher(this.caches.session, 0, this.lockManager);
    this.localCachedFetcher = new CachedFetcher(this.caches.local, 0, this.localCacheLockManager);
    this.ignoreDataIds = ignoreDataIds;

  }

  public async initialize(): Promise<void> {
    await this.caches.longTerm.initialize();
    wait(CleaningDelayInSeconds * 1000).then(async () => {
      let sessionRemovedItemCount = await this.caches.session.cleanCache(-1, this.ignoreDataIds);
      let localRemovedItemCount = await this.caches.local.cleanCache(-1, this.ignoreDataIds);
      let longTermRemovedItemCount = await this.caches.longTerm.cleanCache(-1, this.ignoreDataIds);

      let total = sessionRemovedItemCount + localRemovedItemCount + longTermRemovedItemCount;
      if (total > 0) {
        console.log(`Removed ${total} items from web caches:  ${sessionRemovedItemCount} session, ${localRemovedItemCount} local, ${longTermRemovedItemCount} long term`);
      }
    });
  }

  public withBearerAuthentication(retrieveToken: () => Promise<string | null>, setToken: (t: string, ttl: number) => Promise<void>): this {
    this.useBearerAuthentication = true;
    this.getBearerToken = retrieveToken;
    this.setBearerToken = setToken;
    return this;
  }

  async getPersonEssentialData(personId: number): Promise<any> {
    return await this.getApmEntityData('Person', 'essential', personId, 'local');
  }

  async getPdfDownloadUrl(rawData: any): Promise<PdfUrlResponse> {
    try {
      const resp = await this.post(urlGen.apiTypesetRaw(), rawData, true);
      console.log(`Got PDF download resp`, resp);
      if (resp.status !== 'OK') {
        return {
          url: null, errorMsg: `Could not get PDF download url: ${resp.status}`
        };
      }
      return {
        url: resp.url
      };
    } catch (error) {
      console.warn(`Error getting PDF download url`, error);
      return {
        url: null, errorMsg: `Could not get PDF download url`
      };
    }
  }

  async collationTable_auto(apiCallOptions: any): Promise<ApiCollationTable_auto> {
    return await this.post(urlGen.apiCollationTable_auto(), apiCallOptions, true);
  }

  /**
   *
   * @param apiCallOptions
   * @throws {DataProxyError}
   */
  async collationTable_convertToEdition(apiCallOptions: ApiCollationTable_convertToEdition_input): Promise<ApiCollationTable_convertToEdition> {
    return await this.post(urlGen.apiCollationTable_convertToEdition(apiCallOptions.tableId), apiCallOptions, true);
  }

  async collationTable_versionInfo(tableId: number, versionTimeString: string): Promise<ApiCollationTable_versionInfo | null> {

    try {
      return await this.get(urlGen.apiCollationTable_versionInfo(tableId, versionTimeString));
    } catch (error) {
      console.error(`Error getting collation table version info ${tableId}, ${versionTimeString}`, error);
      return null;
    }
  }

  async getAllPersonEssentialData(): Promise<any> {
    let data = await this.caches.memory.retrieve("allPeopleData");
    if (data === null) {
      data = await this.get(urlGen.apiPersonGetDataForPeoplePage(), true);
      await this.caches.memory.store('allPeopleData', data, 5);
    }
    return data;
  }

  async getWorkDataOld(workId: number): Promise<any> {
    return await this.getApmEntityData('WorkOld', '', workId, 'local');
  }

  async getWorkData(workId: number): Promise<any> {
    return await this.getApmEntityData('Work', '', workId, 'local');
  }

  async getLegacySystemLanguagesArray(): Promise<any> {
    return await this.getAlmostStaticData('SystemLanguages', urlGen.apiSystemGetLanguages());
  }

  async getAuthors(): Promise<any> {
    return this.get(urlGen.apiWorksGetAuthors(), false, TtlOneMinute);
  }

  /**
   * Makes an API call to whoami and returns the user data.
   *
   * If the API returns a non-authorized stats (401), returns null.
   *
   */
  async whoAmI(): Promise<any> {
    if (this.useBearerAuthentication) {
      let token = await this.getBearerToken();
      if (token === null) {
        return null;
      }
    }
    try {
      return await this.get(urlGen.apiWhoAmI(), false, 300);
    } catch (error) {
      console.warn(`Error getting whoami`, error);
      return null;
    }
  }

  async apiLogin(username: string, password: string, rememberMe: boolean): Promise<boolean> {
    try {
      const resp = await fetch(urlGen.apiLogin(), {
        method: 'POST', body: JSON.stringify({user: username, pwd: password, rememberMe: rememberMe ? 'on' : ''})
      });
      if (resp.status === 200) {
        const data = await resp.json();
        if (data.status === 'OK') {
          await this.setBearerToken(data.token, data.ttl ?? 15 * 24 * 3600);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.warn(`Error logging in`, error);
      return false;
    }
    return false;
  }

  async getRealDocId(docId: number): Promise<number> {
    let cacheKey = `docId-${docId}`;
    let realDocId = await this.caches.local.retrieve(cacheKey);
    if (realDocId === null) {
      let resp = await this.get(urlGen.apiDocGetDocId(docId), true);
      realDocId = resp['docId'];
      await this.caches.local.store(cacheKey, realDocId);
    }
    return realDocId;

  }

  /**
   * Returns an array of tuples containing the entity id and name of the available
   * page types:
   *
   * `[ [ type1, 'name1'] , [ type2, 'name2'], .... ]`
   *
   * @returns {Promise<any>}
   */
  async getAvailablePageTypes(): Promise<any> {
    return this.getEntityNameTuples(await this.getAlmostStaticData('PageTypes', urlGen.apiGetPageTypes()));
  }

  async getAvailableLanguages() {
    return this.getEntityNameTuples(await this.getAlmostStaticData('AllLanguages', urlGen.apiEntityTypeGetEntities(Entity.tLanguage)));
  }

  async getAvailableDocumentTypes() {
    return this.getEntityNameTuples(await this.getAlmostStaticData('DocTypes', urlGen.apiEntityTypeGetEntities(Entity.tDocumentType)));
  }

  async getAvailableImagesSources() {
    return this.getEntityNameTuples(await this.getAlmostStaticData('ImageSources', urlGen.apiEntityTypeGetEntities(Entity.tImageSource)));
  }

  /**
   *
   * @param {number}pageId
   * @param {string}foliation
   * @param {number}type
   * @param {string}lang
   * @return {Promise<any>}
   */
  async savePageSettings(pageId: number, foliation: string, type: number, lang: string): Promise<any> {
    return this.post(urlGen.apiUpdatePageSettings(pageId), {
      foliation: foliation, type: type, lang: lang
    }, true);
  }

  async updateUserProfile(userTid: number, email: string, password1: string, password2: string): Promise<any> {
    return this.post(urlGen.apiUpdateProfile(userTid), {
      email: email, password1: password1, password2: password2
    }, true);
  }

  async checkWitnessUpdates(witnessIds: string[]): Promise<WitnessUpdateData> {
    try {
      return await this.post(urlGen.apiWitnessCheckUpdates(), witnessIds, true);
    } catch (error) {
      console.error(`Error checking witness updates`, error);
      return {status: 'Error', message: 'Error checking witness updates', witnesses: [], timeStamp: ''};
    }
  }

  async createUser(personTid: number, username: string): Promise<any> {
    return this.post(urlGen.apiCreateUser(personTid), {
      username: username,
    }, true);
  }

  async createPerson(name: string, sortName: string): Promise<any> {
    return this.post(urlGen.apiPersonCreate(), {
      name: name, sortName: sortName
    }, true);
  }

  /**
   * Calls the createDocument API on APM
   * @param {string}name
   * @param type
   * @param lang
   * @param imageSource
   * @param imageSourceData
   * @returns {Promise<{}>}
   */
  async createDocument(name: string, type: string | null = null, lang: string | null = null, imageSource: string | null = null, imageSourceData: string | null = null): Promise<any> {
    return this.post(urlGen.apiDocumentCreate(), {
      name: name, type: type, lang: lang, imageSource: imageSource, imageSourceData: imageSourceData
    }, true);
  }

  async getPersonWorks(personTid: number): Promise<any> {
    return this.get(urlGen.apiPersonGetWorks(personTid), false, TtlOneMinute);
  }

  /**
   * Gets a URL with caching if needed.
   *
   * By default, an actual GET request will be done and the results will not be cached.
   *
   * @param {string} url
   * @param {boolean} [forceGet=true] if true, the cache is not checked, and the GET request is actually made to the URL
   * @param {number} [ttl=-1] seconds to cache the results, or no caching if <=0
   * @param sessionCache
   * @return {Promise<{}>}
   */
  get(url: string, forceGet: boolean = true, ttl: number = -1, sessionCache = true): Promise<any> {
    return this.fetch(url, 'GET', null, forceGet, false, ttl, sessionCache);
  }

  /**
   * Returns an entity's type.
   *
   * @param {number }id
   */
  async getEntityType(id: number) {
    // Since entities do not change types, these values can be
    // cached for a long time
    let cacheKey = `${EntityTypeCacheKeyPrefix}-${id}`;
    let type = await this.caches.local.retrieve(cacheKey, this.cacheDataId);
    if (type === null) {
      let data = await this.getEntityData(id);
      await this.storeEntityDataInCache(data);
      type = data['type'];
      await this.caches.local.store(cacheKey, type, this.getTtlWithVariability(60 * 24 * 3600));
    }
    return type;
  }

  /**
   *
   * @param {number}id
   * @return {Promise<string>}
   */
  async getEntityName(id: number): Promise<string> {
    if (id === null) {
      return 'Undefined';
    }
    return (await this.getEntityData(id))['name'];
  }

  async apiEntityStatementsEdit(commands: any) {
    return $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(commands));

  }

  /**
   * Gets the server's entity data using smart caching and locking
   * @param {number}id
   * @param {boolean}forceFetch
   * @return {Promise<any>}
   */
  async getEntityData(id: number, forceFetch: boolean = false): Promise<EntityDataInterface> {
    let lockKey = `GetEntityData-${id}`;
    await this.lockManager.getLock(lockKey);
    let data: EntityDataInterface;
    if (forceFetch) {
      data = await this.getEntityDataRaw(id);
      await this.storeEntityDataInCache(data);
    } else {
      data = await this.retrieveEntityDataFromCache(id);
      if (data === null) {
        data = await this.getEntityDataRaw(id);
        await this.storeEntityDataInCache(data);
      }
    }
    this.lockManager.releaseLock(lockKey);
    return data;
  }

  /**
   * Gets statement qualification objects from the server
   * normally saving their entity data in the respective cache
   *
   * @param saveData
   */
  async getStatementQualificationObjects(saveData = true) {

    let data = await this.fetch(urlGen.apiEntityGetStatementQualificationObjects(saveData), 'GET', {}, false, false, TtlOneHour);

    if (!saveData) {
      return data;
    }

    let ids: any[] = [];

    data.forEach((entityData: any) => {
      ids.push(entityData.id);
      this.storeEntityDataInCache(entityData);
    });

    return ids;

  }

  getPredicateDefinitionsForType(type: number) {
    return this.fetch(urlGen.apiEntityGetPredicateDefinitionsForType(type), 'GET', {}, false, false, TtlOneHour);
  }

  getEntityListForType(typeTid: number) {
    return this.fetch(urlGen.apiEntityTypeGetEntities(typeTid), 'GET', {}, false, false, TtlOneHour);
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
  getApmEntityData(entityType: string, dataType: string, entityId: number, cacheName: CacheNames = 'local'): Promise<any> {

    // @ts-ignore
    return new Promise(async (resolve, reject) => {
      let ttl = TtlOneDay;
      let getUrl = '';
      switch (entityType) {
        case 'Person':
          if (dataType === 'essential') {
            ttl = TtlOneDay * 8;
            getUrl = urlGen.apiPersonGetEssentialData(entityId);
          } else {
            reject(`Invalid data type for Person data: ${dataType}`);
          }
          break;

        case 'WorkOld':
          getUrl = urlGen.apiWorkGetInfoOld(entityId);
          break;

        case 'Work':
          getUrl = urlGen.apiWorkGetData(entityId);
          break;
      }
      if (getUrl === '') {
        reject(`Invalid entity type ${entityType} : ${dataType}`);
      }
      let cacheKey = this.getCacheKey(entityType, dataType, entityId);
      let cache: KeyCache = this.caches[cacheName];
      let cachedInfo = await cache.retrieve(cacheKey);
      if (cachedInfo !== null) {
        resolve(cachedInfo);
        return;
      }
      console.log(`Cache key ${cacheKey} not found, getting data from server`);
      this.get(getUrl, true).then(async (serverData) => {
        let dataToStore = null;
        switch (entityType) {
          case 'Person':
            dataToStore = this.getPersonDataToStoreFromServerData(serverData);
            break;

          case 'WorkOld':
            dataToStore = this.getWorkDataToStoreFromServerData(serverData);
            break;

          case 'Work':
            dataToStore = serverData;
        }
        await cache.store(cacheKey, dataToStore, ttl * (1 + Math.random())).then(() => {
          resolve(dataToStore);
        });
      }).catch((e) => {
        reject(e);
      });
    });
  }

  /**
   * Gets edition source information from server
   * @param tid
   */
  getEditionSource(tid: number): Promise<any> {
    return this.fetch(urlGen.apiEditionSourcesGet(tid), 'GET', {}, false, false, TtlOneHour);
  }

  /**
   * Resolves to an array of tuples containing the id and the name for each of the entities
   * in the given array
   * @param {number[]}entityIdArray
   */
  private async getEntityNameTuples(entityIdArray: number[]) {
    return Promise.all(entityIdArray.map(async (id) => {
      return [id, await this.getEntityName(id)];
    }));
  }

  private async getAlmostStaticData(name: string, url: string): Promise<any> {
    let cache = this.caches.local;
    let data = await cache.retrieve(name);
    if (data !== null) {
      return data;
    }
    let serverData = await this.get(url, true);
    await cache.store(name, serverData, TtlOneDay);
    return serverData;
  }

  /**
   *
   * @param {string}url
   * @param {string} method
   * @param {any}payload
   * @param {boolean}forceActualFetch
   * @param {boolean}useRawData if true, the payload is posted as is, otherwise the payload is encapsulated on an object { data: payload}
   * @param {number} ttl
   * @param sessionCache
   * @return {Promise<any>}
   * @throws {DataProxyError}
   */
  private fetch(url: string, method: string = 'GET', payload: any, forceActualFetch: boolean = false, useRawData: boolean = false, ttl: number = -1, sessionCache = true): Promise<any> {
    let key = encodeURI(url);
    let fetcher = sessionCache ? this.cachedFetcher : this.localCachedFetcher;
    return fetcher.fetch(key, () => {
      return new Promise(async (resolve, reject: (e: DataProxyError) => void) => {
        if (['GET', 'POST'].indexOf(method) === -1) {
          reject({
            errorType: 'method',
            httpStatus: -1,
            message: `Invalid method ${method} for URL ${url}`
          });
        }
        let fetchOptions: any = {method: method};
        if (this.useBearerAuthentication) {
          const token = await this.getBearerToken();
          if (token === null) {
            reject({
              errorType: 'authentication',
              httpStatus: -1,
              message: `No authentication token available`
            })
            return;
          }
          fetchOptions['headers'] = {'Authorization': `Bearer ${token}`};
        }
        const actualPayload = useRawData ? payload : {data: JSON.stringify(payload)};

        const fetchFunction = method === 'GET' ? () => {
          return fetch(url, fetchOptions);
        } : () => {
          fetchOptions['headers'] = fetchOptions['headers'] || {};
          fetchOptions['headers']['Content-Type'] = 'application/json';
          fetchOptions['body'] = JSON.stringify(actualPayload);
          return fetch(url, fetchOptions);
        };

        fetchFunction().then((response) => {
          if (response.status === 200) {
            return response.json().then((data) => {
              resolve(data);
            });
          } else {
            console.log(`Error fetching ${url}`, response);
            reject({
              errorType: 'http',
              httpStatus: response.status,
              message: `Error ${response.status} fetching ${url}`
            })
          }
        });
      });
    }, forceActualFetch, ttl);
  }

  /**
   * Post to the APM server.
   * @param {string}url
   * @param {any}payload
   * @param {boolean}useRawData if true, the payload is posted as is, otherwise the payload is encapsulated in an object `{ data: payload}`
   */
  private post(url: string, payload: any, useRawData: boolean = false): Promise<any> {
    return this.fetch(url, 'POST', payload, true, useRawData);
  }

  /**
   * Stores the data for an entity in the browser's cache
   *
   * @param {Object} data - The entity's data object
   * @param {?number} [ttl=null] if null, the default cache strategy will be used
   * @private
   */
  private async storeEntityDataInCache(data: any, ttl: number | null = null) {
    let cache = this.caches.local;
    if (ttl === null) {
      if (data.id <= MaxSystemEntityId) {
        // system entity, data will change only on a change of schema, which
        // entails a change in dataId too, so we can use
        // an arbitrarily long TTL
        ttl = 90 * 24 * 3600;  // 3 months
      } else {
        // any other entity gets one hour
        ttl = 3600;  // 1 hour
      }
    }
    if (ttl < 0) {
      // do nothing
      return;
    }
    // since in many cases a lot of entities get queried at the same time,
    // it makes sense to introduce some variability in the TTL
    ttl = this.getTtlWithVariability(ttl);

    // console.log(`Storing entity ${data.id} data in cache with ttl = ${ttl}`);

    // use the session cache, so that all entity data can disappear when resetting the browser
    await cache.store(`${EntityDataCacheKeyPrefix}:${data.id}`, data, ttl);
  }

  private async retrieveEntityDataFromCache(id: number): Promise<any> {
    let cache = this.caches.local;
    if (id <= MaxSystemEntityId) {
      cache = this.caches.local;
    }
    return cache.retrieve(`${EntityDataCacheKeyPrefix}:${id}`);
  }

  /**
   * Introduces random variability to a given TTL
   * @param {number}ttl  TTL in seconds
   * @param variability  +/- percentage of variability
   * @private
   */
  private getTtlWithVariability(ttl: number, variability = 5) {
    return ttl * (1 - variability / 100) + (ttl / variability) * Math.random();
  }

  private async getEntityDataRaw(tid: number): Promise<EntityDataInterface> {
    console.log(`Fetching data for entity ${tid} from the server`);
    let url = urlGen.apiEntityGetData(tid);
    // use a lock here too, just in case some guerrilla function somewhere
    // else in the code is trying to do the same
    await this.lockManager.getLock(url);
    let data: EntityDataInterface = await $.get(urlGen.apiEntityGetData(tid));
    this.lockManager.releaseLock(url);
    return data;
  }

  /**
   *
   * @param serverData
   * @return {{name, id, username}}
   * @private
   */
  private getPersonDataToStoreFromServerData(serverData: any): { name: string; id: number; username: string } {
    return serverData;
  }

  /**
   *
   * @param serverData
   * @return {{id, dareId, authorId, title}}
   * @private
   */
  private getWorkDataToStoreFromServerData(serverData: any): {
    id: number; dareId: string; authorId: number; authorTid: number; title: string
  } {
    return {
      id: serverData['id'],
      dareId: serverData['dare_id'],
      authorId: serverData['author_id'],
      authorTid: serverData['author_tid'],
      title: serverData['title']
    };
  }

  /**
   *
   * @param {string}entityType
   * @param {string}dataType
   * @param {number}entityId
   * @param {string}attribute
   * @return {string}
   * @private
   */
  private getCacheKey(entityType: string, dataType: string, entityId: number, attribute: string = ''): string {
    if (dataType === '') {
      dataType = 'default';
    }
    return `${entityType}:${dataType}:${entityId}${attribute === '' ? '' : ':' + attribute}`;
  }

  private getBearerToken: () => Promise<string | null> = () => Promise.resolve(null);

  private setBearerToken: (t: string, ttl: number) => Promise<void> = () => Promise.resolve();


}