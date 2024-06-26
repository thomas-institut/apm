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


/* global Quill */

import Quill from 'quill/core'

const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')

export class EditorClipboard extends Clipboard {
  convert(html = null) {
    if (typeof html === 'string') {
      this.container.innerHTML = html;
    }
    //console.log("Pasting...")
    //console.log(this.container.innerHTML)
//    $('#cbtmp').html(this.container.innerHTML)
//    if ($('#cbtmp :first-child').prop('tagName') === 'IMG') {
//      if ($('#cbtmp :first-child').hasClass('mark')) {
//        console.log("Found mark in clipboard")
//      }
//    }
    const text = this.container.innerText;
    this.container.innerHTML = '';
    return new Delta().insert(text);
  }
}

Quill.register('modules/clipboard', EditorClipboard, true);
