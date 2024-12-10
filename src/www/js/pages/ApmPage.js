import { OptionsChecker } from '@thomas-inst/optionschecker'
import { setBaseUrl } from './common/SiteUrlGen'
import { ApmDataProxy } from './common/ApmDataProxy'
import { defaultLanguage, setSiteLanguage, tr, validLanguages } from './common/SiteLang'
import { WebStorageKeyCache } from '../toolbox/KeyCache/WebStorageKeyCache'
import { ApmFormats } from './common/ApmFormats'
import { ViewOptionsCacheDataId } from '../EditionComposer/EditionComposer'


const langCacheKey = 'apmSiteLanguage'
const langCacheDataId = 'v1';
const CachePrefix = 'Apm';
const SessionIdCacheKey = CachePrefix + 'SessionId';
const SessionIdDataId = 'SessionInfo_v0001';
const SessionIdTtl = 365.2422 * 24 * 3600; // 1 tropical year :)

export class ApmPage {

  constructor (options) {
    let optionsChecker = new OptionsChecker({
      context: 'ApmPage',
      optionsDefinition: {
        commonData: {
          required: true,
          type: 'object',
          objectDefinition: {
            appName: { required: true, type: 'string'},
            appVersion: { required: true, type: 'string'},
            pageId: { type: 'string', default: 'ApmPage'},
            copyrightNotice: { required: true, type: 'string'},
            renderTimestamp: { required: true, type: 'number'},
            cacheDataId: { required: true, type: 'string'},
            baseUrl: { required: true, type: 'string'},
            userInfo: { type: 'object'},
            siteLanguage: { type: 'string', default: ''},
            showLanguageSelector: { type: 'boolean', default: false},
            wsServerUrl: { required: true, type: 'string'}
          }
        }
      }
    })
    let cleanOptions = optionsChecker.getCleanOptions(options)
    this.commonData = cleanOptions.commonData
    setBaseUrl(this.commonData.baseUrl);


    this.userId = this.commonData.userInfo['id'];
    /**
     * Use userId instead
     * @var {int} userId
     * @deprecated
     */
    this.userTid = this.commonData.userInfo['tid'];
    this.userName = this.commonData.userInfo.userName;

    this.apmDataProxy = new ApmDataProxy(this.commonData.cacheDataId, CachePrefix, [ SessionIdDataId, ViewOptionsCacheDataId]);
    this.localCache = new WebStorageKeyCache('local', this.commonData.cacheDataId);
    this.sessionCache = new WebStorageKeyCache('session', this.commonData.cacheDataId);

    this.showLanguageSelector = this.commonData.showLanguageSelector;
    if (this.showLanguageSelector) {
      this.siteLanguage = this.commonData.siteLanguage;
      if (this.siteLanguage === '' || this.siteLanguage === 'detect') {
        // console.log(`No site language given, detecting language`);
        this.siteLanguage = this.detectBrowserLanguage();
      }
      setSiteLanguage(this.siteLanguage);
      ApmFormats.setLanguage(this.siteLanguage);
      console.log(`Site language set to '${this.siteLanguage}'`);
    } else {
      this.siteLanguage = 'en';
    }

    this.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    ApmFormats.setTimeZone(this.timeZone);

    console.log(`Client timezone is '${this.timeZone}', currently ${ApmFormats.getTimeZoneOffsetStringForDate(new Date(), false, false)}`);

    // this.sessionId = this.getSessionIdFromWebStorage();
    // if (this.sessionId === null) {
    //   this.sessionId = this.commonData['sessionId'];
    //   console.log(`Using new session id from server: ${this.sessionId}`);
    //   this.saveSessionIdToWebStorage();
    // } else {
    //   console.log(`Using existing session id ${this.sessionId}`);
    // }
  }

  isUserRoot() {
    return this.commonData.userInfo['isRoot'];
  }

  getSessionIdFromWebStorage() {
    return this.sessionCache.retrieve(SessionIdCacheKey, SessionIdDataId);
  }

  saveSessionIdToWebStorage() {
    this.sessionCache.store(SessionIdCacheKey, this.sessionId, SessionIdTtl, SessionIdDataId);
  }



  /**
   * Generates html for a standard loading message with a spinner
   * @param msg
   * @return {string}
   */
  static genLoadingMessageHtml(msg = 'Loading data') {
    return `${tr(msg)} <span class="spinner-border spinner-border-sm" role="status"></span>`
  }

  /**
   * Returns the object needed to properly set up a DataTables object using
   * APM's language-aware strings
   * @return {Object}
   */
  getDataTablesLanguageOption() {
    return {
      processing:     tr('Processing'),
        search:         tr('DataTables:Search'),
        emptyTable:     tr('Empty Table'),
        paginate: {
          first:      tr('First'),
          previous:   tr('Previous'),
          next:       tr('Next'),
          last:       tr('Last')
        },
      info: tr('Showing _START_ to _END_ of _TOTAL_ rows'),
      lengthMenu: tr('Show _MENU_ entries')
    }
  }


  saveLangInCache(lang) {
    this.localCache.store(langCacheKey, lang, 0, langCacheDataId);
  }

  /**
   * Tries to detect the valid language the user prefers the most.
   * If none of the user languages is available, returns the default language.
   * @return {string}
   */
  detectBrowserLanguage() {
    // First, let's see if there's something in the cache
    let cacheLang = this.localCache.retrieve(langCacheKey, langCacheDataId);
    if (validLanguages.indexOf(cacheLang) !== -1) {
      console.log(`Site language detected in browser cache`)
      return cacheLang
    }
    // If not, go over browser languages
    let browserLanguages = navigator.languages
    for (let i = 0; i < browserLanguages.length; i++) {
      let lang = browserLanguages[i]
      if (validLanguages.indexOf(lang) !== -1) {
        return lang
      }
      lang = lang.split('-')[0]  // two-letter code
      if (validLanguages.indexOf(lang) !== -1) {
        return lang
      }
    }
    console.log(`Site language not detected, returning default`)
    return defaultLanguage
  }

}