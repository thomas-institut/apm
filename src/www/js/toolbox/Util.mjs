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

/**
 * Trims whitespace from the start and end of a string
 * @param {string}someString
 * @return {string}
 */
export function trimWhiteSpace(someString) {
  return someString.replace(/^\s+/, '').replace(/\s+$/, '')
}

export function rTrimWhiteSpace(someString) {
  return someString.replace(/\s+$/, '')
}

/**
 * Compares two strings a and b, and return 1 is a>b, -1 if b<a or
 * 0 if the strings are equal
 * @param {string}a
 * @param {string}b
 * @return {number}
 */
export function compareStrings(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 *
 * @param {string}someString
 * @param {string[]}charactersToTrim
 */
export function lTrimCharacters(someString, charactersToTrim) {
  let firstNonTrimmedCharacterIndex = -1
  for (let i=0; i < someString.length && firstNonTrimmedCharacterIndex === -1; i++) {
    if (charactersToTrim.indexOf(someString.charAt(i))===-1) {
      firstNonTrimmedCharacterIndex = i
    }
  }
  if (firstNonTrimmedCharacterIndex === -1) {
    return ''
  }
  return someString.substring(firstNonTrimmedCharacterIndex, someString.length)
}

/**
 *
 * @param {string}someString
 * @param {string[]}charactersToTrim
 */
export function rTrimCharacters(someString, charactersToTrim) {
  let lastNonTrimmedCharacterIndex = -1
  for (let i= (someString.length -1); i >=0 && lastNonTrimmedCharacterIndex === -1; i--) {
    if (charactersToTrim.indexOf(someString.charAt(i))===-1) {
      lastNonTrimmedCharacterIndex = i
    }
  }
  if (lastNonTrimmedCharacterIndex === -1) {
    return ''
  }
  return someString.substring(0, lastNonTrimmedCharacterIndex+1)
}

/**
 *
 * @param {string}someString
 * @param {string[]}charactersToTrim
 */
export function trimCharacters(someString, charactersToTrim) {
  return rTrimCharacters(lTrimCharacters(someString, charactersToTrim), charactersToTrim)
}




export function rTrimNewlineCharacters(someString) {
  return someString.replace(/\n+$/, '')
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


export function  getTextDirectionForLang(lang) {
  switch(lang) {
    case 'ar':
    case 'he':
      return 'rtl'

    default:
      return 'ltr'
  }
}

export function isRtl(lang) {
  return getTextDirectionForLang(lang) === 'rtl'
}

export function hashCodeInt32(str){
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 *
 * @param {number}someNumber
 * @param {number}decimals
 */
export function toFixedPrecision(someNumber, decimals) {
  let factor = Math.pow(10, decimals)
  return Math.floor(someNumber*factor) / factor
}


export function isWhiteSpace(str) {
  return trimWhiteSpace(str) === ''
}

export function isAllUpperCase(str) {
  return str === str.toUpperCase()
}

export function isNumeric(someString) {
  return (/^[0-9]/.test(someString))
}




