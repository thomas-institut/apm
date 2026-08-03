// noinspection ES6PreferShortImport

import {ApparatusEntryInterface} from "./EditionInterface.js";

export type GeneratedLemmaType = 'full' | 'shortened' | 'custom';

interface TypedGeneratedLemmaData {
  type: GeneratedLemmaType;
}

export type GeneratedLemmaData = FullGeneratedLemmaData | CustomGeneratedLemmaData | ShortenedGeneratedLemmaData;

interface FullGeneratedLemmaData extends TypedGeneratedLemmaData {
  type: 'full',
  text: string,
  numWords: number
}

interface CustomGeneratedLemmaData extends TypedGeneratedLemmaData {
  type: 'custom',
  text: string
}

interface ShortenedGeneratedLemmaData extends TypedGeneratedLemmaData {
  type: 'shortened',
  from: string,
  separator: string,
  to: string
}

const LatinAbbreviations: Record<string, string> = {
  'etc': 'etc.'
};

const enDash = String.fromCodePoint(0x2013);

export function getGeneratedLemmaData(entry: ApparatusEntryInterface, langCode: string = ''): GeneratedLemmaData {
  let separator = '';

  switch (entry.lemmaType) {
    case 'auto':
    case 'dash':
      separator = `${enDash}`;
      break;

    case 'ellipsis':
      separator = '...';
      break;

    case 'custom':
      return {type: 'custom', text: entry.customLemmaText};
  }
  // Language-specific processing
  const theLemmaText = processLemmaText(entry.mainTextWords.filter(w => w !== '').join(' '), langCode);

  let lemmaTextWords = theLemmaText.split(' ');
  // if lemmaText is short,
  if (lemmaTextWords.length <= 3) {
    return {
      type: 'full', text: theLemmaText, numWords: lemmaTextWords.length
    };
  }
  return {
    type: 'shortened',
    from: lemmaTextWords[0],
    separator: separator,
    to: lemmaTextWords[lemmaTextWords.length - 1],
  };
}


/**
 * Applies language-specific processing to lemma text.
 */
function processLemmaText(lemmaText: string, langCode: string): string {

  // filter out punctuation from the last word, which should never happen after version 1.0,
  // but there are still some old cases in the data (see issue #294)
  lemmaText = lemmaText.replace(/[.,;!?)\]]$/, '');

  switch (langCode) {
    case 'la':
      return processLemmaTextLatin(lemmaText);

    case 'he':
      return processLemmaTextHebrew(lemmaText);

    case 'ar':
      return processLemmaTextArabic(lemmaText);

    default:
      return lemmaText;
  }
}

function processLemmaTextLatin(lemmaText: string): string {
  return lemmaText.split(' ').map(word => LatinAbbreviations[word] ?? word).join(' ');
}

function processLemmaTextHebrew(lemmaText: string): string {
  const words = lemmaText.split(' ');
  if (words.length === 0 || words[0].length <= 2) {
    return lemmaText;
  }

  const firstWord = words[0];
  const start = firstWord[0];
  const end = firstWord[firstWord.length - 1];
  const middle = firstWord.substring(1, firstWord.length - 1);
  const processedMiddle = middle.replace(/["'“”‘’]/g, '');
  words[0] = start + processedMiddle + end;

  return words.join(' ');
}

function processLemmaTextArabic(lemmaText: string): string {
  return lemmaText;
}