/*
 * Copyright (C) 2017 Universität zu Köln
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

/* global PageRange, FOLIATION_RECTOVERSO, FOLIATION_CONSECUTIVE, ApiUrl */

class DefPagesDefRange {
  
  
  constructor (numPages, htmIdPrefix, docId, pageTypes) {

    this.numPages = numPages
    this.prefix = '#' + htmIdPrefix
    this.docId = docId
    
    this.updating = false
    
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
    this.foliationLabel = $(this.prefix + 'foliation-label')
    this.foliationTypeSelect = $(this.prefix + 'foliation-type-select')
    this.foliationStartField = $(this.prefix + 'startnum')
    this.foliationPrefixField = $(this.prefix + 'prefix')
    this.foliationSuffixField = $(this.prefix + 'suffix')
    this.colsField = $(this.prefix + 'cols')
    this.createColsCheckbox = $(this.prefix + 'createcols')
    this.statusSpan = $(this.prefix + 'status')
    this.submitButton = $(this.prefix + 'submit-button')
    
    this.firstPageField.on('click', this.genCheckFormFunction())
    this.lastPageField.on('click', this.genCheckFormFunction())
    this.setPageTypeCheckbox.on('click', this.genCheckFormFunction())
    this.foliateCheckbox.on('click', this.genCheckFormFunction())
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
    for (const type of pageTypes) {
      optionsType += '<option value="' + type.id + '"'
      if (1 === parseInt(type.id)) {
        optionsType += ' selected'
      }
      optionsType += '>' + type.descr + '</option>'
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
  }
  
   genCheckFormFunction (){
     let thisObject = this
      return function(e) {
        let fp = parseInt(thisObject.firstPageField.val())
        if ( fp < 1) {
          thisObject.firstPageField.val(1)
          fp = 1
        }
        
        let lp = parseInt(thisObject.lastPageField.val())
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
          let foliationTypeString = thisObject.foliationTypeSelect.val()
          let foliationType = FOLIATION_RECTOVERSO
          if (foliationTypeString === 'c') {
            foliationType = FOLIATION_CONSECUTIVE
          }
          let prefix = thisObject.foliationPrefixField.val().replace(/\s+/g, '')
          let suffix = thisObject.foliationSuffixField.val().replace(/\s+/g, '')
          thisObject.foliationLabel.html(
                  pagesRange.toString() + ' &rArr; ' +
                  pagesRange.toStringWithFoliation('', ' - ', '', 
                      foliationType, 
                      parseInt(thisObject.foliationStartField.val()), prefix, suffix ))
          thisObject.foliationLabel.show()
        } else {
          thisObject.overwriteFoliationFormGroup.hide()
          thisObject.foliationLabel.hide()
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
      
      let pageDefs = []
       
      for (const page of textPagesRange.toArray()) {
        let thePageDef = { 
          docId: thisObject.docId, 
          page: page
        }
        if (setPageTypes) {
          thePageDef.type = thisObject.pageTypesSelect.val()
        }
        
        if (createCols) {
          thePageDef.cols = parseInt(thisObject.colsField.val())
        }

        if (foliateTextPages) {
          let foliationTypeString = thisObject.foliationTypeSelect.val()
          let foliationType = FOLIATION_RECTOVERSO
          if (foliationTypeString === 'c') {
            foliationType = FOLIATION_CONSECUTIVE
          }
          let prefix = thisObject.foliationPrefixField.val().replace(/\s+/g, '')
          let suffix = thisObject.foliationSuffixField.val().replace(/\s+/g, '')
          thePageDef.foliation = textPagesRange.foliate(page, 
              foliationType, 
              parseInt(thisObject.foliationStartField.val()), 
              prefix, 
              suffix )
          thePageDef.overwriteFoliation = overwriteFoliation
        }
        pageDefs.push(thePageDef)
      }
      
      thisObject.statusSpan.html('Updating, this might take a few seconds ... <i class="fa fa-refresh fa-spin"></i>')
      console.log(pageDefs)
      thisObject.updating = true
      
      $.post(
        ApiUrl.bulkPageSettings(), 
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

