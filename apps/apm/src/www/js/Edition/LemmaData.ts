import {CompactFmtText, fromCompactFmtText, getPlainText} from "@/lib/FmtText/FmtText";

export interface LemmaData {
  type: 'full' | 'shortened' | 'custom',
  text: string,
  from?: string,
  separator?: string,
  to?: string,
  numWords?: number
}


const enDash = String.fromCodePoint(0x2013);

export function getLemmaData(apparatusEntryLemma: CompactFmtText, lemmaText: string): LemmaData {
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
  // filter out punctuation from the last word, which should never happen after version 1.0,
  // but there's still some old cases in the data (see issue #294)
  const theLemmaText = lemmaText.replace(/[.,;!?)\]]$/, '');
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
