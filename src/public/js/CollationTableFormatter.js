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

/*eslint-env es6*/
/*eslint-env jquery*/

/*eslint no-var: "error"*/
/*eslint default-case: "error"*/
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */


/* global ITEM_RUBRIC, ITEM_DELETION, ITEM_ADDITION, ITEM_SIC, ITEM_UNCLEAR, ITEM_ILLEGIBLE, ITEM_GLIPH, ITEM_ABBREVIATION, ITEM_INITIAL, ITEM_MATH_TEXT */

class CollationTableFormatter {
  
  
  constructor (defaultTdClasses = []){
    this.tokenNotPresent = '&mdash;'
    this.tokenNotPresentTdClass = 'tokennotpresent'
    this.notMainVariantTdClass = 'notmainvariant'
    this.collationTableClass = 'collationtable'
    this.witnessTdClass = 'witness'
    this.defaultTdClasses = defaultTdClasses
    // item types
    this.itemTypeClasses = []
    
    this.itemTypeClasses[ITEM_RUBRIC] = 'rubric'
    this.itemTypeClasses[ITEM_DELETION] = 'deletion'
    this.itemTypeClasses[ITEM_ADDITION] = 'addition'
    this.itemTypeClasses[ITEM_SIC] = 'sic'
    this.itemTypeClasses[ITEM_UNCLEAR] = 'unclear'
    this.itemTypeClasses[ITEM_ILLEGIBLE] = 'illegible'
    this.itemTypeClasses[ITEM_GLIPH] = 'gliph'
    this.itemTypeClasses[ITEM_ABBREVIATION] = 'abbr'
    this.itemTypeClasses[ITEM_INITIAL] = 'initial'
    this.itemTypeClasses[ITEM_MATH_TEXT] = 'mathtext'

  }
  
  getTokenText(token) {
    if (typeof token === 'object') {
      if ('t' in token) {
        return token.t
      }
      return ''
    }
    return token.toString()
  }
  
  // transforms the table in collatexOutput into a flat list of tokens
  flattenCollatexTokens(collatexOutput, collapseSegments = true) {
    
    let processedOutput = collatexOutput
    
    let numWitnesses = collatexOutput.witnesses.length
    let theRows = []
    
    for (let i=0; i < numWitnesses; i++) {
      theRows[i] = []
    }
    
    let table = collatexOutput.table
    let segmentLengths = []
    
    // calculate the max number of tokens in each segment
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
            theRows[i].push({ t: '', isEmpty: true})
            continue
          }
          let theSegmentToken = { isEmpty: false, rawTokens: table[k][i] }
          let textualRepresentation = ''
          
          for (let j = 0; j < table[k][i].length; j++) {
            textualRepresentation += this.getTokenText(table[k][i][j]) + ' '
          }
          theSegmentToken.t = textualRepresentation
          theRows[i].push(theSegmentToken)
          continue
        }
        // do not collapse
        for (let j = 0; j < segmentLengths[k]; j++) {
          if (j < table[k][i].length) {
            let token = table[k][i][j]
            if (typeof token === 'object') {
              let processedToken =  table[k][i][j]
              processedToken.isEmpty = false
              theRows[i].push(processedToken)
              continue
            }
            let processedToken = { isEmpty: false, t: token} 
            if (token === '') {
              processedToken.isEmpty = true
              processedToken.t = ''
            }
            theRows[i].push(processedToken)
          } else {
            theRows[i].push({ t: '', isEmpty: true})
          }
        }
      }
    }
    processedOutput.flattenedTable = theRows
    return processedOutput
  }
  
  getMainVariant(variantsArray) {
    let counts = {}
    let compare = 0
    let mostFrequent = ''
    for (let i=0; i<variantsArray.length; i++) {
      let variant = variantsArray[i]
      if (variant === '') {
        continue
      }
      if (counts[variant] === undefined) {
        counts[variant] = 1
      } else {
        counts[variant]++
      }
      if (counts[variant] > compare) {
        compare = counts[variant]
        mostFrequent = variant
      }
    }
    return mostFrequent
  }
  
  tagVariants(flattenedCollatex) {
    let numWitnesses = flattenedCollatex.witnesses.length
    let numTokens = flattenedCollatex.flattenedTable[0].length
    let output = flattenedCollatex
    
    for (let tkn=0; tkn < numTokens; tkn++) {
      let variants = []
      let mainVariant = ''
      for (let w=0; w < numWitnesses; w++) {
        variants.push(output.flattenedTable[w][tkn].t)
        mainVariant = this.getMainVariant(variants)
      }
      for (let w=0; w < numWitnesses; w++) {
        if (output.flattenedTable[w][tkn].t === mainVariant) {
          output.flattenedTable[w][tkn].isMainVariant = true
        } else {
          output.flattenedTable[w][tkn].isMainVariant = false
        }
      }
    }
    return output
  }
  
  getTdFromToken(token) {
    if (token.isEmpty) {
      return '<td class="' + this.tokenNotPresentTdClass + '">' + this.tokenNotPresent + '</td>'
    }
    let tdClasses = this.defaultTdClasses.slice()
    //let tdClasses = []
    if (!token.isMainVariant) {
      tdClasses.push(this.notMainVariantTdClass)
    }
    
    if (this.itemTypeClasses[token.itemType] !== undefined) {
      tdClasses.push(this.itemTypeClasses[token.itemType])
    }
 
    let theTd = ''
    if (tdClasses.length > 0) {
      theTd = '<td class="' 
      for (const c of tdClasses) {
        theTd += c + ' '
      }
      theTd += '">'
    } else {
      theTd = '<td>'
    }
    theTd += this.getTokenText(token) + '</td>'
    return theTd
  }
  
  format(collatexOutput, collapseSegments = true, maxColumnsPerTable = false) {
    
    let numWitnesses = collatexOutput.witnesses.length
    if (maxColumnsPerTable === false) {
      maxColumnsPerTable = 1000
    }
    
    let flattenedCollatexOutput = this.flattenCollatexTokens(collatexOutput, collapseSegments)
    let taggedCollatex = this.tagVariants(flattenedCollatexOutput)
    console.log('Tagged collatex, collapse segments = ' + collapseSegments)
    console.log(taggedCollatex)
    let theRows = taggedCollatex.flattenedTable
    
    let numColumns = theRows[0].length
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
        output += '<td class="' + this.witnessTdClass + '">' + collatexOutput.witnesses[i] + '</td>'
        for (let tkn=firstColumn; tkn < lastColumn; tkn++ ){
          output += this.getTdFromToken(theRows[i][tkn])
        }
        output += '</tr>'
      }
      output += '</table>'
      columnsRemaining -= numColsInThisTable
    }
    return output
  }
  
 
}
