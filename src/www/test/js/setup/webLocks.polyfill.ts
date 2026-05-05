type LockMode = 'exclusive' | 'shared';

type LockCallback<T> = () => Promise<T> | T;

type LockOptions = {
  mode?: LockMode;
};

// @ts-ignore
interface NavigatorWithLocks extends Navigator {
  locks?: {
    request<T>(name: string, callback: LockCallback<T>): Promise<T>;
    request<T>(name: string, options: LockOptions, callback: LockCallback<T>): Promise<T>;
  };
}

const globalNavigator = globalThis.navigator as NavigatorWithLocks;

if (!globalNavigator.locks) {
  const lockQueues = new Map<string, Promise<void>>();

  const locksImpl = {
    async request<T>(
      name: string,
      optionsOrCallback: LockOptions | LockCallback<T>,
      callbackMaybe?: LockCallback<T>
    ): Promise<T> {
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callbackMaybe;
      if (callback === undefined) {
        throw new Error('Missing lock callback');
      }

      const previous = lockQueues.get(name) ?? Promise.resolve();

      let releaseLock: () => void = () => {
      };

      const current = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      lockQueues.set(name, previous.then(() => current));
      await previous;

      try {
        return await callback();
      } finally {
        releaseLock();
        if (lockQueues.get(name) === current) {
          lockQueues.delete(name);
        }
      }
    }
  };

  try {
    Object.defineProperty(globalNavigator, 'locks', {
      configurable: true,
      value: locksImpl
    });
  } catch (_error) {
    Object.defineProperty(Object.getPrototypeOf(globalNavigator), 'locks', {
      configurable: true,
      value: locksImpl
    });
  }
}