import { wait } from './wait'

export class SimpleLockManager {

  locks: { [key:string] : any} = {}

  /**
   * Waits up to the given max wait time to get the given lock.
   * Returns true if the lock was acquired
   *
   * @param key
   * @param maxWaitTime
   */
  async getLock(key: string, maxWaitTime : number= 2000) {
    let tickSize = 100;
    let ticksToWait = maxWaitTime / tickSize;
    let ticksPassed = 0;
    while (this.locks[key] && ticksPassed < ticksToWait) {
      await wait(tickSize);
      ticksPassed++;
    }
    if (ticksPassed >= ticksToWait) {
      return false;
    }
    this.locks[key] = true;
    return true;
  }

  releaseLock(key: string) {
    delete this.locks[key];
  }

}