/* 
 *  Copyright (C) 2019 Universität zu Köln
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


// TODO: get rid of this class, only getTable is used in DocPage.js
export class ApmUtil {
  static getLangDefFromLanguagesArray(langArray: any) {
    let langDef: any = {};
    for (const lang of langArray) {
      langDef[lang['code']] = lang;
    }
    return langDef;
  }

  static getTable(tdArray: string[], colsPerRow: number, tableClass: string): string {
    let html = '<table class="' + tableClass + '">';
    html += '<tr>';
    for (let i = 0; i < tdArray.length; i++) {
      if (!(i % colsPerRow)) {
        if (i !== 0) {
          html += '</tr><tr>';
        }
      }
      html += '<td>' + tdArray[i] + '</td>';
    }
    html += '</tr></table>';
    return html;
  }
}

