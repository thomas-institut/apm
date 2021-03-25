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

export const defaultLanguageDefinition = {
  la: {
    code: 'la',
    name: 'Latin',
    rtl: false,
    fontsize: 3,
    editionFont: 'FreeSerif',
    standardNormalizations: [ 'toLowerCase']
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    rtl: true,
    fontsize: 3,
    editionFont: 'Noto Naskh Arabic',
    standardNormalizations: [ ]
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    rtl: true,
    fontsize: 3,
    editionFont: 'Noto Serif Hebrew, Noto Serif',
    standardNormalizations: []
  }
}