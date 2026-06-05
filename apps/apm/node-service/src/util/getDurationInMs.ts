export function getDurationInMs(end: bigint, start: bigint) {
  return Math.round(Number(end - start) / 1000000);
}