/*
 * Copyright (C) 2018 Universität zu Köln
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

class QuickCollation {
  
  constructor(urlGenerator) {

    this.pathFor = urlGenerator
    this.textTitles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    this.updating = false
    this.ctf = new CollationTableFormatter()
    
    this.collationTablesHtml = [ '']
    this.currentView = 0
   
    
    this.collateButton = $('#collateButton')
    this.status = $('#status')
    this.collationTableDiv = $('#collationtablediv')
    this.collationTableSection = $('#collationtablesection')
    this.changeTableViewButton = $('#changeTableViewButton')
    this.changeTextDirectionButton = $('#changeTextDirectionButton')
        
    this.collateButton.on('click', this.genOnClickCollateButton())
    this.changeTableViewButton.on('click', this.genOnClickChangeTableViewButton())
    this.changeTextDirectionButton.on('click', this.genOnClickChangeTextDirectionButton())
    
    this.collationTableSection.addClass('hidden')
    
  }
  
  
  genOnClickCollateButton()
  {
    let thisObject = this
    return function () {
      console.log("Collate button clicked")
      
      let collatexInput = { witnesses: [] }
      
      for (const textTitle of thisObject.textTitles) {
        let theText =  $('#text' + textTitle).val()
        if (theText === '') {
          continue
        }
        collatexInput.witnesses.push(
          { 
            id: textTitle, 
            text: theText
          }
        )
      }
      thisObject.collationTableSection.addClass('hidden')
      if (collatexInput.witnesses.length < 2) {
        thisObject.status.html('Error: need at least two texts to collate')
        return
      }
      
      console.log('All set to call API at ' + thisObject.pathFor.apiQuickCollation())
      console.log(collatexInput)
      this.updating = true
      thisObject.status.html('Collating... <i class="fa fa-spinner fa-spin fa-fw"></i>')
      
      $.post(
          thisObject.pathFor.apiQuickCollation(), 
          { data: JSON.stringify(collatexInput) }
        )
        .done(function (data) { 
          thisObject.status.html('Collating... done, formatting table <i class="fa fa-spinner fa-spin fa-fw"></i>')
          console.log(data)

          thisObject.collationTableDiv.html(data)
          thisObject.currentView = 0
          thisObject.updating = false
          thisObject.status.html('')
          thisObject.collationTableSection.removeClass('hidden')
        })
        .fail(function(resp) {
          thisObject.status.html("Collating... fail with error code " + resp.status + ' :(')
          thisObject.updating = false
        })
      
    }
  }
  
  
  genOnClickChangeTableViewButton() {
    let thisObject = this
    return function () { 
      let numViewsAvailable = thisObject.collationTablesHtml.length
      
      if (thisObject.currentView === numViewsAvailable -1 ) {
        thisObject.currentView = 0
      } else {
        thisObject.currentView++
      }
      thisObject.collationTableDiv.html(thisObject.collationTablesHtml[thisObject.currentView])
    
    }
  }
  
  genOnClickChangeTextDirectionButton() {
    let thisObject = this
    return function () { 
      if (thisObject.collationTableDiv.hasClass('ltrtext')) {
        thisObject.collationTableDiv.removeClass('ltrtext')
        thisObject.collationTableDiv.addClass('rtltext')
      } else {
        thisObject.collationTableDiv.removeClass('rtltext')
        thisObject.collationTableDiv.addClass('ltrtext')
      }
    }
  }
  
  
  
}