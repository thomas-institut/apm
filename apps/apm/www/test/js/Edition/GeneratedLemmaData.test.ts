import {describe, expect, it} from 'vitest';
import {getGeneratedLemmaData} from '@/Edition/GeneratedLemmaData';

describe('GeneratedLemmaData', () => {
  describe('getGeneratedLemmaData', () => {
    it('should return custom type for arbitrary lemma', () => {
      const result = getGeneratedLemmaData('arbitrary', 'some lemma text');
      expect(result).toEqual({type: 'custom', text: 'arbitrary'});
    });

    it('should leave custom text intact', () => {
      const result = getGeneratedLemmaData('some text etc.', 'some lemma text', 'la');
      expect(result).toEqual({type: 'custom', text: 'some text etc.'});
    });

    it('should return full type for short lemma text (<= 3 words)', () => {
      const result = getGeneratedLemmaData('', 'one two three');
      expect(result).toEqual({type: 'full', text: 'one two three', numWords: 3});
    });

    it('should return full type for very short lemma text', () => {
      const result = getGeneratedLemmaData('', 'one');
      expect(result).toEqual({type: 'full', text: 'one', numWords: 1});
    });

    it('should filter out punctuation from the last word in full type', () => {
      const result = getGeneratedLemmaData('', 'one two three.');
      expect(result).toEqual({type: 'full', text: 'one two three', numWords: 3});
    });

    it('should return shortened type for long lemma text (> 3 words) with dash as default separator', () => {
      const result = getGeneratedLemmaData('', 'one two three four');
      expect(result).toEqual({
        type: 'shortened',
        from: 'one',
        separator: '\u2013', // enDash
        to: 'four'
      });
    });

    it('should return shortened type with ellipsis separator when lemma is "ellipsis"', () => {
      const result = getGeneratedLemmaData('ellipsis', 'one two three four');
      expect(result).toEqual({
        type: 'shortened',
        from: 'one',
        separator: '...',
        to: 'four'
      });
    });

    it('should return shortened type with dash separator when lemma is "dash"', () => {
      const result = getGeneratedLemmaData('dash', 'one two three four');
      expect(result).toEqual({
        type: 'shortened',
        from: 'one',
        separator: '\u2013', // enDash
        to: 'four'
      });
    });

    it('should filter out punctuation from the last word in shortened type', () => {
      const result = getGeneratedLemmaData('', 'one two three four;');
      expect(result).toEqual({
        type: 'shortened',
        from: 'one',
        separator: '\u2013',
        to: 'four'
      });
    });

    it('should handle empty lemmaText gracefully', () => {
      const result = getGeneratedLemmaData('', '');
      expect(result).toEqual({
        type: 'full',
        text: '',
        numWords: 1
      });
    });

    it('should process Latin abbreviations in lemmaText', () => {
      const result = getGeneratedLemmaData('', 'word etc', 'la');
      expect(result).toEqual({type: 'full', text: 'word etc.', numWords: 2});
    });
    it('should process Latin abbreviations in lemmaText and keep the dot if not at the end', () => {
      const result = getGeneratedLemmaData('', 'word1 etc. word2 word3', 'la');
      expect(result).toEqual({
        type: 'shortened',
        from: 'word1',
        separator: '\u2013',
        to: 'word3'
      });
    });
    it('should process Latin abbreviations in lemmaText and keep the dot if at the beginning', () => {
      const result = getGeneratedLemmaData('', 'etc. word1 word2 word3', 'la');
      expect(result).toEqual({
        type: 'shortened',
        from: 'etc.',
        separator: '\u2013',
        to: 'word3'
      });
    });
    it('should process Hebrew lemmaText and remove inner quotation marks from the first word', () => {
      const result = getGeneratedLemmaData('', 'ה"ספר וגו׳', 'he');
      expect(result).toEqual({type: 'full', text: 'הספר וגו׳', numWords: 2});
    });

    it('should remove all types of inner quotation marks from the first word in Hebrew', () => {
      const result1 = getGeneratedLemmaData('', "ה'ספר", 'he');
      expect(result1.type).toBe('full');
      // @ts-ignore
      expect(result1.text).toBe('הספר');

      const result2 = getGeneratedLemmaData('', 'ה”ספר', 'he');
      // @ts-ignore
      expect(result2.text).toBe('הספר');

      const result3 = getGeneratedLemmaData('', 'ה’ספר', 'he');
      // @ts-ignore
      expect(result3.text).toBe('הספר');

      const result4 = getGeneratedLemmaData('', 'ה“ספר', 'he');
      // @ts-ignore
      expect(result4.text).toBe('הספר');

      const result5 = getGeneratedLemmaData('', 'ה‘ספר', 'he');
      // @ts-ignore
      expect(result5.text).toBe('הספר');
    });

    it('should not remove quotation marks that are not in the first word in Hebrew', () => {
      const result = getGeneratedLemmaData('', 'הספר ה"זה', 'he');
      // @ts-ignore
      expect(result.text).toBe('הספר ה"זה');
    });

    it('should not remove leading or trailing quotation marks in Hebrew (only inner ones)', () => {
      const result1 = getGeneratedLemmaData('', '"ספר"', 'he');
      // @ts-ignore
      expect(result1.text).toBe('"ספר"');

      const result2 = getGeneratedLemmaData('', "'ספר'", 'he');
      // @ts-ignore
      expect(result2.text).toBe("'ספר'");
    });
  });
});
