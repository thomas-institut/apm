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


/* global TranscriptionEditor */

 
class PageViewer {  
  
  constructor (options){
    this.options = options
    let pathFor = options.urlGenerator
    let osdOptions = {
      id: "left-component",
      prefixUrl: pathFor.openSeaDragonImagePrefix(),
      maxZoomPixelRatio: 3
    }
    osdOptions.tileSources = options.osdConfig.tileSources
    
    this.osdViewer = OpenSeadragon(osdOptions)
        
    $('#pagenumber').popover({
      title:'Page List', 
      content: options.pagePopoverContent, 
      container: 'body', 
      html: true, 
      placement: 'auto', 
      trigger: 'click'
    })

    $('div.split-pane').splitPane()
    $('div.split-pane').on('dividerdragend', function (e){
      for (const te of TranscriptionEditor.editors) {
        // TODO: optimize, renumber lines only for active tab
        // if the tab's text is LTR 
        //console.log('Number lines on dividerdragend')
        te.numberLines()
      }
    })
    
    let apiAddColumnUrl = pathFor.apiAddColumn(this.options.docId, this.options.pageNumber)
    $('#realAddColumnButton').click(function () {
      //console.log('I should add a column now!')
      $.getJSON(apiAddColumnUrl, function (resp) {
        location.replace('')
      })
    })

    $('#editPageSubmitButton').on('click', 
      this.genOnClickEditPageSubmitButton())
      
    $('#editPageButton').on('click', 
      this.genOnClickEditPageButton())
      
    // Load columns
    $.getJSON(pathFor.apiGetNumColumns(this.options.docId, this.options.pageNumber), 
      this.genOnLoadNumColumns())
  }
  
  genOnLoadNumColumns(){
    let thisObject = this
    let pathFor = thisObject.options.urlGenerator
    
    return function (numColumns) {
      const thePageNumber = thisObject.options.pageNumber
      if (numColumns === 0) {
        $('#pageinfoTab').addClass('active')
        return true
      } 
      
      for (let col = 1; col <= numColumns; col++) {
        let theUl = '<li id="colheader' + col + '">'
        theUl += '<a data-toggle="tab" id="col-label-' + col + '" href="#col' + col +
                '">Column ' + col + '</a></li>'
        $('#tabsUl').append(theUl)
      }
      for (let col = 1; col <= numColumns; col++) {
        let apiGetColumnDataUrl = pathFor.apiGetColumnData(thisObject.options.docId, thePageNumber, col)
        $.getJSON(
          apiGetColumnDataUrl, 
          function (respColData) {
            $('.nav-tabs a').click(function () {
              $(this).tab('show')
            })
          const theCol = respColData.info.col
          let theDiv = '<div class="textcol tab-pane'
          if (theCol === 1) {
              theDiv += ' active'
          }
          theDiv += '" id="col' + col + '"></div>'
          $('#theTabs').append(theDiv)
          const te = new TranscriptionEditor('col' + theCol, theCol,
            { 
              editorId: thisObject.options.userId , 
              activeWorks: thisObject.options.activeWorks, 
              langDef: thisObject.options.langDef,
              defaultLang: thisObject.options.defaultLang,
              containerId: 'right-component'
            }
          )
          te.setData(respColData)
          te.on('editor-enable',function (e) {
              $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
          })
          te.on('editor-disable', function (e) {
            $('#col-label-' + theCol).html('Column ' + theCol)
           })

           $('#col-label-' + theCol).on('shown.bs.tab', function (e){
             //console.log("Number lines on shown.bs.tab")
             te.numberLines()
          })

          te.on('editor-save', function(){
            console.log("Saving...")
            console.log('Quill data:')
            console.log(te.quillObject.getContents())
            const currentData = te.getData();
            console.log('API data uploaded to server:')
            console.log(currentData)
            $.post(
              pathFor.apiUpdateColumnData(thisObject.options.docId, thePageNumber, col), 
              { data: JSON.stringify(currentData) }
            )
            .done(function () { 
                $.getJSON(apiGetColumnDataUrl, function (newColumnData){
                  //console.log(newResp)
                  console.log('API data received from server:')
                  console.log(newColumnData)
                  te.saveSuccess(newColumnData)
                  console.log('... finished saving')
                })
            })
            .fail(function(resp) {
              te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error)
            })
          })

          te.on('editor-reset',function(e){
            //console.log("Resetting...")
          });

          $(window).on('beforeunload', function(e) {
            if (te.contentsChanged) {
              //console.log("There are changes in editor")
              return false // make the browser show a message confirming leave
            }
          })
          if (theCol === 1) {
            $('#colheader' + theCol).tab('show')
          }
        })
      }
    }
  }
  
  genOnClickEditPageSubmitButton(){
    let apiUpdatePageSettingsUrl = this.options.urlGenerator.apiUpdatePageSettings(this.options.pageSystemId)
    
    return function () {
      //console.log('Updating page settings')
      //console.log($('#pageSettingsForm').serialize())
      $.post(
        apiUpdatePageSettingsUrl, 
        $('#pageSettingsForm').serialize())
      .done(function () { 
        location.replace('')         
      })
      .fail(function() {
        console.log("Error updating page settings")
      })
    }
  }
  
  genOnClickEditPageButton() {
    let thisObject = this
    return function () {

      let optionsHtml = ''
      let langDef = thisObject.options.langDef
      for (const lang in langDef) {
        optionsHtml += '<option value="' + lang + '"'
        if (thisObject.defaultLang === lang) {
          optionsHtml += ' selected'
        }
        optionsHtml += '>' + langDef[lang].name + '</option>'
      }
      $('#editPage-lang').html(optionsHtml)

      let optionsType = ''
      for (const type of thisObject.options.pageTypeNames) {
        optionsType += '<option value="' + type.id + '"'
        if (thisObject.options.pageType === parseInt(type.id)) {
          optionsType += ' selected'
        }
        optionsType += '>' + type.descr + '</option>'
      }
      $('#editPage-type').html(optionsType)


      $('#editPage-foliation').val(thisObject.options.foliation)
      $('#editPageModal').modal('show')
    }
  }

}