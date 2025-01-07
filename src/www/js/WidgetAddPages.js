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

import { urlGen } from './pages/common/SiteUrlGen'


const AddPagesButtonLabel = 'Go for it!';
const SpinnerIcon = '<i class="fa fa-spinner fa-spin fa-fw"></i>';

export class WidgetAddPages {

  constructor (selector, docId, numPages) {

    this.containerSelector = selector;
    this.numPages = numPages
    this.docId = docId

    $(selector).html(this.getSkeletonHtml());

    
    this.updating = false
    
    this.numPagesInput = $(`${this.containerSelector} .num-pages-input`);
    this.addPagesButton = $(`${this.containerSelector} .add-pages-button`);
    this.statusDiv = $(`${this.containerSelector} div.add-pages-status`)
    this.numPagesInput
      .on('click keyup', ()  => { this.checkForm()});
    this.addPagesButton.on('click', () => {
      let np = parseInt(this.numPagesInput.val().toString());
      if (np > 0 && np < 2000) {
        return this.doAddPages(np);
      }
    });


  }

  checkForm() {
    let np = parseInt(this.numPagesInput.val().toString());
    if (np > 0 && np < 2000) {
      this.addPagesButton.removeClass('hidden');
    } else {
      this.addPagesButton.addClass('hidden');
    }
  }

  getSkeletonHtml() {
    return `<div class="add-pages-input-div">
       Add <input type="number" class="num-pages-input" value="0" min="0" max="2000" 
          aria-label="Number of pages to add"/> pages at the end of the document
       <button type="button" class="btn btn-primary btn-sm add-pages-button hidden">${AddPagesButtonLabel}</button>
      </div>
      <div class="add-pages-status"></div>`
  }

  doAddPages(numPagesToAdd) {
    if (this.updating) {
      return false;
    }
    this.addPagesButton.html(`Adding pages...${SpinnerIcon}`);
    $.post(urlGen.apiAddPages(this.docId), { numPages: JSON.stringify(numPagesToAdd)})
      .done( () => {
        this.statusDiv.html(`Done... reloading page`);
        location.replace('');
      })
      .fail( (resp) => {
        this.statusDiv.html(`Adding pages... fail with error code ${resp.status}, please try again`);
        this.addPagesButton.html(AddPagesButtonLabel);
        this.updating = false
      })
  }

}

