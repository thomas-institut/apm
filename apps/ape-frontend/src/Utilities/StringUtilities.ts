/**
 * Returns a string with the first letter of each word capitalized:
 * "this is a test" => "This Is A Test"
 * @param s
 */
export function titleCase(s: string): string {
  if (!s) return '';
  return s
    .split(/[^a-zA-Z0-9]+/)      // split on non‑alphanumeric characters
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');                    // concatenate without separators
}
