/**
 * Convert a duration in milliseconds to a human‑readable string.
 *
 * • < 1 000 ms                → “<ms> milliseconds”
 * • < 60 000 ms               → “<seconds>.<ms> seconds”  (3 decimal places)
 * • < 3 600 000 ms            → “<minutes> minutes <seconds> seconds”
 * • < 86 400 000 ms (1 day)   → “<hours> hours, <minutes> minutes”
 *
 * @param ms – duration in milliseconds (non‑negative)
 * @returns formatted string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) throw new Error("Duration must be non‑negative");

  const MS_IN_SECOND = 1000;
  const MS_IN_MINUTE = MS_IN_SECOND * 60;
  const MS_IN_HOUR   = MS_IN_MINUTE * 60;
  const MS_IN_DAY    = MS_IN_HOUR * 24;

  if (ms < MS_IN_SECOND) {
    // less than one second
    return `${ms} milliseconds`;
  }

  if (ms < MS_IN_MINUTE) {
    // less than one minute – show seconds with three‑digit millisecond fraction
    const seconds = (ms / MS_IN_SECOND).toFixed(3);
    return `${seconds} seconds`;
  }

  if (ms < MS_IN_HOUR) {
    // less than one hour – minutes and whole seconds
    const minutes = Math.floor(ms / MS_IN_MINUTE);
    const seconds = Math.floor((ms % MS_IN_MINUTE) / MS_IN_SECOND);
    return `${minutes} minutes ${seconds} seconds`;
  }

  if (ms < MS_IN_DAY) {
    // less than one day – hours and whole minutes
    const hours   = Math.floor(ms / MS_IN_HOUR);
    const minutes = Math.floor((ms % MS_IN_HOUR) / MS_IN_MINUTE);
    return `${hours} hours, ${minutes} minutes`;
  }

  // Optional: for durations ≥ 1 day you could extend the format.
  const days    = Math.floor(ms / MS_IN_DAY);
  const hours   = Math.floor((ms % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((ms % MS_IN_HOUR) / MS_IN_MINUTE);
  return `${days} days, ${hours} hours, ${minutes} minutes`;
}