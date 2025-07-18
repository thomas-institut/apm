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
import { wait } from '../../toolbox/FunctionUtil'
import { SimpleLockManager } from '../../toolbox/SimpleLockManager'
import * as Entity from '../../constants/Entity'
import {EntityDataInterface} from "../../../schema/Schema";

const TtlOneMinute = 60 // 1 minute
const TtlOneHour = 3600; // 1 hour
const TtlOneDay = 24 * 3600; // 24 hours
const TtlForever = 2 * 365 * 24 * 3600; // 2 years

const CleaningDelayInSeconds = 1;


const typeNames = {
  'mss': 'Manuscript',
  'print': 'Print'
}

const EntityTypeCacheKeyPrefix = 'EntityType'
const EntityDataCacheKeyPrefix = 'EntityData'

const MaxSystemEntityId = 10000000;


/**
 * Class to wrap most API calls to the APM and provide caching
 * for different types of data
 */
export class ApmDataProxy {
  private readonly cacheDataId: string;
  private readonly caches: { [ key: string]: KeyCache };
  private readonly lockManager: any;
  private readonly localCacheLockManager: any;
  private readonly cachedFetcher: any;
  private readonly localCachedFetcher: any;

  /**
   *
   * @param {string}cacheDataId
   * @param {string}cachePrefix
   * @param ignoreDataIds list of dataIds to ignore when cleaning
   */
  constructor (cacheDataId: string, cachePrefix: string, ignoreDataIds: string[] = []) {
    this.cacheDataId = cacheDataId;
    this.caches = {
      memory: new KeyCache(),
      session: new WebStorageKeyCache('session', this.cacheDataId, cachePrefix),
      local: new WebStorageKeyCache('local', this.cacheDataId, cachePrefix)
    }

    this.lockManager = new SimpleLockManager();
    this.localCacheLockManager = new SimpleLockManager();

    this.cachedFetcher = new CachedFetcher(this.caches.session, 0, this.lockManager);
    this.localCachedFetcher = new CachedFetcher(this.caches.local, 0, this.localCacheLockManager);



    wait(CleaningDelayInSeconds * 1000).then( () => {

      let sessionRemovedItemCount = this.caches.session.cleanCache(-1, ignoreDataIds);
      let localRemovedItemCount = this.caches.local.cleanCache(-1, ignoreDataIds);

      let total = sessionRemovedItemCount + localRemovedItemCount;
      if (total > 0) {
        console.log(`Removed ${total} items from web caches:  ${sessionRemovedItemCount} session, ${localRemovedItemCount} local`);
      }
    })
  }

  async getPersonEssentialData(personId: number):Promise<any> {
    return await this.getApmEntityData('Person', 'essential',  personId, 'local');
  }

  async getAllPersonEssentialData():Promise<any>{
    let data = this.caches.memory.retrieve("allPeopleData");
    if (data === null) {
      data = await this.get(urlGen.apiPersonGetDataForPeoplePage(), true);
      this.caches.memory.store('allPeopleData', data, 5);
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

  async getAuthors():Promise<any> {
    return this.get(urlGen.apiWorksGetAuthors(),  false, TtlOneMinute);
  }

  async getRealDocId(docId: number):Promise<number> {
    let cacheKey = `docId-${docId}`;
    let realDocId = this.caches.local.retrieve(cacheKey);
    if (realDocId === null) {
      let resp = await this.get(urlGen.apiDocGetDocId(docId), true);
      realDocId = resp['docId'];
      this.caches.local.store(cacheKey, realDocId);
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
    return this.getEntityNameTuples( await this.getAlmostStaticData('PageTypes', urlGen.apiGetPageTypes()));
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
   * Resolves to an array of tuples containing the id and the name for each of the entities
   * in the given array
   * @param {number[]}entityIdArray
   */
  async getEntityNameTuples(entityIdArray: number[]) {
    return Promise.all( entityIdArray.map( async (id) => {
      return [ id, await this.getEntityName(id)];
    }))
  }


  async getAlmostStaticData(name: string, url: string): Promise<any> {
    let cache = this.caches['local'];
    let data = cache.retrieve(name);
    if (data !== null) {
      return data;
    }
    let serverData = await this.get(url, true);
    cache.store(name, serverData, TtlOneDay)
    return serverData
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
      foliation: foliation,
      type: type,
      lang: lang
    }, true);
  }

  async updateUserProfile(userTid: number, email: string, password1: string, password2: string): Promise<any> {
    return this.post(urlGen.apiUpdateProfile(userTid), {
      email: email,
      password1: password1,
      password2: password2
    }, true);
  }

  async createUser(personTid: number, username: string): Promise<any> {
    return this.post(urlGen.apiCreateUser(personTid), {
      username: username,
    }, true);
  }

  async createPerson(name: string, sortName: string): Promise<any>{
    return this.post(urlGen.apiPersonCreate(), {
      name: name,
      sortName: sortName
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
  async createDocument(name: string, type: string|null = null, lang: string|null = null, imageSource: string|null= null, imageSourceData: string|null = null): Promise<any> {
    return this.post(urlGen.apiDocumentCreate(), {
      name: name,
      type: type,
      lang: lang,
      imageSource: imageSource,
      imageSourceData: imageSourceData
    }, true);
  }

  async getPersonWorks(personTid: number): Promise<any>{
    return this.get(urlGen.apiPersonGetWorks(personTid), false, TtlOneMinute);
  }


  /**
   *
   * @param {string}url
   * @param {string} method
   * @param {{}}payload
   * @param {boolean}forceActualFetch
   * @param {boolean}useRawData if true, the payload is posted as is, otherwise the payload is encapsulated on an object { data: payload}
   * @param {number} ttl
   * @param sessionCache
   * @return {Promise<{}>}
   */
  fetch(url: string, method: string = 'GET', payload: any, forceActualFetch: boolean = false, useRawData: boolean = false, ttl: number = -1, sessionCache = true): Promise<any> {
    let key = encodeURI(url);
    let fetcher = sessionCache ? this.cachedFetcher : this.localCachedFetcher;
    return fetcher.fetch(key, () => {
      switch(method) {
        case 'GET':
          return $.get(url)

        case 'POST':
          if (useRawData) {
            return $.post(url, payload)
          }
          return $.post(url, {data: JSON.stringify(payload)})
      }

    }, forceActualFetch, ttl)
  }

  /**
   * Post to the APM server.
   * @param {string}url
   * @param {{}}payload
   * @param {boolean}useRawData if true, the payload is posted as is, otherwise the payload is encapsulated in an object `{ data: payload}`
   * @return {Promise<{}>}
   */
  post(url: string, payload: any, useRawData: boolean = false): Promise<any> {
    return this.fetch(url, 'POST', payload, true, useRawData)
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
    return this.fetch(url, 'GET', { }, forceGet, false, ttl, sessionCache)
  }

  /**
   * Stores the data for an entity in the browser's cache
   *
   * @param {Object} data - The entity's data object
   * @param {?number} [ttl=null] if null, the default cache strategy will be used
   * @private
   */
  storeEntityDataInCache(data: any, ttl: number | null = null) {
    let cache = this.caches.session;
    if (ttl === null) {
      if (data.id <= MaxSystemEntityId) {
        // system entity, data will change only on a change of schema, which
        // entails a change in dataId too, so we can use
        // an arbitrarily long TTL
        ttl = 90 * 24 * 3600;  // 3 months
        cache = this.caches.local
      } else {
        // any other entity gets one hour
        ttl = 3600;  // 1 hour
      }
    }
    if (ttl < 0 ) {
      // do nothing
      return;
    }
    // since in many cases a lot of entities get queried at the same time,
    // it makes sense to introduce some variability in the TTL
    ttl = this.getTtlWithVariability(ttl);

    // console.log(`Storing entity ${data.id} data in cache with ttl = ${ttl}`);

    // use the session cache, so that all entity data can disappear when resetting the browser
    cache.store(`${EntityDataCacheKeyPrefix}-${data.id}`, data, ttl)
  }

  retrieveEntityDataFromCache(id : number) {
    let cache = this.caches.session
    if (id <= MaxSystemEntityId) {
      cache = this.caches.local;
    }
    return cache.retrieve(`${EntityDataCacheKeyPrefix}-${id}`);
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
    let type = this.caches.local.retrieve(cacheKey, this.cacheDataId);
    if (type === null) {
      let data = await this.getEntityData(id);
      this.storeEntityDataInCache(data);
      type = data['type'];
      this.caches.local.store(cacheKey, type, this.getTtlWithVariability(30 * 24 * 3600));
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

  /**
   * Introduces random variability to a given TTL
   * @param {number}ttl  TTL in seconds
   * @param variability  +/- percentage of variability
   * @private
   */
  getTtlWithVariability(ttl: number, variability = 5) {
    return  ttl * (1-variability/100) + (ttl/variability)*Math.random();
  }


  async getEntityDataRaw(tid: number): Promise<EntityDataInterface> {
    console.log(`Fetching data for entity ${tid} from the server`);
    let url = urlGen.apiEntityGetData(tid);
    // use a lock here too, just in case some guerrilla function somewhere
    // else in the code is trying to do the same
    await this.lockManager.getLock(url);
    let data: EntityDataInterface = await $.get(urlGen.apiEntityGetData(tid));
    this.lockManager.releaseLock(url);
    return data;
  }

  async apiEntityStatementsEdit(commands: any){
    return $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(commands));

  }

  /**
   * Gets the server's entity data using smart caching and locking
   * @param {number}id
   * @param {boolean}forceFetch
   * @return {Promise<any>}
   */
  async getEntityData(id: number, forceFetch: boolean = false): Promise<any> {
    let lockKey = `GetEntityData-${id}`;
    await this.lockManager.getLock(lockKey);
    let data;
    if (forceFetch) {
      data = await this.getEntityDataRaw(id);
      this.storeEntityDataInCache(data);
    } else {
      data = this.retrieveEntityDataFromCache(id);
      if (data === null) {
        data = await this.getEntityDataRaw(id);
        this.storeEntityDataInCache(data);
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

    let data = await this.fetch(urlGen.apiEntityGetStatementQualificationObjects(saveData),
      'GET', {}, false, false, TtlOneHour);

    if (!saveData) {
      return data;
    }

    let ids: any[] = [];

    data.forEach( (entityData: any) => {
      ids.push(entityData.id);
      this.storeEntityDataInCache(entityData);
    })

    return ids;

  }

  getPredicateDefinitionsForType(type:number) {
    return this.fetch(urlGen.apiEntityGetPredicateDefinitionsForType(type), 'GET', {},false, false, TtlOneHour);
  }

  getEntityListForType(typeTid:number) {
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
  getApmEntityData(entityType: string, dataType: string, entityId: number, cacheName: string = 'local'): Promise<any> {
    return new Promise ( (resolve, reject) => {
      let ttl = TtlOneDay;
      let getUrl = '';
      switch(entityType) {
        case 'Person':
          if (dataType === 'essential') {
            ttl = TtlOneDay * 8;
            getUrl =  urlGen.apiPersonGetEssentialData(entityId);
          } else {
            reject(`Invalid data type for Person data: ${dataType}`)
          }
          break;

        case 'WorkOld':
          getUrl = urlGen.apiWorkGetInfoOld(entityId);
          break;

        case 'Work':
          getUrl = urlGen.apiWorkGetData(entityId);
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

          case 'WorkOld':
            dataToStore  = this.getWorkDataToStoreFromServerData(serverData)
            break;

          case 'Work':
            dataToStore = serverData;
        }
        cache.store(cacheKey, dataToStore, ttl * (1+Math.random()));
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
  getPersonDataToStoreFromServerData(serverData: any): { name:string; id: number; username: string } {
    return serverData
  }

  /**
   *
   * @param serverData
   * @return {{id, dareId, authorId, title}}
   * @private
   */
  getWorkDataToStoreFromServerData(serverData: any): { id : number; dareId: string; authorId: number; authorTid: number; title : string} {
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
   * @param {number}entityId
   * @param {string}attribute
   * @return {string}
   * @private
   */
  getCacheKey(entityType: string, dataType: string, entityId: number, attribute: string = ''): string {
    if (dataType === '') {
      dataType = 'default';
    }
    return `${entityType}-${dataType}-${entityId}${attribute === '' ? '' : '-' + attribute}`;
  }

  /**
   * Gets edition source information from server
   * @param tid
   */
  getEditionSource(tid: number): Promise<any> {
    return this.fetch(urlGen.apiEditionSourcesGet(tid), 'GET', {}, false, false, TtlOneHour);
  }



}