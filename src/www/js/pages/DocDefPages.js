/*
 *  Copyright (C) 2023 Universität zu Köln
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


import { DefPagesDefRange } from '../DefPagesDefRange'
import { DefPagesDefAll } from '../DefPagesDefAll'
import { WidgetAddPages } from '../WidgetAddPages'
import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { urlGen } from './common/SiteUrlGen'
import { PageArray } from './common/PageArray'
import { MultiToggle } from '../widgets/MultiToggle'

export class DocDefPages extends NormalPage {

  constructor (options) {
    super(options);
    let oc = new OptionsChecker({
      context: 'DocDefPages',
      optionsDefinition: {
        doc: { type: 'object', required: true},
        numPages: { type: 'number', required: true}
      }
    });
    this.options = oc.getCleanOptions(options);
    console.log(`Options`);
    console.log(this.options);
    this.docInfo = this.options.doc.docInfo;
    document.title = `Define Pages: ${this.docInfo.title}`

    this.pageArray = PageArray.getPageArray(this.options.doc.pages, 'sequence');
    this.thumbnails = 'none';

    this.initPage().then( () => {
      console.log('Finished initializing page');
      this.loadThumbnails().then(() => {
        console.log(`Finished loading thumbnails`)
      })
    })

  }


  async initPage() {
    await super.initPage();

    this.pageTypes = await this.apmDataProxy.getAvailablePageTypes();
    this.pageDiv = $('#pages');
    this.thumbnailToggle = new MultiToggle({
      containerSelector: 'div.thumbnail-selector',
      title: 'Thumbnails: ',
      buttonClass: 'thumbnail-toggle-btn',
      buttonDef: [
        { label: 'None', name: 'none'},
        { label: 'Tiny', name: 'tiny'},
        { label: 'Small', name: 'small'},
        { label: 'Medium', name: 'medium'},
        { label: 'Large', name: 'large'},
        { label: 'X-Large', name: 'x-large'},
      ],
    })
    this.thumbnailToggle.on( 'toggle', () => {
      let option = this.thumbnailToggle.getOption();
      let thumbnailSize = 0;
      switch(option) {
        case 'tiny':
          thumbnailSize = 50;
          break;
        case 'small':
          thumbnailSize = 100;
          break;

        case 'medium':
          thumbnailSize = 200;
          break;

        case 'large':
          thumbnailSize = 400;
          break;
        case 'x-large':
          thumbnailSize = 800;
          break;
      }
      let previousOption = this.thumbnails;
      this.thumbnails = option;
      this.setThumbnailSize(thumbnailSize);
      if (previousOption === 'none') {
        this.loadThumbnails();
      }
    })
    this.pageDiv.html(this.getPageListHtml());
    new DefPagesDefAll(this.options.numPages, 'dap-', this.docInfo['id'], urlGen);
    new DefPagesDefRange(this.options.numPages, 'dr-', this.docInfo['id'], this.pageTypes, urlGen);
    // new WidgetAddPages(this.options.numPages, 'ap-', this.docInfo['id'], urlGen);
  }

  setThumbnailSize(size) {
    this.pageArray.forEach( (page) => {
      let thumbnailImg = $(`img.thumbnail-${page['sequence']}`);
      if (size === 0) {
        thumbnailImg.addClass('hidden')
      } else {
        thumbnailImg.attr('height', `${size}px`).removeClass('hidden')
      }
    })
  }


  getPageListHtml() {
    let divs = []
    this.pageArray.forEach( (page) => {
      let classes = [ 'page-div', `page-div-${page['sequence']}`, `type${page['type']}`]
      if (page['foliationIsSet']) {
        classes.push('foliation-set');
      }
      if (!page['isTranscribed']) {
        classes.push('without-transcription');
      }
      divs.push(`<div class="page-list-page-container">
            <div class="thumbnail-div">
            <img src="${urlGen.siteBlankThumbnail()}" class="thumbnail-${page['sequence']} hidden"
                height="200px" alt="Page ${page['sequence']} thumbnail">
            </div>
            <div class="${classes.join(' ')}">${page['foliation']}</div>
        </div>`);
    })
    return divs.join('');
  }

  loadThumbnails() {
    const parallelRequests = 5;
    return new Promise( async (outerResolve) => {
      for (let i = 0; i < this.pageArray.length; i+=parallelRequests) {
        let promises = [];
        for (let j = 0; i+j < this.pageArray.length && j < parallelRequests; j++) {
          let page = this.pageArray[i+j];
          if (this.thumbnails === 'none') {
            console.log(`Thumbnail set to 'none', aborting actual loading of thumbnails at sequence ${page['sequence']}`);
            outerResolve();
            return;
          }
          promises.push(  new Promise( (resolve) => {
            let thumbnailUrl = page['thumbnailUrl'];
            if (thumbnailUrl === '') {
              thumbnailUrl = page['jpgUrl'];
              if (thumbnailUrl === '') {
                resolve();
                return;
              }
            }
            let thumbnailImg = $(`img.thumbnail-${page['sequence']}`);
            let currentUrl = thumbnailImg.attr('src');
            if (currentUrl === page['thumbnailUrl']) {
              resolve();
            } else {
              thumbnailImg.attr('src', thumbnailUrl).on('load', () => {
                resolve()
              });
            }
          }));
        }
        await Promise.all(promises);
      }
      outerResolve()
    })
  }


  async genContentHtml () {
    return `
        <nav aria-label="breadcumb">
        <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="${urlGen.siteDocs()}">Documents</a></li>
        <li class="breadcrumb-item"><a href="${urlGen.siteDocPage(this.docInfo.id)}">${this.docInfo['title']}</a></li>
        <li class="breadcrumb-item active">Define Document Pages</li>
    </ol>
</nav>

<h2>${this.docInfo['title']}</h2>
    
    <div class="thumbnail-selector"></div>
<div class="page-list-contents doc-def-pages-page-list" id="pages">
</div>

<div class="row with-top-margin def-pages-edit-div">
    <div class="col-md-6" id="pageSettingsFormCol">    
        <h3>Define All Pages</h3>
        <div id="dap-div" class="with-margin-left-sm">
        <form id="dap-form">

        <div id="dap-textpagesrange-fg" class="form-group form-inline without-padding-left">
            Text pages go from page
            <input type="number" class="in-text form-control" id="dap-ftp" value="1" style="width: 90px;" aria-label="From page"/>
             to page
            <input type="number" class="in-text form-control" id="dap-ltp" style="width: 90px;" aria-label="To page"/>
        </div>
            <p class="with-margin-left-sm text-muted">
                Front Matter: <span id="dap-fm-label">-</span><br/>
                Text Pages: <span id="dap-tp-label">1 - ${this.options.numPages}</span><br/>
                Back Matter: <span id="dap-bm-label">-</span>
            </p>
        <div id="dap-overwrite-pt-fg" class="form-group form-check form-inline without-padding-left">
            <input type="checkbox" class="form-check-input" id="dap-overwrite-pt"/>
            <label for="dap-overwrite-pt" class="form-check-label">Overwrite current page types</label>
        </div>

        <div id="dap-createcols-fg" class="form-group form-check form-inline without-padding-left" >
            <input type="checkbox" class="form-check-input" id="dap-createcols" aria-label="Assign columns"/>
            Assign
             <input type="number" class="form-control in-text" aria-label="Number of columns to assign" id="dap-cols" value="1" style="width: 60px;"/> column(s) to each text page
            (won't change current columns)
        </div>

        <div id="dap-foliate-fbm-fg" class="form-group form-check form-inline without-padding-left">
            <input type="checkbox" class="form-check-input" id="dap-foliate-fbm" disabled/>
            <label for="dap-foliate-fbm">Assign foliation to given front/back matter (x1, x2, ...)</label>
        </div>
            <p class="with-margin-left-lg text-muted hidden" id="dap-fmbm-foliation">
               <span id="dap-fm-foliation-label">-</span>
               <span id="dap-bm-foliation-label">-</span>
            </p>

        <div id="dap-foliate-tp-fg" class="form-group form-check form-inline without-padding-left">
            <input type="checkbox" class="form-check-input" id="dap-foliate-tp"/>
            <label for="dap-foliate-tp">Assign foliation to given text pages (1r, 1v, 2r, 2v, ...)</label>
        </div>
            <p class="with-margin-left-lg text-muted hidden" id="dap-tp-foliation">
               <span id="dap-tp-foliation-label"></span>
            </p>

        <div id="dap-overwrite-f-fg" class="form-group form-check form-inline hidden">
           <input type="checkbox" class="form-check-input" id="dap-overwrite-f"/>
            <label for="dap-overwrite-f">Overwrite current page foliation</label>
        </div>


        <button type="button" class="btn btn-primary hidden" id="dap-submit-button" >Go for it!</button>
        <span id="dap-status"></span>
        </form> 

        </div>
    </div>

    <div class="col-md-6">
        <h3>Define Range</h3>
        <div id="dr-div" class="with-margin-left-sm">
        <form id="dr-Form">
    <div id="dr-ftp-fg" class="form-group form-inline">
        From page
        <input type="number" class="in-text form-control" id="dr-fp" value="1" style="width: 90px;" aria-label="From page"/>
         to page
        <input type="number" class="in-text form-control" id="dr-lp" value="10" style="width: 90px;" aria-label="To page"/>
         (real page numbers)
    </div>

    <div id="dr-settype-fg"  class="form-group form-check form-inline without-padding-left">
        <input type="checkbox" class="form-check-input" id="dr-settype" aria-label="Set page type"/>
        Set page type to <select id="dr-pagetypes-select" class="in-text" aria-label="Page type to set"></select>
    </div>

    <div id="dr-foliate-fg" class="form-group form-check form-inline without-padding-left">
        <input type="checkbox" class="form-check-input" id="dr-foliate" aria-label="Assign foliation"/>
        Assign
        <select id="dr-foliation-type-select" class="in-text" aria-label="Foliation type">
            <option value="rv" selected>recto/verso</option>
            <option value="lr">left/right</option>
            <option value="ab">a/b</option>
            <option value="c">consecutive</option>
        </select> foliation starting with
        <input type="number" class="form-control in-text" id="dr-startnum" value="1" style="width: 70px;" aria-label="Foliation starting number"/>
    </div>
    <div id="dr-foliatetp-fg2" class="form-group form-inline with-margin-left-sm">
        <label for="dr-prefix">Prefix:</label><input type="text" class="form-control in-text" id="dr-prefix" style="width: 70px;"/>
        <label for="dr-suffix">Suffix:</label><input type="text" class="form-control in-text" id="dr-suffix" style="width: 70px;"/>
        (spaces will be ignored)
    </div>

    <p class="with-margin-left-lg text-muted hidden" id="dr-foliation-label">
    </p>
    <div id="dr-overwritef-fg" class="form-group form-check  form-inline with-margin-left-sm hidden">
       <input type="checkbox" class="form-check-input" id="dr-overwritef"/>
        <label for="dr-overwritef">Overwrite current page foliation</label>
    </div>
   <div id="dr-reverse-f-fg" class="form-group form-check  form-inline with-margin-left-sm hidden">
       <input type="checkbox" class="form-check-input" id="dr-reverse-f"/>
       <label for="dr-reverse-f">Reverse</label>
   </div>

    <div id="dr-createcols-fg" class="form-group form-check form-inline without-padding-left" >
        <input type="checkbox" class="form-check-input" id="dr-createcols" aria-label="Assign columns to each text page"/>
        Assign <input type="number" class="form-control in-text" id="dr-cols" value="1" style="width: 60px;" aria-label="Number of columns to assign"/> column(s) to each text page
        (won't change current columns)
    </div>

        <button type="button" class="btn btn-primary hidden" id="dr-submit-button">Go for it!</button>
        <span id="dr-status"></span>

    </form> 
    </div>

</div>
</div>`
  }

}

window.DocDefPages = DocDefPages