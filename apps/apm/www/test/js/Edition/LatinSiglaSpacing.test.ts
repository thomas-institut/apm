import { describe, it, expect } from 'vitest';
import { getLatinSiglaSpacing } from '@/Edition/LatinSiglaSpacing';

describe('getLatinSiglaSpacing', () => {
    it('returns indices of sigla that should have a space after them', () => {
        const sigla = ['A', 'B', 'c', 'Dx', 'E'];
        // Index 0 ('A'): last 'A' (UPPER), next 'B' (UPPER) -> No space
        // Index 1 ('B'): last 'B' (UPPER), next 'c' (lower) -> Space after 1
        // Index 2 ('c'): last 'c' (lower), next 'Dx' (UPPER) -> Space after 2
        // Index 3 ('Dx'): last 'x' (lower), next 'E' (UPPER) -> Space after 3
        // Index 4 ('E'): Last sigla -> No space after
        expect(getLatinSiglaSpacing(sigla)).toEqual([1, 2, 3]);
    });

    it('returns empty array for single sigla', () => {
        expect(getLatinSiglaSpacing(['A'])).toEqual([]);
        expect(getLatinSiglaSpacing(['a'])).toEqual([]);
    });

    it('returns empty array for all uppercase sigla', () => {
        expect(getLatinSiglaSpacing(['A', 'B', 'C'])).toEqual([]);
    });

    it('handles lowercase transitions correctly', () => {
        expect(getLatinSiglaSpacing(['A', 'b'])).toEqual([0]);
        expect(getLatinSiglaSpacing(['a', 'B'])).toEqual([0]);
        expect(getLatinSiglaSpacing(['a', 'b'])).toEqual([0]);
    });
});
