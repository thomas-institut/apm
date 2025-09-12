/**
 * Waits a given number of milliseconds
 * @param milliseconds
 */
export function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}