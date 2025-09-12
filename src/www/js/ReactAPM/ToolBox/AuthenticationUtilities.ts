import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";

const debug = false;

/**
 * Returns the authentication token from a cookie or local storage.
 * @param localCache
 * @param tokenCacheKey
 * @param cookieName
 */
export function retrieveToken(localCache: WebStorageKeyCache, tokenCacheKey: string, cookieName: string): string|null {
  let tokenInCookie = '';
  const cookie = document.cookie.split(';').find(row => row.trim().startsWith(`${cookieName}=`));
  if (cookie !== undefined) {
    tokenInCookie = cookie.split('=')[1];
    tokenInCookie = tokenInCookie.replace(/%3A/g, ':');
      debug && console.log(`Found token in cookie`);
  } else {
    debug && console.log(`Token cookie '${cookieName}' not found`);
  }
  let tokenInLocalStorage: string | null = localCache.retrieve(tokenCacheKey);
  if (tokenInLocalStorage !== null) {
    debug && console.log(`Found token in local storage`);
    if (tokenInCookie !== '') {
      if (tokenInLocalStorage !== tokenInCookie) {
        debug && console.log(`Token in local storage does not match token in cookie`);
      } else {
        debug && console.log(`Token in local storage matches token in cookie`);
      }
    }
  }

  if (tokenInLocalStorage === null && tokenInCookie !== '') {
    debug && console.log(`No token in local storage, storing token from cookie`);
    localCache.store(tokenCacheKey, tokenInCookie, 0);
    tokenInLocalStorage = tokenInCookie;
  }
  if (tokenInLocalStorage === null) {
    debug && console.log(`No token found`);
  }
  return tokenInLocalStorage;
}

/**
 * Stores the authentication token in a cookie and in local storage.
 * @param localCache
 * @param tokenCacheKey
 * @param token
 * @param ttl
 * @param cookieName
 */
export function storeToken(localCache: WebStorageKeyCache, tokenCacheKey: string, token: string, ttl: number, cookieName: string): void {
  debug && console.log(`Storing token in local storage and cookie`);
  localCache.store(tokenCacheKey, token, ttl);
  document.cookie = `${cookieName}=${token}; expires=${new Date(Date.now() + ttl * 1000).toUTCString()}; path=/;`;
}

export function deleteToken(localCache: WebStorageKeyCache, tokenCacheKey: string, cookieName: string): void {
  debug && console.log(`Deleting token from local storage and cookie`);
  localCache.delete(tokenCacheKey);
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}