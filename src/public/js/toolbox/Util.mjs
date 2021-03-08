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

export function trimWhiteSpace(someString) {
  return someString.replace(/^\s+/, '').replace(/\s+$/, '')
}

export function getClassArrayFromJQueryObject(jqueryObject) {
  return jqueryObject.attr('class').split(/\s+/);
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

export function isWordToken(text) {
 return !hasSpaces(text) && !hasPunctuation(text)
}

export function isPunctuationToken(text) {
  if (text === undefined) {
    return false
  }
  let punctuationArray = getValidPunctuationArray()
  for (let i = 0; i < text.length; i++) {
    if (punctuationArray.indexOf(text.substr(i, 1)) === -1) {
      return false
    }
  }
  return true
}

export function hasPunctuation(text) {
  let punctuationArray = getValidPunctuationArray()
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

function getValidPunctuationArray() {
  return [
    '.',
    ',',
    ';',
    ':',
    '?',
    '!',
    '⊙',
    '¶',
    String.fromCodePoint(0x61B), // Arabic semi-colon
    String.fromCodePoint(0x61F), // Arabic question mark
    String.fromCodePoint(0x60C), // Arabic comma
    String.fromCodePoint(0x60D), // Arabic date separator
    String.fromCodePoint(0x5BE), // Hebrew maqaf
    String.fromCodePoint(0x5C0), // Hebrew paseq
    String.fromCodePoint(0x5C3) // Hebrew soft pasuq
    // String.fromCodePoint(0x5F3), // Hebrew geresh
    // String.fromCodePoint(0x5F4), // Hebrew gershayim
  ]
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

