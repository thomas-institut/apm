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
    this.tokenNotPresent = '<span style="color: gray">&mdash;</span>'
    this.collationTableClass = 'collationtable'
    this.witnessTableClass = 'witnesstable'
    
  }
  
  
  
  format(collatexOutput) {
    let output = '<table class="'+ this.collationTableClass + '">'
    output += '<tr><td>'
    
    output += '<table class="' + this.witnessTableClass + '">'
    for (const witness of collatexOutput.witnesses) {
      output += '<tr><td>' + witness + '</td></tr>'
    }
    output +='</table>'
    output += '</td>'
    let table = collatexOutput.table
    for (const segment of table) {
      //console.log(segment)
      output += '<td>'
      output += this.formatSegmentTable(segment)
      output += '</td>'
    }
    
    output += "</tr></table>"
    
    return output
  }
  
  formatSegmentTable (segmentTable) {
    let output = '<table class="segmenttable">'
    
    for (const witness of segmentTable) {
      //console.log(witness)
      output += '<tr>'
      if (witness.length === 0) {
        output += '<td>' + this.tokenNotPresent  + '</td>'
      } else {
        output += '<td>'
        for (const token of witness) {
          output += token + ' '
        }
        output += '</td>'
      }
      output += '</tr>'
    }
    output += '</table>'
    
    return output
  }
}
