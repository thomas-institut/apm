/* 
 *  Copyright (C) 2019-2020 Universität zu Köln
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

import {TableEditor, TdExtraAttributes} from '../common/TableEditor';
import * as CollationTableUtil from '../common/CollationTableUtil';
import {defaultLanguageDefinition} from '@/defaults/languages';
import * as PopoverFormatter from '../common/CollationTablePopovers';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {CollationTableFormatter} from './CollationTableFormatter';
import {AutomaticCollationTableSettingsForm} from '../common/AutoCollTableSettingsForm';
import {AutomaticCollationTableViewSettingsForm} from './AutomaticCollationTableViewSettingsForm';
import {CtData} from '@/CtData/CtData';
import {urlGen} from '../common/SiteUrlGen';
import {tr} from '../common/SiteLang';
import {deepCopy, getTextDirectionForLang} from '@/toolbox/Util';
import {ApmFormats} from '../common/ApmFormats';
import {HeaderAndContentPage} from '../HeaderAndContentPage';
import {
  CtDataInterface, FullTxItemEditorialNote, FullTxItemInterface, NonTokenItemIndex, WitnessTokenInterface
} from "@/CtData/CtDataInterface";
import {
  ApiCollationTableAuto, AutoCTablePersonInfo, AutomaticCollationSettings, EngineRunDetails
} from "@/Api/DataSchema/ApiCollationTable";
// @ts-expect-error No TS types for matrix yet
import {Matrix} from "@thomas-inst/matrix";

export class AutomaticCollationTable extends HeaderAndContentPage {
  private options: any;
  private showError: boolean;
  private errorMessage: string;
  private rtlClass!: string;
  private ltrClass!: string;
  private availableWitnesses: any;
  private apiSaveCollationUrl!: string;
  private initialApiOptions!: AutomaticCollationSettings;
  private apiCallOptions!: AutomaticCollationSettings;
  private collationTableDiv!: JQuery<HTMLElement>;
  private collationTableNewDivId!: string;
  private collationTableDivNew!: JQuery<HTMLElement>;
  private actTitleElement!: JQuery<HTMLElement>;
  private status!: JQuery<HTMLElement>;
  private collationEngineDetailsElement!: JQuery<HTMLElement>;
  private redoButton!: JQuery<HTMLElement>;
  private exportCsvButton!: JQuery<HTMLElement>;
  private quickEditionButton!: JQuery<HTMLElement>;
  private versionInfoButton!: JQuery<HTMLElement>;
  private witnessInfoDiv!: JQuery<HTMLElement>;
  private lastTimeLabel!: JQuery<HTMLElement>;
  private editionContainer!: JQuery<HTMLElement>;
  private collationTableActionsDiv!: JQuery<HTMLElement>;
  private saveTableButton!: JQuery<HTMLElement>;
  private ctData!: CtDataInterface;
  private peopleInfo!: { [key: number]: AutoCTablePersonInfo };
  private ctf!: CollationTableFormatter;
  private viewSettingsFormSelector!: string;
  private viewSettingsButton!: JQuery<HTMLElement>;
  private viewSettings!: any;
  private editSettingsFormSelector!: string;
  private editSettingsButton!: JQuery<HTMLElement>;
  private tableSaved!: boolean;
  private viewSettingsFormManager!: AutomaticCollationTableViewSettingsForm;
  private tableEditor: any;
  private editSettingsFormManager!: AutomaticCollationTableSettingsForm;
  private lastChangeInData!: string;
  private collationEngineDetails!: EngineRunDetails;
  private aggregatedNonTokenItemIndexes!: NonTokenItemIndex[][];
  private variantsMatrix!: Matrix;


  constructor(options: any) {
    super(options);
    console.log('ACT mini app starting');
    console.log('Available Witnesses:');
    console.log(options.availableWitnesses);
    console.log('ACT options');
    console.log(options);

    let oc = new OptionsChecker({
      context: 'AutomaticCollationTable', optionsDefinition: {
        error: {type: 'boolean', default: false},
        errorMessage: {type: 'string', default: ''},
        workId: {type: 'string', required: true},
        initialApiOptions: {type: 'object', required: true},
        chunkNumber: {type: 'NonZeroNumber', required: true},
        langDef: {type: 'object', default: defaultLanguageDefinition},
        availableWitnesses: {type: 'Array', default: []},
        suppressTimestampsInApiCalls: {type: 'boolean', default: false},
        loadNow: {type: 'boolean', default: false},
        isPartial: {type: 'boolean'},
        langName: {type: 'string'},
        isPreset: {type: 'boolean', default: false},
        preset: {
          type: 'object', default: {
            id: -1, title: '', userTid: -1, userName: 'no-user', editable: false
          }
        },
        normalizerData: {type: 'Array', default: []}
      }
    });
    this.options = oc.getCleanOptions(options);

    this.showError = this.options.error;
    this.errorMessage = this.options.errorMessage;

    if (!this.showError) {
      this.rtlClass = 'rtltext';
      this.ltrClass = 'ltrtext';
      this.availableWitnesses = this.options.availableWitnesses;

      this.apiSaveCollationUrl = urlGen.apiCollationTable_save();
      // generate witness titles
      for (const witness of this.availableWitnesses) {
        let title = witness['typeSpecificInfo'].docInfo.title;
        if (witness['typeSpecificInfo']['localWitnessId'] !== 'A') {
          title += ' (' + witness['typeSpecificInfo']['localWitnessId'] + ')';
        }
        witness.title = title;

      }

      this.initialApiOptions = deepCopy(this.options.initialApiOptions);

      this.apiCallOptions = this.options.initialApiOptions;
      // if there are no witnesses in the initialApiOptions witnesses array,
      // it means that ALL witnesses should be included

      if (this.apiCallOptions.witnesses.length === 0) {
        //console.log('Including all witnesses in ApiCallOptions')
        for (const witness of this.availableWitnesses) {
          let sysId = witness.systemId;
          if (this.options.suppressTimestampsInApiCalls) {
            sysId = this.supressTimestampFromSystemId(sysId);
          }
          this.apiCallOptions.witnesses.push({
            type: witness.type, systemId: sysId, title: witness.title
          });
        }
      }

    }

    this.initPage().then(() => {
      console.log(`Automatic Collation Table initialized`);
    });

  }

  async initPage() {
    await super.initPage();

    if (this.showError) {
      return;
    }

    this.collationTableDiv = $('#collationtablediv');
    this.collationTableNewDivId = 'collationtablediv';
    this.collationTableDivNew = $('#' + this.collationTableNewDivId);
    this.actTitleElement = $('#act-title');
    this.status = $('#status');
    this.collationEngineDetailsElement = $('#collationEngineDetails');
    this.redoButton = $('#redobutton');
    this.exportCsvButton = $('#exportcsvbutton');
    this.quickEditionButton = $('#quickedbutton');
    this.versionInfoButton = $('#versioninfobutton');
    this.witnessInfoDiv = $('#versioninfo');
    this.lastTimeLabel = $('#lastTimeLabel');
    this.editionContainer = $('#editiondiv');
    // this.editionDiv = $('#theedition')
    this.collationTableActionsDiv = $('#collationTableActions');
    this.saveTableButton = $('#savetablebutton');
    this.peopleInfo = [];
    this.ctf = new CollationTableFormatter({
      lang: this.initialApiOptions.lang, maxColumnsPerTable: 25
    });
    this.viewSettingsFormSelector = '#viewsettingsform';
    this.viewSettingsButton = $('#viewsettingsbutton');
    this.viewSettings = this.ctf.getOptions();

    this.editSettingsFormSelector = '#editsettingsform';
    this.editSettingsButton = $('#editsettingsbutton');

    this.lastTimeLabel.html('TBD');
    this.witnessInfoDiv.html('TBD');
    this.tableSaved = false;

    // save table button
    this.saveTableButton.on('click', this.genOnClickSaveTableButton());

    this.viewSettingsFormManager = new AutomaticCollationTableViewSettingsForm(this.viewSettingsFormSelector);
    this.viewSettingsButton.on('click', () => {
      if (this.viewSettingsFormManager.isHidden()) {
        this.viewSettingsFormManager.show(this.viewSettings);
      } else {
        this.viewSettingsFormManager.hide();
      }
    });

    this.witnessInfoDiv.addClass('hidden');
    this.versionInfoButton.on('click', () => {
      if (this.witnessInfoDiv.hasClass('hidden')) {
        this.witnessInfoDiv.removeClass('hidden');
        this.versionInfoButton.html('<i class="fas fa-angle-down" aria-hidden="true"></i>');
      } else {
        this.witnessInfoDiv.addClass('hidden');
        this.versionInfoButton.html('<i class="fas fa-angle-right" aria-hidden="true"></i>');
      }
    });

    this.viewSettingsFormManager.on('cancel', () => {
      this.viewSettingsFormManager.hide();
    });
    this.viewSettingsFormManager.on('apply', (e: any) => {
      this.viewSettings = e.detail;
      this.setCsvDownloadFile();
      this.viewSettingsFormManager.hide();

      if (this.viewSettings.multipleRows) {
        this.tableEditor.showInMultipleRows(this.viewSettings.maxColumnsPerTable, false);
      } else {
        this.tableEditor.showInSingleRow(false);
      }
      this.tableEditor.redrawTable();
    });

    let actSettingsFormOptions: any = {
      containerSelector: this.editSettingsFormSelector,
      availableWitnesses: this.availableWitnesses,
      langDef: this.options.langDef,
      userId: this.userId,
      isPreset: this.options.isPreset,
      suppressTimestampsInSettings: this.options.suppressTimestampsInApiCalls,
      applyButtonText: 'Redo collation',
      normalizerData: this.options.normalizerData
    };
    if (this.options.isPreset) {
      actSettingsFormOptions.preset = this.options.preset;
    }
    this.editSettingsFormManager = new AutomaticCollationTableSettingsForm(actSettingsFormOptions);

    this.editSettingsButton.on('click', () => {
      if (this.editSettingsFormManager.isHidden()) {
        this.editSettingsFormManager.show(this.apiCallOptions);
      } else {
        this.editSettingsFormManager.hide();
      }
    });

    this.editSettingsFormManager.on('cancel', () => {
      this.actTitleElement.html(this.editSettingsFormManager.getTitleFromSettings(this.apiCallOptions));
      this.editSettingsFormManager.hide();
    });

    this.editSettingsFormManager.on('apply', (e: any) => {
      this.apiCallOptions = e.detail;
      console.log('Got options from form:');
      console.log(this.apiCallOptions);
      this.editSettingsFormManager.hide();
      this.fetchCollationTable();
    });

    this.editSettingsFormManager.on('settings-change', () => {
      this.actTitleElement.html(this.editSettingsFormManager.getTitleFromSettings());
    });

    this.collationTableDiv.popover({
      trigger: 'hover',
      selector: '.withpopover',
      delay: {show: 500, hide: 0},
      placement: 'top',
      html: true,
      container: 'body'
    });

    this.collationTableDiv.html('');
    this.collationEngineDetailsElement.html('');
    this.status.html('');
    this.actTitleElement.html(this.getTitleFromOptions());
    this.editionContainer.addClass('hidden');

    this.quickEditionButton.on('click', () => {
      if (this.editionContainer.hasClass('hidden')) {
        this.editionContainer.removeClass('hidden');
      } else {
        this.editionContainer.addClass('hidden');
      }
    });

    this.redoButton.on('click', () => {
      console.log('redoButton clicked');
      this.fetchCollationTable();
    });
    if (this.options.loadNow) {
      this.fetchCollationTable();
    }

  }

  genOnClickSaveTableButton() {
    return () => {
      if (this.tableSaved) {
        console.log('Save table button clicked, but table is already saved');
        return false;
      }
      console.log('Saving table via API call to ' + this.apiSaveCollationUrl);
      let apiCallOptions = {
        collationTable: this.ctData, source: 'auto', baseSiglum: this.ctData.sigla[0]
      };
      $.post(this.apiSaveCollationUrl, {data: JSON.stringify(apiCallOptions)}).done((apiResponse) => {
        console.log('Success saving table');
        console.log(apiResponse);
        let tableId = apiResponse['tableId'];
        let url = urlGen.siteCollationTableEdit(tableId);

        this.collationTableActionsDiv.html('Table saved: <a href="' + url + '">Edit table</a>');

      }).fail((resp) => {
        console.error('Cannot save table');
        console.log(resp);
      });

    };
  }

  getLastChangeInData() {
    let ctData = this.ctData;
    let lastChangeInData = '';
    for (const witness of ctData.witnesses) {
      if (witness.timeStamp !== undefined) {
        if (witness.timeStamp > lastChangeInData) {
          lastChangeInData = witness.timeStamp;
        }
      }
    }
    return lastChangeInData;
  }

  getTitleFromOptions() {
    return this.editSettingsFormManager.getTitleFromSettings(this.apiCallOptions);
  }

  fetchCollationTable() {
    this.redoButton.prop('disabled', true);
    this.actTitleElement.html(this.getTitleFromOptions());
    this.status.html('Collating... <i class="fa fa-spinner fa-spin fa-fw"></i>');
    this.collationTableDivNew.html('');
    this.collationTableActionsDiv.addClass('hidden');
    this.collationEngineDetailsElement.html('');
    this.editionContainer.addClass('hidden');
    this.lastTimeLabel.html('TBD...');
    this.witnessInfoDiv.html('TBD...');
    console.log(`Fetching collation table`, this.apiCallOptions);
    this.apiClient.collationTableAuto(this.apiCallOptions).then((apiResponse) => {
      console.log('Automatic collation successful. Data:');
      console.log(apiResponse);
      this.setDataFromApiResponse(apiResponse);
      this.status.html('Collating... done,<br/>Formatting table <i class="fa fa-spinner fa-spin fa-fw"></i>');
      this.lastChangeInData = this.getLastChangeInData();
      this.lastTimeLabel.html(ApmFormats.time(this.lastChangeInData));
      this.witnessInfoDiv.html(this.getVersionInfoHtml());

      this.setCsvDownloadFile();

      this.status.html('');
      this.redoButton.prop('disabled', false);
      this.collationEngineDetailsElement.html(this.getCollationEngineDetailsHtml());
      this.collationTableActionsDiv.removeClass('hidden');
      // @ts-expect-error Popover is defined by bootstrap
      this.collationTableDivNew.popover({
        trigger: 'hover',
        selector: '.withpopover',
        delay: {show: 500, hide: 0},
        placement: 'auto top',
        html: true,
        container: 'body'
      });
      this.setupTableEditor();
    }).catch((resp) => {
      console.log('Error in automatic collation, resp:');
      console.log(resp);
      let failMsg = 'Collating... fail <i class="fa fa-frown-o" aria-hidden="true"></i><br/> ';
      failMsg += '<span class="small">HTTP code ' + resp.status + '</span>';
      if (typeof (resp.responseJSON) !== 'undefined') {
        failMsg += '<br/><span class="small"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>&nbsp;Error ' + resp.responseJSON.error + '</span>';
      }
      this.status.html(failMsg);
    });
  }

  /**
   *
   * @param {ApiCollationTableAuto}apiResponse
   */
  setDataFromApiResponse(apiResponse: ApiCollationTableAuto) {
    this.ctData = CtData.getCleanAndUpdatedCtData(apiResponse.collationTable, true, true);
    this.peopleInfo = apiResponse.people;
    this.collationEngineDetails = apiResponse.collationEngineDetails;
    this.aggregatedNonTokenItemIndexes = CtData.calculateAggregatedNonTokenItemIndexes(this.ctData);
  }

  getCollationEngineDetailsHtml() {
    let ced = this.collationEngineDetails;
    let cedHtml = '<b>Engine:</b> ' + ced.engineName + '<br/>';

    cedHtml += '<b>Cached:</b> ' + ced.cached + '<br/>';
    if (!ced.cached) {
      cedHtml += '<b>Date/Time:</b> ' + ced.runDateTime + '<br/>';
      cedHtml += '<b>Collation Runtime:</b> ' + Math.round(ced.duration * 1000.0) + ' ms' + '<br/>';
      cedHtml += '<b>Total Runtime:</b> ' + Math.round(ced.totalDuration * 1000.0) + ' ms';
    } else {
      cedHtml += '<b>Original Date/Time:</b> ' + ced.runDateTime + '<br/>';
      cedHtml += '<b>Original Collation Runtime:</b> ' + Math.round(ced.duration * 1000.0) + ' ms' + '<br/>';
      cedHtml += '<b>Original Total Runtime:</b> ' + Math.round(ced.totalDuration * 1000.0) + ' ms' + '<br/>';
      cedHtml += '<b>Cached Runtime:</b> ' + Math.round((ced.cachedRunTime ?? 0) * 1000.0) + ' ms' + '<br/>';
    }
    return cedHtml;
  }

  setCsvDownloadFile() {
    let href = 'data:text/csv,' + encodeURIComponent(CtData.generateCsv(this.ctData, ',', this.options.showNormalizations));
    this.exportCsvButton.attr('href', href);
  }

  getVersionInfoHtml() {
    let sigla = this.ctData.sigla;
    let witnesses = this.ctData.witnesses;
    let html = '';
    html += '<ul>';
    for (let i = 0; i < witnesses.length; i++) {
      let witness = witnesses[i];
      let siglum = sigla[i];
      if (witness['witnessType'] === 'fullTx') {
        html += '<li><b>' + siglum + '</b>: ' + ApmFormats.time(witness['timeStamp'] ?? '') + '</li>';
      }
    }
    html += '</ul>';

    return html;
  }

  supressTimestampFromSystemId(systemId: string): string {
    let fields = systemId.split('-');
    if (fields.length === 6) {
      fields.pop();
    }
    return fields.join('-');
  }

  // Functions for  Table Editor
  setupTableEditor() {
    let collationTable = this.ctData;

    // div text direction
    if (this.options.langDef[collationTable['lang']].rtl) {
      this.collationTableDivNew.removeClass(this.ltrClass);
      this.collationTableDivNew.addClass(this.rtlClass);
    } else {
      this.collationTableDivNew.removeClass(this.rtlClass);
      this.collationTableDivNew.addClass(this.ltrClass);
    }

    let rowDefinition = [];
    for (let i = 0; i < collationTable['sigla'].length; i++) {
      //let witness = collationTable.witnesses[i]
      let siglum = collationTable['witnessTitles'][i];
      let tokenArray = collationTable['collationMatrix'][i];
      rowDefinition.push({
        title: siglum, values: tokenArray, isEditable: false
      });
    }
    this.tableEditor = new TableEditor({
      id: this.collationTableNewDivId,
      showInMultipleRows: true,
      columnsPerRow: this.viewSettings.maxColumnsPerTable,
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: () => {
        return -1;
      },
      isEmptyValue: (value: number) => {
        return value === -1;
      },
      generateCellContent: this.genGenerateCellContentFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      generateCellTdExtraAttributes: this.genGenerateCellTdExtraAttributesFunction(),
      groupedColumns: [],
      textDirection: getTextDirectionForLang(this.ctData.lang),
      redrawOnCellShift: false,
      generateCellContentEditMode: (row, col, value) => {
        return '';
      },
      isCellEditable: (row, col, value) => {
        return false;
      },
      onCellEnterEditMode: (row, col) => {
        return false;
      },
      onCellLeaveEditMode: (row, col) => {
        return false;
      },
      onCellConfirmEdit: (row, col, newValue) => {
        return {valueChange: false, value: newValue};
      },
      cellValidationFunction: (row, col, currentText) => {
        return {isValid: true, warnings: [], errors: []};
      }
    });
    this.variantsMatrix = CollationTableUtil.genVariantsMatrix(this.tableEditor.getMatrix(), collationTable['witnesses'], collationTable['witnessOrder']);
    this.tableEditor.redrawTable();
  }

  genGenerateCellTdExtraAttributesFunction() {
    return (row: number, col: number, value: number): TdExtraAttributes[] => {
      if (value === -1) {
        return [];
      }
      let popoverHtml = PopoverFormatter.getPopoverHtml(row, value, this.ctData['witnesses'][row], this.getPostNotes(row, col, value), this.peopleInfo);
      return [{attr: 'data-content', val: popoverHtml}];
    };
  }

  genGenerateCellContentFunction() {
    let noteIconSpan = ' <span class="noteicon"><i class="far fa-comment"></i></span>';
    let normalizationSymbol = '<b><sub>N</sub></b>';
    return (row: number, col: number, value: number) => {
      if (value === -1) {
        return '&mdash;';
      }
      let tokenArray = this.ctData.witnesses[row].tokens;
      let token = tokenArray[value];
      let postNotes = this.getPostNotes(row, col, value);
      const sourceItems = token.sourceItems ?? [];
      if (sourceItems.length === 1 && postNotes.length === 0) {
        if (this.viewSettings.showNormalizations && token.normalizedText !== undefined) {
          return token.normalizedText + normalizationSymbol;
        }
        return token.text;
      }
      // spans for different items
      let itemWithAddressArray = this.ctData.witnesses[row].items ?? [];
      let cellHtml = '';
      for (const itemData of sourceItems) {
        let theItem = itemWithAddressArray[itemData['index']];
        let itemText = '';
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData['charRange'].from, itemData['charRange'].to + 1);
        }
        if (theItem.type === 'TextualItem' && itemText !== '\n') {
          cellHtml += '<span class="' + this.getClassesFromItem(theItem).join(' ') + '">';
          cellHtml += itemText;
          cellHtml += '</span>';
        }
      }
      // if there are notes after the token, put the note icon

      if (postNotes.length > 0) {
        cellHtml += noteIconSpan;
      }
      return cellHtml;
    };
  }

  getPostNotes(row: number, _col: number, tokenIndex: number) {
    let postItemIndexes = this.aggregatedNonTokenItemIndexes[row][tokenIndex].post;
    let itemWithAddressArray = this.ctData.witnesses[row].items ?? [];
    let notes: FullTxItemEditorialNote[] = [];
    for (const itemIndex of postItemIndexes) {
      let theItem = itemWithAddressArray[itemIndex];
      let itemNotes = theItem.notes || [];
      for (const note of itemNotes) {
        notes.push(note);
      }
    }
    return notes;
  }

  genGenerateCellClassesFunction() {
    return (row: number, col: number, value: number) => {
      if (value === -1) {
        return ['emptytoken'];
      }
      let tokenArray = this.ctData.witnesses[row].tokens;
      let itemWithAddressArray = this.ctData.witnesses[row].items || [];
      let token = tokenArray[value];
      let classes = this.getTokenClasses(token);
      // popoverclass
      classes.push('withpopover');
      //variant class
      if (this.viewSettings.highlightVariants) {
        classes.push('variant-' + this.variantsMatrix.getValue(row, col));
      }
      // get itemZero
      if (token.sourceItems === undefined) {
        console.warn(`Token for ${row} ${col} has no source items`);
        return classes;
      }
      let itemZeroIndex = token.sourceItems[0]['index'];
      let itemZero = itemWithAddressArray[itemZeroIndex];

      // language class
      let lang = this.ctData.witnesses[row].lang ?? this.ctData.lang;
      if (itemZero.lang !== undefined) {
        lang = itemZero.lang;
      }
      classes.push('text-' + lang);
      if (token['sourceItems'].length === 1) {
        // td inherits the classes from the single source item
        return classes.concat(this.getClassesFromItem(itemZero));
      }
      return classes;
    };
  }

  getClassesFromItem(item: FullTxItemInterface): string[] {
    let classes = [];
    let hand = 0;
    if (item.hand !== undefined) {
      hand = item.hand;
    }
    classes.push('hand-' + hand);

    if (item.format !== undefined && item.format !== '') {
      classes.push(item.format);
    }
    if (item.clarity !== undefined && item.clarity !== 1) {
      classes.push('unclear');
    }
    if (item.textualFlow !== undefined && item.textualFlow === 1) {
      classes.push('addition');
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion');
    }
    if (item.normalizationType !== undefined && item.normalizationType !== '') {
      classes.push(item.normalizationType);
    }
    return classes;
  }

  getTokenClasses(token: WitnessTokenInterface) {
    let classes = [];
    classes.push('tokentype_' + token.tokenType);
    return classes;
  }

  genGenerateTableClassesFunction() {
    return () => {
      return [`te-table-${this.ctData['lang']}`];
    };
  }

  async getHeaderHtml() {
    let breadcrumbHtml = this.getBreadcrumbNavHtml([{
      label: tr('Works'), url: urlGen.siteWorks()
    }, {label: this.options.workId, url: urlGen.siteWorkPage(this.options.workId)}, {
      label: `Chunk ${this.options.chunkNumber}`,
      url: urlGen.siteChunkPage(this.options.workId, this.options.chunkNumber)
    }, {label: tr('Automatic Collation Table')}, {
      label: `${tr(this.options.langName)} ${this.options.isPartial ? `(${tr('Partial')})` : ''}`, active: true
    }]);
    let workInfo = await this.apiClient.getWorkDataOld(this.options.workId);
    let authorInfo = await this.apiClient.getPersonEssentialData(workInfo.authorTid);
    let ctInfoDiv;
    if (this.showError) {
      ctInfoDiv = `<p>${authorInfo.name}, <em>${workInfo.title}</em>, chunk ${this.options.chunkNumber}</p>`;
    } else {
      ctInfoDiv = `<p>${authorInfo.name}, <em>${workInfo.title}</em>, chunk ${this.options.chunkNumber}</p>
                <p><span id="act-title"></span>
                    <button title="Click to edit the automatic collation settings" 
                        id="editsettingsbutton" class="btn btn-default btn-sm noborder ">
                        <i class="fas fa-pencil-alt" aria-hidden="true"></i>
                    </button>
                </p>
                <div id="editsettingsform" class="inlineform">
                </div>
                <p>${tr('Last change in data')}: <span id="lastTimeLabel"></span>
                    <button title="Click to show/hide witness info" id="versioninfobutton" class="btn btn-default btn-sm noborder">
                        <i class="fas fa-angle-right" aria-hidden="true"></i>
                    </button>
                 </p>
                <div id="versioninfo" class="ct-versioninfo">
                </div>
                <div id="collationTableActions">
                    <button id="savetablebutton" class="btn btn-primary" title="Save table to edit later">${tr('Save Table')}</button>
                </div>`;
    }

    return `${breadcrumbHtml}
    <h1>${tr('Automatic Collation Table')}</h1> 
    <div class="row">
        <div class="col-md-9">
            <div id="collationtableinfo">
               ${ctInfoDiv}
            </div>
        </div>
        <div class="col-md-3 text-right">
            <div id="collationtablebuttons" >
<!--                <button title="Toggle Edition"-->
<!--                    id="quickedbutton" class="btn btn-default btn-lg noborder">-->
<!--                    <i class="fas fa-align-left" aria-hidden="true"></i>-->
<!--                </button>-->

                <button title="Reload the collation table with the most recent data" 
                    id="redobutton" class="btn btn-default btn-lg noborder">
                    <i class="fas fa-sync" aria-hidden="true"></i>
                </button>
                <button title="Change view settings" 
                    id="viewsettingsbutton" class="btn btn-default btn-lg noborder">
                    <i class="fas fa-cog" aria-hidden="true"></i>
                </button>
                <a title="Download CSV file" href="data:text/csv,This%2Cis%2Ca%2Ctest" download="apm-collationtable.csv"
                    id="exportcsvbutton" class="btn btn-default noborder">
                     <small>CSV</small> <i class="fas fa-download" aria-hidden="true"></i>
                </a>
            </div>
            <div id="viewsettingsform" class="ctdropdownform text-left" ></div>
        </div>
    </div>
    <div id="status" class="text-danger"></div>`;
  }

  async genContentHtml() {
    if (this.showError) {
      return `<div class="alert alert-danger" role="alert">
        <h1><i class="fas fa-exclamation-triangle" aria-hidden="true"></i>Error</h1>
        <p class="lead">${tr(this.errorMessage)}</p>
    </div>`;
    }

    return `<div id="editiondiv">
        <div id="theedition"></div>
        <div id="sigla"></div>
    </div>
    <div id="collationtablediv" class="ctdiv">Collation table goes here</div>
    <div id="collationEngineDetails" class="text-muted small"> </div>`;
  }
}

// Load as global variable so that it can be referenced in the Twig template
// @ts-ignore
window.AutomaticCollationTable = AutomaticCollationTable;