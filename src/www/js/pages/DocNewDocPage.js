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



import { NormalPage } from './NormalPage'
import { urlGen } from './common/SiteUrlGen'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'

export class DocNewDocPage extends  NormalPage{
  
  
  constructor(options) {

    super(options);

    let oc = new OptionsChecker({
      context: 'DocNewPage',
      optionsDefinition: {
        prefix: { type: 'string', default: 'DocNew'},
        languages: { type: 'array'},
        imageSources: { type: 'array'},
         docTypes: {type: 'array'}
      }
    });

    this.options = oc.getCleanOptions(options);

    console.log(`Options`)
    console.log(this.options);
    this.prefix = this.options.prefix;
    this.docInfoFields = ['title', 'doc_type', 'lang', 'image_source', 'image_source_data'];
    this.newDocApiUrl = urlGen.apiDocumentNew();
    this.docInfo = {
      title: 'New doc title',
      // short_title: 'New doc short title',
      doc_type: 'mss',
      lang: 'la',
      image_source: 'bilderberg',
      image_source_data: 'IMAGE SOURCE DATA'
    }


    this.initPage().then( () => {
      console.log(`NewPage Initialized`)
    })


  }

  async initPage() {
    await super.initPage();
    document.title = tr('New Document');
    let prefix = this.prefix;

    this.titleField = $('#' + prefix + '-title')
    this.typeSelect = $('#' + prefix + '-type')
    this.langSelect = $('#' + prefix + '-lang')
    this.imageSourceSelect = $('#' + prefix + '-imagesource')
    this.imageSourceDataField = $('#' + prefix + '-imagesourcedata')
    this.submitButton = $('#' + prefix + '-submit')
    this.cancelButton = $('#' + prefix + '-cancel')
    this.statusDiv = $('#' + prefix + '-status')
    this.titleStatusDiv = $('#' + prefix + '-titlestatus')


    this.putDocInfoIntoForm(this.docInfo)

    this.titleField.on('keyup', this.genCheckFormFunction())
    this.typeSelect.on('change', this.genCheckFormFunction())
    this.langSelect.on('change', this.genCheckFormFunction())
    this.imageSourceSelect.on('change', this.genCheckFormFunction())
    this.imageSourceDataField.on('keyup', this.genCheckFormFunction())


    this.submitButton.on('click', this.genSubmitFunction())
    this.cancelButton.on('click',
      () => { location.replace(urlGen.siteDocs())
      })

    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
  }

  async genContentHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label: 'New Document', active: true}
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

    return `
${breadcrumbHtml}
<h1>New Document</h1>
  
<div class="row">
    <div class="col-md-8">    
<div class="withmarginleft-small">
    <form id="${this.prefix}-form">
        <div id="${this.prefix}-title-fg" class="form-group">
            <label for="${this.prefix}-title" id="${this.prefix}-title-label" class="control-label">Title:</label>
            <input type="text" class="form-control" id="${this.prefix}-title" value=""/>
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
            <input type="text" class="form-control" id="${this.prefix}-imagesourcedata" value=""/>
        </div>
    </form>
    
    <button type="button" class="btn btn-primary" id="${this.prefix}-cancel">Cancel</button>
    <button type="button" class="btn btn-danger hidden" id="${this.prefix}-submit">Create Document</button>
    <div id="${this.prefix}-status"></div>
</div>
    </div>
</div>`;
  }


  genSubmitFunction() {
    return () => {
      let newInfo = this.getDocInfoFromForm()
      if (this.docInfosAreDifferent(this.docInfo, newInfo)) {
        $.post(
          this.newDocApiUrl,
          { data: JSON.stringify(newInfo) }
        )
        .done( (resp) => {
          let newDocId = resp.newDocId
          this.statusDiv.html("Creating... done")
          this.updating = false
          location.replace(urlGen.siteDocPage(newDocId))
        })
        .fail((resp) => {
          this.statusDiv.html("Creating... fail with error code " + resp.status + ' :(')
          this.updating = false
        })
        return true
      }
      this.statusDiv.html('<div class="alert alert-info>No changes, nothing to do</div>')
    }
  }
  
  
  genCheckFormFunction( ){
    return () => {
      let newInfo = this.getDocInfoFromForm()
      if (!newInfo['title'].replace(/\s/g, '').length) {
        this.titleStatusDiv.html('<p class="text-danger"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Title can\'t be empty</p>')
        this.submitButton.hide()
        return true
      } else {
        this.titleStatusDiv.html('')
      }
      
      if (this.docInfosAreDifferent(this.docInfo, newInfo)) {
        this.submitButton.show()
        return true
      }
      this.submitButton.hide()
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
     docInfo['doc_type'] = this.typeSelect.val()
     docInfo['lang'] = this.langSelect.val()
     docInfo['image_source'] = this.imageSourceSelect.val()
     docInfo['image_source_data'] = this.imageSourceDataField.val().trim()
     
     return docInfo
  }
  
  putDocInfoIntoForm(docInfo)
  {
    this.titleField.val(docInfo['title'])
    this.typeSelect.val(docInfo['doc_type'])
    this.langSelect.val(docInfo['lang'])
    this.imageSourceSelect.val(docInfo['image_source'])
    this.imageSourceDataField.val(docInfo['image_source_data'])
  }
  
}

window.DocNewDocPage = DocNewDocPage
