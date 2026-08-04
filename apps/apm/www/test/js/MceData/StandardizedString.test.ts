import {describe, expect, it} from 'vitest';
import {
  wordMatchesStandardizedString,
  getWordStandardizedByString,
  getMatchingMainTextTokenIndices,
  StandardizedString
} from '@/MceData/StandardizedString.js';
import {MainTextTokenInterface} from '@/Edition/EditionInterface.js';
import {newGlueToken} from "@thomas-inst/fmt-text";

describe('StandardizedString', () => {
  const stdString: StandardizedString = {
    original: 'Dominus',
    standardized: 'dominus',
    instances: []
  };

  describe('wordMatchesStandardizedString', () => {
    describe('Latin (la)', () => {
      const lang = 'la';
      it('matches exact original', () => {
        expect(wordMatchesStandardizedString('Dominus', stdString, lang)).toBe(true);
      });
      it('matches lowercase', () => {
        expect(wordMatchesStandardizedString('dominus', stdString, lang)).toBe(true);
      });
      it('matches capitalized', () => {
        expect(wordMatchesStandardizedString('Dominus', stdString, lang)).toBe(true);
      });
      it('matches uppercase', () => {
        expect(wordMatchesStandardizedString('DOMINUS', stdString, lang)).toBe(true);
      });
      it('does not match different word', () => {
        expect(wordMatchesStandardizedString('Deus', stdString, lang)).toBe(false);
      });
    });

    describe('Non-Latin (en)', () => {
      const lang = 'en';
      it('matches exact original', () => {
        expect(wordMatchesStandardizedString('Dominus', stdString, lang)).toBe(true);
      });
      it('does not match lowercase if original was capitalized', () => {
        expect(wordMatchesStandardizedString('dominus', stdString, lang)).toBe(false);
      });
      it('does not match uppercase if original was capitalized', () => {
        expect(wordMatchesStandardizedString('DOMINUS', stdString, lang)).toBe(false);
      });
    });
  });

  describe('getWordStandardizedByString', () => {
    describe('Latin (la)', () => {
      const lang = 'la';
      const stdString2: StandardizedString = {
        original: 'uita',
        standardized: 'vita',
        instances: []
      };

      it('returns standardized for lowercase', () => {
        expect(getWordStandardizedByString('uita', stdString2, lang)).toBe('vita');
      });

      it('returns capitalized standardized for capitalized word', () => {
        expect(getWordStandardizedByString('Uita', stdString2, lang)).toBe('Vita');
      });

      it('returns uppercase standardized for uppercase word', () => {
        expect(getWordStandardizedByString('UITA', stdString2, lang)).toBe('VITA');
      });

      it('returns original word if no match', () => {
        expect(getWordStandardizedByString('mors', stdString2, lang)).toBe('mors');
      });

      it('handles multi-word strings by capitalising only the first letter', () => {
        const stdString3: StandardizedString = {
          original: 'in principio',
          standardized: 'in-principio',
          instances: []
        };
        expect(getWordStandardizedByString('In principio', stdString3, lang)).toBe('In-principio');
      });
    });

    describe('Non-Latin (en)', () => {
      const lang = 'en';
      const stdString2: StandardizedString = {
        original: 'word',
        standardized: 'standard',
        instances: []
      };

      it('returns standardized for exact match', () => {
        expect(getWordStandardizedByString('word', stdString2, lang)).toBe('standard');
      });

      it('returns original word for case mismatch', () => {
        expect(getWordStandardizedByString('Word', stdString2, lang)).toBe('Word');
      });

      it('returns original word if no match', () => {
        expect(getWordStandardizedByString('other', stdString2, lang)).toBe('other');
      });
    });
  });

  describe('getMatchingMainTextTokenIndices', () => {
    const stdString: StandardizedString = {
      original: 'Dominus',
      standardized: 'dominus',
      instances: []
    };

    const tokens: MainTextTokenInterface[] = [
      {
        type: 'text',
        fmtText: [{type: 'text', text: 'Dominus'}],
        editionWitnessTokenIndex: 0,
        style: ''
      },
      {
        type: 'glue',
        fmtText: [newGlueToken()],
        editionWitnessTokenIndex: 1,
        style: ''
      },
      {
        type: 'text',
        fmtText: [{type: 'text', text: 'dominus'}],
        editionWitnessTokenIndex: 2,
        style: ''
      },
      {
        type: 'text',
        fmtText: [{type: 'text', text: 'Deus'}],
        editionWitnessTokenIndex: 3,
        style: '',
        originalText: 'Dominus'
      },
      {
        type: 'text',
        fmtText: [{type: 'text', text: 'Christus'}],
        editionWitnessTokenIndex: 4,
        style: ''
      }
    ];

    it('returns indices for matching tokens in Latin', () => {
      const result = getMatchingMainTextTokenIndices(stdString, tokens, 'la');
      // Token 0: 'Dominus' (exact match)
      // Token 2: 'dominus' (lowercase match for Latin)
      // Token 3: 'Deus' with originalText 'Dominus' (match)
      expect(result).toEqual([0, 2, 3]);
    });

    it('returns indices for matching tokens in Non-Latin', () => {
      const result = getMatchingMainTextTokenIndices(stdString, tokens, 'en');
      // Token 0: 'Dominus' (exact match)
      // Token 3: 'Deus' with originalText 'Dominus' (exact match on originalText)
      // Token 2: 'dominus' is NOT a match because lang is NOT 'la' and 'dominus' !== 'Dominus'
      expect(result).toEqual([0, 3]);
    });

    it('returns empty array if no tokens match', () => {
      const otherStdString: StandardizedString = {
        original: 'Spiritus',
        standardized: 'spiritus',
        instances: []
      };
      const result = getMatchingMainTextTokenIndices(otherStdString, tokens, 'la');
      expect(result).toEqual([]);
    });

    it('ignores non-text tokens', () => {
      const glueTokenOnly: MainTextTokenInterface[] = [
        {
          type: 'glue',
          fmtText: [{type: 'text', text: 'Dominus'}], // something like this should never be part of a glue token, but just in case it fools the matching algorithm
          editionWitnessTokenIndex: 0,
          style: ''
        }
      ];
      const result = getMatchingMainTextTokenIndices(stdString, glueTokenOnly, 'la');
      expect(result).toEqual([]);
    });

    describe('matching with originalText', () => {
      it('matches when originalText matches even if fmtText does not', () => {
        const targetStdString: StandardizedString = {
          original: 'Target',
          standardized: 'target',
          instances: []
        };
        const tokens: MainTextTokenInterface[] = [
          {
            type: 'text',
            fmtText: [{type: 'text', text: 'Other'}],
            editionWitnessTokenIndex: 0,
            style: '',
            originalText: 'Target'
          }
        ];
        expect(getMatchingMainTextTokenIndices(targetStdString, tokens, 'en')).toEqual([0]);
      });

      it('matches originalText using Latin rules when lang is "la"', () => {
        const tokens: MainTextTokenInterface[] = [
          {
            type: 'text',
            fmtText: [{type: 'text', text: 'Deus'}],
            editionWitnessTokenIndex: 0,
            style: '',
            originalText: 'dominus' // lowercase match for 'Dominus'
          }
        ];
        expect(getMatchingMainTextTokenIndices(stdString, tokens, 'la')).toEqual([0]);
      });

      it('does not match if both fmtText and originalText do not match', () => {
        const targetStdString: StandardizedString = {
          original: 'Target',
          standardized: 'target',
          instances: []
        };
        const tokens: MainTextTokenInterface[] = [
          {
            type: 'text',
            fmtText: [{type: 'text', text: 'Other'}],
            editionWitnessTokenIndex: 0,
            style: '',
            originalText: 'Another'
          }
        ];
        expect(getMatchingMainTextTokenIndices(targetStdString, tokens, 'en')).toEqual([]);
      });
    });
  });
});
