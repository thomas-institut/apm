import {describe, expect, it} from 'vitest';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';

describe('SiglaGroupUtil.getSiglaGroupString', () => {
  it('returns siglum and concatenated witness sigla', () => {
    expect(SiglaGroupUtil.getSiglaGroupString({siglum: 'A', witnesses: [0, 1]}, ['X', 'Y'])).toBe('A => XY');
  });

  it('trims siglum and ignores out-of-range witness indexes', () => {
    expect(SiglaGroupUtil.getSiglaGroupString({siglum: '  A  ', witnesses: [0, 2]}, ['X'])).toBe('A => X');
  });
});