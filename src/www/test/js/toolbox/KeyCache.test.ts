/**
 * @vitest-environment happy-dom
 */

import {describe, expect, it} from 'vitest';
import {randomAlphaString} from "@/toolbox/ToolBox";
import {KeyCache} from "@/toolbox/KeyCache/KeyCache";
import {KeyCacheReferenceTest} from "./KeyCacheReferenceTest";
import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";
import {IndexedDbKeyCache} from "@/toolbox/KeyCache/IndexedDbKeyCache";
import "fake-indexeddb/auto";



describe('KeyCache (Memory)', () => {
  it('should perform basic functions', async () => {
    const dataId = randomAlphaString(32);
    const prefix = randomAlphaString(10);
    await KeyCacheReferenceTest(new KeyCache(dataId, prefix));
  });
});


describe('KeyCache (Web Storage)', () => {
  it('should perform basic functions', async () => {
    const dataId = randomAlphaString(32);
    const prefix = randomAlphaString(10);
    await KeyCacheReferenceTest(new WebStorageKeyCache('session', dataId, prefix));
  });
});

describe('KeyCache (IndexedDB)', () => {

  it('should perform basic functions', async () => {
    const dataId = randomAlphaString(32);
    const dbName = randomAlphaString(10);
    const cache = new IndexedDbKeyCache(dbName, dataId);
    const result = await cache.initialize();
    expect(result).toBe(true);
    await KeyCacheReferenceTest(cache);
  });
});