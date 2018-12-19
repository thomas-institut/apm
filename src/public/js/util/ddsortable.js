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


class DragAndDropSortableList {
  
  constructor(parentSelector, itemClass) {
    this.dragElementClass = 'dragElem'
    this.overClass = 'over'

    let cols = document.querySelectorAll(parentSelector + ' .' + itemClass);
    for(const elem of cols) {
      this.addDnDHandlers(elem)
    }
    
    this.itemClass = itemClass
    
    this.dragSrcEl = null
  }
  
  genOnDragStartFunc() {
    let thisObject = this
    return function (e) {
        // Target (this) element is the source node.
        thisObject.dragSrcEl = this
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', this.outerHTML)
        this.classList.add(thisObject.dragElementClass)
      } 
  }
  
  genOnDragOver() {
    let thisObject = this
    return function (e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }
      this.classList.add(thisObject.overClass);
      e.dataTransfer.dropEffect = 'move';  
      return false;
    }
  }
  
  genOnDragEnter() {
    let thisObject = this
    return function (e) {
      // this / e.target is the current hover target.
    }
  }
  
  genOnDragLeave() {
    let thisObject = this
    return function (e) {
      this.classList.remove(thisObject.overClass);  // this / e.target is previous target element.
    }
  }
  
  genOnDrop() {
    let thisObject = this
    return function (e) {
      //console.log('Drop event')
      // this/e.target is current target element.
      if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting.
      }
      // Don't do anything if dropping the same column we're dragging.
      if (thisObject.dragSrcEl !== this) {
        // Set the source column's HTML to the HTML of the column we dropped on.
        this.parentNode.removeChild(thisObject.dragSrcEl);
        let dropHTML = e.dataTransfer.getData('text/html');
        this.insertAdjacentHTML('beforebegin',dropHTML);
        let dropElem = this.previousSibling;
        thisObject.addDnDHandlers(dropElem);
      }
      this.classList.remove(thisObject.overClass);
      return false;
    }
  }
  
  genOnDragEnd() {
    let thisObject = this
    return function (e) {
      //console.log('Drag end event')
      //this.classList.remove(thisObject.overClass);
      this.classList.remove(thisObject.dragElementClass);
    }
  }
  
  addDnDHandlers(elem) {
    //console.log('Adding handlers')
    //console.log(elem)
    elem.addEventListener('dragstart', this.genOnDragStartFunc(), false);
    elem.addEventListener('dragenter', this.genOnDragEnter(), false)
    elem.addEventListener('dragover', this.genOnDragOver(), false);
    elem.addEventListener('dragleave', this.genOnDragLeave(), false);
    elem.addEventListener('drop', this.genOnDrop(), false);
    elem.addEventListener('dragend', this.genOnDragEnd(), false);
  }
  
}

function addDnDHandlers(elem) {

}

var cols = document.querySelectorAll('#columns .column');
[].forEach.call(cols, addDnDHandlers);

