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

  constructor(options) {

    super(options);

    let oc = new OptionsChecker({
      context: 'DocEditPage',
      optionsDefinition: {
        docInfo: { type: 'object'},
        canBeDeleted: {type: 'boolean'},
        prefix: { type: 'string', default: 'DocEdit'},
        languages: { type: 'array'},
        imageSources: { type: 'array'},
        docTypes: {type: 'array'}
      }
    });

    this.options = oc.getCleanOptions(options);

    console.log(`Options`);
    console.log(this.options);


    this.docInfoFields = ['title', 'doc_type', 'lang', 'image_source', 'image_source_data']
    this.prefix = this.options.prefix;
    this.docInfo = this.options.docInfo;
    this.docId = this.docInfo['id'];
    this.docEditApiUrl = urlGen.apiDocumentUpdate(this.docId);
    this.apiDeleteUrl = urlGen.apiDocumentDelete(this.docId);
    this.doneUrl = urlGen.siteDocs();
    this.docPageUrl = urlGen.siteDocPage(this.docId);
    


    this.initPage().then( () => {
      console.log('DocEditPage Initialized')
    })
  }

  async initPage() {
    await super.initPage();
    let prefix = this.prefix;
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
      location.replace(this.docPageUrl);
    });
    this.deleteButton.on('click', this.genDeleteFunction())

    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
    this.resetButton.hide()
    this.resetButton.removeClass('hidden')
    this.updating = false
  }

  async genContentHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label: this.docInfo['title'], url: urlGen.siteDocPage(this.docInfo.id)},
      { label: 'Document Details', active: true}
    ]);
    let docTypesOptions = this.options.docTypes.map( (docType) => {
      let [type, name] = docType;
      return `<option value="${type}" ${this.docInfo['doc_type'] === type ? 'selected' : ''}>${tr(name)}</option>`
    }).join('');
    let languagesOptions = this.options.languages.map( (langDef) => {
      return `<option value="${langDef['code']}" ${this.docInfo['lang'] === langDef['code'] ? 'selected' : ''}>${tr(langDef['name'])}</option>`
    }).join('');
    let imageSourcesOptions = this.options.imageSources.map((imageSource) => {
      return `<option value="${imageSource}" ${this.docInfo['image_source'] === imageSource ? 'selected' : ''}>${imageSource}</option>`
    }).join('');
    let deleteAreaHtml = this.options.canBeDeleted ?
      `<p class="text-warning">This document has never had any pages defined, it can be safely deleted.</p>
            <p><button type="button" class="btn btn-danger" id="${this.prefix}-delete">Delete This Document</button> </p>` :
      `<p class="text-warning">This document has pages defined, it cannot be deleted.</p>`;
    return `${breadcrumbHtml}
        <h1>${tr('Edit Document Settings')}</h1>
        <div class="row">
    <div class="col-md-8">    
<div class="with-margin-left-sm">
    <form id="${this.prefix}-form">
        <div id="${this.prefix}-id-fg" class="form-group">
            <label for="${this.prefix}-id" id="${this.prefix}-title-label" class="control-label">Doc Id:</label>
            ${this.docInfo.id}
        </div>
        <div id="${this.prefix}-title-fg" class="form-group">
            <label for="${this.prefix}-title" id="${this.prefix}-title-label" class="control-label">Title:</label>
            <input type="text" class="form-control" id="${this.prefix}-title" value="${this.docInfo['title']}"/>
        </div>
        <div id="${this.prefix}-titlestatus"></div>
        <div id="${this.prefix}-type-fg" class="form-group">
            <label for="${this.prefix}-type" id="${this.prefix}-type-label" class="control-label">Type:</label>
            <select id="${this.prefix}-type">${docTypesOptions}</select>
        </div>
        <div id="${this.prefix}-lang-fg" class="form-group">
            <label for="${this.prefix}-lang" id="${this.prefix}-lang-label" class="control-label">Language:</label>
            <select id="${this.prefix}-lang">${languagesOptions}</select>
        </div>
        <div id="${this.prefix}-imagesource-fg" class="form-group">
            <label for="${this.prefix}-imagesource" id="${this.prefix}-imagesource-label" class="control-label">Image Source:</label>
            <select id="${this.prefix}-imagesource">${imageSourcesOptions}</select>
        </div>
        <div id="${this.prefix}-imagesourcedata-fg" class="form-group">
            <label for="${this.prefix}-imagesourcedata" id="${this.prefix}-imagesourcedata-label" class="control-label">Image Source Data:</label>
            <input type="text" class="form-control" id="${this.prefix}-imagesourcedata" value="${this.docInfo['image_source_data']}"/>
        </div>
    </form>
    
    <button type="button" class="btn btn-primary" id="${this.prefix}-cancel">Cancel</button>
    <button type="button" class="btn btn-primary hidden" id="${this.prefix}-reset">Reset</button>
    <button type="button" class="btn btn-danger hidden" id="${this.prefix}-submit">Submit Changes</button>
    
    <div id="${this.prefix}-status"></div>
</div>
    </div>
</div>
    
<div class="row" style="margin-top: 50px">
    <div class="col-md-8">
    ${deleteAreaHtml} 
    </div>
</div>

<!-- ALERT modal -->             
<div id="${this.prefix}-alert-modal" class="modal" role="dialog">
    <div class="modal-dialog modal-sm " role="document">
        <div class="modal-content bg-info">
            <div class="modal-header">
                <h4 id="alert-modal-title">Please confirm</h4>
            </div>
            <div class="modal-body" id="${this.prefix}-alert-modal-body">
                <p id="${this.prefix}-alert-modal-text"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="${this.prefix}-alert-modal-cancel-button" data-dismiss="modal">No</button>
                <button type="button" class="btn btn-danger" id="${this.prefix}-alert-modal-submit-button">Yes</button>
            </div>
      </div>
    </div>
</div>
        `;
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
          location.replace(this.doneUrl);
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