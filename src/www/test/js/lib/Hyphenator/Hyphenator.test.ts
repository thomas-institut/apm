import {describe, expect, it} from "vitest";
import {HyphenationLanguage, hyphenate} from "@/lib/Hyphenator/Hyphenator";


interface HyphenationTestCaseData {
  word: string;
  lang: HyphenationLanguage;
  hyphenation: string[];
}

describe('Hyphenator', () => {

  const TestCases: HyphenationTestCaseData[] = [

    {word: 'Dominus', lang: 'la', hyphenation: ['Do', 'mi', 'nus']},

    {word: 'gloria', lang: 'la', hyphenation: ['glo', 'ria']},

    {word: 'circumire', lang: 'la', hyphenation: ['cir', 'cum', 'i', 're']},

    {word: 'substantia', lang: 'la', hyphenation: ['sub', 'stan', 'tia']},

    {word: 'res', lang: 'la', hyphenation: ['res']},

    {word: 'political', lang: 'en', hyphenation: ['po', 'lit', 'i', 'cal']},

  ];

  TestCases.forEach(tc => {
    it(`should hyphenate ${tc.word} (${tc.lang})`, () => {
      expect(hyphenate(tc.word, tc.lang)).toEqual(tc.hyphenation);
    });
  });
});