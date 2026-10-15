import {describe, expect, it, vi} from 'vitest';
import {Memoizer, deepEqual} from '@/toolbox/Memoizer';

interface MyObjectType {
  a: number,
  s: string
}

describe('deep equality', () => {
  it('compares arrays by length, order, and nested values', () => {
    expect(deepEqual([1, {value: ['a']}], [1, {value: ['a']}])).toBe(true);
    expect(deepEqual([1, 2, 3, '4'], [1, 2, 3, 4])).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual([1], [1, 2])).toBe(false);
  });

  it('compares objects by keys and nested values regardless of key order', () => {
    expect(deepEqual({a: 1, b: {c: [2]}}, {b: {c: [2]}, a: 1})).toBe(true);
    expect(deepEqual({a: 1}, {b: 1})).toBe(false);
    expect(deepEqual({a: 1}, {a: 2})).toBe(false);
  });

  it('uses strict equality for non-object values and handles null', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('test', 'test')).toBe(true);
    expect(deepEqual<number | string>(1, '1')).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
  });
});

describe('Memoizer', () => {
  it('calculates only once for a series of inputs considered equal', () => {
    const calculator = vi.fn((input: { value: number }) => input.value * 2);
    const memoizer = new Memoizer<{ value: number }, number>(calculator, deepEqual);

    expect(memoizer.calculate({value: 3})).toBe(6);
    expect(memoizer.calculate({value: 3})).toBe(6);
    expect(memoizer.calculate({value: 3})).toBe(6);
    expect(calculator).toHaveBeenCalledTimes(1);
  });

  it('memoizes undefined inputs and results', () => {
    const calculator = vi.fn(() => undefined);
    const memoizer = new Memoizer<undefined, undefined>(calculator);

    memoizer.calculate(undefined);
    memoizer.calculate(undefined);

    expect(calculator).toHaveBeenCalledTimes(1);
  });

  it('uses Object.is when no custom equality function is provided', () => {
    const realFunction = (i: MyObjectType): string => `${i.s}: ${i.a}`;
    const calculator = vi.fn(realFunction);
    const memoizer = new Memoizer<MyObjectType, string>(calculator);

    const testObject: MyObjectType = {a: 1, s: 'test'};
    const result1 = memoizer.calculate(testObject);
    const result2 = memoizer.calculate(testObject);
    expect(calculator).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);

    // testObject is still the same object, so the result should be the same
    testObject.a = 2;
    const result3 = memoizer.calculate(testObject);
    expect(calculator).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result3);

    // different object, but same data
    const result4 = memoizer.calculate({a: 1, s: 'test'});
    expect(calculator).toHaveBeenCalledTimes(2);
    expect(result1).toBe(result4);

  });
});