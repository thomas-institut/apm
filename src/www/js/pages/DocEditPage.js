/* 
 *  Copyright (C) 2019-23 Universität zu Köln
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


import { NormalPage } from './NormalPage'
import { tr } from './common/SiteLang'
import { ApmPage } from './ApmPage'
import { urlGen } from './common/SiteUrlGen'
import { OptionsChecker } from '@thomas-inst/optionschecker'

export class DocEditPage extends NormalPage {

  constructor(options,  prefix, docInfo, docEditApiUrl, cancelUrl, deleteUrl, successDeleteUrl) {

    super(options);

    let oc = new OptionsChecker({
      context: 'DocEditPage',
      optionsDefinition: {
        docInfo: { type: 'object'}
      }
    })

    this.docInfoFields = ['title', 'doc_type', 'lang', 'image_source', 'image_source_data']
    
    this.docInfo = docInfo
    this.docEditApiUrl = docEditApiUrl
    this.apiDeleteUrl = deleteUrl
    this.successDeleteUrl = successDeleteUrl
    
    this.titleField = $('#' + prefix + '-title')
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
    this.typeSelect.on('change', this.genCheckFormFunction())
    this.langSelect.on('change', this.genCheckFormFunction())
    this.imageSourceSelect.on('change', this.genCheckFormFunction())
    this.imageSourceDataField.on('keyup', this.genCheckFormFunction())
    
    
    this.submitButton.on('click', this.genSubmitFunction())
    this.resetButton.on('click', this.genResetFunction())
    this.cancelButton.on('click',  ()=> {
      if (this.updating) {
        return;
      }
      location.replace(cancelUrl);
    });
    this.deleteButton.on('click', this.genDeleteFunction())
    
    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
    this.resetButton.hide()
    this.resetButton.removeClass('hidden')
    this.updating = false

    this.initPage().then( () => {
      console.log('DocEditPage Initialized')
    })
  }

  async genContentHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label: 'Document Details', active: true}
    ])
    return `<h1>${tr('<h1>Edit Document Settings</h1>')}</h1>
        <div class="people-page-content">${ApmPage.genLoadingMessageHtml()}</div>`;
  }
  
  genSubmitFunction() {
    return () => {
      if (this.updating) {
        return;
      }
      let newInfo = this.getDocInfoFromForm();
      if (this.docInfosAreDifferent(this.docInfo, newInfo)) {
        this.updating = true;
        let currentSubmitButtonHtml = this.submitButton.html();
        this.submitButton.html(`Applying changes... <i class="fa fa-spinner fa-spin fa-fw">`);
        $.post(
          this.docEditApiUrl,
          { data: JSON.stringify(newInfo) }
        )
        .done( () => {
          this.statusDiv.html("Updating... done");
          this.updating = false;
          location.replace('');
        })
        .fail((resp) => {
          this.statusDiv.html("Updating... fail with error code " + resp.status + ' :(');
          this.updating = false;
          this.submitButton.html(currentSubmitButtonHtml);
        })
        return true;
      }
      this.statusDiv.html('<div class="alert alert-info>No changes, nothing to do</div>');
    }
  }
  
  genDeleteFunction() {
    return ()=> {
      this.alertModalTitle.html('Please confirm');
      this.alertModalSubmitButton.html('Delete Document');
      this.alertModalCancelButton.html('Cancel');
      this.alertModalText.html(`<p>Are you sure you want to delete this document?</p> 
                      <p class="text-danger">This can NOT be undone!`);
      this.alertModalSubmitButton.off();
      this.alertModalSubmitButton.on('click',  ()=> {
        $.get(this.apiDeleteUrl).done( ()=> {
          this.statusDiv.html("Delete... done");
          location.replace(this.successDeleteUrl);
         }).fail((resp) => {
          this.statusDiv.html("Delete... fail with error code " + resp.status + ' :(');
        });
        return true;
      });
      this.alertModal.modal('show');
    }
  }
  
  genResetFunction( ){
    return () => {
      if (this.updating) {
        return;
      }
      let newInfo = this.getDocInfoFromForm();
      if (this.docInfosAreDifferent(this.docInfo, newInfo)) {
        this.putDocInfoIntoForm(this.docInfo);
        this.resetButton.hide();
        this.submitButton.hide();
      }
    }
  }
  
  genCheckFormFunction( ){
    return () => {
      let newInfo = this.getDocInfoFromForm();
      if (!newInfo['title'].replace(/\s/g, '').length) {
        this.titleStatusDiv.html(`<p class="text-danger">
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Title can\'t be empty</p>`);
        this.resetButton.hide();
        this.submitButton.hide();
        return true;
      } else {
        this.titleStatusDiv.html('');
      }
      
      if (this.docInfosAreDifferent(this.docInfo, newInfo)) {
        this.resetButton.show();
        this.submitButton.show();
        return true;
      }
      this.resetButton.hide();
      this.submitButton.hide();
    }
  }
  
  docInfosAreDifferent(oldInfo, newInfo) {
    let changeInInfo = false;
    for (const f of this.docInfoFields) {
      if (oldInfo[f] !== newInfo[f]) {
        changeInInfo = true;
        break;
      }
    }
    return changeInInfo;
  }
   
  getDocInfoFromForm()
  {
     return {
       title: this.titleField.val().trim(),
       doc_type: this.typeSelect.val(),
       lang: this.langSelect.val(),
       image_source: this.imageSourceSelect.val(),
       image_source_data: this.imageSourceDataField.val().trim()
     }
  }
  
  putDocInfoIntoForm(docInfo)
  {
    this.titleField.val(docInfo['title']);
    this.typeSelect.val(docInfo['doc_type']);
    this.langSelect.val(docInfo['lang']);
    this.imageSourceSelect.val(docInfo['image_source']);
    this.imageSourceDataField.val(docInfo['image_source_data']);
  }
}

// make global

window.DocEditPage = DocEditPage