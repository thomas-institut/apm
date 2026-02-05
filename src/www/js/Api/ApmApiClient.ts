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


import {AsyncKeyCache} from '@/toolbox/KeyCache/AsyncKeyCache';
import {WebStorageKeyCache} from '@/toolbox/KeyCache/WebStorageKeyCache';
import {CachedFetcher} from '@/toolbox/CachedFetcher';
import {urlGen} from '@/pages/common/SiteUrlGen';
import {wait} from '@/toolbox/wait';
import * as Entity from '../constants/Entity';
import {WitnessUpdateData} from "@/Api/DataSchema/WitnessUpdates";
import {IndexedDbKeyCache} from "@/toolbox/KeyCache/IndexedDbKeyCache";
import {
  ApiCollationTable_convertToEdition_input,
  ApiCollationTableAuto,
  ApiCollationTableConvertToEdition,
  ApiCollationTableInfo,
  ApiCollationTableVersionInfo,
  AutomaticCollationSettings
} from "@/Api/DataSchema/ApiCollationTable";
import {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import {ApiUserCollationTables} from "@/Api/DataSchema/ApiUserCollationTables";
import {KeyCache} from "@/toolbox/KeyCache/KeyCache";
import {PdfUrlResponse} from "@/Api/DataSchema/ApiPdfUrlResponse";
import {ApiUserTranscriptions} from "@/Api/DataSchema/ApiUserTranscriptions";
import {DocumentData} from "@/Api/DataSchema/ApiDocumentsAllDocumentsData";
import {
  AllPeopleDataForPeoplePageItem, PersonEssentialData
} from "@/Api/DataSchema/ApiPeople";
import {ApiChunksWithTranscription, ApiWorksAll, WorkData} from "@/Api/DataSchema/ApiWorks";
import {EntityDataInterface, PredicateDefinitionsForType} from "@/Api/DataSchema/ApiEntity";
import {ApiSiglaPreset, ApiPresetsQuery, ApiAutomaticCollationTablePreset} from "@/Api/DataSchema/ApiPresets";
import {ApiPersonWorksResponse} from "@/Api/DataSchema/ApiPerson";
import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";

const TtlOneMinute = 60; // 1 minute
const TtlOneHour = 3600; // 1 hour
const TtlOneDay = 24 * 3600; // 24 hours

const CachePrefix = 'ApmData:';

const CleaningDelayInSeconds = 1;

const EntityTypeCacheKeyPrefix = 'EntityType';
const EntityDataCacheKeyPrefix = 'EntityData';

const MaxSystemEntityId = 10000000;


export type EntityNameTuple = [number, string];

export interface ApmApiClientError {
  errorType: 'http' | 'authentication' | 'method' | 'network' | 'other';
  httpStatus: number;
  message: string;
  data?: any;
}


interface Caches {
  memory: AsyncKeyCache;
  session: WebStorageKeyCache;
  local: WebStorageKeyCache;
  longTerm: IndexedDbKeyCache;
}

type CacheNames = 'memory' | 'session' | 'local' | 'longTerm';

/**
 * Class to wrap most API calls to the APM and provide caching
 * for different types of data
 */
export class ApmApiClient {
  private readonly cacheDataId: string;
  private readonly caches: Caches;
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
    this.caches = {
      memory: new AsyncKeyCache(),
      session: new WebStorageKeyCache('session', this.cacheDataId, CachePrefix),
      local: new WebStorageKeyCache('local', this.cacheDataId, CachePrefix),
      longTerm: new IndexedDbKeyCache('ApmData', this.cacheDataId)
    };
    this.cachedFetcher = new CachedFetcher(this.caches.session, 0);
    this.localCachedFetcher = new CachedFetcher(this.caches.local, 0);
    this.ignoreDataIds = ignoreDataIds;

  }

  public async initialize(): Promise<void> {
    await this.caches.longTerm.initialize();
    wait(CleaningDelayInSeconds * 1000).then(async () => {
      let sessionRemovedItemCount = this.caches.session.cleanCache(-1, this.ignoreDataIds);
      let localRemovedItemCount = this.caches.local.cleanCache(-1, this.ignoreDataIds);
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

  async getPersonEssentialData(personId: number): Promise<PersonEssentialData> {
    if (personId === 0) {
      console.warn(`getPersonEssentialData called with personId 0`);
      console.trace();
      return {
        extraAttributes: [],
        isUser: false,
        tid: 0,
        userEmailAddress: "",
        userName: "",
        userTags: [],
        name: '',
        sortName: ''
      };
    }
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

  async collationTableAuto(apiCallOptions: AutomaticCollationSettings): Promise<ApiCollationTableAuto> {
    return await this.post(urlGen.apiCollationTable_auto(), apiCallOptions, true);
  }

  /**
   *
   * @param apiCallOptions
   * @throws {ApmApiClientError}
   */
  async collationTableConvertToEdition(apiCallOptions: ApiCollationTable_convertToEdition_input): Promise<ApiCollationTableConvertToEdition> {
    return await this.post(urlGen.apiCollationTable_convertToEdition(apiCallOptions.tableId), apiCallOptions, true);
  }

  async collationTableVersionInfo(tableId: number, versionTimeString: string): Promise<ApiCollationTableVersionInfo | null> {

    try {
      return await this.get(urlGen.apiCollationTable_versionInfo(tableId, versionTimeString));
    } catch (error) {
      console.error(`Error getting collation table version info ${tableId}, ${versionTimeString}`, error);
      return null;
    }
  }

  async getAllPeopleData(): Promise<AllPeopleDataForPeoplePageItem[]> {
    return await this.get(urlGen.apiPersonGetDataForPeoplePage());
  }

  async getAllWorksData(): Promise<ApiWorksAll> {
    return await this.get(urlGen.apiWorksAll());
  }

  async getAllPersonEssentialData(): Promise<any> {
    let data = await this.caches.memory.retrieve("allPeopleData");
    if (data === null) {
      data = await this.get(urlGen.apiPersonGetDataForPeoplePage(), true);
      await this.caches.memory.store('allPeopleData', data, 5);
    }
    return data;
  }

  async getWorkDataOld(workId: string): Promise<any> {
    return await this.getApmEntityData('WorkOld', '', workId, 'local');
  }

  async getWorkData(workId: number | string): Promise<WorkData> {
    return await this.getApmEntityData('Work', '', workId, 'local');
  }

  async getWorkChunksWithTranscription(workId: string) : Promise<ApiChunksWithTranscription> {
    return await this.get(urlGen.apiWorkGetChunksWithTranscription(workId), false, TtlOneMinute);
  }

  async getWitnessesForChunk(workId: string, chunkNumber: number): Promise<WitnessInfo[]> {
    return await this.get(urlGen.apiWitnessGetWitnessesForChunk(workId, chunkNumber), false, 5* TtlOneMinute);
  }


  async getCollationTablesActiveForWork(workId: string): Promise<ApiCollationTableInfo[]> {
    return await  this.get(urlGen.apiCollationTable_activeForWork(workId), false, TtlOneMinute);
  }

  async getLegacySystemLanguagesArray(): Promise<any> {
    return await this.getAlmostStaticData('SystemLanguages', urlGen.apiSystemGetLanguages());
  }

  async getAuthors(): Promise<number[]> {
    return this.get(urlGen.apiWorksGetAuthors(), false, TtlOneHour);
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
      return await this.get(urlGen.apiWhoAmI(), false, 30);
    } catch (error: any) {
      console.log(`Error getting whoami`, error);
      if (error.httpStatus === 401) {
        return null;
      }
      throw error;
    }
  }

  async apiLogin(username: string, password: string, rememberMe: boolean): Promise<boolean> {
    try {
      const resp = await fetch(urlGen.apiLogin(), {
        method: 'POST', body: JSON.stringify({user: username, pwd: password, rememberMe: rememberMe ? 'on' : ''})
      });
      if (resp.status === 200) {
        const data = await resp.json();
        console.log(`Got login response`, data);
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
  async getAvailablePageTypes(): Promise<EntityNameTuple[]> {
    return this.getEntityNameTuples(await this.getAlmostStaticData('PageTypes', urlGen.apiGetPageTypes()));
  }

  async getAvailableLanguages(): Promise<EntityNameTuple[]> {
    return this.getEntityNameTuples(await this.getAlmostStaticData('AllLanguages', urlGen.apiEntityTypeGetEntities(Entity.tLanguage)));
  }

  async getAvailableDocumentTypes(): Promise<EntityNameTuple[]> {
    return this.getEntityNameTuples(await this.getAlmostStaticData('DocTypes', urlGen.apiEntityTypeGetEntities(Entity.tDocumentType)));
  }

  async getAvailableImagesSources(): Promise<EntityNameTuple[]> {
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

  async userUpdateProfile(userTid: number, email: string, password1: string, password2: string): Promise<any> {
    return this.post(urlGen.apiUserUpdateProfile(userTid), {
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

  async getSiglaPresets(lang: string, witnessIds: string[]): Promise<ApiSiglaPreset[]> {
    const resp = await this.post(urlGen.apiGetSiglaPresets(), {lang: lang, witnesses: witnessIds}, true);
    return resp['presets'];
  }

  async getAutomaticCollationPresets(options: ApiPresetsQuery): Promise<ApiAutomaticCollationTablePreset[]> {
    const resp = await this.post(urlGen.apiGetAutomaticCollationPresets(), options, true);
    return resp['presets'];
  }

  async userMultiChunkEditions(userId: number, ttl?: number): Promise<ApiUserMultiChunkEdition[]> {
    return this.get(urlGen.apiUserGetMultiChunkEditionInfo(userId), false, ttl ?? TtlOneMinute);
  }

  async userTranscriptions(userId: number, ttl?: number): Promise<ApiUserTranscriptions> {
    return this.get(urlGen.apiTranscriptionsByUserDocPageData(userId), false, ttl ?? TtlOneMinute);
  }

  async userCollationTables(userId: number, ttl?: number): Promise<ApiUserCollationTables> {
    return this.get(urlGen.apiUserGetCollationTableInfo(userId), false, ttl ?? TtlOneMinute);
  }

  async userCreate(personId: number, userName: string): Promise<any> {
    return this.post(urlGen.apiCreateUser(personId), {
      userName: userName,
    }, true);
  }

  async personCreate(name: string, sortName: string): Promise<any> {
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


  async documentAllDocuments(): Promise<DocumentData[]> {
    return this.get(urlGen.apiDocumentsAllDocumentsData());
  }

  async getPersonWorks(personTid: number): Promise<ApiPersonWorksResponse> {
    return this.get(urlGen.apiPersonGetWorks(personTid), false, TtlOneHour);
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
    let type = this.caches.local.retrieve(cacheKey, this.cacheDataId);
    if (type === null) {
      let data = await this.getEntityData(id);
      this.storeEntityDataInCache(data);
      type = data['type'];
      this.caches.local.store(cacheKey, type, this.getTtlWithVariability(60 * 24 * 3600));
    }
    return type;
  }

  getEntityNameFromCache(id: number): string | null {
    return this.caches.local.retrieve(this.getEntityNameCacheKey(id));
  }

  /**
   *
   * @param {number}id
   * @return {Promise<string>}
   */
  async getEntityName(id: number): Promise<string> {
    const debug = false;
    if (id === null) {
      return 'Undefined';
    }
    const lockName = `GetEntityName-${id}`;
    return navigator.locks.request(lockName, {mode: 'exclusive'}, async () => {
      debug && console.log(`Acquired lock ${lockName}`);
      const cacheKey = this.getEntityNameCacheKey(id);
      const cachedName = this.caches.local.retrieve(cacheKey);
      if (cachedName !== null) {
        debug && console.log(`Entity name ${id} retrieved from cache`);
        return cachedName;
      }
      debug && console.log(`Entity name ${id} not found in cache, getting it from entity data`);
      const name = (await this.getEntityData(id))['name'];
      this.caches.local.store(cacheKey, name, this.getTtlWithVariability(TtlOneDay));
      debug && console.log(`Releasing lock ${lockName} after caching entity name.`);
      return name;
    });
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
    const debug = false;
    debug && console.log(`Getting entity data ${id}`);
    return await navigator.locks.request(`GetEntityData-${id}`, {mode: 'exclusive'}, async () => {
      let data: EntityDataInterface;
      if (forceFetch) {
        debug && console.log(`Fetching data ${id} from server because forceFetch is true`);
        data = await this.getEntityDataRaw(id);
        this.storeEntityDataInCache(data);
      } else {
        data = this.retrieveEntityDataFromCache(id);
        if (data === null) {
          debug && console.log(`Entity data ${id} not found in cache, fetching from server`);
          data = await this.getEntityDataRaw(id);
          this.storeEntityDataInCache(data);
        } else {
          debug && console.log(`Entity data ${id} retrieved from cache`);
        }
      }
      return data;
    });
  }

  /**
   * Gets statement qualification object ids from the server, saving their data
   * in the cache
   */
  async getStatementQualificationObjects(): Promise<number[]> {

    let data = await this.fetch(urlGen.apiEntityGetStatementQualificationObjects(true), 'GET', {}, false, false, TtlOneHour);
    let ids: number[] = [];

    data.forEach((entityData: any) => {
      ids.push(entityData.id);
      this.storeEntityDataInCache(entityData);
    });
    return ids;

  }

  getPredicateDefinitionsForType(type: number): Promise<PredicateDefinitionsForType> {
    return this.fetch(urlGen.apiEntityGetPredicateDefinitionsForType(type), 'GET', {}, false, false, TtlOneHour);
  }

  getEntityListForType(typeTid: number): Promise<number[]> {
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
  getApmEntityData(entityType: string, dataType: string, entityId: number | string, cacheName: CacheNames = 'local'): Promise<any> {

    // @ts-ignore
    return new Promise(async (resolve, reject) => {
      let ttl = TtlOneDay;
      let getUrl = '';
      switch (entityType) {
        case 'Person':
          if (dataType === 'essential') {
            ttl = TtlOneDay * 8;
            if (typeof entityId === 'string') {
              reject(`Invalid entityId type for Person data: ${typeof entityId}`);
              return;
            }
            getUrl = urlGen.apiPersonGetEssentialData(entityId);
          } else {
            reject(`Invalid data type for Person data: ${dataType}`);
          }
          break;

        case 'WorkOld':
          if (typeof entityId === 'number') {
            reject(`Invalid entityId type for Person data: ${typeof entityId}`);
            return;
          }
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
      let cache: AsyncKeyCache | KeyCache = this.caches[cacheName];
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
        await cache.store(cacheKey, dataToStore, ttl * (1 + Math.random()));
        resolve(dataToStore);
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

  private getEntityNameCacheKey(id: number) {
    return `EntityName:${id}`;
  }

  /**
   * Resolves to an array of tuples containing the id and the name for each of the entities
   * in the given array
   */
  private async getEntityNameTuples(entityIdArray: number[]): Promise<EntityNameTuple[]> {
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
    cache.store(name, serverData, TtlOneDay);
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
   * @throws {ApmApiClientError}
   */
  private fetch(url: string, method: string = 'GET', payload: any, forceActualFetch: boolean = false, useRawData: boolean = false, ttl: number = -1, sessionCache = true): Promise<any> {
    let key = encodeURI(url);
    let fetcher = sessionCache ? this.cachedFetcher : this.localCachedFetcher;
    return fetcher.fetch(key, () => {
      return new Promise(async (resolve, reject: (e: ApmApiClientError) => void) => {
        if (['GET', 'POST'].indexOf(method) === -1) {
          reject({
            errorType: 'method', httpStatus: -1, message: `Invalid method ${method} for URL ${url}`
          });
        }
        let fetchOptions: any = {method: method};
        if (this.useBearerAuthentication) {
          const token = await this.getBearerToken();
          if (token === null) {
            reject({
              errorType: 'authentication', httpStatus: -1, message: `No authentication token available`
            });
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
          // console.log(`Sending POST request to ${url}. Fetch options`, fetchOptions);
          return fetch(url, fetchOptions);
        };

        fetchFunction().then(async (response) => {
          const responseText = await response.text();
          let responseData: any;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            // no valid json
            responseData = null;
          }
          if (response.status === 200) {
            if (responseData !== null) {
              resolve(responseData);
            } else {
              resolve(responseText);
            }
          } else {
            console.log(`Error fetching ${url}`, response);
            const data = responseData ? responseData : {errorMsg: responseText};
            reject({
              errorType: 'http',
              httpStatus: response.status,
              data: data,
              message: `Error ${response.status} fetching ${url}`
            });
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
  private storeEntityDataInCache(data: any, ttl: number | null = null) {
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
    cache.store(`${EntityDataCacheKeyPrefix}:${data.id}`, data, ttl);
  }

  private retrieveEntityDataFromCache(id: number): any {
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
    let url = urlGen.apiEntityGetData(tid);
    return await this.get(urlGen.apiEntityGetData(tid));
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
  private getCacheKey(entityType: string, dataType: string, entityId: number | string, attribute: string = ''): string {
    if (dataType === '') {
      dataType = 'default';
    }
    return `${entityType}:${dataType}:${entityId}${attribute === '' ? '' : ':' + attribute}`;
  }

  private getBearerToken: () => Promise<string | null> = () => Promise.resolve(null);

  private setBearerToken: (t: string, ttl: number) => Promise<void> = () => Promise.resolve();


}