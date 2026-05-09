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


import { PageRange } from './PageRange'
import * as FoliationType from './constants/FoliationType'
import { PageTypes } from './constants/PageTypes'
import { PageTypeText } from './constants/Entity'

export class DefPagesDefRange {
  
  
  constructor (numPages, htmIdPrefix, docId, pageTypes, urlGenerator) {

    this.numPages = numPages
    this.prefix = '#' + htmIdPrefix
    this.docId = docId
    this.pathFor = urlGenerator

    console.log(`Num pages: ${numPages}`)
    
    this.updating = false

    this.foliationTypeStringToInt = {
      'c' : FoliationType.FOLIATION_CONSECUTIVE,
      'rv' : FoliationType.FOLIATION_RECTOVERSO,
      'lr' : FoliationType.FOLIATION_LEFTRIGHT,
      'ab' : FoliationType.FOLIATION_AB
    }
    
    this.dapForm = $(this.prefix + 'form')
    this.firstPageField = $(this.prefix + 'fp')
    this.lastPageField = $(this.prefix + 'lp')
    //this.overwriteTypeFormGroup = $(this.prefix + 'overwritetype-fg')
    this.overwriteTypeCheckbox = $(this.prefix + 'overwritetype')
    this.setPageTypeCheckbox = $(this.prefix + 'settype')
    this.pageTypesSelect = $(this.prefix + 'pagetypes-select')
    this.foliateCheckbox = $(this.prefix + 'foliate')
    this.overwriteFoliationFormGroup = $(this.prefix + 'overwritef-fg')
    this.overwriteFoliationCheckbox = $(this.prefix + 'overwritef')
    this.reverseFoliationFormGroup = $(this.prefix + 'reverse-f-fg')
    this.reverseFoliationCheckbox =  $(this.prefix + 'reverse-f')
    this.foliationLabel = $(this.prefix + 'foliation-label')
    this.foliationTypeSelect = $(this.prefix + 'foliation-type-select')
    this.foliationStartField = $(this.prefix + 'startnum')
    this.foliationPrefixField = $(this.prefix + 'prefix')
    this.foliationSuffixField = $(this.prefix + 'suffix')
    this.colsField = $(this.prefix + 'cols')
    this.createColsCheckbox = $(this.prefix + 'createcols')
    this.statusSpan = $(this.prefix + 'status')
    this.submitButton = $(this.prefix + 'submit-button')

    this.lastPageField.val(this.numPages)
    
    this.firstPageField.on('click', this.genCheckFormFunction())
    this.lastPageField.on('click', this.genCheckFormFunction())
    this.setPageTypeCheckbox.on('click', this.genCheckFormFunction())
    this.foliateCheckbox.on('click', this.genCheckFormFunction())
    this.reverseFoliationCheckbox.on('click', this.genCheckFormFunction())
    this.foliationTypeSelect.on('click', this.genCheckFormFunction())
    this.foliationStartField.on('click', this.genCheckFormFunction())
    this.foliationStartField.on('keyup', this.genCheckFormFunction())
    this.foliationPrefixField.on('keyup', this.genCheckFormFunction())
    this.foliationSuffixField.on('keyup', this.genCheckFormFunction())
    this.colsField.on('click', this.genCheckFormFunction())
    this.createColsCheckbox.on('click', this.genCheckFormFunction())
    
    this.submitButton.on('click', this.genSubmitChangesFunction())
    
    
    // Fill up types in drop down menu
    let optionsType = ''
    for (let i = 0; i < PageTypes.length; i++) {
      let pageTypeDef = PageTypes[i];
      let selected = pageTypeDef.id === PageTypeText ? 'selected' : '';
      optionsType += `<option value="${pageTypeDef.id}" ${selected}>${pageTypeDef.name}</option>`
    }

    this.pageTypesSelect.html(optionsType)

    // Remove 'hidden' class from elements
    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
//    this.overwriteTypeFormGroup.hide()
//    this.overwriteTypeFormGroup.removeClass('hidden')
    this.overwriteFoliationFormGroup.hide()
    this.overwriteFoliationFormGroup.removeClass('hidden')
    this.foliationLabel.hide()
    this.foliationLabel.removeClass('hidden')
    this.reverseFoliationFormGroup.removeClass('hidden').hide()
  }
  
   genCheckFormFunction (){
     let thisObject = this
      return () => {
        let fp = this.firstPageField.val() * 1
        if ( fp < 1) {
          thisObject.firstPageField.val(1)
          fp = 1
        }
        
        let lp = thisObject.lastPageField.val() * 1
        if (lp > thisObject.numPages) {
          thisObject.lastPageField.val(thisObject.numPages)
          lp = thisObject.numPages
        }
        if (thisObject.lastPageField.val() < fp) {
          thisObject.lastPageField.val(fp)
          lp = fp
        }
        
        if (parseInt(thisObject.colsField.val()) < 1) {
          thisObject.colsField.val(1)
        }
        
        if ( parseInt(thisObject.foliationStartField.val()) < 1) {
          thisObject.foliationStartField.val(1)
        }
        
        let pagesRange = new PageRange(fp, lp, thisObject.numPages)

        if(thisObject.foliateCheckbox.is(':checked')) {
          thisObject.overwriteFoliationFormGroup.show()
          thisObject.reverseFoliationFormGroup.show()
          let foliationTypeString = thisObject.foliationTypeSelect.val()

          let foliationType = thisObject.foliationTypeStringToInt[foliationTypeString]
          let prefix = thisObject.foliationPrefixField.val().replace(/\s+/g, '')
          let suffix = thisObject.foliationSuffixField.val().replace(/\s+/g, '')
          let reverse = thisObject.reverseFoliationCheckbox.is(':checked')
          thisObject.foliationLabel.html(
                  pagesRange.toString() + ' &rArr; ' +
                  pagesRange.toStringWithFoliation('', ' - ', '', 
                      foliationType, 
                      parseInt(thisObject.foliationStartField.val()), prefix, suffix, reverse))
          thisObject.foliationLabel.show()

        } else {
          thisObject.overwriteFoliationFormGroup.hide()
          thisObject.foliationLabel.hide()
          thisObject.reverseFoliationFormGroup.hide()
        }
        
        if(thisObject.setPageTypeCheckbox.is(':checked') ||
                thisObject.createColsCheckbox.is(":checked") ||
                thisObject.foliateCheckbox.is(':checked') ) {
          thisObject.submitButton.show()
        } else {
          thisObject.submitButton.hide()
        }
        
      }
  }
  
  genSubmitChangesFunction() {
    let thisObject = this
    return function () {
      if (thisObject.updating) {
        return false
      }
      let fp = parseInt(thisObject.firstPageField.val())
      let lp = parseInt(thisObject.lastPageField.val())
      let textPagesRange = new PageRange(fp, lp, thisObject.numPages)
      
      let setPageTypes = thisObject.setPageTypeCheckbox.is(':checked')
      let foliateTextPages = thisObject.foliateCheckbox.is(':checked')
      let overwriteFoliation = thisObject.overwriteFoliationCheckbox.is(':checked')
      let createCols = thisObject.createColsCheckbox.is(":checked")
      let reverse = thisObject.reverseFoliationCheckbox.is(':checked')
      
      let pageDefs = []
       
      for (const pageNumber of textPagesRange.toArray()) {
        let thePageDef = { 
          docId: thisObject.docId, 
          page: pageNumber
        }
        if (setPageTypes) {
          thePageDef.type = thisObject.pageTypesSelect.val()
        }
        
        if (createCols) {
          thePageDef.cols = parseInt(thisObject.colsField.val())
        }

        if (foliateTextPages) {
          let foliationTypeString = thisObject.foliationTypeSelect.val()
          let foliationType = thisObject.foliationTypeStringToInt[foliationTypeString]
          let prefix = thisObject.foliationPrefixField.val().replace(/\s+/g, '')
          let suffix = thisObject.foliationSuffixField.val().replace(/\s+/g, '')
          thePageDef.foliation = textPagesRange.foliate(pageNumber,
              foliationType, 
              parseInt(thisObject.foliationStartField.val()), 
              prefix, 
              suffix, reverse )
          thePageDef.overwriteFoliation = overwriteFoliation
        }
        pageDefs.push(thePageDef)
      }
      
      thisObject.statusSpan.html('Updating, this might take a few seconds ... <i class="fa fa-refresh fa-spin"></i>')
      //console.log(pageDefs)
      thisObject.updating = true
      
      $.post(
        thisObject.pathFor.apiBulkPageSettings(),
        { data: JSON.stringify(pageDefs) }
      )
      .done(function () {
        thisObject.statusSpan.html("Updating... done")
        thisObject.updating = false
        location.replace('')
      })
      .fail(function(resp) {
        thisObject.statusSpan.html("Updating... fail with error code " + resp.status + ' :(')
        thisObject.updating = false
      })
    }
  }

}

