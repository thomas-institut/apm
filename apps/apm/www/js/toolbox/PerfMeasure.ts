/**
 * Lightweight, dev-only measurement points.
 *
 * In production builds (`NODE_ENV === 'production'`) every function is a pass-through with no
 * measurable cost. In dev builds and tests, each measurement is recorded with `performance.mark/measure`
 * (so it shows up in the browser's Performance panel) and stored in a small in-memory list that can be
 * read with `getPerfRecords()`.
 *
 * Logging to the console is off by default; enable it from the browser console with
 * `localStorage.setItem('apm.perf', '1')` or by calling `setPerfLogging(true)`.
 */

export interface PerfRecord {
  name: string;
  durationMs: number;
  startTime: number;
}

const MAX_RECORDS = 2000;

const perfEnabled: boolean = (() => {
  try {
    // Replaced statically by Vite in production builds, so the measurements are compiled out there
    return process.env.NODE_ENV !== 'production';
  } catch {
    // no `process` in the browser when the bundler did not define it: this only happens in dev
    return true;
  }
})();

let records: PerfRecord[] = [];
let loggingEnabled: boolean | null = null;
const openMarks = new Map<string, number>();

export function isPerfEnabled(): boolean {
  return perfEnabled;
}

export function setPerfLogging(enabled: boolean): void {
  loggingEnabled = enabled;
}

function isLogging(): boolean {
  if (loggingEnabled !== null) {
    return loggingEnabled;
  }
  try {
    return globalThis.localStorage?.getItem('apm.perf') === '1';
  } catch {
    return false;
  }
}

function record(name: string, startTime: number, endTime: number): void {
  const durationMs = endTime - startTime;
  records.push({name, durationMs, startTime});
  if (records.length > MAX_RECORDS) {
    records = records.slice(records.length - MAX_RECORDS);
  }
  try {
    performance.measure(name, {start: startTime, end: endTime});
  } catch {
    // measuring is best effort
  }
  if (isLogging()) {
    console.debug(`[perf] ${name}: ${durationMs.toFixed(2)} ms`);
  }
}

/** Measures a synchronous function. */
export function perfMeasure<T>(name: string, fn: () => T): T {
  if (!perfEnabled) {
    return fn();
  }
  const start = performance.now();
  try {
    return fn();
  } finally {
    record(name, start, performance.now());
  }
}

/** Measures an asynchronous function (time until the promise settles). */
export async function perfMeasureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!perfEnabled) {
    return fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    record(name, start, performance.now());
  }
}

/** Starts a measurement that ends in a different place, e.g. in another function or a React effect. */
export function perfBegin(name: string): void {
  if (perfEnabled) {
    openMarks.set(name, performance.now());
  }
}

/** Ends a measurement started with `perfBegin`. Does nothing if there is no open measurement. */
export function perfEnd(name: string): void {
  if (!perfEnabled) {
    return;
  }
  const start = openMarks.get(name);
  if (start === undefined) {
    return;
  }
  openMarks.delete(name);
  record(name, start, performance.now());
}

export function getPerfRecords(name?: string): PerfRecord[] {
  return name === undefined ? [...records] : records.filter((r) => r.name === name);
}

export function clearPerfRecords(): void {
  records = [];
  openMarks.clear();
}

export interface PerfSummary {
  name: string;
  count: number;
  totalMs: number;
  meanMs: number;
  medianMs: number;
  maxMs: number;
}

/** Aggregates the recorded measurements by name. */
export function getPerfSummary(): PerfSummary[] {
  const byName = new Map<string, number[]>();
  for (const r of records) {
    const list = byName.get(r.name);
    if (list === undefined) {
      byName.set(r.name, [r.durationMs]);
    } else {
      list.push(r.durationMs);
    }
  }
  return [...byName.entries()].map(([name, durations]) => {
    const sorted = [...durations].sort((a, b) => a - b);
    const totalMs = durations.reduce((a, b) => a + b, 0);
    return {
      name,
      count: durations.length,
      totalMs,
      meanMs: totalMs / durations.length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      maxMs: sorted[sorted.length - 1]
    };
  });
}
