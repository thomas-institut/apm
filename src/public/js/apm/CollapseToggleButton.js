/*
 * Copyright (C) 2016-18 Universität zu Köln
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

/*
 * Implements a collapsible panel that includes the toggle button
 */

class CollapseToggleButton {
  
  constructor (iconSpanElement, collapseElement, visibleIconHtml = '', hiddenIconHtml = '' ) {
    
    this.iconSpan = iconSpanElement
    this.collapseElement = collapseElement
    this.visibleIconHtml = visibleIconHtml
    this.hiddenIconHtml = hiddenIconHtml
    if (this.visibleIconHtml === '' ) {
      this.visibleIconHtml = '<i class="fa fa-angle-down" aria-hidden="true"></i>'
    }
    this.hiddenIconHtml = hiddenIconHtml
    if (this.hiddenIconHtml === '' ) {
      this.hiddenIconHtml = '<i class="fa fa-angle-right" aria-hidden="true"></i>'
    }
    
    this.collapseElement.on('show.bs.collapse', this.genOnShownFunction())
    this.collapseElement.on('hide.bs.collapse', this.genOnHiddenFunction())
    
    
  }
  
  genOnShownFunction() {
    let thisObject = this
    return function () {
      thisObject.iconSpan.html(thisObject.visibleIconHtml)
    }
  }
  
  genOnHiddenFunction() {
    let thisObject = this
    return function () {
      thisObject.iconSpan.html(thisObject.hiddenIconHtml)
    }
  }
  
}
