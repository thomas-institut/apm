import {wait} from './wait';
import {randomAlphaString} from "@/toolbox/ToolBox";

export class SimpleLockManager {

  locks: { [key: string]: boolean } = {};

  /**
   * Waits up to the given max wait time to get the given lock.
   * Returns true if the lock was acquired
   *
   * @param key
   * @param maxWaitTime
   */
  async getLock(key: string, maxWaitTime: number = 2000) {
    const requestId = randomAlphaString(5);
    let tickSize = 100;
    let ticksToWait = maxWaitTime / tickSize;
    console.log(`Request ${requestId}: waiting for lock ${key} at ${Date.now()}`);
    let ticksPassed = 0;
    while (this.locks[key] && ticksPassed < ticksToWait) {
      await wait(tickSize);
      ticksPassed++;
      console.log(`Request ${requestId}: ${ticksPassed} ticks have passed at ${Date.now()}`);
    }
    if (ticksPassed >= ticksToWait) {
      console.log(`Request ${requestId}: waited enough, returning false at ${Date.now()}`);
      return false;
    }
    console.log(`Request ${requestId}: got lock at ${Date.now()}`);
    this.locks[key] = true;
    return true;
  }

  releaseLock(key: string) {
    this.locks[key] = false;
  }

}