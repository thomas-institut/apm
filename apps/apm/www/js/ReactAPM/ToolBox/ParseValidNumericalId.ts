/**
 * Parses a given string to extract a valid numerical ID.
 *
 * Checks whether the input string represents a positive integer
 * that is within the safe range for JavaScript numbers. If the string does not
 * meet these criteria, the function returns `null`. Otherwise, it returns the
 * parsed numerical value.
 *
 * @param {string} id - The string to be parsed as a numerical ID.
 * @returns {number | null} The parsed numerical ID if valid; otherwise, `null`.
 */
export const parseValidNumericalId = (id: string): number | null => {
  if (!/^[1-9]\d*$/.test(id)) {
    return null;
  }

  const parsedId = Number(id);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
};