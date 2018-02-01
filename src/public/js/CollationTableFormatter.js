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
  
  format(collatexOutput, collapseSegments = true, maxColumnsPerTable = false) {
    
    let numWitnesses = collatexOutput.witnesses.length
    if (maxColumnsPerTable === false) {
      maxColumnsPerTable = 1000
    }
    
    let theRows = []
    
   for (let i=0; i < numWitnesses; i++) {
     theRows[i] = []
   }
    
    let table = collatexOutput.table
    let segmentLengths = []
    
    // calculate the max number of tokens in each segments
    for (const segment of table) {
      let segmentLength = 0
      for (let i=0; i < numWitnesses; i++) {
        if (segment[i].length > segmentLength) {
          segmentLength = segment[i].length
        }
      }
      segmentLengths.push(segmentLength)
    }
    
    // generate the rows for each witness
    for (let k=0; k < table.length; k++) {
      for (let i = 0; i < numWitnesses; i++) {
        if (collapseSegments) {
          // collapse
          if (table[k][i].length === 0) {
            // no tokens in segment k for witness i
            theRows[i].push('<td class="' + this.tokenNotPresentTdClass + '">' + this.tokenNotPresent + '</td>')
            continue
          }
          let theSegmentTd = '<td>'
          for (let j = 0; j < table[k][i].length; j++) {
            theSegmentTd += table[k][i][j] + ' '
          }
          theSegmentTd += '</td>'
          theRows[i].push(theSegmentTd)
          continue
        }
        // do not collapse
        for (let j = 0; j < segmentLengths[k]; j++) {
          if (j < table[k][i].length) {
            theRows[i].push('<td>' + table[k][i][j] + ' ' + '</td>')
          } else {
            theRows[i].push('<td class="' + this.tokenNotPresentTdClass + '">' + this.tokenNotPresent + '</td>')
          }
        }
      }
    }
    
    let numColumns = theRows[0].length
    console.log('Num columns = ' + numColumns)
    let numTables = Math.ceil(numColumns / maxColumnsPerTable)
    console.log('Num tables = ' + numTables)
    
    let output = ''
    let columnsRemaining = numColumns
    for (let t=0; t < numTables; t++) {
      output += '<table class="' + this.collationTableClass + '">'
      let numColsInThisTable = Math.min(maxColumnsPerTable, columnsRemaining)
      let firstColumn = t*maxColumnsPerTable
      let lastColumn = firstColumn + numColsInThisTable
      for (let i = 0; i < numWitnesses; i++) {
        output += '<tr>'
        output += '<td class="' + this.witnessTdClass + '">' + collatexOutput.witnesses[i] + '</td>'
        for (let tdn=firstColumn; tdn < lastColumn; tdn++ ){
          output += theRows[i][tdn]
        }
        output += '</tr>'
      }
      output += '</table>'
      columnsRemaining -= numColsInThisTable
    }
    return output
  }
  
 
}
