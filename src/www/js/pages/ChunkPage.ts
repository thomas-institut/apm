/* 
 *  Copyright (C) 2020-21 Universität zu Köln
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

import {AutomaticCollationTableSettingsForm} from './common/AutoCollTableSettingsForm';
import * as WitnessType from '../Witness/WitnessType';
import {CollapseToggleButton} from '@/widgets/CollapseToggleButton';
import {ConfirmDialog} from './common/ConfirmDialog';
import {urlGen} from './common/SiteUrlGen';
import {ApmFormats} from './common/ApmFormats';
import {TimeString} from '@/toolbox/TimeString';
import {tr} from './common/SiteLang';
import {HeaderAndContentPage, HeaderAndContentPageOptions} from './HeaderAndContentPage';
import {Tid} from '@/Tid/Tid';
import DataTable from 'datatables.net-dt';
import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";
import {PersonEssentialData} from "@/Api/DataSchema/ApiPeople";
import {WorkData} from "@/Api/DataSchema/ApiWorks";
import {LanguageInfoObject} from "@/Api/DataSchema/LanguageInfo";
import {ApiPresetsQuery} from "@/Api/DataSchema/ApiPresets";
import {AutomaticCollationSettings} from "@/Api/DataSchema/ApiCollationTable";

const convertToEditionIcon = '<i class="fas fa-file-alt"></i>';
const showWitnessInfoIcon = '<i class="fas fa-cogs"></i>';

const convertToEditionLinkClass = 'cte-link';

interface ChunkPageOptions extends HeaderAndContentPageOptions {
  workId: string;
  chunkNumber: number;
  showAdminInfo: boolean;
  witnessInfo: WitnessInfo[];
  pageInfo: any[];
  languageInfo: LanguageInfoObject;
  validChunks: number[];
  savedCollationTables: any[];
}

interface AutomaticCollationUrl {
  lang: string,
  name: string,
  url: string,
  urlText: string;
  urlTitle: string;
  availableWitnesses: WitnessInfo[],
  isPreset: boolean,
  preset?: PresetInfo,
  actSettings: AutomaticCollationSettings;
}


interface PresetInfo {
  id: number,
  title: string,
  userId: number,
  userName: string,
  editable: boolean;
}

/**
 * Mini JS app running in the Chunk Page
 */
export class ChunkPage extends HeaderAndContentPage {
  private readonly options: ChunkPageOptions;
  private readonly witnessTypeLabels: { [key: string]: string };
  private readonly invalidErrorCodes: string[] = [];
  private witnessesByLang: { [key: string]: WitnessInfo[] };
  private ctLinksElement!: JQuery;
  private chunkIdDiv!: JQuery<HTMLElement>;
  private witnessListNewDiv!: JQuery<HTMLElement>;
  private witnessPanelsDiv!: JQuery<HTMLElement>;
  private editionsDiv!: JQuery<HTMLElement>;
  private savedCollationTablesDiv!: JQuery<HTMLElement>;
  private workData!: WorkData;
  private authorInfo!: PersonEssentialData;

  constructor(options: ChunkPageOptions) {
    super(options);
    this.options = options;
    console.log('Chunk Page options');
    console.log(this.options);

    // some constant labels
    this.witnessTypeLabels = {};
    this.witnessTypeLabels[WitnessType.FULL_TX] = tr('Full Transcription');


    this.invalidErrorCodes = ['', tr('Chunk start not defined'), tr('Chunk end not defined'), tr('Chunk start after chunk end'), tr('Duplicate chunk start marks'), tr('Duplicate chunk end marks')];

    this.witnessesByLang = {};


    this.initPage().then(() => {
      console.log(`ChunkPage initialized`);
    });
  }

  async initPage() {

    await super.initPage();
    console.log(`ChunkPage: initPage`);

    // selectors and classes
    this.ctLinksElement = $('#collation-table-links');
    this.chunkIdDiv = $('#chunkid');
    this.witnessListNewDiv = $('#witnessListNew');
    this.witnessPanelsDiv = $('#witnesspanels');
    this.headerDiv = $('#chunkpageheader');
    this.savedCollationTablesDiv = $('#savedcollationtables');
    this.editionsDiv = $('#editions');

    this.workData = await this.apiClient.getWorkData(this.options.workId);
    console.log(`WorkData from server`, this.workData);
    this.authorInfo = await this.apiClient.getPersonEssentialData(this.workData.authorId);
    this.headerDiv.html(this.generateHeaderDivHtml());
    this.chunkIdDiv.html(this.generateChunkIdDivHtml());

    this.witnessListNewDiv.html(await this.generateWitnessListNew());

    this.options.witnessInfo.forEach((info: any, i: number) => {
      $(`.${convertToEditionLinkClass}-${i}`).on('click', this.genOnClickConvertToEditionButton(i, info));
    });
    new DataTable("#witnessTableNew", {
      paging: false, searching: false, info: false, columns: [{}, //title
        {}, // witness type
        {}, //doctype
        {}, // language
        {orderable: false}, //pages
        {orderable: false}, // info
        {orderable: false}, // actions
        {orderable: false} // admin
      ]
    });

    // build witness data by language
    this.witnessesByLang = {};
    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)) {
        continue;
      }
      let witnessInfo = this.options.witnessInfo[w];
      if (witnessInfo.type !== WitnessType.FULL_TX) {
        // TODO: support other witness types!
        continue;
      }
      let fullTxInfo = witnessInfo["typeSpecificInfo"];
      let title = fullTxInfo.docInfo.title;
      let lwid = fullTxInfo["localWitnessId"];
      if (lwid !== 'A') {
        title += ' (' + lwid + ')';
      }
      let witness = witnessInfo;
      witness.index = parseInt(w);
      witness.title = title;
      // let witness = {
      //   index:  parseInt(w),
      //   type: witnessInfo.type,
      //   id: witnessInfo["typeSpecificInfo"].docId,
      //   lwid : lwid,
      //   title: title,
      //   systemId: witnessInfo.systemId
      // }
      if (witnessInfo.isValid) {
        if (this.witnessesByLang[witnessInfo['languageCode']] === undefined) {
          this.witnessesByLang[witnessInfo['languageCode']] = [];
        }
        this.witnessesByLang[witnessInfo['languageCode']].push(witness);
        new CollapseToggleButton($('#texttoggle-' + witness.systemId), $('#text-' + witness.systemId));
      }
    }
    console.log('Witnesses by lang');
    console.log(this.witnessesByLang);


    this.savedCollationTablesDiv.html(await this.genSavedCollationTablesDivHtml('ctable'));
    this.editionsDiv.html(await this.genSavedCollationTablesDivHtml('edition'));


    await this.updateCollationTableLinks();

    this.witnessPanelsDiv.html(this.generateWitnessPanelHtml());


    // load good witnesses into panels

    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)) {
        continue;
      }
      let witnessInfo = this.options.witnessInfo[w];
      if (!witnessInfo.isValid) {
        continue;
      }
      switch (witnessInfo.type) {
        case WitnessType.FULL_TX:
          let witnessUrl = urlGen.apiWitnessGet(witnessInfo.systemId, 'html');
          console.log('Loading witness ' + witnessInfo.systemId);
          let formattedSelector = '#formatted-' + witnessInfo.systemId;
          $(formattedSelector).html('Loading text, this might take a while <i class="fas fa-spinner fa-spin fa-fw"></i> ...');
          // TODO: change this to ApmDataProxy
          $.get(witnessUrl)
          .done(function (data) {
            console.log('Got data for fullTx witness ' + witnessInfo.systemId);
            $(formattedSelector).html(data);
          })
          .fail(function (resp) {
            console.log('Error getting data for fullTx witness ' + witnessInfo.systemId);
            console.log(resp);
            $(formattedSelector).html('Error loading text');
          });
          break;

        case WitnessType.PARTIAL_TX:
          console.log('Partial TX witness not supported yet!');
          break;

        default:
          console.warn('Unsupported witness type: ' + witnessInfo.type);
      }
    }

    // @ts-ignore
    $('body').popover({
      container: 'body',
      html: true,
      trigger: 'hover',
      selector: '.withformatpopover',
      delay: {show: 500, hide: 0},
      placement: 'auto',
      sanitize: false
    });

  }

  async getHeaderHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([{
      label: tr('Works'), url: urlGen.siteWorks()
    }, {
      label: this.options.workId, url: urlGen.siteWorkPage(this.options.workId)
    }, {label: `Chunk ${this.options.chunkNumber}`, active: true}]);
    return `${breadcrumbHtml} <div id="chunkpageheader"></div>`;
  }

  async genContentHtml() {
    return `
    <div id="chunkid"></div>
    <div id="witnessListNew"></div>
    <div id="editions" class="collationtablelinks"></div>
    <div id="savedcollationtables" class="collationtablelinks"></div>
    <h4 id="ctlinks-header" class="hidden">${tr('Automatic Collation Tables')}</h4>
    <div id="collation-table-links" class="collationtablelinks">  </div>
    <div id="witnesspanels"></div>`;
  }

  genOnClickConvertToEditionButton(index: number, info: any) {
    return (ev: any) => {
      ev.preventDefault();
      console.log(`Click on link for witness ${index}. Witness Id = ${info.systemId}`);
      console.log(info);
      let editionCreated = false;
      let confirmDialog = new ConfirmDialog({
        body: `
<p>Are you sure you want to create an edition with <b>only</b> the witness <b>${info.title}</b>?</p>
<p>This will create a new edition, even if there's already one or more with that witness.</p>
`,
        acceptButtonLabel: 'Create',
        hideOnAccept: false,
        cancelButtonLabel: 'Cancel',
        acceptFunction: (_id: any, dialogObject: ConfirmDialog) => {
          $.get(urlGen.apiWitnessToEdition(info.systemId)).done(function (apiResponse) {
            console.log("Success");
            let tableUrl = urlGen.siteCollationTableEdit(apiResponse.tableId);
            dialogObject.setTitle('Success');
            dialogObject.setBody(`
<p>The edition with witness ${info.title} was successfully created.<p><p>Click <a href="${tableUrl}" target="_blank" >here to open it on a new tab</a></p>
<p>You can also close this window and find a link to the new edition under the 'Chunk Editions' section.</p>
`);
            dialogObject.hideAcceptButton();
            dialogObject.setCancelButtonText(`Close and Refresh Page`);
            editionCreated = true;
            console.log(apiResponse);
          }).fail(function (resp) {
            dialogObject.setBody(`ERROR: Cannot create edition, please report to developers`);
            console.error("Cannot create edition");
            console.log(resp);
          });
        },
        cancelFunction: () => {
          if (editionCreated) {
            console.log(`Cancel WITH edition created`);
            window.location.reload();
          }
        }
      });
      confirmDialog.show();
    };
  }

  async genSavedCollationTablesDivHtml(type: string): Promise<string> {
    let html = '';

    const titles = {
      ctable: tr('Saved Collation Tables'), edition: tr('Chunk Editions')
    };

    let tables = this.options.savedCollationTables.filter((savedCt: { type: any }) => savedCt.type === type);

    if (tables.length !== 0) {
      // @ts-ignore
      // TODO: try to fix this, how can I index titles with a string in TS?
      html += `<h4>${titles[type]}</h4>`;
      html += '<ul>';
      for (const ctInfo of tables) {
        console.log(`Processing ctInfo`, ctInfo);
        let url = type === 'edition' ? urlGen.siteChunkEdition(ctInfo['tableId']) : urlGen.siteCollationTableEdit(ctInfo['tableId']);
        html += '<li class="smallpadding"><a title="Open in new tab/window" target="_blank" href="' + url + '">' + ctInfo['title'] + '</a>, <small>last change: ' + ApmFormats.timeString(ctInfo['lastSave']) + ' by ' + await this.getAuthorLink(ctInfo['authorTid']) + '</small></li>';
      }
      html += '</ul>';

    }
    return html;
  }

  getPreviousChunk(chunk: any, validChunks: any) {
    let index = validChunks.findIndex(function (c: any) {
      return c === chunk;
    });
    if (index === 0) {
      return -1;
    }
    return validChunks[index - 1];
  }

  getNextChunk(chunk: any, validChunks: any) {
    let index = validChunks.findIndex(function (c: any) {
      return c === chunk;
    });
    if (index === (validChunks.length - 1)) {
      return -1;
    }
    return validChunks[index + 1];
  }

  generateHeaderDivHtml() {
    let html = '';
    let arrowLeft = '<i class="fas fa-angle-left"></i>';
    let arrowRight = '<i class="fas fa-angle-right"></i>';

    html += '<div class="row row-no-gutters">';

    html += '<div class="col-md-11 cpheader">';
    //let url = this.pathFor.siteChunkPage(this.options.workId, this.options.chunkNumber-1)

    let prevChunk = this.getPreviousChunk(this.options.chunkNumber, this.options.validChunks);
    if (prevChunk !== -1) {
      let url = urlGen.siteChunkPage(this.options.workId, prevChunk);
      html += '<a role="button" class="btn-default" title="Go to chunk ' + prevChunk + '" href="' + url + '">' + arrowLeft + '</a>';
      html += '&nbsp;&nbsp;';
    }
    html += `<a href="${urlGen.sitePerson(Tid.toBase36String(this.authorInfo.tid))}">${this.authorInfo.name}</a>, 
        <em><a href="${urlGen.siteWorkPage(this.workData.workId)}">${this.workData.title}</a></em>, chunk ${this.options.chunkNumber}`;

    html += '</div>';

    html += '<div class="col-md1 cpheader justifyright">';
    let nextChunk = this.getNextChunk(this.options.chunkNumber, this.options.validChunks);
    if (nextChunk !== -1) {
      let url = urlGen.siteChunkPage(this.options.workId, nextChunk);
      html += '<a role="button" class="btn-default" title="Go to chunk ' + nextChunk + '" href="' + url + '">' + arrowRight + '</a>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  generateWitnessPanelHtml() {
    let html = '';
    for (const w in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(w)) {
        continue;
      }
      let witnessInfo = this.options.witnessInfo[w];
      if (!witnessInfo.isValid) {
        continue;
      }
      switch (witnessInfo.type) {
        case WitnessType.FULL_TX:
          let localWitnessId = witnessInfo["typeSpecificInfo"].localWitnessId;
          let title = witnessInfo["typeSpecificInfo"].docInfo.title;
          if (localWitnessId !== 'A') {
            title += ' (' + localWitnessId + ')';
          }
          html += this.getWitnessCard(witnessInfo.systemId, title, witnessInfo['languageCode']);
          break;
      }
    }
    return html;
  }

  /**
   *
   * @param {string}witnessSystemId
   * @param {string}title
   * @param {string}lang
   * @return {string}
   * @private
   */
  getWitnessCard(witnessSystemId: string, title: string, lang: string): string {
    return `<div class="card witness-card">
      <div class="card-header">
      <p>${title} &nbsp;&nbsp;&nbsp; <a role="button" title="Click to show/hide text" data-toggle="collapse" 
            href="#text-${witnessSystemId}" aria-expanded="true" aria-controls="text-${witnessSystemId}">
      <span id="texttoggle-${witnessSystemId}"><i class="fas fa-angle-right" aria-hidden="true"></i></span>
    </a></p>
    </div>
    <div class="collapse" id="text-${witnessSystemId}">
      <div class="card-body">
      <p class="formattedchunktext text-${lang}" id="formatted-${witnessSystemId}"></p>
      </div>
      </div>
      </div>`;
  }

  async generateWitnessListNew() {
    let html = `<table id="witnessTableNew" class="stripe">
        <thead><tr>
            <th>${tr('Title')}</th>
            <th>${tr('Witness Type')}</th>
            <th>${tr('Doc Type')}</th>
            <th>${tr('Language')}</th>
            <th>${tr('Pages')}</th>
            <th>${tr('Info')}</th>
            <th></th>
            <th></th>
        </tr>
        </thead>`;

    for (const i in this.options.witnessInfo) {
      if (!this.options.witnessInfo.hasOwnProperty(i)) {
        continue;
      }
      let witnessInfo = this.options.witnessInfo[i];
      html += '<tr>';
      let docInfo = witnessInfo["typeSpecificInfo"].docInfo;
      let lwid = witnessInfo['typeSpecificInfo'].localWitnessId;
      html += '<td>' + this.getDocLink(docInfo);
      if (lwid !== 'A') {
        html += ' (' + lwid + ')';
      }
      html += '</td>';
      html += '<td>' + this.witnessTypeLabels[witnessInfo['type']] + '</td>';
      html += '<td>' + (await this.apiClient.getEntityName(docInfo['type'])) + '</td>';
      html += '<td>' + (await this.apiClient.getEntityName(witnessInfo['language'])) + '</td>';
      let info: any = '';
      switch (witnessInfo.type) {
        case WitnessType.FULL_TX:
          info = await this.genFullTxInfo(witnessInfo, parseInt(i));
          break;

        case WitnessType.PARTIAL_TX:
          info = {'location': 'tbd', 'essential': 'based on TBD', 'actions': '', 'admin': ''};
          break;

        default:
          info = 'Unknown witness type';
      }
      html += '<td>' + info['location'] + '</td>';
      html += '<td>' + info['essential'] + '</td>';
      html += '<td>' + info['actions'] + '</td>';
      if (this.options.showAdminInfo) {
        html += '<td>' + info['admin'] + '</td>';
      } else {
        html += '<td></td>';
      }

      html += '</tr>';
    }

    return html;
  }

  async genFullTxInfo(witnessInfo: any, index: number) {

    let info: any = [];
    let docInfo = witnessInfo["typeSpecificInfo"].docInfo;
    let segments = witnessInfo["typeSpecificInfo"]["segments"];

    let segmentHtmlArray = [];
    for (const s in segments) {
      if (!segments.hasOwnProperty(s)) {
        continue;
      }
      if (segments[s] === undefined) {
        console.warn(`Segment ${s} is undefined`);
      }
      if (segments[s].start === undefined) {
        console.warn(`Segment ${s} start is undefined`, segments[s]);
        segmentHtmlArray.push(`Undefined segment ${s}`);
      } else {
        let segmenthtml = this.genPageLink(docInfo.id, segments[s].start.pageId, segments[s].start.columnNumber);
        if (segments[s].start.pageId !== segments[s].end.pageId) {
          segmenthtml += '&ndash;' + this.genPageLink(docInfo.id, segments[s].end.pageId, segments[s].end.columnNumber);
        }
        segmentHtmlArray.push(segmenthtml);
      }
    }
    info['location'] = segmentHtmlArray.join(', ');

    let lastVersion = witnessInfo['typeSpecificInfo'].lastVersion;
    if (witnessInfo.isValid) {
      info['essential'] = '<small>Last change: ' + ApmFormats.time(TimeString.toDate(lastVersion['timeFrom'])) + ' by ' + await this.getAuthorLink(lastVersion.authorTid) + '</small>';
    } else {
      let errorMsg = this.invalidErrorCodes[witnessInfo.errorCode];
      if (errorMsg === undefined) {
        errorMsg = 'Error code ' + witnessInfo.errorCode;
      }
      info['essential'] = '<i class="fas fa-exclamation-triangle"></i> ' + errorMsg;
    }

    if (witnessInfo.isValid) {
      info['actions'] = `<a href="" class="${convertToEditionLinkClass} ${convertToEditionLinkClass}-${index}" 
title="Click to create edition with only this witness">${convertToEditionIcon}</a>`;
      info['admin'] = `<a href="${urlGen.apiWitnessGet(witnessInfo.systemId, 'full')}" 
       title="Show witness details for witness ${witnessInfo.systemId}" target="_blank">${showWitnessInfoIcon}</a>`;
    } else {
      info['actions'] = '';
      info['admin'] = '';
    }
    return info;
  }

  async getAuthorLink(authorId: number) {
    if (authorId === 0) {
      return 'Author not set';
    }
    let userData = await this.apiClient.getPersonEssentialData(authorId);
    return `<a href="${urlGen.sitePerson(Tid.toBase36String(userData.tid))}" 
    title="${tr('View person data')}" target="_blank">${userData.name}</a>`;
  }

  genPageLink(docId: any, pageId: number, column: any) {
    if (pageId === 0) {
      return '???';
    }
    let pia = this.options.pageInfo.filter((r: { pageId: number }) => r.pageId === pageId);
    let pageInfo = null;
    if (pia.length !== 0) {
      pageInfo = pia[0];
    } else {
      console.warn(`No page info for page ${pageId}`);
    }

    let numColumns, foliation, sequence;
    if (pageInfo === null) {
      numColumns = 0;
      foliation = '';
      sequence = 0;
    } else {
      numColumns = pageInfo.numCols;
      foliation = pageInfo.foliation;
      sequence = pageInfo.sequence;
    }


    let label = foliation;
    if (numColumns > 1) {
      label += ' c' + column;
    }
    let url = urlGen.sitePageView(docId, sequence, column);

    return '<a href="' + url + '" title="View page ' + foliation + ' col ' + column + ' in new tab" target="_blank">' + label + '</a>';
  }

  getDocLink(docInfo: { id: string; title: string }) {
    return '<a href="' + urlGen.siteDocPage(docInfo.id) + '" title="View document page" target="_blank">' + docInfo.title + '</a>';
  }

  generateChunkIdDivHtml() {
    let html = '';

    let numWitnesses = this.options.witnessInfo.length;
    let numValidWitnesses = this.calculateTotalValidWitnesses();
    html += '<p>';
    html += '<b>Chunk ID:</b> ' + this.workData.workId + '-' + this.options.chunkNumber;
    html += '<br/>';
    if (numWitnesses === 0) {
      html += '<b>Witnesses:</b> none';
    } else {
      html += '<b>Witnesses:</b> ' + numWitnesses + ' total, ';
      html += (numValidWitnesses === numWitnesses ? ' all ' : numValidWitnesses) + ' valid';

      if (numValidWitnesses > 0) {

        let langInfoLabels = [];
        let langInfo = this.options.languageInfo;
        for (const lang in langInfo) {
          if (langInfo.hasOwnProperty(lang)) {
            langInfoLabels.push((langInfo[lang]['validWitnesses'] === numValidWitnesses ? 'all' : langInfo[lang]['validWitnesses']) + ' ' + langInfo[lang]['name']);
          }
        }
        html += (numValidWitnesses === numWitnesses ? ', ' : ' ( ');
        html += langInfoLabels.join(', ');
        html += (numValidWitnesses === numWitnesses ? '' : ' ) ');
      }
    }
    html += '<br/>';
    html += '</p>';
    return html;
  }

  calculateTotalValidWitnesses() {
    const langInfoObject = this.options.languageInfo;
    let totalValidWitnesses = 0;
    Object.keys(langInfoObject).forEach(lang => {
      totalValidWitnesses += langInfoObject[lang].validWitnesses;
    });
    return totalValidWitnesses;
  }


  async updateCollationTableLinks() {
    this.ctLinksElement.html('<ul id="ctlinks-ul"></ul>');
    const langInfoObject = this.options.languageInfo;
    let ctLinksUl = $('#ctlinks-ul');
    await Promise.all(Object.keys(langInfoObject).map(async (l) => {
      if (langInfoObject[l]['validWitnesses'] < 2) {
        return;
      }
      $('#ctlinks-header').removeClass('hidden');
      let urls: AutomaticCollationUrl[] = [];
      let langName = langInfoObject[l].name;
      let insideListId = 'ct-links-ul-' + l;
      ctLinksUl.append('<li>' + langName + '</li>');
      ctLinksUl.append('<ul id="' + insideListId + '"></ul>');
      urls.push({
        lang: l,
        name: langName,
        url: urlGen.siteCollationTableAutomatic(this.options.workId, this.options.chunkNumber, l),
        urlText: 'All witnesses',
        urlTitle: 'Open automatic collation table in new tab',
        availableWitnesses: this.witnessesByLang[l],
        isPreset: false,
        actSettings: {
          collationEngine: '',
          lang: l,
          work: this.options.workId,
          chunk: this.options.chunkNumber,
          ignorePunctuation: true,
          witnesses: this.witnessesByLang[l].filter(w => w.type === 'fullTx').map(w => {
            return {type: 'fullTx', systemId: w.systemId, title: w.title};
          })
        }
      });
      // get applicable presets
      let apiCallOptions: ApiPresetsQuery = {
        lang: langInfoObject[l].code, userId: -1, witnesses: []
      };
      this.witnessesByLang[l].forEach(witness => {
        // try to match fullTx witnesses with localWitness Id === 'A'
        // TODO: support other localWitnessId
        if (witness.type === 'fullTx') {
          // if (witness['typeSpecificInfo'].localWitnessId === 'A') {
          //   apiCallOptions.witnesses.push(witness['typeSpecificInfo'].docId)
          // }
          apiCallOptions.witnesses.push('fullTx-' + witness['typeSpecificInfo'].docId + '-' + witness['typeSpecificInfo'].localWitnessId);
        }
      });

      console.log('Getting presets');
      console.log(apiCallOptions);
      try {
        const data = await this.apiClient.getAutomaticCollationPresets(apiCallOptions);
        console.log('Got ' + data.length + ' presets');
        console.log(data);
        for (const preset of data) {
          let witnessesToInclude = [];
          for (const presetWitness of preset.data.witnesses) {
            let witness: WitnessInfo | null = null;
            let fields = presetWitness.split('-');
            let presetWitnessType = fields[0];
            let presetWitnessDocId = parseInt(fields[1]);
            let presetWitnessLwid = fields[2];
            for (const w of this.witnessesByLang[l]) {
              // match only fullTx witnesses with localWitnessId === 'A'
              if (w.type === presetWitnessType && w['typeSpecificInfo'].docId === presetWitnessDocId && w['typeSpecificInfo'].localWitnessId === presetWitnessLwid) {
                witness = w;
              }
            }
            if (witness === null) {
              console.error('Witness in preset not found in witnesses available, this must NEVER happen!');
              return false;
            }
            witnessesToInclude.push(witness);
          }
          urls.push({
            lang: l,
            name: langName,
            url: urlGen.siteCollationTablePreset(this.options.workId, this.options.chunkNumber, preset.presetId),
            urlText: preset.title + ' <small><i>(' + preset.userName + ')</i></small>',
            urlTitle: 'Open collation table in new tab',
            availableWitnesses: this.witnessesByLang[l],
            isPreset: true,
            preset: {
              id: preset.presetId,
              title: preset.title,
              userId: preset.userId,
              userName: preset.userName,
              editable: (preset.userId === this.userId)
            },
            actSettings: {
              collationEngine: 'DoNothing',
              lang: l,
              work: this.options.workId,
              chunk: this.options.chunkNumber,
              ignorePunctuation: preset.data.ignorePunctuation,
              normalizers: preset.data.normalizers,
              witnesses: witnessesToInclude.filter(w => w.type === 'fullTx').map(w => {
                return {type: 'fullTx', systemId: w.systemId, title: w.title};
              })
            }
          });
        }
        this.fillCollationTableLinks(urls, insideListId);
      } catch (e) {
        console.log(`Error getting presets: ${e}`);
        this.fillCollationTableLinks(urls, insideListId);
      }
    }));
    // for (const l in langInfoObject) {
    //   if (!langInfoObject.hasOwnProperty(l)) {
    //     continue;
    //   }
    //   if (langInfoObject[l]['validWitnesses'] >= 2) {
    //     $('#ctlinks-header').removeClass('hidden');
    //     let urls = [];
    //     let langName = langInfoObject[l].name;
    //     let insideListId = 'ct-links-ul-' + l;
    //     ctLinksUl.append('<li>' + langName + '</li>');
    //     ctLinksUl.append('<ul id="' + insideListId + '"></ul>');
    //     urls.push({
    //       lang: l,
    //       name: langName,
    //       url: urlGen.siteCollationTableAutomatic(this.options.workId, this.options.chunkNumber, l),
    //       urltext: 'All witnesses',
    //       urltitle: 'Open automatic collation table in new tab',
    //       availableWitnesses: this.witnessesByLang[l],
    //       isPreset: false,
    //       actSettings: {
    //         collationEngine: 'DoNothing',
    //         lang: l,
    //         work: this.options.workId,
    //         chunk: this.options.chunkNumber,
    //         ignorePunctuation: true,
    //         witnesses: this.witnessesByLang[l]
    //       }
    //
    //     });
    //     // get applicable presets
    //     let thisObject = this;
    //     let apiCallOptions: any = {
    //       lang: langInfoObject[l].code, userId: -1, witnesses: []
    //     };
    //     for (const w in this.witnessesByLang[l]) {
    //       if (!this.witnessesByLang[l].hasOwnProperty(w)) {
    //         continue;
    //       }
    //       // try to match fullTx witnesses with localWitness Id === 'A'
    //       // TODO: support other localWitnessId
    //       let witness = this.witnessesByLang[l][w];
    //       if (witness.type === 'fullTx') {
    //         // if (witness['typeSpecificInfo'].localWitnessId === 'A') {
    //         //   apiCallOptions.witnesses.push(witness['typeSpecificInfo'].docId)
    //         // }
    //         apiCallOptions.witnesses.push('fullTx-' + witness['typeSpecificInfo'].docId + '-' + witness['typeSpecificInfo'].localWitnessId);
    //       }
    //     }
    //     console.log('Getting presets');
    //     console.log(apiCallOptions);
    //     $.post(this.getPresetsUrl, {data: JSON.stringify(apiCallOptions)})
    //     .done(function (data) {
    //       console.log('Got ' + data.presets.length + ' presets');
    //       console.log(data.presets);
    //       for (const preset of data.presets) {
    //         let witnessesToInclude = [];
    //         for (const presetWitness of preset.data.witnesses) {
    //           let witness: WitnessInfo | null = null;
    //           let fields = presetWitness.split('-');
    //           let presetWitnessType = fields[0];
    //           let presetWitnessDocId = parseInt(fields[1]);
    //           let presetWitnessLwid = fields[2];
    //           for (const w of thisObject.witnessesByLang[l]) {
    //             // match only fullTx witnesses with localWitnessId === 'A'
    //             if (w.type === presetWitnessType && w['typeSpecificInfo'].docId === presetWitnessDocId && w['typeSpecificInfo'].localWitnessId === presetWitnessLwid) {
    //               witness = w;
    //             }
    //           }
    //           if (witness === null) {
    //             console.error('Witness in preset not found in witnesses available, this must NEVER happen!');
    //             return false;
    //           }
    //           witnessesToInclude.push(witness);
    //         }
    //         urls.push({
    //           lang: l,
    //           name: langName,
    //           url: urlGen.siteCollationTablePreset(thisObject.options.workId, thisObject.options.chunkNumber, preset.presetId),
    //           urltext: preset.title + ' <small><i>(' + preset.userName + ')</i></small>',
    //           urltitle: 'Open collation table in new tab',
    //           availableWitnesses: thisObject.witnessesByLang[l],
    //           isPreset: true,
    //           preset: {
    //             id: preset.presetId,
    //             title: preset.title,
    //             userId: preset.userId,
    //             userName: preset.userName,
    //             editable: (preset.userId === thisObject.userId)
    //           },
    //           actSettings: {
    //             collationEngine: 'DoNothing',
    //             lang: l,
    //             work: thisObject.options.workId,
    //             chunk: thisObject.options.chunkNumber,
    //             ignorePunctuation: preset.data.ignorePunctuation,
    //             normalizers: preset.data.normalizers !== undefined ? preset.data.normalizers : null,
    //             witnesses: witnessesToInclude
    //           }
    //
    //         });
    //       }
    //       thisObject.fillCollationTableLinks(urls, insideListId);
    //     })
    //     .fail(function (resp) {
    //       console.log('Failed API call for presets for ' + langName, ' status: ' + resp.status);
    //       console.log(resp);
    //       thisObject.fillCollationTableLinks(urls, insideListId);
    //     });
    //   }
    // }
  }

  fillCollationTableLinks(urls: AutomaticCollationUrl[], containerId: string) {
    if (urls.length === 0) {
      return;
    }

    let html = '';
    html += '<ul>';
    html += urls.map((url, index) => {
      const liId = containerId + '-' + index;
      let deleteButtonHtml = '';
      if (url.isPreset && url.preset !== undefined) {
        if (url.preset.userId === this.userId) {
          deleteButtonHtml = `<button title="Erase preset" class="btn btn-default btn-sm ct-urls-button cterasepresetbutton">
            <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
            <div id="${liId}-erasediv"></div>`;
        }
      }
      // urlHtml += deleteButtonHtml;
      //
      // urlHtml += '<div id="' + liId + '-div' + '" class="actsettings"></div>';
      // urlHtml += '</li>';

      return `<li id="${liId}">${url.urlText}: 
<a class="btn btn-default btn-sm ct-urls-button" id="${liId}-a" href="${url.url}" title="${url.urlTitle}" target="_blank"><i class="fas fa-external-link-alt"></i></a>
<button title="Edit automatic collation settings" class="btn btn-default btn-sm ct-urls-button ctsettingsbutton"><i class="fas fa-pencil-alt" aria-hidden="true"></i></button>
${deleteButtonHtml}
<div id="${liId}-div" class="actsettings"></div>
</li>`
      // return urlHtml;
    }).join('');
    html += '</ul>';

    $('#' + containerId).html(html);

    for (const u in urls) {
      if (!urls.hasOwnProperty(u)) {
        continue;
      }
      let liId = containerId + '-' + u;
      let ctSettingsFormManager = new AutomaticCollationTableSettingsForm({
        containerSelector: '#' + liId + '-div',
        initialSettings: urls[u].actSettings,
        availableWitnesses: urls[u].availableWitnesses,
        hideTitle: true,
        isPreset: urls[u].isPreset,
        preset: urls[u].preset,
        applyButtonText: 'Generate Collation',
        userId: this.userId,
        normalizerData: this.options.languageInfo[urls[u].lang]['normalizerData'],
        debug: false
      });
      $('#' + liId + ' .cterasepresetbutton').on('click', () => {
        $('#' + liId + '-a').addClass('disabled');
        $('#' + liId + ' .ctsettingsbutton').addClass('disabled');
        $('#' + liId + ' .cterasepresetbutton').addClass('disabled');
        let divSelector = '#' + liId + '-erasediv';
        let eraseHtml = '<p class="text-danger erase-preset-warning">Do you really want to erase this preset?';
        eraseHtml += '<button class="btn btn-sm btn-default button-yes">Yes</button>';
        eraseHtml += '<button class="btn btn-sm btn-default button-no">No</button>';
        $(divSelector).html(eraseHtml);
        $(divSelector + ' .button-no').on('click', () => {
          $(divSelector).html('');
          $('#' + liId + '-a').removeClass('disabled');
          $('#' + liId + ' .cterasepresetbutton').removeClass('disabled');
          $('#' + liId + ' .ctsettingsbutton').removeClass('disabled');
        });
        $(divSelector + ' .button-yes').on('click', () => {
          if (urls[u].preset === undefined) {
            return;
          }
          $.get(urlGen.apiDeletePreset(urls[u].preset.id))
          .done(async () => {
            await this.updateCollationTableLinks();
          })
          .fail(function (resp) {
            console.error('Cannot delete preset');
            console.log(resp);
          });

        });

      });

      $('#' + liId + ' .ctsettingsbutton').on('click', function () {
        if (ctSettingsFormManager.isHidden()) {
          $('#' + liId + '-a').addClass('disabled');
          $('#' + liId + ' .cterasepresetbutton').addClass('disabled');
          ctSettingsFormManager.show();
        } else {
          ctSettingsFormManager.hide();
          $('#' + liId + '-a').removeClass('disabled');
          $('#' + liId + ' .cterasepresetbutton').removeClass('disabled');
        }
      });
      ctSettingsFormManager.on('cancel', function () {
        ctSettingsFormManager.hide();
        $('#' + liId + '-a').removeClass('disabled');
        $('#' + liId + ' .cterasepresetbutton').removeClass('disabled');
      });
      let thisObject = this;
      ctSettingsFormManager.on('apply', function (e: any) {
        console.log('Opening automatic collation table');
        console.log(e.detail);
        let formElement = $('#theForm');
        if (formElement.length !== 0) {
          //console.log('Removing hidden form')
          formElement.remove();
        }
        //console.log('Adding hidden form')
        $('body').append('<form id="theForm" class="hidden" method="POST" target="_blank" action="' + urlGen.siteCollationTableCustom(thisObject.options.workId, thisObject.options.chunkNumber, urls[u].lang) + '">' + '<input type="text" name="data" value=\'' + JSON.stringify({options: e.detail}) + '\'></form>');
        //console.log('Submitting')
        // @ts-ignore
        document.getElementById('theForm').submit();
      });
      ctSettingsFormManager.on('preset-new', async () => {
        await this.updateCollationTableLinks();
      });
    }

  }

}

// Load as global variable so that it can be referenced in the Twig template
(window as any).ChunkPage = ChunkPage;