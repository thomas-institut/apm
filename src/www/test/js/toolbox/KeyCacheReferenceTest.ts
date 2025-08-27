import { expect } from 'vitest'
import {randomAlphaString} from "@/toolbox/ToolBox";
import {KeyCache} from "@/toolbox/KeyCache/KeyCache";
import {wait} from "@/toolbox/wait";

const NumIterations = 100;

interface TestData {
  key: string;
  value: string | number | boolean;
}


/**
 * A test suite that every KeyCache implementation should pass.
 * @param keyCache a KeyCache instance without any data and set up with a non-empty dataId
*/
export async function KeyCacheReferenceTest(keyCache: KeyCache) {

  // get non-existent keys
  for (let i = 0; i < NumIterations; i++) {
    const val = await keyCache.retrieve(randomAlphaString(10));
    expect(val, `Non-existent key, iteration ${i}`).toBe(null);
  }

  // generate and store data
  const data = generateData(NumIterations);
  for (let i=0; i < data.length; i++) {
    await keyCache.store(data[i].key, data[i].value);
  }

  // this should not have any effect!
  await keyCache.cleanCache();

  // get the data
  for(let i=0; i<data.length; i++) {
    const item = data[i];
    const val = await keyCache.retrieve(item.key);
    expect(val, `Data item ${i}`).toBe(item.value);
    const val2 = await keyCache.retrieve(item.key, randomAlphaString(10));
    expect(val2, `Data item ${i} retrieved with invalid dataId`).toBe(null);
    await keyCache.delete(item.key);
    const val3 = await keyCache.retrieve(item.key);
    expect(val3,`Data item ${i} deleted`).toBe(null);
  }


  const data2 = generateData(NumIterations);
  for (let i=0; i < data2.length; i++) {
    await keyCache.store(data[i].key, data[i].value, 1);
  }
  // wait until TTL is over
  await wait(1100);

  for(let i=0; i<data2.length; i++) {
    const val = await keyCache.retrieve(data2[i].key);
    expect(val, `Expired data item ${i}`).toBe(null);
  }

}


function generateData(count: number) : TestData[] {
  const data: TestData[] = [];
  for (let i=0; i<count; i++) {
    const key = randomAlphaString(10);
    let value: string|number|boolean = randomAlphaString(64);
    const randomNumber = Math.random();
    if (randomNumber < 0.33) {
      value = Math.random() > 0.5;
    } else {
      if (randomNumber < 0.66) {
        value = Math.floor(Math.random() * 1000000);
      }
    }
    data.push({key, value});
  }
  return data;
}
