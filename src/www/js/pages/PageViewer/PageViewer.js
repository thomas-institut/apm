/* 
 *  Copyright (C) 2019-24 Universität zu Köln
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



import { TranscriptionEditor } from './TranscriptionEditor'
import { urlGen } from '../common/SiteUrlGen'
import { ApmUtil } from '../../ApmUtil'
import { ApmPage } from '../ApmPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import * as Entity from '../../constants/Entity'
import { TranscriptionLanguages } from '../../constants/TranscriptionLanguages'




const DEFAULT_LAYOUT_CACHE_TTL = 180 * 24 * 3600;  // 6 months
const LAYOUT_CACHE_DATA_ID = 'apm_pv_a4af3548';

export class PageViewer extends ApmPage {
  
  constructor (options){
    super(options);

    let oc = new OptionsChecker({
      context: 'PageViewer',
      optionsDefinition: {
        docId: { type: 'integer', required: true},
        pageId: { type: 'integer', required: true},
        activeColumn: { type: 'integer', required: true},
      }
    });

    this.options = options;
    console.log('Page Viewer options');
    console.log(options);


    this.docId = this.options.docId;
    this.pageNumber  = this.options.pageNumber;
    this.seq = this.options.seq;
    this.pageId = this.options.pageId;
    this.column = this.options.activeColumn;

    TranscriptionEditor.init(this.commonData.baseUrl);


    this.layoutCacheKey = `apm-PageViewer-Layout-${this.userId}-${this.pageId}`

    this.splitPaneElements =  $('div.split-pane')
    
    this.getViewerLayoutFromCache()
    this.langDef = [];
    for (const lang of TranscriptionLanguages) {
      this.langDef[lang['id']] = lang
    }

    if (this.layout.vertical) {
      this.doVerticalLayout(this.layout.percentage)
    } else {
      this.doHorizontalLayout(this.layout.percentage)
    }
    this.splitPaneElements.splitPane()
    
    let osdOptions = {
      id: "osd-pane",
      prefixUrl: urlGen.openSeaDragonImagePrefix(),
      minZoomLevel: 0.4,
      maxZoomLevel:5,
      showRotationControl: true,
      defaultZoomLevel: this.layout.zoom,
      preserveImageSizeOnResize: true
   }
    if (options.deepZoom) {
      osdOptions.tileSources = options.imageUrl;
    } else {
      osdOptions.tileSources = {
        type: 'image',
        url: options.imageUrl,
        buildPyramid: false,
        homeFillsViewer: true
      }
    }

    this.osdViewer = OpenSeadragon(osdOptions)

    // TODO: generate page list in JS
    $('#pagenumber').popover({
      title:'Page List', 
      content: options.pagePopoverContent, 
      container: 'body', 
      html: true, 
      placement: 'auto', 
      trigger: 'click',
      sanitize: false
    })

    this.splitPaneElements.on('dividerdragend', this.genOnDividerDragEnd())
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
    $.getJSON(urlGen.apiGetNumColumns(this.docId, this.pageNumber),
      this.genOnLoadNumColumns())
  }
  
  genOnOsdZoom() {
    return (e) => {
      //console.log('OSD zoom to ' + e.zoom)
      this.layout.zoom = e.zoom
      this.storeViewerLayoutInCache(this.layout)
    }
  }
  
  genOnDividerDragEnd() {
    return  (e, data) => {
      // TODO: optimize, renumber lines only for active tab
      TranscriptionEditor.editors.forEach( (editor) => {
        editor.resizeContainer();
        editor.numberLines();
      })
      this.layout.percentage = 100 * data.lastComponentSize / (data.lastComponentSize + data.firstComponentSize + 5)
      this.storeViewerLayoutInCache(this.layout)
    }
  }
  
  getViewerLayoutFromCache() {
    let layout = null;
    let layoutJson = this.localCache.retrieve(this.layoutCacheKey, LAYOUT_CACHE_DATA_ID);
    if (layoutJson !== null) {
      layout = JSON.parse(layoutJson);
    }
    if (layout === null) {
      // console.log('No layout in cache, using defaults')
      layout = { 
        vertical: true,
        percentage: 50,
        zoom: 1
      }
      this.storeViewerLayoutInCache(layout)
    }
    if (layout.zoom === undefined) {
      layout.zoom = 1
    }
    this.layout = layout
  }
  
  storeViewerLayoutInCache(layout) {
    this.localCache.store(this.layoutCacheKey, JSON.stringify(layout), DEFAULT_LAYOUT_CACHE_TTL, LAYOUT_CACHE_DATA_ID);
  }
  
  genOnClickRealAddColumnButton() {
    let apiAddColumnUrl = urlGen.apiAddColumn(this.options.docId, this.options.pageNumber)
    return function () {
      $.getJSON(apiAddColumnUrl,  () => {
        location.replace('')
      })
      .fail(  (resp) => {
        console.log("Error adding new column")
        
        $('#addColumnModal').modal('hide')
        let msg = resp.responseJSON['msg'] ?? ''
        $('#pageinfoerrors').html('<p class="text-danger">Error adding new column.<br/>'
          + 'HTTP Status: '  + resp.status + '<br/>'  
          + 'Error: (' + resp.responseJSON.error + ') ' 
          + msg  + '</p>')
      })
    }
  }
  genOnLoadNumColumns(){
    return  (numColumns) => {
      const thePageNumber = this.options.pageNumber
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
        console.log(`Getting column data for doc ${this.options.docId}, page ${thePageNumber}, col ${col}`);
        let apiGetColumnDataUrl = urlGen.apiTranscriptionsGetData(this.options.docId, thePageNumber, col)
        $.getJSON(apiGetColumnDataUrl,
          (respColData) => {
            console.log(`Got data`, respColData);
            $('.nav-tabs a').on('click', function () {
              $(this).tab('show')
            })
            const theCol = respColData.info.col
            const versions = respColData.info.versions
            $('#versions-col' + col).html(this.genVersionsDiv(col, versions))
            let theDiv = '<div class="textcol tab-pane'
            if (col === this.options.activeColumn) {
              theDiv += ' active'
            }
            theDiv += '" id="col' + col + '"></div>'
            $('#theTabs').append(theDiv)
            const te = new TranscriptionEditor('col' + theCol, theCol,
                {
                editorTid: this.userId ,
                activeWorks: this.options.activeWorks,
                langDef: this.langDef,
                defaultLang: this.options.defaultLang,
                containerId: 'editor-pane',
            })
            te.setData(respColData)
            te.on('editor-enable', ()=> {
              $('#col-label-' + theCol).html('Column ' + theCol + ' (editing)')
            })
            te.on('editor-disable',  ()=> {
              $('#col-label-' + theCol).html('Column ' + theCol)
            })

            $('#col-label-' + theCol).on('shown.bs.tab',  ()=> {
              //console.log("Number lines on shown.bs.tab")
              te.resizeContainer()
              te.numberLines()
            })

            te.on('editor-save', (ev)=> {
              console.log("Saving...")
              console.log('Quill data:')
              console.log(te.quillObject.getContents())
              const currentData = te.getData();
              currentData.versionInfo = ev.originalEvent.detail
              console.log('API data uploaded to server:')
              console.log(currentData)
              $.post(urlGen.apiTranscriptionsUpdateData(this.options.docId, thePageNumber, col),
              { data: JSON.stringify(currentData) })
                .done( ()=> {
                  $.getJSON(apiGetColumnDataUrl,  (newColumnData) => {
                    //console.log(newResp)
                    console.log('API data received from server:')
                    console.log(newColumnData)
                    te.saveSuccess(newColumnData)
                    console.log('... finished saving')
                    const versions = newColumnData.info.versions
                    console.log(versions)
                    $('#versions-col' + col).html(this.genVersionsDiv(col, versions))
                  })
                })
                .fail((resp) => {
                  let msg = resp.responseJSON['msg'] ?? 'Click to try again'
                  te.saveFail('Status: ' + resp.status + ' Error: ' + resp.responseJSON.error + ' ('
                    + msg + ')')
                })
            });
            te.on('version-request', (ev) => {
              let versionId = ev.originalEvent.detail.versionId
              console.log('Version request from editor, version ID = ' + versionId)
              let apiGetColumnDataUrl = urlGen.apiTranscriptionsGetDataWithVersion(this.options.docId, thePageNumber, col, versionId)
              $.getJSON(apiGetColumnDataUrl,  (newColumnData)=> {
                console.log('API data received from server:')
                console.log(newColumnData)
                const versions = newColumnData.info.versions
                console.log(versions)
                $('#versions-col' + col).html(this.genVersionsDiv(col, versions))
                te.loadNewVersion(newColumnData)
              })
            })
          te.on('editor-reset',(e) => {
            console.log("Editor reset event")
          });

          $(window).on('beforeunload', function() {
            if (te.contentsChanged) {
              //console.log("There are changes in editor")
              return false // make the browser show a message confirming leave
            }
          })
          if (col === this.options.activeColumn) {
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
  }

  genOnClickEditPageSubmitButton(){
    let apiUpdatePageSettingsUrl = urlGen.apiUpdatePageSettings(this.pageId)
    return  () => {
      let pageSettingsForm = $('#pageSettingsForm');
      console.log('Updating page settings');
      console.log(pageSettingsForm.serialize());
      $.post(apiUpdatePageSettingsUrl, pageSettingsForm.serialize())
        .done(() =>  {
          location.replace('');
        })
        .fail((resp) => {
          console.log("Error updating page settings")
          $('#editPageModal').modal('hide')
          let msg = resp.responseJSON['msg'] ?? ''
          $('#pageinfoerrors').html('<p class="text-danger">Error updating page settings.<br/>'
            + 'HTTP Status: '  + resp.status + '<br/>'
            + 'Error: (' + resp.responseJSON.error + ') '
            + msg  + '</p>')
        });
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
      this.storeViewerLayoutInCache(this.layout)

      TranscriptionEditor.editors.forEach( (te) => {
        te.resizeContainer()
        te.numberLines()
      })
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
    this.storeViewerLayoutInCache(this.layout)

    TranscriptionEditor.editors.forEach( (te) => {
      te.resizeContainer()
      te.numberLines()
    })
  }
  
  
  genOnVerticalButton()
  {
    return  ()  => {
      this.doVerticalLayout(50);
    }
  }
  
  
  genOnHorizontalButton()
  {
    return () => {
      this.doHorizontalLayout(50);
    }
  }
  
  
  genOnClickEditPageButton() {
    return  ()=>  {

      let optionsHtml = ''
      let langDef = this.langDef
      for (const lang in langDef) {
        if (!langDef.hasOwnProperty(lang)) {
          continue
        }
        optionsHtml += '<option value="' + lang + '"'
        if (this.options.defaultLang === lang) {
          optionsHtml += ' selected'
        }
        optionsHtml += '>' + langDef[lang].name + '</option>'
      }
      $('#editPage-lang').html(optionsHtml)

      let optionsType = ''
      for (const type of this.options.pageTypeNames) {
        optionsType += '<option value="' + type.id + '"'
        if (this.options.pageType === parseInt(type.id)) {
          optionsType += ' selected'
        }
        optionsType += '>' + type.descr + '</option>'
      }
      $('#editPage-type').html(optionsType)


      $('#editPage-foliation').val(this.options.foliation)
      $('#editPageModal').modal('show')
    }
  }

}

window.PageViewer = PageViewer