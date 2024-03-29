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

export class DefPagesAddPages {

  constructor (numPages, htmIdPrefix, docId, urlGenerator) {

    this.numPages = numPages
    this.prefix = '#' + htmIdPrefix
    this.docId = docId
    this.pathFor = urlGenerator
    
    this.updating = false
    
    this.numPagesField = $(this.prefix + 'num-pages')
    this.submitButton = $(this.prefix + 'submit-button')
    this.statusSpan = $(this.prefix + 'status')
    
    this.numPagesField.on('click', this.genCheckFormFunction())
    this.numPagesField.on('keyup', this.genCheckFormFunction())
    this.submitButton.on('click', this.genSubmitChangesFunction())
    
    
    // Remove 'hidden' class from elements
    this.submitButton.hide()
    this.submitButton.removeClass('hidden')
  }
  
   genCheckFormFunction (){
     let thisObject = this
      return function() {
        let np = parseInt(thisObject.numPagesField.val())
        if (np > 0 && np <= 2000 ) {
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
      let np = parseInt(thisObject.numPagesField.val())
      thisObject.submitButton.hide()
      thisObject.statusSpan.html('Adding pages... <i class="fa fa-spinner fa-spin fa-fw"></i>')
      $.post(
        thisObject.pathFor.apiAddPages(thisObject.docId), 
        { numPages: JSON.stringify(np) }
      )
      .done(function () { 
        thisObject.statusSpan.html("Adding pages... done")
        thisObject.updating = false
        location.replace('')
      })
      .fail(function(resp) {
        thisObject.statusSpan.html("Adding pages... fail with error code " + resp.status + ' :(')
        thisObject.updating = false
      })
    }
  }

}

