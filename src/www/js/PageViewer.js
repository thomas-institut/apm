/* 
 *  Copyright (C) 2019-20 Universität zu Köln
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


/* global TranscriptionEditor */

 
class PageViewer {  
  
  constructor (options){
    this.options = options
    //console.log('Page Viewer options')
    //console.log(options)
    this.cookieName = 'apm-pv2-' + this.options.userId + '-' + this.options.pageSystemId

    this.splitPaneElements =  $('div.split-pane')
    
    this.getViewerLayoutFromCookie()
    let pathFor = options.urlGenerator
    
    if (this.layout.vertical) {
      this.doVerticalLayout(this.layout.percentage)
    } else {
      this.doHorizontalLayout(this.layout.percentage)
    }
    this.splitPaneElements.splitPane()
    
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
    
    $('#pagenumber').popover({
      title:'Page List', 
      content: options.pagePopoverContent, 
      container: 'body', 
      html: true, 
      placement: 'auto', 
      trigger: 'click',
      sanitize: false
    })

    this.splitPaneElements.on('dividerdragend', this.genOnDividerdragend())
    this.osdViewer.addHandler('zoom', this.genOnOsdZoom())
    
    $('#realAddColumnButton').on('click', 
      this.genOnClickRealAddColumnButton())
      
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
        thisObject.layout.percentage = 100 * data.lastComponentSize / (data.lastComponentSize + data.firstComponentSize + 5)
        thisObject.storeViewerLayoutInCookie(thisObject.layout)
      }
    }
  }
  
  getViewerLayoutFromCookie() {
    
    let layout

    try {
      layout = JSON.parse(Cookies.get(this.cookieName))
    } catch (e) {
      console.log(`Error parsing cookie ${this.cookieName}, resetting`)
      layout = undefined
    }

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
    // console.log(`Storing layout in cookie`)
    // console.log(layout)
    Cookies.set(this.cookieName, JSON.stringify(layout))
  }
  
  genOnClickRealAddColumnButton() {
    let pathFor = this.options.urlGenerator
    let apiAddColumnUrl = pathFor.apiAddColumn(this.options.docId, this.options.pageNumber)
    return function () {
      $.getJSON(apiAddColumnUrl, function () {
        location.replace('')
      })
      .fail( function (resp) {
        console.log("Error adding new column")
        
        $('#addColumnModal').modal('hide')
        let msg = ''
        if (resp.responseJSON.msg !== undefined) {
          msg = resp.responseJSON.msg
        }

        $('#pageinfoerrors').html('<p class="text-danger">Error adding new column.<br/>' 
          + 'HTTP Status: '  + resp.status + '<br/>'  
          + 'Error: (' + resp.responseJSON.error + ') ' 
          + msg  + '</p>')
      })
    }
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
        let theUl = '<li class="nav-item" id="colheader' + col + '">'
        theUl += '<a role="tab" class="nav-link" data-toggle="tab" id="col-label-' + col + '" href="#col' + col +
                '">Column ' + col + '</a></li>'
        $('#tabsUl').append(theUl)
      }
      for (let col = 1; col <= numColumns; col++) {
        let apiGetColumnDataUrl = pathFor.apiTranscriptionsGetData(thisObject.options.docId, thePageNumber, col)
        $.getJSON(
          apiGetColumnDataUrl, 
          function (respColData) {
            $('.nav-tabs a').on('click', function () {
              $(this).tab('show')
            })
          const theCol = respColData.info.col
            const versions = respColData.info.versions
            $('#versions-col' + col).html(thisObject.genVersionsDiv(col, versions))
          let theDiv = '<div class="textcol tab-pane'
          if (col === thisObject.options.activeColumn) {
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
              containerId: 'editor-pane',
            }
          )
          te.setData(respColData)
          te.on('editor-enable',function () {
              $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
          })
          te.on('editor-disable', function () {
            $('#col-label-' + theCol).html('Column ' + theCol)
           })

           $('#col-label-' + theCol).on('shown.bs.tab', function (){
             //console.log("Number lines on shown.bs.tab")
             te.resizeContainer()
             te.numberLines()
          })

          te.on('editor-save', function(ev){
            console.log("Saving...")
            console.log('Quill data:')
            console.log(te.quillObject.getContents())
            const currentData = te.getData();
            currentData.versionInfo = ev.originalEvent.detail
            console.log('API data uploaded to server:')
            console.log(currentData)
            $.post(
              pathFor.apiTranscriptionsUpdateData(thisObject.options.docId, thePageNumber, col),
              { data: JSON.stringify(currentData) }
            )
            .done(function () { 
                $.getJSON(apiGetColumnDataUrl, function (newColumnData){
                  //console.log(newResp)
                  console.log('API data received from server:')
                  console.log(newColumnData)
                  te.saveSuccess(newColumnData)
                  console.log('... finished saving')
                  const versions = newColumnData.info.versions
                  console.log(versions)
                  $('#versions-col' + col).html(thisObject.genVersionsDiv(col, versions))
                })
            })
            .fail(function(resp) {
              let msg = 'Click to try again'
              if (resp.responseJSON.msg !== undefined) {
                msg = resp.responseJSON.msg
              }
              te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error + ' (' 
                 + msg + ')')
            })
          })

            te.on('version-request', function(ev){
              let versionId = ev.originalEvent.detail.versionId
              console.log('Version request from editor, version ID = ' + versionId)
              let apiGetColumnDataUrl = pathFor.apiTranscriptionsGetDataWithVersion(thisObject.options.docId, thePageNumber, col, versionId)
              $.getJSON(apiGetColumnDataUrl, function (newColumnData){
                console.log('API data received from server:')
                console.log(newColumnData)
                const versions = newColumnData.info.versions
                console.log(versions)
                $('#versions-col' + col).html(thisObject.genVersionsDiv(col, versions))
                te.loadNewVersion(newColumnData)
              })
                // .fail(function(resp) {
                //   let msg = 'Click to try again'
                //   if (resp.responseJSON.msg !== undefined) {
                //     msg = resp.responseJSON.msg
                //   }
                //   te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error + ' ('
                //     + msg + ')')
                // })
            })

          te.on('editor-reset',function(e){
            //console.log("Resetting...")
          });

          $(window).on('beforeunload', function() {
            if (te.contentsChanged) {
              //console.log("There are changes in editor")
              return false // make the browser show a message confirming leave
            }
          })
          if (col === thisObject.options.activeColumn) {
            $('#colheader' + theCol).tab('show')
            $(`#col-label-${theCol}`).addClass('active')
          }
        })
      }
    }
  }

  genVersionsDiv(col, versions) {
    let html  = '<p style="margin-top: 20px"/>'
    html += '<strong>Versions Column ' + col + ':</strong>'
    html += '<table class="versiontable">'
    html += '<tr><th>N</th><th>Id</th></th><th>Time</th><th>Author</th><th>Description</th></tr>'
    // put the versions in reverse chronological order
    for (let i=versions.length-1; i >= 0; i--) {
      let v = versions[i]
      html+='<tr>'
      html+='<td>' + v.number + '</td>'
      html+='<td>' + v.id + '</td>'
      html+='<td>' + this.formatVersionTime(v.time_from) + '</td>'
      html+='<td>' + v.author_name + '</td>'
      html+='<td>' + (v.descr==='' ? '---' : v.descr)  + '</td>'
      html+='<td>' + (v.minor ? '<em>[m]</em>&nbsp;' : '')
      html+= (v.review ? '<em>[r]</em>&nbsp;' : '')
      html += `${v.is_published ? '[Published]' : ''}</td>`
      html += '</tr>'
    }
    html += '</table>'
    return html
  }

  formatVersionTime(time) {
    return moment(time).format('D MMM YYYY, H:mm:ss')

    //return d.getDate() + ' ' + d.getMonth() + ' ' + d.getFullYear()
    //return time.split('.')[0]
  }

  genOnClickEditPageSubmitButton(){
    let apiUpdatePageSettingsUrl = this.options.urlGenerator.apiUpdatePageSettings(this.options.pageSystemId)
    
    return function () {
      console.log('Updating page settings')
      console.log($('#pageSettingsForm').serialize())
      $.post(
        apiUpdatePageSettingsUrl, 
        $('#pageSettingsForm').serialize())
      .done(function () { 
        location.replace('')         
      })
      .fail(function(resp) {
        console.log("Error updating page settings")
        
        $('#editPageModal').modal('hide')
        let msg = ''
        if (resp.responseJSON.msg !== undefined) {
          msg = resp.responseJSON.msg
        }

        $('#pageinfoerrors').html('<p class="text-danger">Error updating page settings.<br/>' 
          + 'HTTP Status: '  + resp.status + '<br/>'  
          + 'Error: (' + resp.responseJSON.error + ') ' 
          + msg  + '</p>')
      })
    }
  }
  
  doVerticalLayout(perc) {
    let osdPane = $('#osd-pane')
    osdPane.removeClass('horiz-top')
    osdPane.addClass('vert-left')
    osdPane.css('height', "100%")
    osdPane.css('width', "")
    osdPane.css('right', perc + "%")
    osdPane.css('bottom', "")

    let editorPane = $('#editor-pane')
    editorPane.removeClass('horiz-bottom')
    editorPane.addClass('vert-right')
    editorPane.css('height', "100%")
    editorPane.css('width', perc + "%")

    let divider = $('#divider')
    divider.removeClass('horiz-divider')
    divider.addClass('vert-divider')
    divider.css('bottom', "")
    divider.css('right', perc + "%")

    let fullPane = $('#full-pane')
    fullPane.removeClass('horizontal-percent')
    fullPane.addClass('vertical-percent')
      
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
    let osdPane = $('#osd-pane')
    osdPane.removeClass('vert-left')
    osdPane.addClass('horiz-top')
    osdPane.css('width', "100%")
    osdPane.css('height', "")
    osdPane.css('bottom', perc + "%")
    osdPane.css('right', "")

    let editorPane = $('#editor-pane')
    editorPane.removeClass('vert-right')
    editorPane.addClass('horiz-bottom')
    editorPane.css('width', "100%")
    editorPane.css('height', perc + "%")

    let divider = $('#divider')
    divider.removeClass('vert-divider')
    divider.addClass('horiz-divider')
    divider.css('right', "")
    divider.css('bottom', perc + "%")

    let fullPane = $('#full-pane')
    fullPane.removeClass('vertical-percent')
    fullPane.addClass('horizontal-percent')
      
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
        if (!langDef.hasOwnProperty(lang)) {
          continue
        }
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