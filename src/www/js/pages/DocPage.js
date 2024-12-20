/*
 *  Copyright (C) 2020-2023 Universität zu Köln
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


import * as Popper from '@popperjs/core'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { NormalPage } from './NormalPage'
import { urlGen } from './common/SiteUrlGen'
import { tr } from './common/SiteLang'
import { EditableTextField } from '../widgets/EditableTextField'
import { trimWhiteSpace } from '../toolbox/Util.mjs'
import { Tid } from '../Tid/Tid'
import { PageArray } from './common/PageArray'
import { MultiToggle } from '../widgets/MultiToggle'
import { ApmUtil } from '../ApmUtil'
import { ApmFormats } from './common/ApmFormats'
import { TimeString } from '../toolbox/TimeString.mjs'
import Split from 'split-grid'
import { ApmPage } from './ApmPage'

export class DocPage extends NormalPage {
  constructor(options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'DocumentDetailsPage',
      optionsDefinition: {
        doc: { type: 'object', required: true},
        chunkInfo: {type: 'object', required: true},
        versionInfo: { type: 'object', required: true},
        lastSaves: { type: 'object', required: true},
        canDefinePages: {type: 'boolean', default: false},
        canEditDocuments: { type: 'boolean', default: false}
      }
    })

    this.options = oc.getCleanOptions(options)

    this.chunkInfo = this.options.chunkInfo;
    this.doc = this.options.doc
    this.docInfo = this.doc.docInfo
    this.docId = this.docInfo.id
    this.pages = this.doc.pages;

    Object.keys(this.pages).forEach( (pageId) => {
      if (this.pages[pageId]['foliation'] === null) {
        this.pages[pageId]['foliation'] = this.pages[pageId]['seq'].toString();
      }
    });


    this.pageSeqToPageKeyMap = this.getPageSequenceToPageKeyMap(this.pages)
    this.pageArray = PageArray.getPageArray(this.pages, 'sequence')

    console.log(`DocPage for docId ${this.docId}`)
    console.log(options)

    this.firstPage = Math.min(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)))
    this.lastPage = Math.max(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)))

    this.versionInfo = this.options.versionInfo
    this.authors = this.options.authorInfo;
    this.lastSaves = this.options.lastSaves;
    this.canDefinePages = this.options.canDefinePages;
    this.canEditDocuments = this.options.canEditDocuments;
    this.osd = null

    this.initPage().then( () => {
      console.log('Finished initializing page')
    })

  }

  async initPage () {
    await super.initPage();

    let pageTypesData = await this.apmDataProxy.getAvailablePageTypes();
    this.pageTypes = [];
    for (let i = 0; i < pageTypesData.length; i++) {
      this.pageTypes[pageTypesData[i]] = await this.apmDataProxy.getEntityName(pageTypesData[i]);
    }

    this.selectedPage = -1
    this.thumbnails = 'none';


    this.thumbnailToggle = new MultiToggle({
      containerSelector: 'div.thumbnail-selector',
      title: 'Thumbnails: ',
      buttonClass: 'thumbnail-toggle-btn',
      buttonDef: [
        { label: 'None', name: 'none'},
        { label: 'Tiny', name: 'tiny'},
        { label: 'Small', name: 'small'},
        { label: 'Medium', name: 'medium'},
        { label: 'Large', name: 'large'},
        // { label: 'X-Large', name: 'x-large'},
      ],
    })
    this.thumbnailToggle.on( 'toggle', () => {
      let option = this.thumbnailToggle.getOption();
      let thumbnailSize = 0;
      switch(option) {
        case 'tiny':
          thumbnailSize = 50;
          break;
        case 'small':
          thumbnailSize = 100;
          break;

        case 'medium':
          thumbnailSize = 200;
          break;

        case 'large':
          thumbnailSize = 400;
          break;
        // case 'x-large':
        //   thumbnailSize = 800;
        //   break;
      }
      let previousOption = this.thumbnails;
      this.thumbnails = option;
      this.setThumbnailSize(thumbnailSize);
      if (previousOption === 'none') {
        this.loadThumbnails();
      }
    })

    $('button.first-btn').on('click', () => { this.selectPage(this.firstPage)})
    $('button.last-btn').on('click', () => { this.selectPage(this.lastPage)})
    $('button.prev-btn').on('click', () => {
      if (this.selectedPage > this.firstPage) {
        this.selectPage(this.selectedPage-1)
      }
    });
    $('button.next-btn').on('click', () => {
      if (this.selectedPage < this.lastPage) {
        this.selectPage(this.selectedPage+1)
      }
    });
    this.pageListPopoverDiv = $('div.page-list-popover');
    this.rebuildPageList();

    let pageNumberSpan = $('div.page-info');

    this.pageInfoPopper = Popper.createPopper(
      pageNumberSpan.get(0),
      this.pageListPopoverDiv.get(0),
      {
        placement: 'bottom',
        modifiers: [ {
          name: 'offset',
          options: { offset: [ 0, 0]}
        }]
      }
    )
    this.pageInfoPopperShown = false
    pageNumberSpan.on('click', () => {
      if (this.pageInfoPopperShown) {
        this.hidePageListPopover()
      } else {
        this.showPageListPopover()
      }
    })

    this.split = Split( {
      columnGutters: [{
        track: 1,
        element: document.querySelector('div.divider'),
      }],
      // onDragStart: (direction, track) => { console.log(`Dragging ${direction}:${track}`)},
      // onDragEnd: (direction, track) => {console.log(`Drag end ${direction}:${track}`)}
    })

    for (let i = this.firstPage; i <= this.lastPage; i++) {
      $(`.page-select-${i}`).on('click', (ev) => {
        ev.preventDefault();
        this.selectPage(i);
      })
    }
    this.selectPage(this.firstPage);
    this.maximizeElementsHeight();

    $(window).on('resize', () => {
      this.maximizeElementsHeight();
    });
  }

  maximizeElementsHeight() {

    let rightPanelHeight = $('div.right-panel').height();
    let tabsHeight = $('div.tabs').height();
    let panelContentHeight = rightPanelHeight - tabsHeight;
    // console.log(`Right panel: ${rightPanelHeight}, tabs: ${tabsHeight}, content: ${panelContentHeight}`)
    $('div.right-panel .tab-pane').outerHeight(panelContentHeight);

    [ 'div.page-list-panel'].forEach( (panelSelector) => {
      let toolbarHeight = $(`${panelSelector} div.panel-toolbar`).height();
      // console.log(`Panel ${panelSelector}: toolbar height = ${toolbarHeight}`);
      $(`${panelSelector} div.panel-content`).outerHeight(panelContentHeight - toolbarHeight -1 );
    })

  }

  rebuildPageList() {
    $('div.page-list-panel .panel-content').html(this.getPageListHtml(true))
    this.pageListPopoverDiv.html(this.getPageListHtml(false));
    this.setupEventHandlersForPageTable()
  }

  hidePageListPopover() {
    this.pageListPopoverDiv.get(0).removeAttribute('data-show')
    this.pageInfoPopperShown = false
  }

  getPageListHtml(withThumbnails = true) {
    let divs = []
    this.pageArray.forEach( (page) => {
      let classes = [ `page-div`, `page-div-${page['sequence']}`, `type${page['type']}`]
      if (page['foliationIsSet']) {
        classes.push('foliation-set');
      }
      if (!page['isTranscribed']) {
        classes.push('without-transcription');
      }

      let thumbnailDiv = withThumbnails ? `<div class="thumbnail-div">
            <img src="${urlGen.siteBlankThumbnail()}" class="thumbnail-${page['sequence']} hidden"
                height="200px" alt="Page ${page['sequence']} thumbnail">
            </div>` : '';
      divs.push(`<div class="page-big-div page-big-div-${page['sequence']}">
            ${thumbnailDiv}
            <div class="${classes.join(' ')}">${page['foliation']}</div>
        </div>`);
    })
    return `<div class="page-list-contents">${divs.join('')}</div>` ;
  }


  setThumbnailSize(size) {
    this.pageArray.forEach( (page) => {
      let thumbnailImg = $(`img.thumbnail-${page['sequence']}`);
      if (size === 0) {
        thumbnailImg.addClass('hidden')
      } else {
        thumbnailImg.attr('height', `${size}px`).removeClass('hidden')
      }
    })
  }

  loadThumbnails() {
    const parallelRequests = 5;
    return new Promise( async (outerResolve) => {
      for (let i = 0; i < this.pageArray.length; i+=parallelRequests) {
        let promises = [];
        for (let j = 0; i+j < this.pageArray.length && j < parallelRequests; j++) {
          let page = this.pageArray[i+j];
          if (this.thumbnails === 'none') {
            console.log(`Thumbnail set to 'none', aborting actual loading of thumbnails at sequence ${page['sequence']}`);
            outerResolve();
            return;
          }
          promises.push(  new Promise( (resolve) => {
            let thumbnailUrl = page['thumbnailUrl'];
            if (thumbnailUrl === '') {
              thumbnailUrl = page['jpgUrl'];
              if (thumbnailUrl === '') {
                resolve();
                return;
              }
            }
            let thumbnailImg = $(`img.thumbnail-${page['sequence']}`);
            let currentUrl = thumbnailImg.attr('src');
            if (currentUrl === page['thumbnailUrl']) {
              resolve();
            } else {
              // console.log(`Fetching thumbnail for page ${page['sequence']}`);
              thumbnailImg.attr('src', thumbnailUrl).on('load', () => {
                resolve()
              });
            }
          }));
        }
        await Promise.all(promises);
      }
      outerResolve()
    })
  }



  showPageListPopover() {
    this.pageListPopoverDiv.get(0).setAttribute('data-show', '');
    this.pageInfoPopper.update().then( () => {
      this.pageInfoPopperShown = true;
    });
  }

  setupEventHandlersForPageTable() {
    this.pageArray.forEach( (page) => {
      $(`div.page-big-div-${page['sequence']}`).on('click', () => {
        this.selectPage(page['sequence'])
        if (this.pageInfoPopperShown) {
          this.hidePageListPopover()
        }
      })
    })
  }

  getPageSequenceToPageKeyMap(pages) {
    let map = []
    Object.keys(pages).forEach( (pageKey) => {
      map[pages[pageKey]['seq']] = pageKey
    })
    return map
  }

  async getDocInfoHtml() {
    let langName = await this.apmDataProxy.getEntityName(this.docInfo.lang)
    let docTypeName = await this.apmDataProxy.getEntityName(this.docInfo.doc_type)
    let items = []
    items.push(tr(`${langName} ${docTypeName}`) + ', ' + tr('{{num}} of {{total}} pages transcribed',
      { num:this.doc['numTranscribedPages'], total:  this.doc['numPages']}));


    switch(this.docInfo.image_source) {
      case 'averroes-server':
        items.push('Images stored in the Averroes server');
        break;

      case 'bilderberg':
        items.push('Images stored in Bilderberg');
        break;
    }
    items.push(`Doc ID: ${this.docInfo.id}, Entity ID: ${Tid.toBase36String(this.docInfo['tid'])}`)

    return `<div class="doc-basic-data">` + items.map( (item) => { return `<p>${item}</p>`}).join('') + '</div>'
  }

  getExtraClassesForPageContentDiv () {
    return [ 'doc-page'];
  }

  async genContentHtml() {

    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label:  this.docInfo.title, active:  true}
    ])
    return `
    <div class="doc-page-breadcrum">${breadcrumbHtml}</div>
    <div class="doc-page-header">
    </div>
    <div class="doc-page-content">
        <div class="page-viewer">
            <div class="viewer-toolbar">
                    <div>
                        <button class="btn first-btn" title="First Page"><i class="fa fa-step-backward" aria-hidden="true"></i></button>
                        <button class="btn prev-btn" title="Previous Page"><i class="fa fa-chevron-left" aria-hidden="true"></i>
                            </button>
                    </div>
                    <div class="page-info"></div>
                    <div>
                        <button class="btn next-btn" title="Next Page"><i class="fa fa-chevron-right" aria-hidden="true"></i></button>
                        <button class="btn last-btn" title="Last Page"><i class="fa fa-step-forward" aria-hidden="true"></i></button>
                    </div>    
                </div>
            <div id="osd-div" class="osd-div"></div>
        </div>
        <div class="divider"></div>
        <div class="right-panel">
            <div class="tabs">
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" data-target="#metadata" data-toggle="tab">Doc</button>
                </li>
               <li class="nav-item" role="presentation">
                <button class="nav-link" data-target="#page-list" data-toggle="tab">Pages</button>
            </li>
             <li class="nav-item">
                <button class="nav-link" data-target="#page-contents" data-toggle="tab">Contents</button>
            </li>

            <li class="nav-item">
                <button class="nav-link" data-target="#last-saves" data-toggle="tab">Last Saves</button>
            </li>
             <li class="nav-item">
                <button class="nav-link page-info-tab-title" data-target="#page-info-tab" data-toggle="tab">Page Info</button>
             </li>
            </ul>
            </div>
            <div class="tab-content">
                <div class="tab-pane page-info-panel" id="page-info-tab"></div>
                <div class="tab-pane doc-metadata show active" id="metadata">
                     <h1>${this.docInfo.title}</h1>
                     <div class="doc-info-tag"> ${await this.getDocInfoHtml()}</div>
                      <div class="doc-admin">${this.getAdminHtml()}</div> 
                    <div>
                        <h2>Metadata</h2>
                        <p><em>TDB...</em></p>
                    </div>
                </div>
                <div class="tab-pane panel-with-toolbar page-list-panel" id="page-list">
                   <div class="panel-toolbar">
                      <div class="thumbnail-selector"></div>
                   </div>
                   <div class="panel-content">
                    
                   </div>
                </div>
                <div class="tab-pane page-contents" id="page-contents">
                     <h1>Works</h1>
                    <div class="worksinfo" id="chunkinfo">${await this.genWorkInfoHtml()}</div>   
                </div>
                <div class="tab-pane doc-last-saves" id="last-saves">
                    <h1>Last Saves </h1>
                    <div id="lastsaves">${await this.getLastSavesHtml()}</div>
                </div>
            </div>
        </div>
    </div>
     <!-- Page list popover -->
    <div class="page-list-popover"></div>
`
  }


  /**
   * Loads a page into OpenSeaDragon
   * @private
   * @param pageSequence
   */
  selectPage(pageSequence) {
    // console.log(`Selecting page with page sequence ${pageSequence}`)
    let pageIndex = this.pageSeqToPageKeyMap[pageSequence];
    // console.log(`Page index = ${pageIndex}`);
    let page = this.pages[pageIndex];
    // console.log(`Page`, page);
    if (this.osd !== null) {
      this.osd.destroy();
    }

    let osdOptions = {
      id: "osd-div",
      prefixUrl: urlGen.siteOpenSeadragonIconsPrefix(),
      minZoomLevel: 0.4,
      maxZoomLevel:5,
      showRotationControl: true,
      tileSources: {
        type: 'image',
        url: page['jpgUrl'],
        buildPyramid: false,
        homeFillsViewer: true
      },
      preserveImageSizeOnResize: true
    }

    let pageInfoDiv = $('div.page-info');
    pageInfoDiv.html(`<span class="page-info-foliation">${ApmPage.genLoadingMessageHtml('')}</span>`);
    this.osd = new OpenSeadragon(osdOptions);
    // console.log(`Loading image...`)
    this.osd.addHandler('open', () => {
      // console.log(`Image loaded`);
      pageInfoDiv.html(`<span title="Click to show page list" class="page-info-foliation">${page['foliation']}</span>`);
    })
    $('.page-selected').removeClass('page-selected');
    $(`div.page-div-${page['sequence']}`).addClass('page-selected');
    $('.page-info-tab-title').html(`Page ${page['foliation']}`)
    $('div.page-info-panel').html(this.getPageInfoHtml(pageIndex));
    let foliationIsSet = page['foliationIsSet'];
    let foliationWarningElement = $('div.page-info-panel span.foliation-warning');
    let foliationEditor = new EditableTextField({
      containerSelector: `div.page-info-panel span.foliation-span`,
      initialText: page['foliation'],
      onConfirm: (ev) => {
        let data = ev.originalEvent.detail;
        let newText = trimWhiteSpace(data.newText);
        if (newText === '') {
          foliationEditor.setText(page['foliation']);
          return true;
        }
        if (!foliationIsSet || newText !== data.oldText) {
          foliationWarningElement.html(`Saving foliation...`);
          this.saveFoliation(pageIndex, newText).then ( () => {
            console.log(`Foliation saved`);
            this.pages[pageIndex].foliation = newText;
            this.pages[pageIndex].foliationIsSet = true;
            this.rebuildPageList()
            this.selectPage(pageSequence);
          }).catch( (e) => {
            console.warn(`Error saving foliation for page ${pageIndex}: ${e}`);
            foliationWarningElement.html(`Error saving foliation`);
            foliationEditor.setText(page['foliation']);
          })
        }
      }
    })
    this.selectedPage = pageSequence;
  }


  /**
   *
   * @param {number}pageIndex
   * @param {string}newFoliation
   * @return {Promise<void>}
   */
  async saveFoliation(pageIndex, newFoliation) {
    let page = this.pages[pageIndex]
    await this.apmDataProxy.savePageSettings(page['pageId'], newFoliation, page['type'], page['langCode'])
  }

  getPageInfoHtml(pageIndex) {
    let page = this.pages[pageIndex]
    let infoItems = []
    infoItems.push(`<strong>${tr('Page Id')}</strong>: ${page['pageId']}`)
    infoItems.push('&nbsp;')
    let foliationWarning = ''
    if (!page['foliationIsSet']) {
      foliationWarning = `${tr('Foliation not set, using sequence number')}`
    }
    infoItems.push(`<strong>${tr('Foliation')}</strong>: <span class="foliation-span"></span>`)
    if (foliationWarning !== '') {
      infoItems.push(`<span class="foliation-warning text-warning"><i class="bi bi-exclamation-triangle"></i> ${foliationWarning}</span>`)
    }
    infoItems.push('&nbsp;')
    infoItems.push(`<strong>${tr('Page Number')}</strong>: ${page['pageNumber']}`)
    infoItems.push(`<strong>${tr('Image Number')}</strong>: ${page['imageNumber']}`)
    infoItems.push(`<strong>${tr('Sequence Number')}</strong>: ${page['sequence']}`)
    infoItems.push('&nbsp;')
    infoItems.push(`<strong>${tr('Image Links')}</strong>: <a class="image-link" 
        title="${tr('Click to open in new tab/window')}" href="${page['jpgUrl']}" target="_blank">JPG</a>`)

    infoItems.push('&nbsp;')
    infoItems.push(`<strong>${tr('Page Type')}</strong>: ${this.pageTypes[page['type']]}`)
    infoItems.push(`<strong>${tr('Columns Defined')}</strong>: ${page['numCols']}`)
    infoItems.push('&nbsp;')
    infoItems.push(`<a class="btn btn-primary btn-sm" href="${urlGen.sitePageView(this.docId, page['sequence'])}" title="${tr('Click to edit in new tab/window')}" target="_blank">
     ${tr('Edit Transcription')}</a>`)
    return infoItems.map( item => `<div class="page-info-item">${item}</div>`).join('')
  }

  getAdminHtml() {

    let editDocUrl = urlGen.siteDocEdit(this.docId)
    let editDocumentHtml = this.canEditDocuments ?
      `<a class="btn btn-sm btn-primary" href="${editDocUrl}">Edit Document</a>` : '';

    let defineDocPagesUrl = urlGen.siteDocDefinePages(this.docId);
    let definePagesHtml = this.canDefinePages ?
      `<a class="btn btn-sm btn-primary" href="${defineDocPagesUrl}">Define pages</a>` : '';

    return `${editDocumentHtml} ${definePagesHtml}`;
  }
  async genWorkInfoHtml() {
    if (Object.keys(this.chunkInfo).length === 0) {
      return '<ul>No chunk start/end marks found</ul>';
    }
    let html = '<ul>';
    let chunkInfo = this.chunkInfo;
    for (const workDareId in this.chunkInfo) {
      if (!this.chunkInfo.hasOwnProperty(workDareId)) {
        continue;
      }
      let workData = await this.apmDataProxy.getWorkDataOld(workDareId)
      let authorData = await this.apmDataProxy.getPersonEssentialData(workData['authorTid'])
      html += `<li><a href="${urlGen.sitePerson(Tid.toBase36String(authorData.tid))}">${authorData.name}</a>, 
            <a href="${urlGen.siteWorkPage(workDareId)}"><em>${workData['title']}</em> (${workDareId})</a>`
      html += '<ul><li>';
      let tdArray = [];
      for (const chunkNumber in chunkInfo[workDareId]) {
        if (!chunkInfo[workDareId].hasOwnProperty(chunkNumber)) {
          continue;
        }
        let tdHtml = '';
        tdHtml += await this.getChunkLabelHtml(workDareId, chunkNumber) + ': ';
        let segmentArray = [];
        for (const segmentNumber in chunkInfo[workDareId][chunkNumber]) {
          if (!chunkInfo[workDareId][chunkNumber].hasOwnProperty(segmentNumber)) {
            continue;
          }
          let segmentHtml = '';
          let segmentInfo = chunkInfo[workDareId][chunkNumber][segmentNumber];
          let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLinkFromSegmentInfo(segmentInfo['start']);
          let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLinkFromSegmentInfo(segmentInfo['end']);
          segmentHtml += startLabel + ' &ndash; ' + endLabel;
          if (!segmentInfo['valid']) {
            segmentHtml += ' <a href="#" title="' + segmentInfo['errorMsg'] + '">*</a>';
          }
          segmentArray.push({ seg: segmentNumber, html: segmentHtml });
        }
        if (segmentArray.length > 1) {
          tdHtml += '<small>' + segmentArray.length + ' segments <br/>';
          for (const i in segmentArray) {
            tdHtml += '&nbsp;&nbsp;' + segmentArray[i].seg + ': ' + segmentArray[i].html + '<br/>';
          }
        }
        else {
          tdHtml += '<small>' + segmentArray[0].html;
        }
        tdHtml += '&nbsp;';
        tdHtml += this.getChunkLink(workDareId, chunkNumber);
        tdHtml += '</small>';
        tdArray.push(tdHtml);
      }
      // @ts-ignore
      html += ApmUtil.getTable(tdArray, 5, 'chunktable');
      html += '</ul>';
    }
    return html;
  }
  async getChunkLabelHtml(work, chunk) {
    let dataContent
    if (!this.isChunkValid(work, chunk)) {
      dataContent = 'Not defined correctly';
    }
    else {
      let formattedTime = ApmFormats.time(TimeString.toDate(this.versionInfo[work][chunk]['timeFrom']))
      let authorName = '';
      if (this.versionInfo[work][chunk].authorId !== 0) {
        let authorData = await this.apmDataProxy.getPersonEssentialData(this.versionInfo[work][chunk]['authorTid'])
        authorName = authorData['name']
      }
      dataContent = '<b>Last change:</b><br/>' + formattedTime + '<br/>' + authorName;
    }
    return `<a href="${urlGen.siteChunkPage(work, chunk)}" target="_blank" data-toggle="popover" title="${work}-${chunk}" data-content="${dataContent}">${chunk}</a>`
  }

  isChunkValid(work, chunk) {
    for (const segmentNumber in this.chunkInfo[work][chunk]) {
      if (!this.chunkInfo[work][chunk][segmentNumber].valid) {
        return false;
      }
    }
    return true;
  }
  getChunkLink(work, chunk) {
    let icon = '<span class="glyphicon glyphicon-new-window"></span>';
    // @ts-ignore
    return '<a href="' + urlGen.siteChunkPage(work, chunk) + '" target="_blank" title="Open chunk page ' +
      work + '-' + chunk + ' in new tab">' +
      icon + '</a>';
  }
  /**
   *
   * @param {int} authorTid
   * @return {Promise<string>}
   */
  async getAuthorLink(authorTid) {
    if (authorTid === 0) {
      return 'n/a';
    }
    let authorData = await this.apmDataProxy.getPersonEssentialData(authorTid)
    let url = urlGen.sitePerson(Tid.toBase36String(authorData['tid']));
    return `<a href="${url}" title="View user profile" target="_blank">${authorData['name']}</a>`;
  }

  async getLastSavesHtml() {
    let html = '<ol>';
    for (const i in this.lastSaves) {
      let versionInfo = this.lastSaves[i];
      // @ts-ignore
      let formattedTime = ApmFormats.timeString(versionInfo['timeFrom']);
      let authorLink = await this.getAuthorLink(versionInfo['authorTid']);
      html += '<li> Page ' + this.getPageLinkFromPageId(versionInfo.pageId, versionInfo.column) + ', ' +
        formattedTime + ' by ' + authorLink + '</li>';
    }
    html += '</ol>';
    return html;
  }
  getPageLinkFromSegmentInfo(segmentInfo) {
    let foliation = segmentInfo['foliation'];
    let pageSeq = segmentInfo['seq'];
    let label = foliation;
    if (segmentInfo['numColumns'] > 1) {
      label += ' c' + segmentInfo['column'];
    }
    return this.getPageLink(pageSeq, label);
  }

  getPageLink(pageSeq, label) {
    return `<a href="#" title= "${tr('Click to select page')}" class="page-select-${pageSeq}">${label}</a>`
  }

  getPageLinkFromPageId(pageId, col) {
    let pageInfo = this.pages[pageId];
    let foliation = pageInfo.foliation;
    let pageSeq = pageInfo.sequence;
    let label = foliation;
    if (pageInfo.numCols > 1) {
      label += ' c' + col;
    }
    return this.getPageLink(pageSeq, label);
  }
}

// Load as global variable so that it can be referenced in the Twig template
window.DocPage = DocPage