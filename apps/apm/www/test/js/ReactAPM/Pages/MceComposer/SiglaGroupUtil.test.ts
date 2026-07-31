import {describe, expect, it} from 'vitest';
import {getSiglaGroupString} from '@/ReactAPM/Pages/MceComposer/SiglaGroupUtil';

describe('getSiglaGroupString', () => {
  it('returns siglum and concatenated witness sigla', () => {
    expect(getSiglaGroupString({siglum: 'A', witnesses: [0, 1]}, ['X', 'Y'])).toBe('A => XY');
  });

  it('trims siglum and ignores out-of-range witness indexes', () => {
    expect(getSiglaGroupString({siglum: '  A  ', witnesses: [0, 2]}, ['X'])).toBe('A => X');
  });
});