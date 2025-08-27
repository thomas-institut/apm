import {createRoot} from "react-dom/client";
import {BrowserRouter, Route, Routes} from "react-router";
import "bootstrap5/dist/css/bootstrap.min.css";
import "./index.css";

import Dashboard from "./Dashboard";
import Docs from "./Docs";
import Works from "./Works";
import People from "./People";
import Search from "./Search";
import {Context, createContext} from "react";
import {ApmDataProxy} from "@/pages/common/ApmDataProxy";
import {defaultLanguage, setSiteLanguage, validLanguages} from "@/pages/common/SiteLang";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";
import {DataId_EC_ViewOptions} from '@/constants/WebStorageDataId';
import {setBaseUrl} from "@/pages/common/SiteUrlGen";
import Login from "./Login";

// @ts-ignore
// Stop the loading sign from writing to the window's body
window.loading = false;

const devMode: boolean = location.port === '5173';
console.log(`Dev mode: ${devMode}`);

// These two will change when the new app is integrated with the current app
const devBaseUrl = '/reactAPM';


export const langCacheKey = 'apmSiteLanguage';
const langCacheDataId = 'v1';

const AppSettingsUrl: string = devMode ? `http://localhost:8888/app-settings` : "app-settings";


interface AppContextProps {
  userId: number;
  userName: string;
  baseUrl: string;
  apiBaseUrl: string;
  reactAppBaseUrl: string,
  showLanguageSelector: boolean;
  siteLanguage: string;
  localCache: WebStorageKeyCache;
  dataProxy: ApmDataProxy;
}

const DefaultAppContext: AppContextProps = {
  userId: -1,
  userName: 'No User',
  baseUrl: '/',
  apiBaseUrl: '/api',
  reactAppBaseUrl: devMode ? devBaseUrl : '/',
  showLanguageSelector: false,
  siteLanguage: 'en',
  localCache: new WebStorageKeyCache('local', 'apm-cache'),
  dataProxy: new ApmDataProxy('apm-cache', [DataId_EC_ViewOptions])
};

export const AppContext: Context<AppContextProps> = createContext(DefaultAppContext);

fetch(AppSettingsUrl).then(async (response) => {
  const settings = await response.json();
  const baseUrl: string = settings.baseUrl;
  const apiBaseUrl: string = settings.baseUrl + '/api';
  const reactAppBaseUrl: string = devMode ? devBaseUrl : baseUrl;

  setBaseUrl(baseUrl, apiBaseUrl);
  const localCache = new WebStorageKeyCache('local', settings.cacheDataId);
  const apmDataProxy = new ApmDataProxy(settings.cacheDataId, [DataId_EC_ViewOptions]);
  await apmDataProxy.initialize();
  apmDataProxy.withBearerAuthentication(() => {
    return Promise.resolve(localCache.retrieve('apm-token'));
  }, (token: string, ttl: number) => {
    localCache.store('apm-token', token, ttl);
    return Promise.resolve();
  });

  const userData = await apmDataProxy.whoAmI();

  const userId = userData?.id ?? -1;
  const userName = userData?.name ?? 'No User';

  const showLanguageSelector = settings.showLanguageSelector;
  let siteLanguage = settings.siteLanguage ?? '';
  if (showLanguageSelector) {

    if (siteLanguage === '' || siteLanguage === 'detect') {
      // console.log(`No site language given, detecting language`);
      siteLanguage = await detectBrowserLanguage(localCache);
    }
    setSiteLanguage(siteLanguage);
    ApmFormats.setLanguage(siteLanguage);
    console.log(`Site language set to '${siteLanguage}'`);
  } else {
    siteLanguage = 'en';
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  ApmFormats.setTimeZone(timeZone);

  console.log(`Client timezone is '${timeZone}', currently ${ApmFormats.getTimeZoneOffsetStringForDate(new Date(), false, false)}`);

  const appContext: AppContextProps = {
    userId: userId,
    userName: userName,
    baseUrl: baseUrl,
    apiBaseUrl: settings.baseUrl + '/api',
    reactAppBaseUrl: devMode ? devBaseUrl : baseUrl,
    showLanguageSelector: settings.showLanguageSelector ?? false,
    siteLanguage: siteLanguage,
    localCache: localCache,
    dataProxy: apmDataProxy,
  };
  createRoot(document.body).render(<AppContext value={appContext}>
    <BrowserRouter>
      <Routes>
        <Route path={`${reactAppBaseUrl}/`} element={<Dashboard/>}/>
        <Route path={`${reactAppBaseUrl}/docs`} element={<Docs/>}/>
        <Route path={`${reactAppBaseUrl}/works`} element={<Works/>}/>
        <Route path={`${reactAppBaseUrl}/people`} element={<People/>}/>
        <Route path={`${reactAppBaseUrl}/search`} element={<Search/>}/>
        <Route path={`${reactAppBaseUrl}/login`} element={<Login/>}/>
      </Routes>
    </BrowserRouter>
  </AppContext>);
}).catch(e => {
  console.log(`Error reading app settings: ${e}`);
  document.body.innerHTML = `<h1>Error loading APM</h1><p>Error: ${e}</p>`;
});


// function saveLangInCache(lang: string, localCache: WebStorageKeyCache, langCacheDataId: string) {
//   localCache.store(langCacheKey, lang, 0, langCacheDataId);
// }

/**
 * Tries to detect the valid language the user prefers the most.
 * If none of the user languages is available, returns the default language.
 * @return {string}
 */
async function detectBrowserLanguage(localCache: WebStorageKeyCache): Promise<string> {
  // First, let's see if there's something in the cache
  let cacheLang = await localCache.retrieve(langCacheKey, langCacheDataId);
  if (validLanguages.indexOf(cacheLang) !== -1) {
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
  return defaultLanguage;
}








