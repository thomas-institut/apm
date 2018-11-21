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
  
  
  constructor (defaultTdClasses = []){
    this.tokenNotPresent = '&mdash;'
    this.collationTableClass = 'collationtable'
    this.witnessTdClass = 'witness'
    this.newLineHtml =  '<span class="newlinesymbol">&ldsh;</span>';

  }
  
  
  
  format(apiResponse, popoverClass) {
    
    let sigla = apiResponse.sigla
    let collationTable = apiResponse.collationTable
    let numWitnesses = sigla.length
      
    let maxColumnsPerTable = 20

    let numColumns = collationTable[sigla[0]].length
    let numTables = Math.ceil(numColumns / maxColumnsPerTable)
    
    let output = ''
    let columnsRemaining = numColumns
    for (let t=0; t < numTables; t++) {
      output += '<table class="' + this.collationTableClass + '">'
      let numColsInThisTable = Math.min(maxColumnsPerTable, columnsRemaining)
      let firstColumn = t*maxColumnsPerTable
      let lastColumn = firstColumn + numColsInThisTable
      for (let i = 0; i < numWitnesses; i++) {
        output += '<tr>'
        output += '<td class="' + this.witnessTdClass + '">' + sigla[i] + '</td>'
        for (let tkn=firstColumn; tkn < lastColumn; tkn++ ){
          output += this.getTdFromToken(sigla[i],collationTable[sigla[i]][tkn], popoverClass)
        }
        output += '</tr>'
      }
      output += '</table>'
      columnsRemaining -= numColsInThisTable
    }
    return output
  }
  
 getTdFromToken(siglum, token, popoverClass) {
   
   if (token.empty) {
     return '<td class="' + token.classes.join(' ') + '">'+ token.text + '</td>'
   }
   
   let html = '<td class="' + token.classes.join(' ') + '">'
   html += '<a class="' + popoverClass + '" title="' + token.text + '" '
   html += 'role="button" tabindex="0" '
   html += 'data-content="' + this.getPopoverHtmlFromToken(siglum, token) + '">'
   html += token.text
   html += '</a>'
   if (token.lineBreak) {
     html += this.newLineHtml
   }
   html += '</td>'
   
   return html
 }
 
 getPopoverHtmlFromToken(siglum, token) {
   let html = siglum + ', token ' + (token.witnessTokenIndex+1) + ', line ' + token.lineNumber
   return html
   
 }
 
}
