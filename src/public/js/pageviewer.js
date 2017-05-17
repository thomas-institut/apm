/*
 * Copyright (C) 2016-7 Universität zu Köln
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

/* eslint-env jquery, browser */

/* global Item */

var pageNumber
var docId
var apiBase
var numColumns
var userId
var cols = []

$(function () {
  $('div.split-pane').splitPane()
})

$(document).ready(function () {
  console.log('User Id: ' + userId)
  apiGetColumnInfoUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/numcolumns'
  apiAddColumnUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/newcolumn'

  $('#realAddColumnButton').click(function () {
    console.log('I should add a column now!')
    $.getJSON(apiAddColumnUrl, function (resp) {
      location.replace('')
    })
  })

  // Load columns
  $.getJSON(apiGetColumnInfoUrl, function (resp) {
    let numColumns = resp
    if (numColumns === 0) {
      $('#pageinfoTab').addClass('active')
    } else {
      for (let col = 1; col <= numColumns; col++) {
        $.getJSON(
          apiBase + '/api/' + docId + '/' + pageNumber + '/' + col + '/elements', 
          function (resp) {
              $('.nav-tabs a').click(function () {
                $(this).tab('show')
              })
              console.log(resp)
              let theCol = resp.info['col']
              let theDiv = '<div class="textcol tab-pane'
              if (theCol === 1) {
                theDiv += ' active'
              }
              theDiv += '" id="col' + col + '"></div>'
              $('#theTabs').append(theDiv)
              let theUl = '<li id="colheader' + theCol + '">'
              theUl += '<a data-toggle="tab" id="col-label-' + theCol + '" href="#col' + theCol +
                  '">Column ' + theCol + '</a></li>'
              $('#tabsUl').append(theUl)
                  
              let te = new TranscriptionEditor(
                  '#col' + theCol, 
                  theCol, 
                  apiBase,
                  userId,   //editorId
                  getDefaultLang(resp.elements),  // default Lang
                  0 // handId
              );
              te.setData(resp)
              te.onEditorEnable(function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
              })
              te.onEditorDisable(function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol)
              })

              if (theCol === 1) {
                $('#colheader' + theCol).tab('show')
              }
          }
        )
      }
    }
  })
})



function getDefaultLang(elements) {
  let languages = {
    'ar':0,
    'he':0,
    'la':0
  }

  for (let i = 0; i < elements.length; i++) {
    languages[elements[i].lang]++
  }
  let lang='la'
  if (languages.ar > languages.la) {
    lang = 'ar'
  }
  if (languages.he > languages.ar) {
    lang = 'he'
  }
  return lang
}
