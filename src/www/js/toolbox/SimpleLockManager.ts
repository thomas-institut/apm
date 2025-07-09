import { wait } from './FunctionUtil'

export class SimpleLockManager {

  locks: { [key:string] : any} = {}

  async getLock(key: string, maxWaitTime : number= 2000) {
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

  releaseLock(key: string) {
    delete this.locks[key];
  }

}