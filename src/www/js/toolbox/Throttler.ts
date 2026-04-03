type AnyFunction<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => void;

/**
 * Throttles the given function to be called at most once per waitMs milliseconds.
 *
 * If multiple calls happen during the wait period, only the latest arguments are used for the next execution.
 *
 * @param expensiveFunction
 * @param waitMs  configurable minimum delay between real executions.
 */
export function throttle<TArgs extends unknown[]>(
  expensiveFunction: AnyFunction<TArgs>,
  waitMs: number
): AnyFunction<TArgs> {
  let lastExecutionTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: TArgs | null = null;

  return (...args: TArgs): void => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;

    latestArgs = args;

    const invoke = (): void => {
      lastExecutionTime = Date.now();
      timeoutId = null;

      if (latestArgs) {
        expensiveFunction(...latestArgs);
        latestArgs = null;
      }
    };

    if (timeSinceLastExecution >= waitMs) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      invoke();
      return;
    }

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        invoke();
      }, waitMs - timeSinceLastExecution);
    }
  };
}