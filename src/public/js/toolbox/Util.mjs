/*
 *  Copyright (C) 2020 Universität zu Köln
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

import * as Punctuation from '../constants/Punctuation.js'

// Utility functions, now as a module

export function deepCopy(someVariable) {
  return JSON.parse(JSON.stringify(someVariable))
}

export function formatVersionTime(time) {
  return moment(time).format('D MMM YYYY, H:mm:ss')
}

export function removeWhiteSpace(someString) {
  return someString.replace(/\s/g, '')
}

export function removeExtraWhiteSpace(someString) {
  return trimWhiteSpace(someString).replace(/\s+/g, ' ')
}

export function trimWhiteSpace(someString) {
  return someString.replace(/^\s+/, '').replace(/\s+$/, '')
}

export function getClassArrayFromJQueryObject(element) {
  if (element.attr('class') === undefined) {
    return []
  }
  return element.attr("class").split(/\s+/)
}

/**
 * Substitutes some characters like '&', '<', etc, into html entities ('&amp;', ...)
 * @param html
 * @returns {string}
 */
export function escapeHtml(html) {
  let entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return String(html).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}

export function isWordToken(text, lang = '') {
 return !hasSpaces(text) && !hasPunctuation(text, lang)
}

/**
 *
 * @param str {string}
 * @param searchStrings {string[]}
 * @param replaceString {string}
 * @returns {string}
 */
export function stringReplaceArray(str, searchStrings, replaceString) {
  let result = str
  searchStrings.forEach( (searchString) => {
    result = result.replaceAll(searchString, replaceString)
  })
  return result
}

/**
 *
 * @param text
 * @param lang, if an empty string only common characters are checked
 * @return {boolean}
 */
export function strIsPunctuation(text, lang = '') {
  if (text === undefined) {
    return false
  }
  let punctuationArray = Punctuation.getValidPunctuationForLang(lang)
  for (let i = 0; i < text.length; i++) {
    if (punctuationArray.indexOf(text.substr(i, 1)) === -1) {
      return false
    }
  }
  return true
}

export function parseWordsAndPunctuation(text, lang = '') {
  let parsedArray = []
  let currentWord = ''
  text.split('').forEach( (ch) => {
    if (isWordToken(ch, lang)) {
      // word
      currentWord += ch
      return
    }
    if (strIsPunctuation(ch, lang)) {
      // punctuation
      if (currentWord !== '') {
        parsedArray.push({ type: 'w', text: currentWord})
        currentWord = ''
      }
      parsedArray.push( { type: 'p', text: ch})
      return
    }
    // whitespace
    if (currentWord !== '') {
      parsedArray.push({ type: 'w', text: currentWord })
      currentWord = ''
    }
  })
  if (currentWord !== '') {
    parsedArray.push({ type: 'w', text: currentWord})
  }

  return parsedArray
}


export function hasPunctuation(text, lang = '') {
  let punctuationArray = Punctuation.getValidPunctuationForLang(lang)
  for (let i = 0; i < text.length; i++) {
    if (punctuationArray.indexOf(text.substr(i, 1)) !== -1) {
      return true
    }
  }
  return false
}

export function hasSpaces(text) {
  return /\s/.test(text)
}

export function safeGetIntVal(element, title) {
  let val = element.val()
  if (val === undefined) {
    console.error(`safeGetIntVal: Undefined value for ${title}`)
  }
  if (typeof val === 'object') {
    console.error(`safeGetIntVal: Value for ${title} is object/array`)
  }
  return parseInt(val)
}


export function getIntegerSuffix(someString, prefix) {
  return someString.startsWith(prefix) ? parseInt(someString.replace(prefix, '')) : null
}

/**
 *
 * @param string
 * @returns {string}
 */
export function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}


export function getTextDirectionForLang(lang) {
  switch(lang) {
    case 'ar':
    case 'he':
      return 'rtl'

    default:
      return 'ltr'
  }
}

export function hashCodeInt32(str){
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

