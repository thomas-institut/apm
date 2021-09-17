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
  // String.fromCodePoint(0x5F3), // Hebrew geresh
  // String.fromCodePoint(0x5F4), // Hebrew gershayim
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

