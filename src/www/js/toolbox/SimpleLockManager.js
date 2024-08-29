import { wait } from './FunctionUtil.mjs'

export class SimpleLockManager {

  constructor () {
    this.locks = {};
  }

  async getLock(key, maxWaitTime = 2000) {
    let tickSize = 100;
    let ticksToWait = maxWaitTime / tickSize;
    let ticksPassed = 0;
    while (this.locks[key] && ticksPassed < ticksToWait) {
      await wait(tickSize);
      ticksPassed++;
    }
    this.locks[key] = true;
    return true;
  }

  releaseLock(key) {
    delete this.locks[key];
  }



}