type AnyFunction<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => void;


/**
 * Creates a delayer function that delays the execution of the given function by the given delay.
 * If multiple calls happen during the delay period, only the latest call will execute after the delay.
 *
 * @param delayedFunction
 * @param delayMs
 */
export function createDelayer<TArgs extends unknown[]>(
  delayedFunction: AnyFunction<TArgs>,
  delayMs: number
): AnyFunction<TArgs> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      delayedFunction(...args);
      timeoutId = null;
    }, delayMs);
  };
}