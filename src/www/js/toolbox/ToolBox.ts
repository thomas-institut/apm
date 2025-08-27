export function randomAlphaString(length: number): string {
  return Math.random().toString(36).substring(2, length + 2);
}