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

/* global PageRange, FOLIATION_RECTOVERSO, FOLIATION_CONSECUTIVE */

class DefPagesDefAll {
  
  
  constructor (numPages, htmIdPrefix = 'dap-', docId, urlGenerator) {

    this.numPages = numPages
    this.prefix = '#' + htmIdPrefix
    this.docId = docId
    this.pathFor = urlGenerator
    
    this.updating = false
    
    this.rangeSepString = ' &ndash; '

    this.dapForm = $(this.prefix + 'form')
    this.firstTextPageField = $(this.prefix + 'ftp')
    this.lastTextPageField = $(this.prefix + 'ltp')
    this.frontMatterRangeLabel = $(this.prefix + 'fm-label')
    this.backMatterRangeLabel = $(this.prefix + 'bm-label')
    this.textPagesRangeLabel = $(this.prefix + 'tp-label')
    this.createColsCheckbox = $(this.prefix + 'createcols')
    this.colsField = $(this.prefix + 'cols')
    this.overwritePageTypesCheckbox = $(this.prefix + 'overwrite-pt')
    this.foliateFrontBackMatterCheckbox = $(this.prefix + 'foliate-fbm')
    this.foliateFrontBackMatterLabelGroup = $(this.prefix + 'fmbm-foliation')
    this.frontMatterFoliationLabel = $(this.prefix + 'fm-foliation-label')
    this.backMatterFoliationLabel = $(this.prefix + 'bm-foliation-label')
    this.foliateTextPagesCheckbox = $(this.prefix + 'foliate-tp')
    this.textPagesFoliationLabelGroup = $(this.prefix + 'tp-foliation')
    this.textPagesFoliationLabel = $(this.prefix + 'tp-foliation-label')
    
    this.overwriteFoliationFormGroup = $(this.prefix + 'overwrite-f-fg')
    this.overwriteFoliationCheckbox = $(this.prefix + 'overwrite-f')
    this.submitButton = $(this.prefix + 'submit-button')
    this.statusSpan = $(this.prefix + 'status')

    this.lastTextPageField.val(this.numPages)

    this.overwritePageTypesCheckbox.on('click', this.genCheckFormFunction())
    this.firstTextPageField.on('click', this.genCheckFormFunction())
    this.firstTextPageField.on('focusout', this.genCheckFormFunction())
    this.lastTextPageField.on('click', this.genCheckFormFunction())
    this.lastTextPageField.on('focusout', this.genCheckFormFunction())
    this.overwriteFoliationCheckbox.on('click', this.genCheckFormFunction())
    this.foliateFrontBackMatterCheckbox.on('click', this.genCheckFormFunction())
    this.foliateTextPagesCheckbox.on('click', this.genCheckFormFunction())
    this.colsField.on('click', this.genCheckFormFunction())
    this.createColsCheckbox.on('click', this.genCheckFormFunction())
    
    this.submitButton.on('click', this.genSubmitChangesFunction())
    
    this.foliateFrontBackMatterLabelGroup.hide()
    this.foliateFrontBackMatterLabelGroup.removeClass('hidden')
    this.textPagesFoliationLabelGroup.hide()
    this.textPagesFoliationLabelGroup.removeClass('hidden')
    this.overwriteFoliationFormGroup.hide()
    this.overwriteFoliationFormGroup.removeClass('hidden')
    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
       
  }
  
   genCheckFormFunction (){
     let thisObject = this
      return function(e) {
        let fp = parseInt(thisObject.firstTextPageField.val())
        if ( fp < 1) {
          thisObject.firstTextPageField.val(1)
          fp = 1
        }
        
        let lp = parseInt(thisObject.lastTextPageField.val())
        if (lp > thisObject.numPages) {
          thisObject.lastTextPageField.val(thisObject.numPages)
          lp = thisObject.numPages
        }
        if (parseInt(thisObject.lastTextPageField.val()) < fp) {
          thisObject.lastTextPageField.val(fp)
          lp = fp
        }
        
        if (parseInt(thisObject.colsField.val()) < 1) {
          thisObject.colsField.val(1)
        }
        
        let frontMatterRange = new PageRange(1, fp-1, thisObject.numPages)
        let textPagesRange = new PageRange(fp, lp, thisObject.numPages)
        let backMatterRange = new PageRange(lp+1, thisObject.numPages, thisObject.numPages)
        
        thisObject.frontMatterRangeLabel.html(frontMatterRange.toString())
        thisObject.backMatterRangeLabel.html(backMatterRange.toString())
        thisObject.textPagesRangeLabel.html(textPagesRange.toString())
        
        if (frontMatterRange.isEmpty() && backMatterRange.isEmpty()) {
          thisObject.foliateFrontBackMatterCheckbox.prop('checked', false)
          thisObject.foliateFrontBackMatterCheckbox.prop('disabled', true)
        } else {
          thisObject.foliateFrontBackMatterCheckbox.prop('disabled', false)
        }
        
        if (thisObject.foliateTextPagesCheckbox.is(":checked") ){
          thisObject.overwriteFoliationFormGroup.show()
          thisObject.textPagesFoliationLabelGroup.show()
          thisObject.textPagesFoliationLabel.html(
                  textPagesRange.toString() + ' &rArr; ' +
                  textPagesRange.toStringWithFoliation('', ' - ', '', FOLIATION_RECTOVERSO, 1))
        } else {
          thisObject.overwriteFoliationFormGroup.hide()
          thisObject.textPagesFoliationLabelGroup.hide()
        }
        
        if (thisObject.foliateFrontBackMatterCheckbox.is(":checked")) {
          if (!frontMatterRange.isEmpty()) {
            thisObject.frontMatterFoliationLabel.html(
                  frontMatterRange.toString() + ' &rArr; ' +
                  frontMatterRange.toStringWithFoliation('', ' - ', '', FOLIATION_CONSECUTIVE, 1, 'x') +
                  '<br/>'
                    )
          } else {
            thisObject.frontMatterFoliationLabel.html('')
          }
          if (!backMatterRange.isEmpty()) {
            thisObject.backMatterFoliationLabel.html(
                  backMatterRange.toString() + ' &rArr; ' +
                  backMatterRange.toStringWithFoliation('', ' - ', '', FOLIATION_CONSECUTIVE, frontMatterRange.getLength()+1, 'x')
                    )
          } else {
            thisObject.backMatterFoliationLabel.html('')
          }
          thisObject.overwriteFoliationFormGroup.show()
          thisObject.foliateFrontBackMatterLabelGroup.show()
        } else {
          thisObject.foliateFrontBackMatterLabelGroup.hide()
        }
        
        if (thisObject.foliateTextPagesCheckbox.is(":checked") || 
              thisObject.foliateFrontBackMatterCheckbox.is(":checked") ||
              thisObject.createColsCheckbox.is(":checked") ||
              thisObject.overwritePageTypesCheckbox.is(":checked")){
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
      let fp = parseInt(thisObject.firstTextPageField.val())
      let lp = parseInt(thisObject.lastTextPageField.val())
      let frontMatterRange = new PageRange(1, fp-1, thisObject.numPages)
      let textPagesRange = new PageRange(fp, lp, thisObject.numPages)
      let backMatterRange = new PageRange(lp+1, thisObject.numPages, thisObject.numPages)

      let overwriteTypes = thisObject.overwritePageTypesCheckbox.is(":checked")
      let foliateFrontBackMatter = thisObject.foliateFrontBackMatterCheckbox.is(":checked")
      let foliateTextPages = thisObject.foliateTextPagesCheckbox.is(":checked")
      let overwriteFoliation = thisObject.overwriteFoliationCheckbox.is(":checked")
      let createCols = thisObject.createColsCheckbox.is(":checked")
      
      let pageDefs = []
      for (const page of frontMatterRange.toArray()) {
        let thePageDef = { 
          docId: thisObject.docId, 
          page: page
        }
        if (overwriteTypes) {
          thePageDef.type = 2
        }

        if (foliateFrontBackMatter) {
          thePageDef.foliation = frontMatterRange.foliate(page, FOLIATION_CONSECUTIVE, 1, 'x')
          thePageDef.overwriteFoliation = overwriteFoliation
        }
        pageDefs.push(thePageDef)
      }
      
      for (const page of textPagesRange.toArray()) {
        let thePageDef = { 
          docId: thisObject.docId, 
          page: page
        }
        if (overwriteTypes) {
          thePageDef.type = 1
        }

        if (foliateTextPages) {
          thePageDef.foliation = textPagesRange.foliate(page, FOLIATION_RECTOVERSO, 1)
          thePageDef.overwriteFoliation = overwriteFoliation
        }
        
        if (createCols) {
          thePageDef.cols = parseInt(thisObject.colsField.val())
        }
        pageDefs.push(thePageDef)
      }
      
      for (const page of backMatterRange.toArray()) {
        let thePageDef = { 
          docId: thisObject.docId, 
          page: page
        }
        if (overwriteTypes) {
          thePageDef.type = 3
        }

        if (foliateFrontBackMatter) {
          thePageDef.foliation = backMatterRange.foliate(page, 
              FOLIATION_CONSECUTIVE, 
              frontMatterRange.getLength()+1, 
              'x')
          thePageDef.overwriteFoliation = overwriteFoliation
        }
        pageDefs.push(thePageDef)
      }
      
      thisObject.statusSpan.html('Updating, this might take a few seconds ... <i class="fa fa-refresh fa-spin"></i>')
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

