/* 
 * Copyright (C) 2016 Universität zu Köln
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

// Holds the current position of the container
// divider as a fraction of the document's width
var minDocumentFontSize = 8;
var maxDocumentFontSize = 64;
var currentDocumentFontSize = 12;

function changeDocumentFontSize(bigger){
    
    newFS = currentDocumentFontSize;
    
    if (bigger && currentDocumentFontSize < maxDocumentFontSize){
        newFS++;
    } 
    else if (!bigger && currentDocumentFontSize > minDocumentFontSize){
        newFS--;
    }
    if (newFS !== currentDocumentFontSize){
        $('#right-component').css('font-size', newFS);
        currentDocumentFontSize = newFS;
//        console.log('Document font size: ' + currentDocumentFontSize);
    }
}

$(document).ready(function(){
    reportedFS = $('#right-component').css('font-size');
    currentDocumentFontSize = /\d+/.exec(reportedFS);
//    console.log('Document font size: ' + currentDocumentFontSize + ' pixels');
});
           
$(function() {
    $('div.split-pane').splitPane();
});