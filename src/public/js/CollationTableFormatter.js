/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/*eslint-env es6*/
/*eslint-env jquery*/

/*eslint no-var: "error"*/
/*eslint default-case: "error"*/
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */


class CollationTableFormatter {
  
  
  constructor (){
    this.tokenNotPresent = '&mdash;'
    this.tokenNotPresentTdClass = 'tokennotpresent'
    this.collationTableClass = 'collationtable'
    this.witnessTdClass = 'witness'
    
    
  }
  
  
  
  format(collatexOutput) {
    
    let numRows = collatexOutput.witnesses.length
    
    let theRows = []
    for (let i = 0; i < numRows; i++) {
      theRows[i] = []
      theRows[i].push('<td class="' + this.witnessTdClass + '">' +collatexOutput.witnesses[i] + '</td>')
    }
    
    let table = collatexOutput.table
    for (const segment of table) {
      for (let i = 0; i < numRows; i++) {
        if (segment[i].length === 0) {
          theRows[i].push('<td class="' + this.tokenNotPresentTdClass + '">' + this.tokenNotPresent + '</td>')
          continue
        }
        let theSegmentTd = '<td>'
        for (let j = 0; j < segment[i].length; j++) {
          theSegmentTd += segment[i][j] + ' '
        }
        theSegmentTd += '</td>'
        theRows[i].push(theSegmentTd)
      }
    }
    
    let output = '<table class="' + this.collationTableClass + '">'
    for (let i = 0; i < numRows; i++) {
      output += '<tr>'
      for (const theTd of theRows[i]) {
        output += theTd
      }
      output += '</tr>'
    }
    output += '</table>'
    return output
  }
  
 
}
