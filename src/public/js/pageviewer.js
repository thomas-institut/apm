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
var defaultLang
var cols = []

$(function () {
  $('div.split-pane').splitPane()
})

$(document).ready(function () {
  apiGetColumnInfoUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/numcolumns'
  apiAddColumnUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/newcolumn'

  $('#realAddColumnButton').click(function () {
    //console.log('I should add a column now!')
    $.getJSON(apiAddColumnUrl, function (resp) {
      location.replace('')
    })
  })
  
  $('#editPageButton').click(function () {
    let langs = [ 'ar', 'he', 'la']
    let langLabels = { ar: 'Arabic', he: 'Hebrew', la: 'Latin'}
    let optionsHtml = ''
    for (const lang of langs) {
      optionsHtml += '<option value="' + lang + '"'
      if (defaultLang === lang) {
        optionsHtml += ' selected'
      }
      optionsHtml += '>' + langLabels[lang] + '</option>'
    }
    $('#editPage-lang').html(optionsHtml)
    $('#editPage-foliation').val(foliation)
    $('#editPageModal').modal('show')
  })

  // Load columns
  $.getJSON(apiGetColumnInfoUrl, function (resp) {
    let numColumns = resp
    let thePageNumber = pageNumber
    if (numColumns === 0) {
      $('#pageinfoTab').addClass('active')
    } else {
      for (let col = 1; col <= numColumns; col++) {
        let theUl = '<li id="colheader' + col + '">'
        theUl += '<a data-toggle="tab" id="col-label-' + col + '" href="#col' + col +
                  '">Column ' + col + '</a></li>'
        $('#tabsUl').append(theUl)
      }
      
      for (let col = 1; col <= numColumns; col++) {
        let getApiUrl = apiBase + '/api/' + docId + '/' + thePageNumber + '/' + col + '/elements'
        let updateApiUrl = getApiUrl + '/update'
        $.getJSON(
          getApiUrl, 
          function (resp) {
              $('.nav-tabs a').click(function () {
                $(this).tab('show')
              })
              //console.log(resp)
              let theCol = resp.info['col']
              let theDiv = '<div class="textcol tab-pane'
              if (theCol === 1) {
                theDiv += ' active'
              }
              theDiv += '" id="col' + col + '"></div>'
              $('#theTabs').append(theDiv)
              let te = new TranscriptionEditor(
                  '#col' + theCol, 
                  theCol, 
                  apiBase,
                  userId,   //editorId
                  resp.info['lang'],
                  0, // handId
                  {
                    selector: '#right-component',
                    offset: $('#tabsUl').height()
                  }
              );
              te.setData(resp)
              te.onEditorEnable(function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
              })
              te.onEditorDisable(function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol)
              })
              
              te.onEditorSave(function(e){
                
                let currentData = te.getData();
                console.log("Current data from editor...")
                console.log(currentData)
                $.post(
                  updateApiUrl, 
                  { data: JSON.stringify(currentData) }
                ).done( function () { 
                  $.getJSON(getApiUrl, function (newResp){
                    //console.log(newResp)
                    te.saveSuccess(newResp)
                  })
                }).fail( function(resp) {
                  te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error)
                })
              });
              
              te.onEditorReset(function(e){
                //console.log("Resetting...")
              });
              
              $(window).on("beforeunload", function(e) {
                //console.log("Before unload")
                if (te.contentsChanged) {
                  //console.log("There are changes in editor")
                  return false  // make the browser show a message confirming leave
                }
              });
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
