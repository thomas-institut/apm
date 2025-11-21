import {OptionsChecker} from "@thomas-inst/optionschecker";
import {setBaseUrl, urlGen} from './common/SiteUrlGen';
import {ApmApiClient} from '@/Api/ApmApiClient';
import {defaultLanguage, setSiteLanguage, tr, validLanguages} from './common/SiteLang';
import {WebStorageKeyCache} from '@/toolbox/KeyCache/WebStorageKeyCache';
import {ApmFormats} from './common/ApmFormats';
import {DataId_EC_ViewOptions} from '@/constants/WebStorageDataId';
import {CommonData, CommonDataOptionsDefinition} from "./CommonData";


const langCacheKey = 'apmSiteLanguage';
const langCacheDataId = 'v1';
const AppSettingsUrl = 'app-settings.json';

const debug = true;


export interface ApmPageOptions {
  commonData: CommonData;
}

export class ApmPage {

  protected commonData!: CommonData;
  protected userId: number = -1;
  protected userName: string = '';
  protected apiClient!: ApmApiClient;
  protected localCache!: WebStorageKeyCache;
  protected showLanguageSelector: boolean = false;
  protected siteLanguage: string = 'en';
  protected timeZone: string = 'UTC';
  protected readonly constructorPromise: Promise<void> | null = null;


  /**
   * Creates an ApmPage
   *
   * If the constructor is called without arguments or the given options do not contain
   * the CommonData object, an API call is made to the backend to get it.
   *
   * @param options
   */
  constructor(options: ApmPageOptions|null = null) {
    // @ts-ignore
    // Stop the loading sign from writing to the window's body
    window.loading = false;
    let start = Date.now();

    this.constructorPromise = new Promise(async (resolve, reject) => {
      if (options !== null && options.commonData !== undefined) {
        let optionsChecker = new OptionsChecker({
          context: 'ApmPage Common Data', optionsDefinition: CommonDataOptionsDefinition
        });
        this.commonData = optionsChecker.getCleanOptions(options.commonData);
        setBaseUrl(this.commonData.baseUrl);
        this.apiClient = new ApmApiClient(this.commonData.cacheDataId, [DataId_EC_ViewOptions]);
        await this.apiClient.initialize();
        this.userId = this.commonData.userInfo.id;
      } else {
        debug && console.log(`No options given, getting settings from backend`);
        // read basic settings from JSON

        let appSettings: any = {};
        try {
          let response = await fetch(AppSettingsUrl);
          appSettings = await response.json();
        } catch (e) {
          reject(`Error reading app settings: ${e}`);
        }
        debug && console.log(`Got app settings`, appSettings);
        setBaseUrl(appSettings.baseUrl);
        this.commonData = {
          baseUrl: appSettings.baseUrl,
          appName: appSettings.appName,
          appVersion: `${appSettings.appVersion} (${appSettings.versionDate}) ${appSettings.versionExtra}`.trim(),
          copyrightNotice: appSettings.copyrightNotice,
          devMode: appSettings.devMode,
          cacheDataId: appSettings.cacheDataId,
          showLanguageSelector: appSettings.showLanguageSelector,
          renderTimestamp: Math.round(Date.now() / 1000),
          userInfo: {}
        };
        setBaseUrl(this.commonData.baseUrl);
        this.apiClient = new ApmApiClient(this.commonData.cacheDataId, [DataId_EC_ViewOptions]);

        let userData = await this.apiClient.whoAmI();

        if (userData === null) {
          // this means the user is not authorized
          window.location.href = urlGen.siteLogin();
        }
        this.userId = userData.id;
        this.commonData.userInfo = userData;

        debug && console.log(`Common data`, this.commonData);
      }

      this.userName = this.commonData.userInfo.userName;

      this.localCache = new WebStorageKeyCache('local', this.commonData.cacheDataId);

      this.showLanguageSelector = this.commonData.showLanguageSelector;
      if (this.showLanguageSelector) {
        this.siteLanguage = this.commonData.siteLanguage ?? '';
        if (this.siteLanguage === '' || this.siteLanguage === 'detect') {
          // console.log(`No site language given, detecting language`);
          this.siteLanguage = await this.detectBrowserLanguage();
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
      let end = Date.now();
      console.log(`ApmPage ready in ${end - start} ms`);
      resolve();
    });
  }

  /**
   * Generates HTML for a standard loading message with a spinner
   * @param msg
   * @return {string}
   */
  static genLoadingMessageHtml(msg = 'Loading data'): string {
    return `${tr(msg)} <span class="spinner-border spinner-border-sm" role="status"></span>`;
  }

  async initPage() {
    if (this.constructorPromise !== null) {
      await this.constructorPromise;
    }
  }

  isUserRoot() {
    return this.commonData.userInfo['isRoot'];
  }

  /**
   * Returns the object needed to properly set up a DataTables object using
   * APM's language-aware strings
   * @return {Object}
   */
  getDataTablesLanguageOption(): object {
    return {
      processing: tr('Processing'), search: tr('DataTables:Search'), emptyTable: tr('Empty Table'), paginate: {
        first: tr('First'), previous: tr('Previous'), next: tr('Next'), last: tr('Last')
      }, info: tr('Showing _START_ to _END_ of _TOTAL_ rows'), lengthMenu: tr('Show _MENU_ entries')
    };
  }


  saveLangInCache(lang: string) {
    this.localCache.store(langCacheKey, lang, 0, langCacheDataId);
  }

  /**
   * Tries to detect the valid language the user prefers the most.
   * If none of the user languages is available, returns the default language.
   * @return {string}
   */
  detectBrowserLanguage(): string {
    // First, let's see if there's something in the cache
    let cacheLang = this.localCache.retrieve(langCacheKey, langCacheDataId);
    if (validLanguages.indexOf(cacheLang) !== -1) {
      console.log(`Site language detected in browser cache`);
      return cacheLang;
    }
    // If not, go over browser languages
    let browserLanguages = navigator.languages;
    for (let i = 0; i < browserLanguages.length; i++) {
      let lang = browserLanguages[i];
      if (validLanguages.indexOf(lang) !== -1) {
        return lang;
      }
      lang = lang.split('-')[0];  // two-letter code
      if (validLanguages.indexOf(lang) !== -1) {
        return lang;
      }
    }
    console.log(`Site language not detected, returning default`);
    return defaultLanguage;
  }

}