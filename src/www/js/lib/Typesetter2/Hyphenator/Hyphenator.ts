import {LatinHyphenationPatterns} from "./patterns/la.js";
import {EnglishHyphenationPatterns} from "./patterns/en-us.js";


export type HyphenationLanguage = 'la' | 'en' | 'custom';


const RawPatterns: Record<HyphenationLanguage, string> = {
  la: LatinHyphenationPatterns,
  en: EnglishHyphenationPatterns,
  custom: ''
};

interface ParsedManualEntry {
  word: string;
  syllables: Syllable[];
}

interface Syllable {
  syllable: string;
  startIndex: number;
  endIndex: number;
}


// ---------- Internal types ----------

interface PatternNode {
  char: string;   // the letter (or '.' for word boundary)
  pre: number;    // weight *before* this character
  post: number;   // weight *after* this character
}

interface ParsedPattern {
  nodes: PatternNode[];
}

// ---------- Pattern parser ----------

/**
 * Parses a single TeX hyphenation pattern string (e.g. "a2l1ue") into
 * a structured pattern with characters and their surrounding weights.
 *
 * In TeX patterns the digits represent hyphenation weights placed
 * *between* characters. A digit before the first letter is a "pre" weight
 * on that letter; a digit after a letter is a "post" weight on that letter
 * (and simultaneously the "pre" weight on the next letter).
 */
function parsePattern(text: string): ParsedPattern {
  const nodes: PatternNode[] = [];
  const chars: string[] = [];
  // Weights array: weights[i] sits between chars[i-1] and chars[i].
  // weights[0] is before the first char, weights[chars.length] is after the last.
  const weights: number[] = [];

  let i = 0;
  let currentWeight = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      currentWeight = parseInt(ch, 10);
    } else {
      weights.push(currentWeight);
      chars.push(ch);
      currentWeight = 0;
    }
    i++;
  }
  // trailing weight after the last character
  weights.push(currentWeight);

  for (let j = 0; j < chars.length; j++) {
    nodes.push({
      char: chars[j],
      pre: weights[j],
      post: weights[j + 1],
    });
  }
  return { nodes };
}

/**
 * Parse all patterns from the embedded pattern text.
 */
function parseAllPatterns(raw: string): ParsedPattern[] {
  return raw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .map(parsePattern)
  .filter((p) => p.nodes.length > 0);
}

const PreParsedPatterns: Record<HyphenationLanguage, ParsedPattern[]|null>  = {
  la: null,
  en: null,
  custom: [],
}

// ---------- Pattern matching ----------

function patternMatchesAt(
  pattern: ParsedPattern,
  charArray: string[],
  startIndex: number,
): boolean {
  const len = pattern.nodes.length;
  if (len === 0 || startIndex < 0 || startIndex + len > charArray.length) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (charArray[startIndex + i] !== pattern.nodes[i].char) {
      return false;
    }
  }
  return true;
}

// ---------- Public API ----------

/**
 * Decomposes a  word into syllables using TeX hyphenation patterns.
 *
 * If a manual hyphenation entry is provided, it will be used instead of the patterns.
 *
 * If the word is listed in the exceptions list, it will be returned as is.
 *
 * ```ts
 * hyphenize("Dominus", 'la')  // → ["Do", "mi", "nus"]
 * hyphenizeLatin("gloria", 'la')   // → ["glo", "ria"]
 * ```
 *
 * @param inputWord  A single word (no spaces / punctuation).
 * @param lang Hyphenation language.
 * @param manualEntries An array of manual hyphenation entries, as words with hyphens, ['ex-cep-tion']
 * @param exceptions List of words that should not be hyphenated
 * @returns An array of syllable strings whose concatenation equals `inputWord`.
 */
export function hyphenate(inputWord: string, lang: HyphenationLanguage, manualEntries: string[] = [], exceptions: string[] = []): string[] {
  if (inputWord.length === 0) {
    return [];
  }

  const parsedExceptions = exceptions.map(e => e.toLowerCase());
  if (parsedExceptions.includes(inputWord.toLowerCase())) {
    return [inputWord];
  }

  const parsedManualEntries = manualEntries.map(parseManualEntry);

  const manualEntry = parsedManualEntries.find(entry => entry.word === inputWord.toLowerCase());
  if (manualEntry) {
    return manualEntry.syllables.map((s) => inputWord.substring(s.startIndex, s.endIndex));
  }


  // Wrap in '.' sentinels (standard TeX convention)
  const word = `.${inputWord.toLowerCase()}.`;
  const charArray = word.split('');
  const len = charArray.length;

  if (PreParsedPatterns[lang] === null) {
    // parse patterns only once
    PreParsedPatterns[lang] = parseAllPatterns(RawPatterns[lang]);
  }

  // 1. Find every pattern that matches at every position
  const matchingPatterns: ParsedPattern[][] = [];
  for (let i = 0; i < len; i++) {
    const matches: ParsedPattern[] = [];
    for (const pattern of PreParsedPatterns[lang]) {
      if (patternMatchesAt(pattern, charArray, i)) {
        matches.push(pattern);
      }
    }
    matchingPatterns.push(matches);
  }

  // 2. Collect pre/post weight lists for every position
  const weights: { pre: number[]; post: number[] }[] = [];
  for (let i = 0; i < len; i++) {
    weights.push({ pre: [], post: [] });
  }
  for (let i = 0; i < len; i++) {
    for (const pattern of matchingPatterns[i]) {
      for (let j = 0; j < pattern.nodes.length; j++) {
        const node = pattern.nodes[j];
        weights[i + j].pre.push(node.pre);
        weights[i + j].post.push(node.post);
      }
    }
  }

  // 3. Walk the interior characters (skip the '.' sentinels).
  //    At each inter‑character position compute the maximum weight;
  //    an odd maximum means "break here".
  const originalChars = inputWord.split('');
  const syllables: string[] = [];
  let syllableStart = 0; // index into originalChars

  for (let i = 1; i < len - 1; i++) {
    // The weight at the boundary *after* position i comes from:
    //   – post weights of position i
    //   – pre  weights of position i+1
    const pw: number[] = [...weights[i].post];
    if (i + 1 < len) {
      pw.push(...weights[i + 1].pre);
    }
    const maxWeight = pw.length === 0 ? 0 : Math.max(...pw);

    if (maxWeight % 2 === 1) {
      // i is an index in the *wrapped* string; the original word starts at index 1
      const cutEnd = i; // position in wrapped string → originalChars index = i - 1 + 1 = i
      syllables.push(originalChars.slice(syllableStart, cutEnd).join(''));
      syllableStart = cutEnd;
    }
  }

  // Push the remaining characters as the last syllable
  if (syllableStart < originalChars.length) {
    syllables.push(originalChars.slice(syllableStart).join(''));
  }

  return syllables;
}

function parseManualEntry(entry: string): ParsedManualEntry {
  const hyphenation = entry.toLowerCase().split('-');
  const word = hyphenation.join('');
  const syllables: Syllable[] = [];
  let currentSyllableIndex = 0;
  for (let i = 0; i < hyphenation.length; i++) {
    syllables.push({syllable: hyphenation[i], startIndex: currentSyllableIndex, endIndex: currentSyllableIndex + hyphenation[i].length});
    currentSyllableIndex += hyphenation[i].length;
  }
  return { word, syllables };
}