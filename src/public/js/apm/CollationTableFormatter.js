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
  
  
  constructor (options = {}){
    this.tokenNotPresent = '&mdash;'
    this.collationTableClass = 'collationtable'
    this.witnessTdClass = 'witness'
    this.newLineHtml =  '<span class="newlinesymbol">&ldsh;</span>';
    this.variantClassPrefix = 'variant'
    this.maxColumnsPerTable = 15
    this.setOptions(options)
  }
  
  getDefaultOptions() {
    let options = {}
    
    options.multipleRows = true
    options.maxColumnsPerTable = 15
    options.highlightVariants = true
    
    return options
  }
  
  setOptions(options={}) {
    this.options = this.getCleanOptionsObject(this.getDefaultOptions(), options)
  }
  
  getOptions() {
    return this.options
  }
  
  getCleanOptionsObject(defaultOptions, options) {

    let cleanOptions = defaultOptions
    
    if (typeof(options.multipleRows) === 'boolean') {
      cleanOptions.multipleRows = options.multipleRows
    }
    
    if(typeof(options.maxColumnsPerTable) === 'number' && options.maxColumnsPerTable > 0) {
      cleanOptions.maxColumnsPerTable = options.maxColumnsPerTable
    }
    
    if (typeof(options.highlightVariants) === 'boolean') {
      cleanOptions.highlightVariants = options.highlightVariants
    }
    return cleanOptions
  }
  
  format(apiResponse, popoverClass, oneTimeOptions = {}) {
    
    let sigla = apiResponse.sigla
    let collationTable = apiResponse.collationTable
    let numWitnesses = sigla.length
    let options = this.getCleanOptionsObject(this.options, oneTimeOptions)

    let numColumns = collationTable[sigla[0]].length
    let numTables = 1
    let maxColumnsPerTable = numColumns
    if (options.multipleRows) {
      numTables = Math.ceil(numColumns / options.maxColumnsPerTable)
      maxColumnsPerTable = options.maxColumnsPerTable
    }
    
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
   if (typeof(token.html) !== 'undefined') {
     if (token.html !== '') {
       return '<td>' + token.html + '</td>'
     }
   }
   
   token.classes.push(popoverClass)
   let popOverHtml = this.getPopoverHtmlFromToken(siglum, token)
   let filteredTokenClasses = this.getTokenClasses(token.classes, this.options.highlightVariants)
   
   let html = '<td class="' + filteredTokenClasses.join(' ') + '"' 
   html += 'data-content=\'' + popOverHtml + '\''
   html += '>'
   html += token.text
   if (token.lineBreak) {
     html += this.newLineHtml
   }
   html += '</td>'
   
   return html
 }
 
 getTokenClasses(classes, includeVariants = true) {
    if (includeVariants) {
      return classes
    }
    let filteredClasses = []
    let re = RegExp('^' + this.variantClassPrefix + '.*') 
    for(const tokenClass of classes) {
      if (re.test(tokenClass)) {
        continue
      }
      filteredClasses.push(tokenClass)
    }
    return filteredClasses
 }
 
 getPopoverHtmlFromToken(siglum, token) {
   
   let html = ''
   if (typeof(token.popoverHtml) !== 'undefined') {
     html += token.popoverHtml
   }
   html += '<br/>Token ' + (token.witnessTokenIndex+1) 
   if (typeof(token.lineNumber) !== 'undefined') {
     html += ' , line ' + token.lineNumber
   }
   return html
 }
 

 
}
