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
import {NormalPage, NormalPageOptions} from './NormalPage';
import { urlGen } from './common/SiteUrlGen'
import { tr } from './common/SiteLang'
import { EditableTextField } from '@/widgets/EditableTextField'
import { trimWhiteSpace } from '@/toolbox/Util'
import { Tid } from '@/Tid/Tid'
import { PageArray } from './common/PageArray'
import { MultiToggle } from '@/widgets/MultiToggle'
import { ApmUtil } from '@/ApmUtil'
import { ApmFormats } from './common/ApmFormats'
import { TimeString } from '@/toolbox/TimeString'
import Split, {SplitInstance} from 'split-grid';
import { ApmPage } from './ApmPage'
import * as Entity from '../constants/Entity'
import { MetadataEditorSchema } from '@/MetadataEditor/MetadataEditorSchemata/MetadataEditorSchema'
import { MetadataEditor } from '@/MetadataEditor/MetadataEditor'
import { WidgetAddPages } from '@/WidgetAddPages'
import { CollapsePanel } from '@/widgets/CollapsePanel'
import { SetLanguage } from '@/widgets/SetLanguage'
import {DocInfoLegacy} from "@/Api/DataSchema/ApiDocuments";
import {SchemaInterface} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";
import { EntityDataInterface } from "@/Api/DataSchema/ApiEntity";
import OpenSeadragon from "openseadragon";

const TabId_DocDetails = 'doc-info';
const TabId_Pages = 'page-list';
const TabId_Contents = 'contents';
const TabId_LastSaves = 'last-saves';
const TabId_PageInfo = 'page-info';

interface DocPageOptions extends NormalPageOptions {
  doc: DocProps,
  chunkInfo: ChunkMap,
  versionInfo: Record<string, Record<number, VersionInfo>>,
  lastSaves: VersionInfo[],
  canDefinePages?: boolean,
  canEditDocuments?: boolean,
  params: string[],
  selectedPage?: number,
  metadata: any[]
}

interface DocProps {
  docInfo: DocInfoLegacy;
  editors: number[];
  numPages: number;
  numTranscribedPages: number;
  pages: Record<number, OverkillPageInfoItem>;
  tableId: string;
}

type ChunkMap = Record<string, ChunkMapForWork>
type ChunkMapForWork = Record<number, SegmentDataForChunk>
type SegmentDataForChunk = Record<number, SegmentInfoItem>

interface SegmentInfoItem {
  start: StartEndInfo;
  end: StartEndInfo;
  errorCode: number;
  errorMsg: string;
  valid: boolean;
}

interface StartEndInfo {
  seq: number;
  column: number;
  numColumns: number;
  foliation: string;
}

export interface OverkillPageInfoItem {
  doc_id: number;
  foliation: string;
  foliationIsSet: boolean;
  id: number;
  imageNumber: number;
  imageSource: number;
  imageUrl: string;
  img_number: number;
  isDeepZoom: boolean;
  isTranscribed: boolean;
  jpgUrl: string;
  lang: number;
  numCols: number;
  num_cols: number;
  pageId: number;
  pageNumber: number;
  page_number: number;
  seq: number;
  sequence: number;
  thumbnailUrl: string;
  type: number;
  valid_from: string;
  valid_until: string;
}

interface VersionInfo {
  authorTid: number;
  column: number;
  description: string;
  id: number;
  isMinor: boolean;
  isPublished: boolean;
  isReview: boolean;
  pageId: number;
  timeFrom: string;
  timeUntil: string;
}

export class DocPage extends NormalPage {

  options:DocPageOptions;
  private chunkInfo: ChunkMap;
  private doc: DocProps;
  docInfo: DocInfoLegacy;
  private docId: number;
  pages: Record<number, OverkillPageInfoItem>;
  private pageSeqToPageKeyMap: Record<number, number>;
  pageArray: OverkillPageInfoItem[];
  firstPage: number;
  private lastPage: number;
  private versionInfo: Record<string, Record<number, VersionInfo>>;
  authors: any;
  lastSaves: VersionInfo[];
  private canDefinePages: boolean;
  canEditDocuments: boolean;
  private osd: OpenSeadragon.Viewer|null;
  private selectedPage: number;
  tabSlugs: Record<string, string>;
  tabTitles: Record<string, string>;
  initialTab: string;
  private currentTab: string;
  private initialPage: number;
  docPageUrl: string;
  private reestablishingPreviousState: boolean;
  private initialState: { tab: string; selectedPage: number };
  private pageTypes: Record<number, string> = [];
  private entityData!: EntityDataInterface;
  private schema!: SchemaInterface;
  private thumbnails: string = 'none';
  private thumbnailToggle!: MultiToggle;
  private pageListPopoverDiv!: JQuery<HTMLElement>;
  private pageInfoPopper: any;
  private pageInfoPopperShown: boolean = false;
  private split!: SplitInstance;

  constructor(options: DocPageOptions) {
    super(options);

    const defaults = {
      canDefinePages: false,
      canEditDocuments: false,
      params: [],
      selectedPage: 0
    }
    this.options = { ...defaults, ...options};

    this.chunkInfo = this.options.chunkInfo;
    this.doc = this.options.doc;
    this.docInfo = this.doc.docInfo;
    this.docId = this.docInfo.id;
    this.pages = this.doc.pages;

    Object.keys(this.pages).forEach( (key) => {
      const pageId = Number(key);
      if (this.pages[pageId]['foliation'] === null) {
        this.pages[pageId]['foliation'] = this.pages[pageId]['seq'].toString();
      }
    });


    this.pageSeqToPageKeyMap = this.getPageSequenceToPageKeyMap(this.pages);
    this.pageArray = PageArray.getPageArray(this.pages, 'sequence');

    console.log(`DocPage for docId ${this.docId}`);
    console.log(options);
    this.firstPage = -1;
    this.lastPage = -1;

    if (Object.keys(this.pageSeqToPageKeyMap).length !== 0) {
      this.firstPage = Math.min(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)));
      this.lastPage = Math.max(...Object.keys(this.pageSeqToPageKeyMap).map( k => parseInt(k)));
    }

    this.versionInfo = this.options.versionInfo;
    // this.authors = this.options.authorInfo;
    this.lastSaves = this.options.lastSaves;
    this.canDefinePages = this.options.canDefinePages ?? false;
    this.canEditDocuments = this.options.canEditDocuments ?? false;
    this.osd = null;
    this.selectedPage = -1;

    this.tabSlugs={};
    this.tabSlugs[TabId_DocDetails] = '';
    this.tabSlugs[TabId_Pages] = 'pages';
    this.tabSlugs[TabId_Contents] = 'contents';
    this.tabSlugs[TabId_LastSaves] = 'lastSaves';
    this.tabSlugs[TabId_PageInfo] = 'page';

    // titles to be used in the document's title
    // actual tab title in the browser is set in the HTML generator function
    this.tabTitles = {};
    this.tabTitles[TabId_DocDetails] = '';
    this.tabTitles[TabId_Pages] = 'Pages Tab';
    this.tabTitles[TabId_Contents] = 'Contents Tab';
    this.tabTitles[TabId_LastSaves] = 'Last Saves Tab';
    this.tabTitles[TabId_PageInfo] = 'page';

    this.initialTab = TabId_DocDetails;
    this.currentTab = this.initialTab;
    this.initialPage = this.firstPage;
    if (this.options.selectedPage !== 0) {
      this.initialPage = this.options.selectedPage ?? 0;
    }
    this.docPageUrl = urlGen.siteDocPage(Tid.toBase36String(this.docId));
    // parse params
    if (this.options.params.length !== 0) {
      switch(this.options.params[0]) {
        case this.tabSlugs[TabId_Pages]:
          this.initialTab = TabId_Pages;
          break;

        case this.tabSlugs[TabId_Contents]:
          this.initialTab = TabId_Contents;
          break;

        case this.tabSlugs[TabId_LastSaves]:
          this.initialTab = TabId_LastSaves;
          break;

        case this.tabSlugs[TabId_PageInfo]:
          this.initialTab = TabId_PageInfo;
          this.initialPage = parseInt(this.options.params[1]);
          if (this.initialPage < this.firstPage){
            this.initialPage = this.firstPage;
          }
          if (this.initialPage > this.lastPage) {
            this.initialPage = this.lastPage;
          }
          break;
      }
    }
    this.initialState = { tab: this.initialTab, selectedPage: this.initialPage};
    window.history.replaceState(this.initialState, '', this.getUrlForTab(this.initialTab, this.initialPage));
    this.reestablishingPreviousState = false;

    // console.log(`Ready to init page`, window.history.state);


    this.initPage().then( () => {
      document.title = this.getTitle();
      $(`.btn-${TabId_DocDetails}`).on('show.bs.tab', this.genOnShowTab(TabId_DocDetails));
      $(`.btn-${TabId_Pages}`).on('show.bs.tab', this.genOnShowTab(TabId_Pages));
      $(`.btn-${TabId_Contents}`).on('show.bs.tab', this.genOnShowTab(TabId_Contents));
      $(`.btn-${TabId_LastSaves}`).on('show.bs.tab', this.genOnShowTab(TabId_LastSaves));
      $(`.btn-${TabId_PageInfo}`).on('show.bs.tab', this.genOnShowTab(TabId_PageInfo));
      window.onpopstate = this.genOnPopState();
      console.log('Finished initializing page');
    })
  }

  getTitle() {
    let title = this.docInfo['title'];

    if (this.currentTab === TabId_PageInfo) {
      return `${title}: page ${this.selectedPage} details`;
    }

    if (this.currentTab !== TabId_DocDetails) {
      title += `: ${this.tabTitles[this.currentTab]}`;
    }
    if (this.selectedPage > 1) {
      title += ` (at page ${this.selectedPage})`;
    }
    return title;
  }

  /**
   * Returns the url for the given tab id and selected page
   *
   * If selectedPage is null, the current selected page is used
   */
  getUrlForTab(tabId: string, selectedPage: number|null = null): string {
    if (selectedPage === null) {
      selectedPage = this.selectedPage;
    }
    switch(tabId) {
      case TabId_DocDetails:
        if (selectedPage <= 1) {
          return this.docPageUrl;
        } else {
          return `${this.docPageUrl}?selectedPage=${selectedPage}`;
        }


      case TabId_Pages:
      case TabId_Contents:
      case TabId_LastSaves:
        if (selectedPage <= 1) {
          return `${this.docPageUrl}/${this.tabSlugs[tabId]}`;
        } else {
          return `${this.docPageUrl}/${this.tabSlugs[tabId]}?selectedPage=${selectedPage}`;
        }

      case TabId_PageInfo:
        return `${this.docPageUrl}/${this.tabSlugs[tabId]}/${selectedPage}`;
    }
    throw new Error(`Invalid tabId: ${tabId}`);
  }

  genOnShowTab(tabId: string) {
    return () => {
      // console.log(`show.bs.tab ${tabId}`);
      if (this.reestablishingPreviousState) {
        // console.log(`Re-establishing previous state, nothing to do`);
        this.reestablishingPreviousState = false;
        return;
      }
      if (this.currentTab !== tabId) {
        this.currentTab = tabId;
        let newState = { tab: tabId, selectedPage: this.selectedPage};
        // console.log(`Pushing state to history`, newState)
        window.history.pushState(newState, '', this.getUrlForTab(tabId));
        document.title = this.getTitle();
      }
    }
  }

  showTab(tabId: string) {
    $(`.btn-${tabId}`).tab('show').focus();
  }

  genOnPopState() {
    return () => {
      let state =  window.history.state;
      console.log(`onpopstate`);
      console.log(`Current window.history.state`, state);
      console.log(`There are ${window.history.length} entries in the session history`);
      if (state === null) {
        console.log(`Using initial state`, this.initialState);
        state = this.initialState;
      }
      this.reestablishingPreviousState = true; // will be set to false by the tab's onShow event handler
      this.selectPage(state.selectedPage, false);
      this.showTab(state.tab);
      document.title = this.getTitle();
    }
  }

  async initPage () {
    await super.initPage();

    let pageTypesData = await this.apiClient.getAvailablePageTypes();
    this.pageTypes = [];
    for (let i = 0; i < pageTypesData.length; i++) {
      let [id, name]  = pageTypesData[i];
      this.pageTypes[id] = name;
    }


    this.entityData = await this.apiClient.getEntityData(this.docId);
    const schema =  MetadataEditorSchema.getSchema(Entity.tDocument);
    if (schema === null) {
      throw new Error('Schema not found for Document type');
    }
    this.schema =schema;
    console.log(`Entity Schema for type Document`, this.schema);


    // preload statement qualification object entities
    await this.apiClient.getStatementQualificationObjects();

    new MetadataEditor({
      containerSelector: 'div.metadata-editor',
      entityDataSchema: this.schema  ?? { type: -1, context: 'unknown', sections: []},
      entityData: this.entityData,
      apiClient: this.apiClient,
      infoStringProviders: [
        {
          name: 'docShortInfo',
          provider: async () => {
            return `${this.doc['numTranscribedPages']} of ${this.doc['numPages']} pages transcribed`
          }
        }
      ]
    });


    this.selectedPage = -1;
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

    $('button.first-btn').on('click', () => { this.selectPage(this.firstPage, true)})
    $('button.last-btn').on('click', () => { this.selectPage(this.lastPage, true)})
    $('button.prev-btn').on('click', () => {
      if (this.selectedPage > this.firstPage) {
        this.selectPage(this.selectedPage-1, true)
      }
    });
    $('button.next-btn').on('click', () => {
      if (this.selectedPage < this.lastPage) {
        this.selectPage(this.selectedPage+1, true)
      }
    });
    this.pageListPopoverDiv = $('div.page-list-popover');
    this.rebuildPageList();

    let pageNumberSpan = $('div.page-info');


    this.pageInfoPopper = Popper.createPopper(
      // @ts-ignore this should be defined
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

    const dividerElement = document.querySelector('div.divider') as HTMLElement;
    if (dividerElement === null) {
      throw new Error('Divider element not found');
    }
    this.split = Split( {
      columnGutters: [{
        track: 1,
        element: dividerElement,
      }],
      // onDragStart: (direction, track) => { console.log(`Dragging ${direction}:${track}`)},
      // onDragEnd: (direction, track) => {console.log(`Drag end ${direction}:${track}`)}
    })

    for (let i = this.firstPage; i <= this.lastPage; i++) {
      $(`.page-select-${i}`).on('click', (ev) => {
        ev.preventDefault();
        this.selectPage(i, true);
      });
    }

    new CollapsePanel({
      containerSelector: 'div.page-admin',
      title: 'Manage Pages',
      content: this.getPageAdminHtml(),
      initiallyShown: true,
      iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
      iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
      iconAtEnd: true,
    });

    new WidgetAddPages('div.add-pages-widget-container', this.docId, this.doc.numPages);
    new SetLanguage({
      containerSelector: 'div.set-default-language-container',
      defaultLanguage: this.doc.docInfo.lang,
      confirmMessage: `Are you sure you want to set this language as the default transcription language for ALL pages?`,
      onSetLanguage: async (newLanguage: number) => {
        return this.setDefaultLanguageForAllPages(newLanguage);
      }
    });


    this.selectPage(this.initialPage, false);
    this.maximizeElementsHeight();

    $(window).on('resize', () => {
      this.maximizeElementsHeight();
    });


  }

  setDefaultLanguageForAllPages(newLanguage: number) {
    let pageDefs = [];
    for(let i = 0; i < this.doc.numPages; i++) {
      pageDefs.push({
        docId: this.doc.docInfo['id'],
        page: i+1,
        lang: newLanguage
      });
    }
    return new Promise ((resolve, reject) => {
      $.post(
        urlGen.apiBulkPageSettings(),
        { data: JSON.stringify(pageDefs) }
      ).done( () => {
          resolve('');
      }).fail((resp) => {
        console.log('Could not change page settings', resp);
         reject('Could not change page settings');
        })
    });
  }

  maximizeElementsHeight() {
    let rightPanelHeight = $('div.right-panel').height();
    let tabsHeight = $('div.tabs').height();
    if (rightPanelHeight === undefined || tabsHeight === undefined) {
      return;
    }
    let panelContentHeight = rightPanelHeight - tabsHeight;
    // console.log(`Right panel: ${rightPanelHeight}, tabs: ${tabsHeight}, content: ${panelContentHeight}`)
    $('div.right-panel .tab-pane').outerHeight(panelContentHeight);

    [ 'div.page-list-panel'].forEach( (panelSelector) => {
      let toolbarHeight = $(`${panelSelector} div.panel-toolbar`).height();
      if (toolbarHeight === undefined) {
        return;
      }
      // console.log(`Panel ${panelSelector}: toolbar height = ${toolbarHeight}`);
      $(`${panelSelector} div.panel-content`).outerHeight(panelContentHeight - toolbarHeight -1 );
    })

  }

  rebuildPageList() {
    $('div.page-list-panel .page-list').html(this.getPageListHtml(true))
    this.pageListPopoverDiv.html(this.getPageListHtml(false));
    this.setupEventHandlersForPageTable()
  }

  hidePageListPopover() {
    // @ts-ignore
    this.pageListPopoverDiv.get(0).removeAttribute('data-show')
    this.pageInfoPopperShown = false
  }

  getPageListHtml(withThumbnails = true) {
    let divs: string[] = []
    this.pageArray.forEach( (page) => {
      let classes = [ `page-div`, `page-div-${page.sequence}`, `type${page.type}`]
      if (page.foliationIsSet) {
        classes.push('foliation-set');
      }
      if (!page.isTranscribed) {
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


  setThumbnailSize(size: number) {
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
    return new Promise<void>( async (outerResolve): Promise<void> => {
      for (let i = 0; i < this.pageArray.length; i+=parallelRequests) {
        let promises = [];
        for (let j = 0; i+j < this.pageArray.length && j < parallelRequests; j++) {
          let page = this.pageArray[i+j];
          if (this.thumbnails === 'none') {
            console.log(`Thumbnail set to 'none', aborting actual loading of thumbnails at sequence ${page['sequence']}`);
            outerResolve();
            return;
          }
          promises.push(  new Promise<void>( (resolve) => {
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
    // @ts-ignore
    this.pageListPopoverDiv.get(0).setAttribute('data-show', '');
    this.pageInfoPopper.update().then( () => {
      this.pageInfoPopperShown = true;
    });
  }

  setupEventHandlersForPageTable() {
    this.pageArray.forEach( (page) => {
      $(`div.page-big-div-${page['sequence']}`).on('click', () => {
        this.selectPage(page['sequence'], true)
        if (this.pageInfoPopperShown) {
          this.hidePageListPopover()
        }
      })
    })
  }

  getPageSequenceToPageKeyMap(pages:Record<number, OverkillPageInfoItem>) {
    let map: Record<number, number> = [];
    Object.keys(pages).forEach( (pageKey) => {
      const pageId = Number(pageKey);
      map[pages[pageId].seq] = pageId
    })
    return map
  }

  getExtraClassesForPageContentDiv () {
    return [ 'doc-page'];
  }



  async genContentHtml() {

    let tabActiveClasses = (tabId: string) => {
      return this.initialTab===tabId ? 'active' : '';
    }
    let buttonClasses = (tabId: string) => {
      let classes = [ `btn-${tabId}`];
      if (this.initialTab === tabId) {
        classes.push('active');
      }
      return classes.join(' ');
    }

    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: 'Documents', url:  urlGen.siteDocs()},
      { label:  this.docInfo.title, url: this.getUrlForTab(TabId_DocDetails, 1), active:  true}
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
                    <button class="nav-link ${buttonClasses(TabId_DocDetails)}" data-target="#tab-${TabId_DocDetails}" data-toggle="tab">Doc</button>
                </li>
               <li class="nav-item">
                <button class="nav-link ${buttonClasses(TabId_Pages)}" data-target="#tab-${TabId_Pages}" data-toggle="tab">Pages</button>
            </li>
             <li class="nav-item">
                <button class="nav-link ${buttonClasses(TabId_Contents)}" data-target="#tab-${TabId_Contents}" data-toggle="tab">Contents</button>
            </li>

            <li class="nav-item">
                <button class="nav-link ${buttonClasses(TabId_LastSaves)}" data-target="#tab-${TabId_LastSaves}" data-toggle="tab">Last Saves</button>
            </li>
             <li class="nav-item">
                <button class="nav-link page-info-tab-title ${buttonClasses(TabId_PageInfo)}" data-target="#tab-${TabId_PageInfo}" data-toggle="tab">Page Info</button>
             </li>
            </ul>
            </div>
            <div class="tab-content">
                <div class="tab-pane doc-metadata ${tabActiveClasses(TabId_DocDetails)}" id="tab-${TabId_DocDetails}">
                    <div class="metadata-editor">
                    </div>
                    <div>
                    Doc ${this.docId} &bull; Db ${this.pageArray[0] ? this.pageArray[0]['doc_id'] : 'N/A'} &bull; <a href="${urlGen.siteAdminEntity(this.docId)}">[ Entity Admin ]</a>
                    </div>
                   
                </div>
                <div class="tab-pane panel-with-toolbar page-list-panel ${tabActiveClasses(TabId_Pages)}" id="tab-${TabId_Pages}">
                   <div class="panel-toolbar">
                      <div class="thumbnail-selector"></div>
                   </div>
                   <div class="panel-content">
                    <div class="page-list"></div>
                    <div class="page-admin">                </div>
                    
                   </div>
                </div>
                <div class="tab-pane page-contents ${tabActiveClasses(TabId_Contents)}" id="tab-${TabId_Contents}">
                     <h1>Works</h1>
                    <div class="worksinfo" id="chunkinfo">${await this.genWorkInfoHtml()}</div>   
                </div>
                <div class="tab-pane doc-last-saves ${tabActiveClasses(TabId_LastSaves)}" id="tab-${TabId_LastSaves}">
                    <h1>Last Saves </h1>
                    <div id="lastsaves">${await this.getLastSavesHtml()}</div>
                </div>
                <div class="tab-pane page-info-panel ${tabActiveClasses(TabId_PageInfo)}" id="tab-${TabId_PageInfo}"></div>
            </div>
        </div>
    </div>
     <!-- Page list popover -->
    <div class="page-list-popover"></div>
`
  }

  getPageAdminHtml() {
    let defineDocPagesUrl = urlGen.siteDocDefinePages(Tid.toBase36String(this.docId));
    let definePagesHtml = this.canDefinePages ?
      `<a class="btn btn-sm btn-primary" href="${defineDocPagesUrl}">Define pages</a>` : '';

    return `
        <div class="page-admin-section">
            <h5>Add pages</h5><div class="add-pages-widget-container indent-m"></div>
            <h5>Set Default Language for All Pages</h5>
            <div class="set-default-language-container indent-m" style="display: flex; flex-direction: row; gap: 0.5em"></div>
            <h5>Define Pages</h5>
            <div class="indent-m">
            ${definePagesHtml}
            </div>
            </div>
        </div>
    `
  }

  /**
   * Shows a page in the viewer
   *
   * @private
   * @param pageSequence
   * @param changeBrowserHistory
   */
  selectPage(pageSequence: number, changeBrowserHistory = false) {
    // console.log(`Selecting page with page sequence ${pageSequence}`)

    if (pageSequence === -1 || this.selectedPage === pageSequence) {
      // nothing to do
      return;
    }
    let pageIndex = this.pageSeqToPageKeyMap[pageSequence];
    // console.log(`Page index = ${pageIndex}`);
    let page = this.pages[pageIndex];
    // console.log(`Page`, page);
    if (this.osd !== null) {
      console.log(`Destroying existing viewer for page ${this.selectedPage}`);
      this.osd.destroy();
      this.osd = null;
    }
    const osdElement = document.getElementById('osd-div');
    if (osdElement === null) {
      console.error('OSD element not found, cannot initialize viewer');
      return;
    }

    console.log(`Initializing viewer for page ${pageSequence}`);

    let osdOptions: OpenSeadragon.Options = {
      element: osdElement,
      prefixUrl: urlGen.siteOpenSeadragonIconsPrefix(),
      minZoomLevel: 0.4,
      maxZoomLevel:5,
      showRotationControl: true,
      tileSources: {
        type: 'image',
        url: page['jpgUrl'],
      },
      preserveImageSizeOnResize: true,
      drawer: 'canvas',
    }

    let pageInfoDiv = $('div.page-info');
    pageInfoDiv.html(`<span class="page-info-foliation">${ApmPage.genLoadingMessageHtml('')}</span>`);
    this.osd = OpenSeadragon(osdOptions);
    console.log(`Loading image...`)
    this.osd.addHandler('open', () => {
      console.log(`Image loaded`);
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
      onConfirm: (ev:any) => {
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
            this.selectPage(pageSequence, false);
            $(`div.page-info .page-info-foliation`).html(newText);
          }).catch( (e) => {
            console.warn(`Error saving foliation for page ${pageIndex}: ${e}`);
            foliationWarningElement.html(`Error saving foliation`);
            foliationEditor.setText(page['foliation']);
          })
        }
      }
    });
    this.selectedPage = pageSequence;
    if (changeBrowserHistory) {
      let newState = { tab: this.currentTab, selectedPage: this.selectedPage};
      // console.log(`Pushing state to history`, newState)
      window.history.pushState(newState, '', this.getUrlForTab(this.currentTab));
      document.title = this.getTitle();
    }
  }


  async saveFoliation(pageIndex: number, newFoliation: string): Promise<void> {
    let page = this.pages[pageIndex]
    await this.apiClient.savePageSettings(page.pageId, newFoliation, page.type, page.lang)
  }

  getPageInfoHtml(pageIndex: number) {
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

  // getAdminHtml() {
  //
  //   let defineDocPagesUrl = urlGen.siteDocDefinePages(Tid.toBase36String(this.docId));
  //   let definePagesHtml = this.canDefinePages ?
  //     `<a class="btn btn-sm btn-primary" href="${defineDocPagesUrl}">Define pages</a>` : '';
  //
  //   return `${definePagesHtml}`;
  // }
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
      let workData = await this.apiClient.getWorkDataOld(workDareId)
      let authorData = await this.apiClient.getPersonEssentialData(workData['authorTid'])
      html += `<li><a href="${urlGen.sitePerson(Tid.toBase36String(authorData.tid))}">${authorData.name}</a>, 
            <a href="${urlGen.siteWorkPage(workDareId)}"><em>${workData['title']}</em> (${workDareId})</a>`
      html += '<ul><li>';
      let tdArray = [];
      for (const chunkNumberKey in chunkInfo[workDareId]) {
        const chunkNumber = Number(chunkNumberKey);
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
          // @ts-ignore TODO: check that the chunk map generated in the server sends '' for segments without a start mark
          let startLabel = segmentInfo['start'] === '' ? '???' : this.getPageLinkFromSegmentInfo(segmentInfo.start);
          // @ts-ignore
          let endLabel = segmentInfo['end'] === '' ? '???' : this.getPageLinkFromSegmentInfo(segmentInfo.end);
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
      html += ApmUtil.getTable(tdArray, 5, 'chunktable');
      html += '</ul>';
    }
    return html;
  }
  async getChunkLabelHtml(work: string, chunk: number) {
    let dataContent
    if (!this.isChunkValid(work, chunk)) {
      dataContent = 'Not defined correctly';
    }
    else {
      let formattedTime = ApmFormats.time(TimeString.toDate(this.versionInfo[work][chunk]['timeFrom']))
      let authorName = '';
      if (this.versionInfo[work][chunk].authorTid !== 0) {
        let authorData = await this.apiClient.getPersonEssentialData(this.versionInfo[work][chunk].authorTid)
        authorName = authorData['name']
      }
      dataContent = '<b>Last change:</b><br/>' + formattedTime + '<br/>' + authorName;
    }
    return `<a href="${urlGen.siteChunkPage(work, chunk)}" target="_blank" data-toggle="popover" title="${work}-${chunk}" data-content="${dataContent}">${chunk}</a>`
  }

  isChunkValid(work: string, chunk: number) {
    for (const segmentNumber in this.chunkInfo[work][chunk]) {
      if (!this.chunkInfo[work][chunk][segmentNumber].valid) {
        return false;
      }
    }
    return true;
  }
  getChunkLink(work: string, chunk: number) {
    let icon = '<span class="glyphicon glyphicon-new-window"></span>';
    // @ts-ignore
    return '<a href="' + urlGen.siteChunkPage(work, chunk) + '" target="_blank" title="Open chunk page ' +
      work + '-' + chunk + ' in new tab">' +
      icon + '</a>';
  }

  async getAuthorLink(authorTid: number) {
    if (authorTid === 0) {
      return 'n/a';
    }
    let authorData = await this.apiClient.getPersonEssentialData(authorTid)
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
  getPageLinkFromSegmentInfo(startEndInfo: StartEndInfo) {
    let foliation = startEndInfo.foliation;
    let pageSeq = startEndInfo.seq;
    let label = foliation;
    if (startEndInfo.numColumns > 1) {
      label += ' c' + startEndInfo.column;
    }
    return this.getPageLink(pageSeq, label);
  }

  getPageLink(pageSeq: number, label: string) {
    return `<a href="#" title= "${tr('Click to select page')}" class="page-select-${pageSeq}">${label}</a>`
  }

  getPageLinkFromPageId(pageId: number, col: number) {
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
// @ts-ignore
window.DocPage = DocPage