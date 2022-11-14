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


// NOTE: if not explicitly set, isPunctuationInsideWord is true
// such punctuation signs effectively split the words

export const punctuationDefinition = [
  { char: '.', // period
    default: {
      isPunctuation: true,
      isPunctuationInsideWord: false, // to allow for decimal period
      sticksToPrevious: true,
      sticksToNext: false }
  },
  { char: ',',  // comma
    default: {
      isPunctuation: true,
      isPunctuationInsideWord: false,  // to allow for decimal comma
      sticksToPrevious: true,
      sticksToNext: false }
  },
  { char: String.fromCodePoint(0x60C), // Arabic comma
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: ';', // semi-colon
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: String.fromCodePoint(0x61B), // Arabic semi-colon
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: ':', // colon
    default: {
      isPunctuation: true,
      isPunctuationInsideWord: false,  // to allow for ratios, e.g, 3:2, A:B
      sticksToPrevious: true,
      sticksToNext: false }
  },
  { char: '¿', // starting question mark
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }
  },
  { char: '?', // question mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: String.fromCodePoint(0x61F), // Arabic question mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '¡', // starting exclamation mark
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }
  },
  { char: '!', // exclamation mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '⊙', // circled period
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char: '¶', // paragraph
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x2013), // en dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x2014), // em dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x2e3a), // two-em dash
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char: '«', // start guillemet   (i.e., left-pointing guillemet in Latin, right-pointing guillemet in Hebrew/Arabic
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }
  },
  { char: '»', // end guillemet
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '[', // start square bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: false, sticksToNext: true }
  },
  { char: ']', // end square bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '(', // start round bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: false, sticksToNext: true }
  },
  { char: ')', // end round bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '{', // start curly bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: false, sticksToNext: true }
  },
  { char: '}', // end curly bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: true, sticksToNext: false }
  },
  { char: '⟨', // start angle bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: false, sticksToNext: true }
  },
  { char: '⟩', // end angle bracket
    default: { isPunctuation: true, isPunctuationInsideWord: false, sticksToPrevious: true, sticksToNext: false }
  },

  { char: '"', // straight double quote 
    default: {
      isPunctuation: false,  // Editors MUST use proper left/right quotation mark characters
      sticksToPrevious: false,
      sticksToNext: false
    }
  },
  { char: '“', // left double quotation mark
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
    ar: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
  },
  { char: '”', // right double quotation mark
    default: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
    ar: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: false, sticksToNext: true },
  },
  { char: "'", // straight single quotation mark, apostrophe
    default: {
      isPunctuation: false,  // Editors MUST use proper left/right quotation mark characters
      sticksToPrevious: false,
      sticksToNext: false
    },
  },
  { char: '‘', // left single quotation mark
    default: {
      isPunctuation: true,
      isPunctuationInsideWord: false,
      sticksToPrevious: false,
      sticksToNext: true
    },
    ar: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false }, // in LTR languages it should be inverted
    he: { isPunctuation: true, sticksToPrevious: true, sticksToNext: false },
  },
  { char: '’', // right single quotation mark, fancy apostrophe
    default: {
      isPunctuation: true,
      isPunctuationInsideWord: false,
      sticksToPrevious: true,
      sticksToNext: false
    },
    ar: {
      isPunctuation: true,
      isPunctuationInsideWord: false,
      sticksToPrevious: false,  // in LTR languages it should be inverted
      sticksToNext: true
    },
    he: {
      isPunctuation: true,
      isPunctuationInsideWord: false,
      sticksToPrevious: false,  // in LTR languages it should be inverted
      sticksToNext: true
    },
  },
  { char:  String.fromCodePoint(0x60D), // Arabic date separator
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x5BE), // Hebrew maqaf
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x5C0), // Hebrew paseq
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
  { char:  String.fromCodePoint(0x5C3), // Hebrew soft pasuq
    default: { isPunctuation: true, sticksToPrevious: false, sticksToNext: false }
  },
]


export class Punctuation {

  /**
   * Returns true if the given string is entirely composed
   * of punctuation characters in the given language
   * @param theString
   * @param lang
   * @return boolean
   */
  static stringIsAllPunctuation(theString, lang = ''){
    for (let i = 0; i < theString.length; i++) {
      if (!this.characterIsPunctuation(theString.charAt(i), lang)) {
        return false
      }
    }
    return true
  }

  static characterIsPunctuation(char, lang = '', insideWord = false) {
    let definitionObjectArray = getPunctuationDefinition(lang).filter( (def) => { return def['char'] === char})
    if (definitionObjectArray.length === 0) {
      return false
    }
    return insideWord ? definitionObjectArray[0]['def']['isPunctuationInsideWord'] : definitionObjectArray[0]['def']['isPunctuation']
  }

  /**
   * Returns true if the given string has at least one character
   * that is punctuation in the given language.
   *
   * This function takes into account peculiarities of each language.
   * For example, in Hebrew, a straight double quotation inside a
   * word does not count as punctuation.
   *
   * @param theString
   * @param lang
   */
  static stringHasPunctuation(theString, lang = '') {
    for (let i = 0; i < theString.length; i++) {
      let char = theString.charAt(i)
      let insideWord = i > 0 && i < theString.length-1
      // console.log(`Processing character ${i}: '${char}', insideWord=${insideWord}`)
      if (this.characterIsPunctuation(char, lang, insideWord)) {
        return true
      }
    }
    return false
  }

  static sticksToPrevious(char, lang) {
    let definitionObjectArray = getPunctuationDefinition(lang).filter( (def) => { return def['char'] === char})
    if (definitionObjectArray.length === 0) {
      return false
    }
    return definitionObjectArray[0]['def']['sticksToPrevious']
  }

  static sticksToNext(char, lang) {
    let definitionObjectArray = getPunctuationDefinition(lang).filter( (def) => { return def['char'] === char})
    if (definitionObjectArray.length === 0) {
      return false
    }
    return definitionObjectArray[0]['def']['sticksToNext']
  }

}

let punctuationDefinitionsPerLanguage = {}
const defaultLangKey = 'default'

function getPunctuationDefinition(lang = '') {
  let langKey = lang === '' ? defaultLangKey : lang

  if (punctuationDefinitionsPerLanguage[langKey] !== undefined) {
    // return cached definitions object
    return punctuationDefinitionsPerLanguage[langKey]
  }
  punctuationDefinitionsPerLanguage[langKey] = buildPunctuationDefinitionForLanguage(lang)
  console.log(`Punctuation definition created for lang ${lang}`)
  console.log(punctuationDefinitionsPerLanguage[langKey])
  return punctuationDefinitionsPerLanguage[langKey]
}

function buildPunctuationDefinitionForLanguage(lang) {
  return punctuationDefinition.map( (def) => {
    let charDef
    if (def[lang] !== undefined) {
        charDef = def[lang]
    } else {
      charDef = def['default']
    }
    if (charDef['isPunctuationInsideWord'] === undefined) {
      charDef['isPunctuationInsideWord'] = charDef['isPunctuation']
    }
    return { char: def['char'], def: charDef}
  })
}


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
 * @param {string}someString
 * @param {string}lang
 */
export function trimPunctuation(someString, lang = '') {
  return trimCharacters(someString, getPunctuationCharactersForLang(lang))
}

