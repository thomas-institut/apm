/*
 *  Copyright (C) 2021 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import { lTrimCharacters, rTrimCharacters, trimCharacters } from '../toolbox/Util.mjs'

export const punctuationDefinition = [
  { char: '.', // period
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: ',',  // comma
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: String.fromCodePoint(0x60C), // Arabic comma
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: ';', // semi-colon
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: String.fromCodePoint(0x61B), // Arabic semi-colon
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: ':', // colon
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: '¿', // starting question mark
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }},
  { char: '?', // question mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: String.fromCodePoint(0x61F), // Arabic question mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: '¡', // starting exclamation mark
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }},
  { char: '!', // exclamation mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: '⊙', // circled period
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char: '¶', // paragraph
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x2013), // en dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x2014), // em dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x2e3a), // two-em dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char: '«', // left guillemet
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }},
  { char: '»', // right guillemet
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }},
  { char: '"', // straight double quote 
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false },
    he: { isPunctuation: false, sticksToPrevious: true, sticksToNext: true }, // not punctuation in Hebrew
  },
  { char: '“', // left double quote
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
    ar: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
  },
  { char: '”', // right double quote
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
    ar: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
  },
  { char: "'", // straight single quote 
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false },
    he: { isPunctuation: false, sticksToPrevious: true, sticksToNext: true }, // not punctuation in Hebrew
  },
  { char: '‘', // left single quote
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
    ar: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
  },
  { char: '’', // right single quote
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
    ar: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
  },
  { char:  String.fromCodePoint(0x60D), // Arabic date separator
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x5BE), // Hebrew maqaf
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x5C0), // Hebrew paseq
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
  { char:  String.fromCodePoint(0x5C3), // Hebrew soft pasuq
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }},
]

export const common =  [
  '.',
  ',',
  ';',
  ':',
  '?',
  '¿',
  '¡',
  '!',
  '⊙',
  '¶',
  '«',
  '»',
  '“', // left double quote
  '”', // right double quote
  '‘', // left single quote
  '’', // right single quote
  String.fromCodePoint(0x2013), // en dash
  String.fromCodePoint(0x2014), // em dash
  String.fromCodePoint(0x2e3a), // two-em dash

  String.fromCodePoint(0x61B), // Arabic semi-colon
  String.fromCodePoint(0x61F), // Arabic question mark
  String.fromCodePoint(0x60C), // Arabic comma
  String.fromCodePoint(0x60D), // Arabic date separator

  String.fromCodePoint(0x5BE), // Hebrew maqaf
  String.fromCodePoint(0x5C0), // Hebrew paseq
  String.fromCodePoint(0x5C3) // Hebrew soft pasuq
]

export const extraLatin = [
  '"'
]

export const extraArabic = [
  '"'
]

export const extraHebrew = []


export function getValidPunctuationForLang(lang) {
  let extra = []

  switch (lang) {
    case 'ar':
      extra = extraArabic
      break

    case 'he':
      extra = extraHebrew
      break

    case 'la':
      extra = extraLatin
      break
  }
  return common.concat(extra)
}

/**
 * 
 * @param lang
 * @return {(string)[]}
 */
export function getPunctuationCharactersForLang(lang = '') {
  return punctuationDefinition.filter ( (def) => {
    if (def[lang] !== undefined) {
      return def[lang].isPunctuation
    }
    return def.default.isPunctuation
  }).map ( (def) => { return def.char})
}

/**
 * 
 * @param {string}char
 * @param {string}lang
 * @return {boolean}
 */
export function isPunctuation(char, lang = '') {
  return getPunctuationCharactersForLang(lang).indexOf(char) !== -1
}

/**
 *
 * @param {string}char
 * @param {string}lang
 * @return {boolean}
 */
export function punctuationCharSticksToNext(char, lang) {
  return __sticks(char, lang, true)
}

/**
 *
 * @param {string}char
 * @param {string}lang
 * @return {boolean}
 */
export function punctuationCharSticksToPrevious(char, lang) {
  return __sticks(char, lang, false)
}

/**
 *
 * @param {string}char
 * @param {string}lang
 * @param {boolean}toNext
 * @return {boolean}
 * @private
 */
function __sticks(char, lang, toNext) {
  let charDefArray = punctuationDefinition.filter((def) => { return def.char === char})
  if (charDefArray.length === 0) {
    throw Error(`Char '${char}' is not punctuation`)
  }
  let def = charDefArray[0]
  let stickTo = toNext ? "sticksToNext" : "sticksToPrevious"
  if (def[lang] !== undefined) {
    return def[lang][stickTo]
  }
  return def.default[stickTo]
}

/**
 *
 * @param {string}someString
 * @param {string}lang
 */
export function trimInitialPunctuation(someString, lang = '') {
  return lTrimCharacters(someString, getPunctuationCharactersForLang(lang))
}

/**
 *
 * @param {string}someString
 * @param {string}lang
 */
export function trimFinalPunctuation(someString, lang = '') {
  return rTrimCharacters(someString, getPunctuationCharactersForLang(lang))
}

/**
 *
 * @param {string}someString
 * @param {string}lang
 */
export function trimPunctuation(someString, lang = '') {
  return trimCharacters(someString, getPunctuationCharactersForLang(lang))
}

