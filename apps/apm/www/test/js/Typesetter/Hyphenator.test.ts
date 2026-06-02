import {describe, expect, it} from "vitest";
import {HyphenationLanguage, hyphenate} from "@/lib/Typesetter/Hyphenator/Hyphenator";


interface HyphenationTestCaseData {
  word: string;
  lang: HyphenationLanguage;
  hyphenation: string[];
}

describe('Hyphenator', () => {

  const manualEntries = ['Ná-je-ra', 'Car-va-jal'];
  const exceptions = [ 'Mr.', 'institute']

  const TestCases: HyphenationTestCaseData[] = [

    {word: 'Dominus', lang: 'la', hyphenation: ['Do', 'mi', 'nus']},

    {word: 'DOMINUS', lang: 'la', hyphenation: ['DO', 'MI', 'NUS']},

    {word: 'gloria', lang: 'la', hyphenation: ['glo', 'ria']},

    {word: 'circumire', lang: 'la', hyphenation: ['cir', 'cum', 'i', 're']},

    {word: 'substantia', lang: 'la', hyphenation: ['sub', 'stan', 'tia']},

    {word: 'res', lang: 'la', hyphenation: ['res']},

    {word: 'political', lang: 'en', hyphenation: ['po', 'lit', 'i', 'cal']},

    {word: 'Nájera', lang: 'custom', hyphenation: ['Ná', 'je', 'ra']},

    {word: 'NÁjeRA', lang: 'custom', hyphenation: ['NÁ', 'je', 'RA']},

    {word: 'CARVAJAL', lang: 'custom', hyphenation: ['CAR', 'VA', 'JAL']},

    {word: 'institute', lang: 'en', hyphenation: ['institute']},

    {word: 'Institute', lang: 'en', hyphenation: ['Institute']},

  ];

  TestCases.forEach(tc => {
    it(`should hyphenate ${tc.word} (${tc.lang})`, () => {
      expect(hyphenate(tc.word, tc.lang, manualEntries, exceptions)).toEqual(tc.hyphenation);
    });
  });
});