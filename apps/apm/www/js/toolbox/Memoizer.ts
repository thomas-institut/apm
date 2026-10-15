

export type CalculatorFunction<I, O> = (input: I) => O;
export type EqualityFunction<I> = (a: I, b: I) => boolean;

export class Memoizer<I, O> {

  private previousInput: I | undefined;
  private memoizedResult: O | undefined;
  private hasMemoizedResult = false;

  private readonly calculatorFunction: CalculatorFunction<I, O>;
  private readonly equal: EqualityFunction<I>;

  constructor(f: CalculatorFunction<I, O>, equalityFunction: EqualityFunction<I> = Object.is) {
    this.calculatorFunction = f;
    this.equal = equalityFunction;
  }

  public calculate(input: I) : O {
    if (!this.hasMemoizedResult || !this.equal(input, this.previousInput as I)) {
      const result = this.calculatorFunction(input);
      this.previousInput = input;
      this.memoizedResult = result;
      this.hasMemoizedResult = true;
    }
    return this.memoizedResult!;
  }

}

/**
 * Returns if a and b have the same content value.
 *
 * If a and b are arrays, returns true if they have the same length and the same content values in the same order.
 *
 * if a and b are objects, returns true if they have the same keys and the same content value for each key.
 *
 * Otherwise, return true if a and b are strictly equal.
 *
 * @param a
 * @param b
 */
export function deepEqual<T>(a: T, b: T) : boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => deepEqual(value, b[index]));
  }

  if (Array.isArray(b)) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  const bRecord = b as Record<string, unknown>;
  return aKeys.every(key => bKeys.includes(key) && deepEqual((a as Record<string, unknown>)[key], bRecord[key]));
}

