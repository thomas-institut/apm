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

const arabicZeroCodePoint = 0x660;


export type NumeralSystem = 'WesternArabic' | 'EasternArabic';

export class NumeralSystems {

  static toWesternArabic(n: number): string {
    return n.toString(10);
  }

  static toEasternArabic(n: number): string {
    if (n === -1) {
      return '?';
    }
    let westernArabic = this.toWesternArabic(n);
    let easternArabic = '';
    for (let i = 0; i < westernArabic.length; i++) {
      let digit = parseInt(westernArabic.charAt(i));
      if (isNaN(digit)) {
        console.log(`Found non-number in ${n}, character '${westernArabic.charAt(i)}'`);
      } else {
        easternArabic += String.fromCodePoint(arabicZeroCodePoint + digit);
      }
    }
    return easternArabic;
  }

  static isEasternArabicNumber(str: string): boolean {
    return /^[\u0660-\u0669]+$/.test(str);
  }


  static isWesternArabicNumber(str: string): boolean {
    return /^[0-9]$/.test(str);
  }

}