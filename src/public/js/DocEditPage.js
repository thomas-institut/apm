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

class DocEditPage {
  
  
  constructor(prefix, docInfo, docEditApiUrl, cancelUrl, deleteUrl, successDeleteUrl) {
    
    this.docInfoFields = ['title', 'short_title', 'doc_type', 'lang', 'image_source', 'image_source_data']
    
    this.docInfo = docInfo
    this.docEditApiUrl = docEditApiUrl
    this.apiDeleteUrl = deleteUrl
    this.successDeleteUrl = successDeleteUrl
    
    this.titleField = $('#' + prefix + '-title')
    this.shortTitleField = $('#' + prefix + '-shorttitle')
    this.typeSelect = $('#' + prefix + '-type')
    this.langSelect = $('#' + prefix + '-lang')
    this.imageSourceSelect = $('#' + prefix + '-imagesource')
    this.imageSourceDataField = $('#' + prefix + '-imagesourcedata')
    this.submitButton = $('#' + prefix + '-submit')
    this.cancelButton = $('#' + prefix + '-cancel')
    this.resetButton = $('#' + prefix + '-reset')
    this.deleteButton = $('#' + prefix + '-delete')
    this.statusDiv = $('#' + prefix + '-status')
    this.titleStatusDiv = $('#' + prefix + '-titlestatus')
    
    this.alertModal = $('#' + prefix + '-alert-modal')
    this.alertModalTitle = $('#' + prefix + '-alert-modal-title')
    this.alertModalSubmitButton = $('#' + prefix + '-alert-modal-submit-button')
    this.alertModalCancelButton = $('#' + prefix + '-alert-modal-cancel-button')
    this.alertModalText = $('#' + prefix + '-alert-modal-text')
    
    this.titleField.on('keyup', this.genCheckFormFunction())
    this.shortTitleField.on('keyup', this.genCheckFormFunction())
    this.typeSelect.on('change', this.genCheckFormFunction())
    this.langSelect.on('change', this.genCheckFormFunction())
    this.imageSourceSelect.on('change', this.genCheckFormFunction())
    this.imageSourceDataField.on('keyup', this.genCheckFormFunction())
    
    
    this.submitButton.on('click', this.genSubmitFunction())
    this.resetButton.on('click', this.genResetFunction())
    this.cancelButton.on('click', function (){ location.replace(cancelUrl)})
    this.deleteButton.on('click', this.genDeleteFunction())
    
    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
    this.resetButton.hide()
    this.resetButton.removeClass('hidden')
  }
  
  genSubmitFunction() {
    let thisObject = this
    return function() {
      let newInfo = thisObject.getDocInfoFromForm()
      if (thisObject.docInfosAreDifferent(thisObject.docInfo, newInfo)) {
        $.post(
          thisObject.docEditApiUrl, 
          { data: JSON.stringify(newInfo) }
        )
        .done(function () { 
          thisObject.statusDiv.html("Updating... done")
          thisObject.updating = false
          location.replace('')
        })
        .fail(function(resp) {
          thisObject.statusDiv.html("Updating... fail with error code " + resp.status + ' :(')
          thisObject.updating = false
        })
        return true
      }
      thisObject.statusDiv.html('<div class="alert alert-info>No changes, nothing to do</div>')
    }
  }
  
  genDeleteFunction() {
    let thisObject = this
    return function() {
      thisObject.alertModalTitle.html('Please confirm')
      thisObject.alertModalSubmitButton.html('Delete Document')
      thisObject.alertModalCancelButton.html('Cancel')
      thisObject.alertModalText.html(
                      'Are you sure you want to delete this document?</p>'+ 
                      '<p class="text-danger">This can NOT be undone!')
      thisObject.alertModalSubmitButton.off()
      thisObject.alertModalSubmitButton.on('click', function () {
        $.get(
          thisObject.apiDeleteUrl
        )
        .done(function () { 
          thisObject.statusDiv.html("Delete... done")
          location.replace(thisObject.successDeleteUrl)
         })
        .fail(function(resp) {
          thisObject.statusDiv.html("Delete... fail with error code " + resp.status + ' :(')
        })
        return true
      })
      thisObject.alertModal.modal('show')
    }
  }
  
  genResetFunction( ){
    let thisObject = this
    return function() {
      let newInfo = thisObject.getDocInfoFromForm()
      if (thisObject.docInfosAreDifferent(thisObject.docInfo, newInfo)) {
        thisObject.putDocInfoIntoForm(thisObject.docInfo)
        thisObject.resetButton.hide()
        thisObject.submitButton.hide()
      }
    }
  }
  
  genCheckFormFunction( ){
    let thisObject = this
    return function() {
      let newInfo = thisObject.getDocInfoFromForm()
      if (!newInfo['title'].replace(/\s/g, '').length) {
        thisObject.titleStatusDiv.html('<p class="text-danger"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Title can\'t be empty</p>')
        thisObject.resetButton.hide()
        thisObject.submitButton.hide()
        return true
      } else {
        thisObject.titleStatusDiv.html('')
      }
      
      if (thisObject.docInfosAreDifferent(thisObject.docInfo, newInfo)) {
        thisObject.resetButton.show()
        thisObject.submitButton.show()
        return true
      }
      thisObject.resetButton.hide()
      thisObject.submitButton.hide()
    }
  }
  
  docInfosAreDifferent(oldInfo, newInfo) {
    let changeInInfo = false
    for (const f of this.docInfoFields) {
      if (oldInfo[f] !== newInfo[f]) {
        changeInInfo = true
        break
      }
    }
    return changeInInfo
    
  }
   
  getDocInfoFromForm()
  {
     let docInfo = {}
     
     docInfo['title'] = this.titleField.val().trim()
     docInfo['short_title'] = this.shortTitleField.val().trim()
     docInfo['doc_type'] = this.typeSelect.val()
     docInfo['lang'] = this.langSelect.val()
     docInfo['image_source'] = this.imageSourceSelect.val()
     docInfo['image_source_data'] = this.imageSourceDataField.val().trim()
     
     return docInfo
  }
  
  putDocInfoIntoForm(docInfo)
  {
    this.titleField.val(docInfo['title'])
    this.shortTitleField.val(docInfo['short_title'])
    this.typeSelect.val(docInfo['doc_type'])
    this.langSelect.val(docInfo['lang'])
    this.imageSourceSelect.val(docInfo['image_source'])
    this.imageSourceDataField.val(docInfo['image_source_data'])
  }
  
}
