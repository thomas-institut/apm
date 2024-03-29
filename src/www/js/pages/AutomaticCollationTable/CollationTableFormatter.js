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

import {OptionsChecker} from '@thomas-inst/optionschecker'

export class CollationTableFormatter {
  
  
  constructor (options = {}){

    this.setOptions(options)
    this.tokenNotPresent = '&mdash;'
    this.collationTableClass = 'collationtable'
    this.witnessTdClass = 'witness'
    this.newLineHtml =  '<span class="newlinesymbol">&ldsh;</span>';
    this.normalizationPostfix = '<sub class="text-muted">&nbsp;<b>N</b></sub>'
    this.variantClassPrefix = 'variant'
    this.maxColumnsPerTable = 15

    this.collationTable = {}
    this.peopleInfo = []
  }

  getOptions () {
    return this.options
  }

  setOptions (options) {

    let optionsDefinition = {
      multipleRows: { type: 'boolean', default: true},
      maxColumnsPerTable: { type: 'NumberGreaterThanZero', default: 15},
      highlightVariants: { type: 'boolean', default: true},
      showNormalizations: { type: 'boolean', default: false},
      lang: { type: 'NonEmptyString', default: 'la'},
    }

    this.optionsChecker = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'CollationTableFormatter'})
    this.options = this.optionsChecker.getCleanOptions(options)
  }

  generateCsv(data, sep = ',') {
    let collationTable = data.collationTable
    let sigla = collationTable.sigla
    let numWitnesses = collationTable.witnesses.length
    
    let output = ''
    for (let i=0; i < numWitnesses; i++) {
      let siglum = sigla[i]
      output += siglum + sep
      let ctRefRow = collationTable.collationMatrix[i]
      for (let tkRefIndex = 0; tkRefIndex < ctRefRow.length; tkRefIndex++) {
        let tokenRef = ctRefRow[tkRefIndex]
        let tokenCsvRep = ''
        if (tokenRef !== -1 ) {
          let token = collationTable.witnesses[i].tokens[tokenRef]
          tokenCsvRep = this.getCsvRepresentationForToken(token, this.options.showNormalizations)
        }
        output += tokenCsvRep + sep
      }
      output += "\n"
    }
    return output
  }
  
  getCsvRepresentationForToken(tkn, showNormalizations) {
    if (tkn.empty) {
      return ''
    }
    let text = tkn.text
    if (showNormalizations) {
      text = tkn.norm
    }
    return '"' + text + '"'
  }

  setDataFromApiResponse(collationTable, peopleInfo) {
    this.collationTable = collationTable
    this.peopleInfo = peopleInfo
  }
  
  format(apiResponse, popoverClass) {

   this.setDataFromApiResponse(apiResponse.standardData, apiResponse.people)

    //let sigla = apiResponse.sigla
    let sigla = this.collationTable.sigla
    //let collationTable = apiResponse.collationTable
    let collationTable = this.collationTable
    let numWitnesses = sigla.length
    let options = this.options
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
          output += this.getTdFromToken(sigla[i],collationTable[sigla[i]][tkn], popoverClass, options.showNormalizations)
        }
        output += '</tr>'
      }
      output += '</table>'
      columnsRemaining -= numColsInThisTable
    }
    return output
  }

  getPopoverTextSpan(text, lang) {
    return '<span class="popovertext-' + lang + '">' + text + '</span>'
  }
  
  getTdFromToken(siglum, token, popoverClass, showNormalization = false) {

    // deal quickly with empty tokens
    if (token.empty) {
      return '<td class="' + token.classes.join(' ') + '">'+ token.text + '</td>'
    }

    // if there's already html defined in the token, return that
    // (normally not used)
    if (typeof(token.html) !== 'undefined') {
      if (token.html !== '') {
        return '<td>' + token.html + '</td>'
      }
    }


    let html = ''
    let lang = this.options.lang

    // language class
    token.classes.push(lang + '-td')

    let popoverHtml = ''
    // Add popover html if in token
    // (not used normally)
    if (typeof(token.popoverHtml) === 'string' ) {
      popoverHtml = token.popoverHtml
    }

    let mainTextElementClasses = token.classes
    mainTextElementClasses.push(popoverClass)
    mainTextElementClasses.push(lang + '-td')

    let popoverHeading = ''
    let mainTextHtml = ''
    let mainTextElement= ''
    let itemsPopoverHtml = ''

    if (token.itemFormats.length === 1) {
      // simplest case, only one item
      if (showNormalization) {
        mainTextHtml = token.norm
        popoverHeading = this.getPopoverTextSpan(token.norm, lang)
        if (token.norm !== token.text)  {
          popoverHeading += '<br/>'
          popoverHeading += ' + ' + token.text
        }
      } else {
        mainTextHtml = token.text
        popoverHeading = this.getPopoverTextSpan(token.text, lang)
        if (token.norm !== token.text)  {
          popoverHeading += '<br/>'
          popoverHeading += ' &equiv; ' + token.norm
        }
      }

      itemsPopoverHtml = token.itemFormats[0]['popoverHtml']
      if (itemsPopoverHtml === '') {
        itemsPopoverHtml = 'Normal text'
      }
      let itemClasses = token.itemFormats[0]['classes']
      for(const itemClass of itemClasses) {
        mainTextElementClasses.push(itemClass)
      }

    } else {
      //multi-item token
      if (showNormalization) {
        mainTextHtml = token.norm
        popoverHeading = this.getPopoverTextSpan(token.norm, lang)
        if (token.norm !== token.text)  {
          popoverHeading += '<br/>'
          popoverHeading += ' + ' + token.norm
        }
      } else {
        mainTextHtml = ''
        popoverHeading = this.getPopoverTextSpan(token.text, lang)
        if (token.norm !== token.text)  {
          popoverHeading += '<br/>'
          popoverHeading += ' &equiv; ' + token.norm
        }
      }

      let collectedItemText = ''
      let lineBreakInText = false
      let textWithDashes = ''
      for(const itemFormat of token.itemFormats) {
        let itemText = itemFormat.text
        if (itemText === "\n") {
          lineBreakInText = true
          textWithDashes += '&ndash;'
          continue
        }
        let classes = itemFormat.classes
        let itemPopoverHtml = itemFormat.popoverHtml
        if (itemPopoverHtml === '') {
          itemPopoverHtml = 'Normal text'
        }

        itemPopoverHtml = '<p>' + this.getPopoverTextSpan(itemFormat.text, this.options.lang)+ '<ul>' + itemPopoverHtml + '</ul></p>'
        collectedItemText += itemText
        textWithDashes += itemText
        if (!showNormalization) {
          mainTextHtml += '<span class=">'  + classes.join(' ') + '">' + itemText + '</span>'
        }
        itemsPopoverHtml += itemPopoverHtml
      }
      if (lineBreakInText) {
        popoverHeading += '<br/>'
        popoverHeading += '<span class="textwithdashes"> = ' + textWithDashes + '</span>'
      }
    }

    popoverHtml = '<p class="popoverheading popover-' +  lang + '">' +  popoverHeading + '</p>' + '<div class="itemspopover popover-' + lang + '">' + itemsPopoverHtml + '</div>'
    if (typeof(token.addressHtml) !== 'undefined') {
      popoverHtml += '<p class="popoveraddress">'
      popoverHtml += token.addressHtml
      popoverHtml += '</p>'
    }

    let filteredTokenClasses = this.getTokenClasses(mainTextElementClasses, this.options.highlightVariants)
   
    let elementType = 'td';
    if (token.postNotes.length > 0) { 
      elementType = 'span'
    }
    html += '<' + elementType + ' class="' + filteredTokenClasses.join(' ') + '"' 
    html += 'data-content=\'' + this.escapeHtml(popoverHtml) + '\''
    html += '>'
    html += mainTextHtml
    if (showNormalization && mainTextHtml !== token.text) {
      html += this.normalizationPostfix
    }
    if (token.lineBreak) {
      html += this.newLineHtml
    }
    html += '</' + elementType + '>'
    
    if (token.postNotes.length > 0) {
      html = '<td>' + html + '&nbsp;'
      for(const noteHtml of token.postNotes) {
        html += noteHtml
      }
      html += '</td>'
    }
   
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
 
  escapeHtml (string) {
    let entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
      return entityMap[s];
    })
  }
 
  addAddressesToPopoverHtml(token, popoverHtml) {
   
    let html = ''
    if (typeof(popoverHtml) !== 'undefined') {
      html += popoverHtml
    }
    if (typeof(token.addressHtml) !== 'undefined') {
      html += '<p class="popoveraddress">'
      html += token.addressHtml
      html += '</p>'
    }

    return html
  }
 

 
}
