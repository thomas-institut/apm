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

const arabicZeroCodePoint = 0x660

export class NumeralStyles {

  static toDecimalWestern(n) {
    return n.toString()
  }

  static toDecimalArabic(n) {
    let decimalWestern = this.toDecimalWestern(n)
    let decimalArabic = ''
    for (let i = 0; i < decimalWestern.length; i++) {
      let digit = parseInt(decimalWestern.charAt(i))
      decimalArabic += String.fromCodePoint(arabicZeroCodePoint + digit)
    }
    return decimalArabic
  }

}