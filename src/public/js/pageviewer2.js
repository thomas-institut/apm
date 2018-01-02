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


let pageNumber = 0
let docId = 0
let apiBase = ''
let numColumns = 0
let userId = 0
let defaultLang = ''
const cols = []

$(document).ready(function () {
  $('div.split-pane').splitPane()
  
  $('div.split-pane').on('dividerdragend', function (e){
    for (const te of TranscriptionEditor.editors) {
      // TODO: optimize, renumber lines only for active tab
      // if the tab's text is LTR 
      te.numberLines()
    }
  })
  
  apiGetColumnInfoUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/numcolumns'
  apiAddColumnUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/newcolumn'
    
  apiUpdatePageSettingsUrl = apiBase + '/api/page/' + pageSystemId + '/update'

  $('#realAddColumnButton').click(function () {
    //console.log('I should add a column now!')
    $.getJSON(apiAddColumnUrl, function (resp) {
      location.replace('')
    })
  })
  
  
  $('#editPageSubmitButton').click( function () {
    console.log('Updating page settings')
    console.log($('#pageSettingsForm').serialize())
    $.post(
      apiUpdatePageSettingsUrl, $('#pageSettingsForm').serialize())
    .done(function () { 
      location.replace('')         
    })
    .fail(function() {
      console.log("Error updating page settings")
    })

  })
  
  $('#editPageButton').click(function () {
    const langs = ['ar', 'he', 'la']
    const langLabels = { ar: 'Arabic', he: 'Hebrew', la: 'Latin'}
    let optionsHtml = ''
    for (const lang of langs) {
      optionsHtml += '<option value="' + lang + '"'
      if (defaultLang === lang) {
        optionsHtml += ' selected'
      }
      optionsHtml += '>' + langLabels[lang] + '</option>'
    }
    $('#editPage-lang').html(optionsHtml)
    
    let optionsType = ''
    for (const type of pageTypeNames) {
      optionsType += '<option value="' + type.id + '"'
      if (pageType === parseInt(type.id)) {
        optionsType += ' selected'
      }
      optionsType += '>' + type.descr + '</option>'
    }
    $('#editPage-type').html(optionsType)
    
    
    $('#editPage-foliation').val(foliation)
    $('#editPageModal').modal('show')
  })

  // Load columns
  $.getJSON(apiGetColumnInfoUrl, function (resp) {
    const numColumns = resp
    const thePageNumber = pageNumber
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
        const getApiUrl = apiBase + '/api/' + docId + '/' + thePageNumber + '/' + col + '/elements'
        const updateApiUrl = getApiUrl + '/update'
        $.getJSON(
          getApiUrl, 
          function (resp) {
              $('.nav-tabs a').click(function () {
                $(this).tab('show')
              })
              //console.log(resp)
              const theCol = resp.info.col
              let theDiv = '<div class="textcol tab-pane'
              if (theCol === 1) {
                theDiv += ' active'
              }
              theDiv += '" id="col' + col + '"></div>'
              $('#theTabs').append(theDiv)
              const te = new TranscriptionEditor(
                  'col' + theCol, 
                  theCol);
              te.setData(resp)
              te.on('editor-enable',function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
              })
              te.on('editor-disable', function (e) {
                $('#col-label-' + theCol).html('Column ' + theCol)
              })
              
              $('#col-label-' + theCol).on('shown.bs.tab', function (e){
                 te.numberLines()
              })
              
//              $('#col-' + theCol).on('resize', function (e){
//                console.log('Resizing col ' + theCol)
//                 te.numberLines()
//              })
              te.on('editor-save', function(e){
                
                const currentData = te.getData();
                console.log('Current data from editor...')
                console.log(currentData)
                $.post(
                  updateApiUrl, 
                  { data: JSON.stringify(currentData) }
                ).done(function () { 
                  $.getJSON(getApiUrl, function (newResp){
                    //console.log(newResp)
                    console.log('Data from API...')
                    console.log(newResp)
                    te.saveSuccess(newResp)
                  })
                }).fail(function(resp) {
                  te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error)
                })
              });
              
              te.on('editor-reset',function(e){
                //console.log("Resetting...")
              });
              
              $(window).on('beforeunload', function(e) {
                //console.log("Before unload")
                if (te.contentsChanged) {
                  //console.log("There are changes in editor")
                  return false // make the browser show a message confirming leave
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
  const languages = {
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
