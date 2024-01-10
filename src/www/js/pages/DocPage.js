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

export class DocPage extends NormalPage {
  constructor(options) {
    super(options)

    let oc = new OptionsChecker({
      context: 'DocPage',
      optionsDefinition: {
        doc: { type: 'object', required: true},
        chunkInfo: {type: 'object', required: true},
        versionInfo: { type: 'object', required: true},
        lastSaves: { type: 'object', required: true},
        canDefinePages: {type: 'boolean', default: false}
      }
    })

    this.options = oc.getCleanOptions(options)

    this.chunkInfo = this.options.chunkInfo;
    this.doc = this.options.doc
    this.docInfo = this.doc.docInfo
    this.docId = this.docInfo.id
    this.pages = this.doc.pages
    this.pageSeqToPageKeyMap = this.getPageSequenceToPageKeyMap(this.pages)
    this.pageArray = PageArray.getPageArray(this.pages, 'sequence')

    console.log(`DocPage for docId ${this.docId}`)
    console.log(options)

    this.firstPage = Math.min(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)))
    this.lastPage = Math.max(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)))

    this.versionInfo = this.options.versionInfo
    this.authors = this.options.authorInfo;
    this.lastSaves = this.options.lastSaves;
    this.canDefinePages = this.options.canDefinePages
    this.osd = null

    this.initPage().then( () => {
      console.log('Finished initializing page')
    })

  }

  async initPage () {
    await super.initPage();


    let pageTypesData = await this.apmDataProxy.getAvailablePageTypes();
    this.pageTypes = [];
    pageTypesData.forEach( ( ptd) => {
      this.pageTypes[ptd.id] = ptd.descr;
    })

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
    })
    $('button.next-btn').on('click', () => {
      if (this.selectedPage < this.lastPage) {
        this.selectPage(this.selectedPage+1)
      }
    })

    let toolbarPageInfoDiv =  $('div.page-info')
    this.rebuildPageList()

    // this.pageInfoPopper = Popper.createPopper(
    //   toolbarPageInfoDiv.get(0),
    //   this.pageListPopoverDiv.get(0),
    //   {
    //     placement: 'bottom',
    //     modifiers: [ {
    //       name: 'offset',
    //       options: { offset: [ 0, 0]}
    //     }]
    //   }
    // )
    // this.pageInfoPopperShown = false
    // toolbarPageInfoDiv.on('click', () => {
    //   if (this.pageInfoPopperShown) {
    //     this.hidePageListPopover()
    //   } else {
    //     this.showPageListPopover()
    //   }
    // })
    this.selectPage(this.firstPage)
  }

  rebuildPageList() {
    // this.pageListPopoverDiv = $('div.page-list-popover')
    $('div.page-list-left-pane').html(this.getPageListHtml(this.docId, this.pageArray, false))
    // this.pageListPopoverDiv.html(this.getPageListHtml(this.docId, this.pageArray))
    this.setupEventHandlersForPageTable()
  }

  hidePageListPopover() {
    // this.pageListPopoverDiv.get(0).removeAttribute('data-show')
    this.pageInfoPopperShown = false
  }
  getPageListHtml() {
    let divs = []
    this.pageArray.forEach( (page) => {
      let classes = [ `page-div`, `page-div-${page['sequence']}`, `type${page['type']}`]
      if (page['foliationIsSet']) {
        classes.push('foliation-set');
      }
      if (!page['isTranscribed']) {
        classes.push('without-transcription');
      }
      divs.push(`<div class="page-big-div page-big-div-${page['sequence']}">
            <div class="thumbnail-div">
            <img src="${urlGen.siteBlankThumbnail()}" class="thumbnail-${page['sequence']} hidden"
                height="200px" alt="Page ${page['sequence']} thumbnail">
            </div>
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
              console.log(`Fetching thumbnail for page ${page['sequence']}`);
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



  // showPageListPopover() {
  //   this.pageListPopoverDiv.get(0).setAttribute('data-show', '');
  //   this.pageInfoPopper.update().then( () => {
  //     this.pageInfoPopperShown = true;
  //   });
  // }

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
      map[pages[pageKey]['sequence']] = pageKey
    })
    return map
  }

  async getDocInfoHtml() {
    let langName = await this.apmDataProxy.getLangName(this.docInfo.lang)
    let docTypeName = await this.apmDataProxy.getDocTypeName(this.docInfo.doc_type)
    let items = []
    items.push(tr(`${langName} ${docTypeName}`))
    items.push(tr('{{num}} of {{total}} pages transcribed',
      { num:this.doc['numTranscribedPages'], total:  this.doc['numPages']}));

    switch(this.docInfo.image_source) {
      case 'averroes-server':
        items.push('images stored in the Averroes server');
        break;

      case 'bilderberg':
        items.push('images stored in Bilderberg');
        break;
    }
    items.push(`doc ${this.docInfo.id}`)

    items.push(`entity ${Tid.toBase36String(this.docInfo.tid)}`)

    return items.join(', ')
  }

  getExtraClassesForPageContentDiv () {
    return [ 'doc-page'];
  }

  async genHtml() {

    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label: 'Document Details', active: true}
    ])
    return `
    <div>${breadcrumbHtml}</div>
    <div class="doc-page-header">
            <h2>${this.docInfo.title}</h2>
            <div class="doc-info-tag"> ${await this.getDocInfoHtml()}</div>
            <div class="doc-admin">${this.getAdminHtml()}</div> 
        </div>
    <div class="doc-page-content">
        <div class="left-pane"> 
         <div>
            <div class="thumbnail-selector"></div>
            <div class="page-list-left-pane"></div>
          </div>
         <div> 
            <h4>Works</h4>
            <div class="worksinfo" id="chunkinfo">${await this.genWorkInfoHtml()}</div>
        </div>
            <div>
            <h4>Last Saves </h4>
            <div id="lastsaves">${await this.getLastSavesHtml()}</div>
        </div> 
        </div>
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
        <div class="page-info-panel"></div>
    </div>
     <!-- Page list menu -->
    <div class="page-list-popover"></div>
`
  }

//   getPageListHtml(docId, pageArray, withHeader = true) {
//     let divs = []
//     pageArray.forEach( (page) => {
//       let classes = [ 'page-div', `page-div-${page['sequence']}`, `type${page['type']}`]
//       if (page['foliationIsSet']) {
//         classes.push('foliation-set')
//       }
//       if (!page['isTranscribed']) {
//         classes.push('without-transcription')
//       }
//       divs.push( `<div title="Click to select page" class="${classes.join(' ')}">${page['foliation']}</div>`)
//     })
//     let header = withHeader ? `<div class="page-list-header">Page List</div>` : ''
//     return `<div class="page-list">
//            ${header}
//            <div class="page-list-contents">
//             ${divs.join('')}
//             </div>
//
// </div>`
//   }

  /**
   * Loads a page into OpenSeaDragon
   * @private
   * @param pageSequence
   */
  selectPage(pageSequence) {
    let pageIndex = this.pageSeqToPageKeyMap[pageSequence];
    let page = this.pages[pageIndex];
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
    this.osd = new OpenSeadragon(osdOptions);
    $('.page-selected').removeClass('page-selected');
    $(`div.page-div-${page['sequence']}`).addClass('page-selected');
    $('div.page-info').html(`<span title="Click to show page list" class="page-info-foliation">${page['foliation']}</span>`);
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
    if (!this.canDefinePages) {
      return ''
    }
    let editDocUrl = urlGen.siteDocEdit(this.docId)
    let defineDocPagesUrl = urlGen.siteDocDefinePages(this.docId)
    return `<a class="" href="${editDocUrl}">Edit Document</a> 
        <a class="" href="${defineDocPagesUrl}">Define pages</a>`
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
      let workData = await this.apmDataProxy.getWorkData(workDareId)
      let authorData = await this.apmDataProxy.getPersonData(workData['authorTid'])
      html += '<li>' + authorData['name'] + ', <em>' + workData['title'] + '</em> (' + workDareId + ')';
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
          let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLink(segmentInfo['start']);
          let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLink(segmentInfo['end']);
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
      let formattedTime = ApmUtil.formatVersionTime(this.versionInfo[work][chunk]['timeFrom'])
      let authorName = '';
      if (this.versionInfo[work][chunk].authorId !== 0) {
        let authorData = await this.apmDataProxy.getPersonData(this.versionInfo[work][chunk]['authorTid'])
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
    let authorData = await this.apmDataProxy.getPersonData(authorTid)
    let url = urlGen.siteUserProfile(authorData['userName']);
    return `<a href="${url}" title="View user profile" target="_blank">${authorData['name']}</a>`;
  }

  async getLastSavesHtml() {
    let html = '<ol>';
    for (const i in this.lastSaves) {
      let versionInfo = this.lastSaves[i];
      // @ts-ignore
      let formattedTime = ApmUtil.formatVersionTime(versionInfo['timeFrom']);
      let authorLink = await this.getAuthorLink(versionInfo['authorTid']);
      html += '<li> Page ' + this.getPageLink2(versionInfo.pageId, versionInfo.column) + ', ' +
        formattedTime + ' by ' + authorLink + '</li>';
    }
    html += '</ol>';
    return html;
  }
  getPageLink(segmentInfo) {
    let foliation = segmentInfo['foliation'];
    let pageSeq = segmentInfo['seq'];
    let title = 'View Page ' + segmentInfo['foliation'] + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = urlGen.sitePageView(this.docId, pageSeq);
    if (segmentInfo['numColumns'] > 1) {
      title = 'View Page ' + segmentInfo['foliation'] + ' column ' + segmentInfo['column'] + ' in new tab';
      // @ts-ignore
      url = urlGen.sitePageView(this.docId, pageSeq, segmentInfo['column']);
      label += ' c' + segmentInfo['column'];
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
  getPageLink2(pageId, col) {
    let pageInfo = this.pages[pageId];
    let foliation = pageInfo.foliation;
    let pageSeq = pageInfo.sequence;
    let title = 'View Page ' + foliation + ' in new tab';
    let label = foliation;
    // @ts-ignore
    let url = urlGen.sitePageView(this.docId, pageSeq);
    if (pageInfo.numCols > 1) {
      title = 'View Page ' + foliation + ' col ' + col + ' in new tab';
      // @ts-ignore
      url = urlGen.sitePageView(this.docId, pageSeq, col);
      label += ' c' + col;
    }
    // @ts-ignore
    return '<a href="' + url + '" target="_blank" title="' + title + '">' + label + '</a>';
  }
}

// Load as global variable so that it can be referenced in the Twig template
window.DocPage = DocPage