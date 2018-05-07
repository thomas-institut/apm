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
    this.cookieName = 'apm-pv2-' + this.options.userId + '-' + this.options.pageSystemId
    
    this.getViewerLayoutFromCookie()
    let pathFor = options.urlGenerator
    
    if (this.layout.vertical) {
      this.doVerticalLayout(this.layout.percentage)
    } else {
      this.doHorizontalLayout(this.layout.percentage)
    }
    $('div.split-pane').splitPane()
    
    let osdOptions = {
      id: "osd-pane",
      prefixUrl: pathFor.openSeaDragonImagePrefix(),
      minZoomLevel: 0.4,
      maxZoomLevel:5,
      showRotationControl: true,
      defaultZoomLevel: this.layout.zoom,
      preserveImageSizeOnResize: true
   }
    osdOptions.tileSources = options.osdConfig.tileSources
    
    this.osdViewer = OpenSeadragon(osdOptions)
    
    //console.log('OSD constructed')
    //console.log(this.osdViewer)
    
    $('#pagenumber').popover({
      title:'Page List', 
      content: options.pagePopoverContent, 
      container: 'body', 
      html: true, 
      placement: 'auto', 
      trigger: 'click'
    })

    let osd = this.osdViewer
    
    $('div.split-pane').on('dividerdragend', this.genOnDividerdragend())
    this.osdViewer.addHandler('zoom', this.genOnOsdZoom())
//    this.osdViewer.addHandler('reset-size', function(d) {
//      console.log('OSD reset image rize to ' + d.contentSize.x + ' x ' + d.contentSize.y)
//    })
    
//    this.osdViewer.addHandler('resize', function(d) {
//      console.log('OSD resize to ' +  d.newContainerSize.x + ' x ' + d.newContainerSize.y)
//    })
    
//    this.osdViewer.addHandler('pan', function (s) {
//      console.log('OSD pan to ( ' + s.center.x + ', ' + s.center.y + ' )')
//    })
    
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
      
    $('#vertButton').on('click', 
      this.genOnVerticalButton())
      
    $('#horizButton').on('click', 
      this.genOnHorizontalButton())  
      
    // Load columns
    $.getJSON(pathFor.apiGetNumColumns(this.options.docId, this.options.pageNumber), 
      this.genOnLoadNumColumns())
  }
  
  genOnOsdZoom() {
    let thisObject = this
    return function(e) {
      //console.log('OSD zoom to ' + e.zoom)
      thisObject.layout.zoom = e.zoom
      thisObject.storeViewerLayoutInCookie(thisObject.layout)
    }
  }
  
  genOnDividerdragend() {
    let thisObject = this
    return function (e, data){
      for (const te of TranscriptionEditor.editors) {
        // TODO: optimize, renumber lines only for active tab
        // if the tab's text is LTR 
        //console.log('Number lines on dividerdragend')
        te.resizeContainer()
        te.numberLines()
        let perc = 100*data.lastComponentSize / (data.lastComponentSize + data.firstComponentSize + 5)
        thisObject.layout.percentage = perc
        thisObject.storeViewerLayoutInCookie(thisObject.layout)
      }
    }
  }
  
  getViewerLayoutFromCookie() {
    
    let layout = Cookies.getJSON(this.cookieName)
    if (layout === undefined) {
      console.log('No layout cookie present, using defaults')
      layout = { 
        vertical: true,
        percentage: 50,
        zoom: 1
      }
      this.storeViewerLayoutInCookie(layout)
    }
    if (layout.zoom === undefined) {
      layout.zoom = 1
    }
    this.layout = layout
  }
  
  storeViewerLayoutInCookie(layout) {
    Cookies.set(this.cookieName, layout)
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
              containerId: 'editor-pane'
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
             te.resizeContainer()
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
  
  doVerticalLayout(perc) {
    $('#osd-pane').removeClass('horiz-top')
      $('#osd-pane').addClass('vert-left')
      $('#osd-pane').css('height', "100%")
      $('#osd-pane').css('width', "")
      $('#osd-pane').css('right', perc + "%")
      $('#osd-pane').css('bottom', "")

      $('#editor-pane').removeClass('horiz-bottom')
      $('#editor-pane').addClass('vert-right')
      $('#editor-pane').css('height', "100%")
      $('#editor-pane').css('width', perc + "%")
      
      $('#divider').removeClass('horiz-divider')
      $('#divider').addClass('vert-divider')
      $('#divider').css('bottom', "")
      $('#divider').css('right', perc + "%")
      
      $('#full-pane').removeClass('horizontal-percent')
      $('#full-pane').addClass('vertical-percent')
      
      this.layout.vertical = true
      this.layout.percentage = perc
      this.storeViewerLayoutInCookie(this.layout)
      
      if (TranscriptionEditor.editors) {
        for (const te of TranscriptionEditor.editors) {
          te.resizeContainer()
          te.numberLines()
        }
      }
  }
  
  doHorizontalLayout(perc) {
    $('#osd-pane').removeClass('vert-left')
      $('#osd-pane').addClass('horiz-top')
      $('#osd-pane').css('width', "100%")
      $('#osd-pane').css('height', "")
      $('#osd-pane').css('bottom', perc + "%")
      $('#osd-pane').css('right', "")
      
      $('#editor-pane').removeClass('vert-right')
      $('#editor-pane').addClass('horiz-bottom')
      $('#editor-pane').css('width', "100%")
      $('#editor-pane').css('height', perc + "%")
      
      $('#divider').removeClass('vert-divider')
      $('#divider').addClass('horiz-divider')
      $('#divider').css('right', "")
      $('#divider').css('bottom', perc + "%")
      
      $('#full-pane').removeClass('vertical-percent')
      $('#full-pane').addClass('horizontal-percent')
      
      this.layout.vertical = false
      this.layout.percentage = perc
      this.storeViewerLayoutInCookie(this.layout)
      
      if (TranscriptionEditor.editors) {
        for (const te of TranscriptionEditor.editors) {
          te.resizeContainer()
          te.numberLines()
        }
      }
  }
  
  
  genOnVerticalButton()
  {
    let thisObject = this
    
    return function () {
      thisObject.doVerticalLayout(50)
    }
  }
  
  
  genOnHorizontalButton()
  {
    let thisObject = this
    
    return function () {
      thisObject.doHorizontalLayout(50)
    }
  }
  
  
  genOnClickEditPageButton() {
    let thisObject = this
    return function () {

      let optionsHtml = ''
      let langDef = thisObject.options.langDef
      for (const lang in langDef) {
        optionsHtml += '<option value="' + lang + '"'
        if (thisObject.options.defaultLang === lang) {
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