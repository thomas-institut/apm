import { describe, it, expect } from 'vitest';
import { getLatinSiglaSpacing } from '@/Edition/LatinSiglaSpacing';

describe('getLatinSiglaSpacing', () => {
    it('returns index before the first strictly lowercase siglum', () => {
        const sigla = ['A', 'B', 'c', 'Dx', 'E'];
        expect(getLatinSiglaSpacing(sigla)).toEqual([1]);
    });

    it('returns empty array for single sigla', () => {
        expect(getLatinSiglaSpacing(['A'])).toEqual([]);
        expect(getLatinSiglaSpacing(['a'])).toEqual([]);
    });

    it('returns empty array for all uppercase sigla', () => {
        expect(getLatinSiglaSpacing(['A', 'B', 'C'])).toEqual([]);
    });

    it('returns empty array when the first siglum is strictly lowercase', () => {
        expect(getLatinSiglaSpacing(['a', 'B'])).toEqual([]);
        expect(getLatinSiglaSpacing(['a', 'b'])).toEqual([]);
    });

    it('ignores mixed-case sigla when searching for first strictly lowercase siglum', () => {
        expect(getLatinSiglaSpacing(['A', 'b'])).toEqual([0]);
        expect(getLatinSiglaSpacing(['Ab', 'Bx', 'Cd', 'p', 'v'])).toEqual([2]);
        expect(getLatinSiglaSpacing(['Ab', 'Bx', 'Cd'])).toEqual([]);
    });
});
