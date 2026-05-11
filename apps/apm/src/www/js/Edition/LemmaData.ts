import {CompactFmtText, fromCompactFmtText, getPlainText} from "@/lib/FmtText/FmtText";

export interface LemmaData {
  type: 'full' | 'shortened' | 'custom',
  text: string,
  from?: string,
  separator?: string,
  to?: string,
  numWords?: number
}

const LatinAbbreviations: Record<string, string> = {
  'etc': 'etc.'
}


const enDash = String.fromCodePoint(0x2013);

export function getLemmaData(apparatusEntryLemma: CompactFmtText, lemmaText: string, langCode: string = ''): LemmaData {
  let separator = '';
  let custom = false;
  const theLemma = getPlainText(fromCompactFmtText(apparatusEntryLemma));
  if (lemmaText === '') {
    console.warn(`Lemma text is empty for lemma '${theLemma}'`, apparatusEntryLemma);
  }

  switch (theLemma) {
    case '':
    case 'dash':
      separator = `${enDash}`;
      break;

    case 'ellipsis':
      separator = '...';
      break;

    default:
      custom = true;
  }
  if (custom) {
    return {type: 'custom', text: getPlainText(fromCompactFmtText(apparatusEntryLemma))};
  }
  // Language-specific processing
  const theLemmaText = processLemmaText(lemmaText, langCode);

  let lemmaTextWords = theLemmaText.split(' ');
  // if lemmaText is short,
  if (lemmaTextWords.length <= 3) {
    return {
      type: 'full', text: theLemmaText, numWords: lemmaTextWords.length
    };
  }
  return {
    text: '',
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
  // but there's still some old cases in the data (see issue #294)
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