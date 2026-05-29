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

export function deepCopy<T>(someVariable: T): T {
  return JSON.parse(JSON.stringify(someVariable));
}

export function removeWhiteSpace(someString: string): string {
  return someString.replace(/\s/g, '');
}

export function removeExtraWhiteSpace(someString: string): string {
  return trimWhiteSpace(someString).replace(/\s+/g, ' ');
}

/**
 * Trims whitespace from the start and end of a string
 */
export function trimWhiteSpace(someString: string): string {
  return someString.replace(/^\s+/, '').replace(/\s+$/, '');
}

// export function rTrimWhiteSpace(someString: string): string {
//   return someString.replace(/\s+$/, '')
// }

/**
 * Compares two strings a and b, and return 1 is a>b, -1 if b<a or
 * 0 if the strings are equal
 */
export function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function lTrimCharacters(someString: string, charactersToTrim: string[]) {
  let firstNonTrimmedCharacterIndex = -1;
  for (let i = 0; i < someString.length && firstNonTrimmedCharacterIndex === -1; i++) {
    if (charactersToTrim.indexOf(someString.charAt(i)) === -1) {
      firstNonTrimmedCharacterIndex = i;
    }
  }
  if (firstNonTrimmedCharacterIndex === -1) {
    return '';
  }
  return someString.substring(firstNonTrimmedCharacterIndex, someString.length);
}

export function rTrimCharacters(someString: string, charactersToTrim: string[]) {
  let lastNonTrimmedCharacterIndex = -1;
  for (let i = (someString.length - 1); i >= 0 && lastNonTrimmedCharacterIndex === -1; i--) {
    if (charactersToTrim.indexOf(someString.charAt(i)) === -1) {
      lastNonTrimmedCharacterIndex = i;
    }
  }
  if (lastNonTrimmedCharacterIndex === -1) {
    return '';
  }
  return someString.substring(0, lastNonTrimmedCharacterIndex + 1);
}

export function trimCharacters(someString: string, charactersToTrim: string[]) {
  return rTrimCharacters(lTrimCharacters(someString, charactersToTrim), charactersToTrim);
}


export function rTrimNewlineCharacters(someString: string) {
  return someString.replace(/\n+$/, '');
}

/**
 * Substitutes some characters like '&', '<', etc, into html entities ('&amp;', ...)
 */
export function escapeHtml(html: string) {
  let entityMap: { [key: string]: string; } = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
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
export function stringReplaceArray(str: string, searchStrings: string[], replaceString: string): string {
  let result = str;
  searchStrings.forEach((searchString) => {
    result = result.replaceAll(searchString, replaceString);
  });
  return result;
}


// export function getIntegerSuffix(someString: string, prefix: string): number | null {
//   return someString.startsWith(prefix) ? parseInt(someString.replace(prefix, '')) : null
// }

export function capitalizeFirstLetter(string: string): string {
  return string[0].toUpperCase() + string.slice(1);
}


export function getTextDirectionForLang(lang: string): string {
  switch (lang) {
    case 'ar':
    case 'he':
      return 'rtl';

    default:
      return 'ltr';
  }
}

export function isRtl(lang: string): boolean {
  return getTextDirectionForLang(lang) === 'rtl';
}

export function hashCodeInt32(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export function toFixedPrecision(someNumber: number, decimals: number) {
  let factor = Math.pow(10, decimals);
  return Math.floor(someNumber * factor) / factor;
}


export function isWhiteSpace(str: string): boolean {
  return trimWhiteSpace(str) === '';
}

export function isAllUpperCase(str: string): boolean {
  return str === str.toUpperCase();
}

export function isNumeric(someString: string): boolean {
  return (/^[0-9]/.test(someString));
}




