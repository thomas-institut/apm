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

class CollationTablePage {
  
  constructor(data, rtl=false, defaultTdClasses) {

    this.ctf = new CollationTableFormatter(defaultTdClasses)
    
    this.currentView = 0
    
    this.collationTableDiv = $('#collationtablediv')
    this.changeTableViewButton = $('#changeTableViewButton')
    this.changeTextDirectionButton = $('#changeTextDirectionButton')
    this.changeTableViewButton.on('click', this.genOnClickChangeTableViewButton())
    
    if (rtl) {
      this.collationTableDiv.removeClass('ltrtext')
      this.collationTableDiv.addClass('rtltext')
    }
    
    this.collationTablesHtml = []
    this.collationTablesHtml.push(this.ctf.format(data, false, 15))
    this.collationTablesHtml.push(this.ctf.format(data, true, 8))
    this.collationTableDiv.html(this.collationTablesHtml[0])
    
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
  
}