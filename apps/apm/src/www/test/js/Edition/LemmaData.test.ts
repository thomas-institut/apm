import {describe, expect, it} from 'vitest';
import {getLemmaData} from '@/Edition/LemmaData';

describe('LemmaData', () => {
  describe('getLemmaData', () => {
    it('should return custom type for arbitrary lemma', () => {
      const result = getLemmaData('arbitrary', 'some lemma text');
      expect(result).toEqual({type: 'custom', text: 'arbitrary'});
    });

    it('should leave custom text intact', () => {
      const result = getLemmaData('some text etc.', 'some lemma text', 'la');
      expect(result).toEqual({type: 'custom', text: 'some text etc.'});
    });

    it('should return full type for short lemma text (<= 3 words)', () => {
      const result = getLemmaData('', 'one two three');
      expect(result).toEqual({type: 'full', text: 'one two three', numWords: 3});
    });

    it('should return full type for very short lemma text', () => {
        const result = getLemmaData('', 'one');
        expect(result).toEqual({type: 'full', text: 'one', numWords: 1});
    });

    it('should filter out punctuation from the last word in full type', () => {
      const result = getLemmaData('', 'one two three.');
      expect(result).toEqual({type: 'full', text: 'one two three', numWords: 3});
    });

    it('should return shortened type for long lemma text (> 3 words) with dash as default separator', () => {
      const result = getLemmaData('', 'one two three four');
      expect(result).toEqual({
        type: 'shortened',
        text: '',
        from: 'one',
        separator: '\u2013', // enDash
        to: 'four'
      });
    });

    it('should return shortened type with ellipsis separator when lemma is "ellipsis"', () => {
      const result = getLemmaData('ellipsis', 'one two three four');
      expect(result).toEqual({
        type: 'shortened',
        text: '',
        from: 'one',
        separator: '...',
        to: 'four'
      });
    });

    it('should return shortened type with dash separator when lemma is "dash"', () => {
        const result = getLemmaData('dash', 'one two three four');
        expect(result).toEqual({
            type: 'shortened',
            text: '',
            from: 'one',
            separator: '\u2013', // enDash
            to: 'four'
        });
    });

    it('should filter out punctuation from the last word in shortened type', () => {
      const result = getLemmaData('', 'one two three four;');
      expect(result).toEqual({
        type: 'shortened',
        text: '',
        from: 'one',
        separator: '\u2013',
        to: 'four'
      });
    });
    
    it('should handle empty lemmaText gracefully', () => {
        const result = getLemmaData('', '');
        expect(result).toEqual({
            type: 'full',
            text: '',
            numWords: 1
        });
    });

    it('should process Latin abbreviations in lemmaText', () => {
        const result = getLemmaData('', 'word etc', 'la');
        expect(result).toEqual({type: 'full', text: 'word etc.', numWords: 2});
    });
    it('should process Latin abbreviations in lemmaText and keep the dot if not at the end', () => {
        const result = getLemmaData('', 'word1 etc. word2 word3', 'la');
        expect(result).toEqual({
            type: 'shortened',
            text: '',
            from: 'word1',
            separator: '\u2013',
            to: 'word3'
        });
    });
    it('should process Latin abbreviations in lemmaText and keep the dot if at the beginning', () => {
        const result = getLemmaData('', 'etc. word1 word2 word3', 'la');
        expect(result).toEqual({
            type: 'shortened',
            text: '',
            from: 'etc.',
            separator: '\u2013',
            to: 'word3'
        });
    });
  });
});
