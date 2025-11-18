/*
 *  Copyright (C) 2021 Universität zu Köln
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


/**
 * The collation table panel in the EditorComposer.
 *
 *  - Collation table manipulation: moving, grouping, normalizations
 */
import {OptionsChecker} from '@thomas-inst/optionschecker';
import {PanelWithToolbar} from '@/MultiPanelUI/PanelWithToolbar';
import {MultiToggle, optionChange} from '@/widgets/MultiToggle';
import {NiceToggle, toggleEvent} from '@/widgets/NiceToggle';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';
import * as ArrayUtil from '../lib/ToolBox/ArrayUtil';
import * as NormalizationSource from '../constants/NormalizationSource';
import * as TranscriptionTokenType from '../Witness/WitnessTokenType';
import * as WitnessTokenType from '../Witness/WitnessTokenType';
import {defaultLanguageDefinition} from '@/defaults/languages';
import {
  columnClearSelectionEvent,
  columnGroupEvent,
  columnSelectEvent,
  columnUngroupEvent,
  editModeGroup,
  editModeOff,
  TableEditor
} from '@/pages/common/TableEditor';
import * as WitnessType from '../Witness/WitnessType';
import * as TokenClass from '../Witness/WitnessTokenClass';
import * as Util from '../toolbox/Util.mjs';
import * as CollationTableType from '../constants/CollationTableType';
import * as CollationTableUtil from '../pages/common/CollationTableUtil';
import * as PopoverFormatter from '../pages/common/CollationTablePopovers';
import {FULL_TX} from '@/Witness/WitnessTokenClass';
import {CtData} from '@/CtData/CtData';
import {EditionWitnessTokenStringParser} from '@/toolbox/EditionWitnessTokenStringParser.mjs';
import {capitalizeFirstLetter} from '@/toolbox/Util';
import {HtmlRenderer} from '@/lib/FmtText/Renderer/HtmlRenderer';
import {FmtTextUtil} from '@/lib/FmtText/FmtTextUtil';
import {Punctuation} from '@/defaults/Punctuation';
import {ToolbarCharacter, toolbarCharactersDefinition,} from '@/EditionComposer/ToolbarCharactersDefinition';
import {SimpleConfirmDialog} from '@/pages/common/SimpleConfirmDialog';
import {CtDataInterface, FullTxItemInterface, NonTokenItemIndex, WitnessTokenInterface} from "@/CtData/CtDataInterface";
// @ts-expect-error No TS definitions for matrix yet
import {Matrix} from "@thomas-inst/matrix";


interface ViewSettings {
  highlightVariants: boolean;
  showNormalizations: boolean;
  showWitnessTitles: boolean;
}

export class CollationTablePanel extends PanelWithToolbar {
  private options: any;
  private ctData: CtDataInterface;
  private lang: string;
  private tableEditModeToRestore: string;
  private panelIsSetup: boolean;
  private normalizerRegister: NormalizerRegister;
  private availableNormalizers: string[];
  private icons: any;
  private textDirection: string;
  private aggregatedNonTokenItemIndexes: NonTokenItemIndex[][];
  private toolbarCharacters: ToolbarCharacter[];
  private viewSettings: ViewSettings;
  private popoversAreOn: boolean = true;
  private tableEditor!: TableEditor;
  private tokenDataCache: any;
  private normalizationSettingsButton!: JQuery<HTMLElement>;
  private savedNormalizerSettings!: string[];
  private normalizationsToggle!: NiceToggle;
  private modeToggle!: MultiToggle;
  private popoversToggle!: NiceToggle;
  private compactTableButton!: JQuery<HTMLElement>;
  private exportCsvButton!: JQuery<HTMLElement>;
  private selectedColumnsFrom!: number;
  private selectedColumnsTo!: number;
  private variantsMatrix: Matrix | null;

  constructor(options = {}) {
    super(options);
    let optionsDefinition = {
      ctData: {type: 'object'},
      normalizerRegister: {type: 'object', objectClass: NormalizerRegister},
      icons: {type: 'object', required: true},
      langDef: {type: 'object', default: defaultLanguageDefinition},
      peopleInfo: {type: 'object', default: []},
      onCtDataChange: {
        type: 'function', default: () => {
          this.verbose && console.log(`New CT data, but no handler for change`);
        }
      },
      editApparatusEntry: {
        type: 'function', default: () => {
        }
      }
    };

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'Collation Table Panel'});
    this.options = oc.getCleanOptions(options);
    this.debug = true;
    this.ctData = CtData.copyFromObject(this.options.ctData);
    this.lang = this.ctData.lang;
    this.tableEditModeToRestore = editModeOff;
    this.panelIsSetup = false;
    this.normalizerRegister = this.options.normalizerRegister;
    this.availableNormalizers = this.normalizerRegister.getRegisteredNormalizers();
    this.icons = this.options.icons;
    this.textDirection = this.options.langDef[this.ctData['lang']].rtl ? 'rtl' : 'ltr';
    this.resetTokenDataCache();
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes();
    this.debug && console.log(`Aggregated non-token item indexes`, this.aggregatedNonTokenItemIndexes);
    const toolBarCharsDef = toolbarCharactersDefinition[this.ctData.lang];

    this.toolbarCharacters = Object.keys(toolBarCharsDef).map(char => toolBarCharsDef[char]);

    // viewSettings
    this.viewSettings = {
      highlightVariants: true, showNormalizations: false, showWitnessTitles: false
    };

    // popovers for collation table
    // this.setUpPopovers()
    this.popoversTurnOn();
  }

  getContentAreaClasses() {
    return super.getContentAreaClasses().concat([`${this.textDirection}text`]);
  }


  updateCtData(ctData: CtData, source: string) {
    this.verbose && console.log(`Got news of changes in CT data from ${source}`);
    this.ctData = CtData.copyFromObject(ctData);
    this.panelIsSetup = false;
    this.resetTokenDataCache();
    this.aggregatedNonTokenItemIndexes = this.calculateAggregatedNonTokenItemIndexes();
    if (this.tableEditor !== undefined) {
      this.tableEditModeToRestore = this.tableEditor.getTableEditMode();
      this.verbose && console.log(`Current TableEditor edit mode: ${this.tableEditModeToRestore}`);
      this.tableEditor.clearColumnSelection();
    }
    if (this.visible) {
      this._setupPanelContent();
      this.panelIsSetup = true;
    }
  }

  resetTokenDataCache() {
    this.tokenDataCache = {};
  }


  generateToolbarHtml(_tabId: string, _mode: string, _visible: boolean) {

    let apparatusLinks = this.ctData['customApparatuses'].map((app, index) => {
      return `<a class="dropdown-item add-entry-apparatus-${index}" href="">${capitalizeFirstLetter(app.type)}</a>`;
    }).join('');


    let tbChars = this.toolbarCharacters;
    if (this.ctData.lang === 'he' || this.ctData.lang === 'ar') {
      tbChars = (tbChars.reverse());
    }

    let toolbarCharactersHtml = tbChars.map((chData, index) => {
      return `<a class="tb-button tb-ch-button-${index} text-${this.ctData.lang}" title="${chData.title} (click to copy to clipboard)" href="#"> ${chData.character} </a>`;
    }).join('&nbsp;');

    return `<div class="panel-toolbar-group">
       <div class="panel-toolbar-group" id="mode-toggle"></div>
       <div class="panel-toolbar-group"><span id="popovers-toggle"></span></div>
       <div class="panel-toolbar-group">
            <span id="normalizations-toggle"></span>
            <a class="tb-button" href="#" title="Click to choose which normalizations to apply" id="normalizations-settings-button"><i class="fas fa-pen"></i></a>
       </div>
       <div class="panel-toolbar-group">
            <div class="panel-toolbar-item add-entry-dropdown hidden">
                <div class="dropdown">
                     <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" 
                     id="ct-panel-add-entry-dropdown" data-toggle="dropdown" aria-expanded="false" title="Click to add apparatus entry">
                            ${this.icons.addEntry}
                     </button>
                     <div class="dropdown-menu" aria-labelledby="ct-panel-add-entry-dropdown">${apparatusLinks}</div>
                  </div>
               </div>      
        </div>
        
        <div class="panel-toolbar-group" id="table-ops-group">
         <a class="tb-button" href="#" title="Delete all empty columns" id="compact-table-button"><i class="bi bi-eraser-fill"></i></a>
        </div>
        <div class="panel-toolbar-group">
            ${toolbarCharactersHtml}
        </div>
        
</div>
<div class="panel-toolbar-group leftmost">
    <div class="panel-toolbar-item">
        <a id="export-csv-button" class="tb-button"  download="ApmCollationTable.csv"
                       title="Download CSV"><small>CSV</small><i class="fas fa-download"></i></a>
    </div>
</div>`;
  }

  async generateContentHtml(_tabId: string, _mode: string, _visible: boolean) {
    this.panelIsSetup = false;
    return `Setting up collation table....`;
  }

  postRender(id: string, mode: string, visible: boolean) {
    super.postRender(id, mode, visible);
    this._setupToolBar();
    if (visible) {
      this._setupPanelContent();
      super.onResize(visible);
      this.panelIsSetup = true;
    }
  }

  onShown() {
    super.onShown();
    if (!this.panelIsSetup) {
      this._setupPanelContent();
      super.onResize(true);
      this.panelIsSetup = true;
    }
  }

  onHidden() {
    super.onHidden();
    this.visible = false;
  }

  _setupToolBar() {

    let thisObject = this;

    // NORMALIZATIONS

    this.normalizationSettingsButton = $('#normalizations-settings-button');
    if (this.availableNormalizers.length !== 0) {
      // Set up normalization toggle and settings button
      this.savedNormalizerSettings = this.ctData['automaticNormalizationsApplied'].length === 0 ? this.availableNormalizers : this.ctData['automaticNormalizationsApplied'];
      this._normalizationsSetupSettingsButton();
      this.normalizationsToggle = new NiceToggle({
        containerSelector: '#normalizations-toggle',
        title: 'Normalizations: ',
        initialValue: this.ctData['automaticNormalizationsApplied'].length !== 0,
        onIcon: '<i class="fas fa-toggle-on"></i>',
        onPopoverText: 'Click to disable automatic normalizations',
        offIcon: '<i class="fas fa-toggle-off"></i>',
        offPopoverText: 'Click to enable automatic normalizations'
      });

      this.normalizationsToggle.on(toggleEvent, (ev: any) => {
        if (ev.detail.toggleStatus) {
          thisObject.normalizationSettingsButton.show();
        } else {
          thisObject.normalizationSettingsButton.hide();
        }
        let automaticNormalizationsApplied = ev.detail.toggleStatus ? thisObject.savedNormalizerSettings : [];
        thisObject._normalizationApplyAutomaticNormalizations(automaticNormalizationsApplied);

      });
      if (this.normalizationsToggle.isOn) {
        this.normalizationSettingsButton.show();
      } else {
        this.normalizationSettingsButton.hide();
      }
    } else {
      // No normalizations available, no need to show normalization settings
      this.normalizationSettingsButton.hide();
    }

    this.normalizationSettingsButton.on('click', this._normalizationsGenOnClickSettingsButton());


    // EDIT MODE

    this.modeToggle = new MultiToggle({
      containerSelector: '#mode-toggle',
      title: 'Edit: ',
      buttonClass: 'tb-button',
      initialOption: 'off',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'panel-toolbar-item',
      buttonDef: [{label: 'Off', name: 'off', helpText: 'Turn off editing'}, {
        label: 'Move',
        name: 'move',
        helpText: 'Show controls to move/add/delete cells'
      }, {label: 'Group', name: 'group', helpText: 'Show controls to group columns'},]
    });

    this.modeToggle.on(optionChange, (ev: any) => {
      this.verbose && console.log('New Edit Mode: ' + ev.detail.currentOption);
      this.tableEditor.setEditMode(ev.detail.currentOption);
    });

    // POPOVERS

    this.popoversToggle = new NiceToggle({
      containerSelector: '#popovers-toggle',
      title: 'Popovers: ',
      onIcon: '<i class="fas fa-toggle-on"></i>',
      onPopoverText: 'Click to disable popovers',
      offIcon: '<i class="fas fa-toggle-off"></i>',
      offPopoverText: 'Click to enable popovers'
    });

    this.popoversToggle.on(toggleEvent, (ev: any) => {
      if (ev.detail.toggleStatus) {
        thisObject.popoversTurnOn();
      } else {
        thisObject.popoversTurnOff();
      }
    });

    // COMPACT TABLE
    this.compactTableButton = $('#compact-table-button');
    this.compactTableButton.on('click', this.genOnClickCompactTable());

    // toolbar characters
    this.toolbarCharacters.forEach((chData, index) => {
      $(`.tb-ch-button-${index}`).on('click', async (ev) => {
        ev.preventDefault();
        await navigator.clipboard.writeText(chData.character);
      });
    });

    // EXPORT CSV
    this.exportCsvButton = $('#export-csv-button');
    this.setCsvDownloadFile();

    // ADD APPARATUS ENTRY
    this.ctData['customApparatuses'].forEach((_app, index) => {
      $(`${this.containerSelector} .add-entry-apparatus-${index}`).on('click', this._genOnClickAddEntryButton(index));
    });

    // click on toolbar, to unselect columns
    $(`${this.containerSelector} div.panel-toolbar`).on('click', this._genOnClickToolbar());
  }

  _genOnClickToolbar() {
    return (ev: any) => {
      if (this.tableEditor.tableEditMode !== editModeGroup) {
        return;
      }
      let target = $(ev.target);
      if (target.prop('nodeName') === 'DIV' && target.hasClass('panel-toolbar')) {
        if (this.selectedColumnsFrom !== -1) {
          this.tableEditor.clearColumnSelection();
        }
      }
    };
  }

  /**
   * @private
   */
  genOnClickCompactTable() {
    return async () => {
      let emptyColumnCount = this.tableEditor.getEmptyColumnCount();
      if (emptyColumnCount !== 0) {
        let msg = emptyColumnCount === 1 ? 'There is one empty column, do you want to erase it?' : `There are ${emptyColumnCount} empty columns, do you want to erase them?`;
        if (await SimpleConfirmDialog.getUserConfirmation(msg, "Yes", "No")) {
          this.tableEditor.compactTable();
        }
      }

    };
  }

  _genOnClickAddEntryButton(appIndex: number) {
    return (ev: any) => {
      ev.preventDefault();
      ev.stopPropagation();

      this.verbose && console.log(`Click on add entry button for apparatus ${appIndex}, currently selected columns`);
      if (this.selectedColumnsFrom === -1 || this.selectedColumnsTo === -1) {
        this.verbose && console.log(`No columns selected, nothing to do`);
        return;
      }
      this.options.editApparatusEntry(appIndex, this.selectedColumnsFrom, this.selectedColumnsTo);
      $('#ct-panel-add-entry-dropdown').dropdown('hide');
    };
  }


  _normalizationsSetupSettingsButton() {
    if (this.savedNormalizerSettings.length !== this.availableNormalizers.length) {
      this.normalizationSettingsButton.html(`${this.icons.editSettings}<sup>*</sup>`);
      this.normalizationSettingsButton.attr('title', `${this.savedNormalizerSettings.length} of ${this.availableNormalizers.length} normalizations applied. Click to change.`);
    } else {
      // this.verbose && console.log(`All normalizations`)
      this.normalizationSettingsButton.html(`${this.icons.editSettings}`);
      this.normalizationSettingsButton.attr('title', `All standard normalizations applied. Click to change.`);
    }
  }

  _normalizationsGenOnClickSettingsButton() {
    let thisObject = this;
    return (ev: any) => {
      ev.preventDefault();
      let availableNormalizers = thisObject.normalizerRegister.getRegisteredNormalizers();
      if (availableNormalizers.length === 0) {
        console.warn(`Click on normalization settings, but no normalizations are available`);
        return;
      }

      let modalSelector = '#normalization-settings-modal';
      $('body')
      .remove(modalSelector)
      .append(thisObject._normalizationsGetSettingsDialogHtml());

      let togglesDiv = $(`${modalSelector} .normalization-toggles`);

      let normalizerMetadata = availableNormalizers.map((name) => {
        let obj = thisObject.normalizerRegister.getNormalizerMetadata(name);
        obj.name = name;
        return obj;
      });
      let togglesHtml = '<ul class="normalization-list">';
      normalizerMetadata.forEach((data) => {
        togglesHtml += `<li><input type="checkbox" class="normalizer-checkbox normalizer-${data['name']}" title="${data['help']}">&nbsp;&nbsp;${data['label']}</li>`;
      });
      togglesHtml += '</ul>';

      togglesDiv.html(togglesHtml);

      let currentlyAppliedNormalizers = thisObject.ctData['automaticNormalizationsApplied'];

      currentlyAppliedNormalizers.forEach((name) => {
        $(`${modalSelector} .normalizer-${name}`).prop('checked', true);
      });

      let cancelButton = $(`${modalSelector} .cancel-btn`);
      let submitButton = $(`${modalSelector} .submit-btn`);
      let statusSpan = $(`${modalSelector} .status-span`);

      cancelButton.on('click', () => {
        $(modalSelector).modal('hide');
      });

      submitButton.on('click', () => {
        let checkedNormalizers = availableNormalizers.filter((name) => {
          return $(`${modalSelector} .normalizer-${name}`).prop('checked');
        });

        this.verbose && console.log(`Checked normalizers`);
        this.verbose && console.log(checkedNormalizers);
        if (!ArrayUtil.arraysAreEqual(checkedNormalizers, currentlyAppliedNormalizers, (a, b) => {
          return a === b;
        })) {
          this.verbose && console.log(`Change in applied normalizers`);
          if (checkedNormalizers.length === 0) {
            // this is the same as turning normalizations off
            submitButton.hide();
            cancelButton.hide();
            statusSpan.html(`Turning off normalizations  ${thisObject.icons.busy}`);

            thisObject._normalizationApplyAutomaticNormalizations([]);
            thisObject.savedNormalizerSettings = thisObject.availableNormalizers;
            thisObject.normalizationsToggle.toggleOff();
            thisObject.normalizationSettingsButton.hide();

          } else {
            submitButton.hide();
            cancelButton.hide();
            statusSpan.html(`Recalculating normalizations ${thisObject.icons.busy}`);
            thisObject._normalizationApplyAutomaticNormalizations(checkedNormalizers);
            thisObject.savedNormalizerSettings = checkedNormalizers;
          }
        } else {
          this.verbose && console.log(`No change in applied normalizers `);
        }
        this._normalizationsSetupSettingsButton();
        submitButton.show();
        cancelButton.show();
        statusSpan.html('');
        $(modalSelector).modal('hide');
      });


      $(modalSelector).modal({
        backdrop: 'static', keyboard: false, show: false
      });
      $(modalSelector).modal('show');
    };
  }


  _normalizationsGetSettingsDialogHtml() {
    return `
<div id="normalization-settings-modal" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Normalizations To Apply</h5>
            </div>
            <div class="modal-body">

            <h6>Standard</h6>
            <div class="normalization-toggles"></div>
            <span class="status-span text-warning"></span>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger submit-btn">Apply</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>  
            </div>
        </div>
    </div>
</div>`;
  }


  _normalizationApplyAutomaticNormalizations(normalizationsToApply: string[]) {

    this.ctData = CtData.applyAutomaticNormalizations(this.ctData, this.normalizerRegister, normalizationsToApply);
    // this.verbose && console.log(`New CT Data after automatic normalizations: [${normalizationsToApply.join(', ')}]`)
    // this.verbose && console.log(this.ctData)

    this.options.onCtDataChange(this.ctData);

    // Update UI
    this.resetTokenDataCache();
    this._setupPanelContent();
    // this.setCsvDownloadFile()
  }

  _popoversGenContentFunction() {
    // need to use thisObject because 'this' in the popover function is bound to the element for which the popover is shown
    // and that is needed to get the cell index
    let thisObject = this;
    return function () {

      if (!thisObject.popoversAreOn) {
        return '';
      }

      // @ts-ignore
      let cellIndex = thisObject.tableEditor._getCellIndexFromElement($(this));
      if (cellIndex === null) {
        console.error('Popover requested on a non-cell element!');
        return '';
      }

      if (thisObject.tableEditor.isCellInEditMode(cellIndex.row, cellIndex.col)) {
        //  this.verbose && console.log(`Cell ${cellIndex.row}:${cellIndex.col} in is cell edit mode`)
        return '';
      }
      let witnessIndex = thisObject.ctData['witnessOrder'][cellIndex.row];
      let tokenIndex = thisObject.tableEditor.getValue(cellIndex.row, cellIndex.col);
      //  this.verbose && console.log(`Getting popover for witness index ${witnessIndex}, token ${tokenIndex}, col ${cellIndex.col}`)
      return thisObject.getPopoverHtml(witnessIndex, tokenIndex, cellIndex.col);
    };
  }

  getPopoverHtml(witnessIndex: number, tokenIndex: number, col: number) {
    if (tokenIndex === -1) {
      return '';
    }
    let popoverHtml = this.getPopoverHtmlFromCache(witnessIndex, tokenIndex);
    if (popoverHtml !== undefined) {
      //  this.verbose && console.log(`Popover from cache: '${popoverHtml}'`)
      return popoverHtml;
    }
    let witness = this.ctData['witnesses'][witnessIndex];

    popoverHtml = PopoverFormatter.getPopoverHtml(witnessIndex, tokenIndex, witness, witness['tokens'][tokenIndex]['tokenClass'] === FULL_TX ? this.getPostNotes(witnessIndex, col, tokenIndex) : [], this.options.peopleInfo);

    this.storePopoverHtmlInCache(witnessIndex, tokenIndex, popoverHtml);
    return popoverHtml;
  }

  getPopoverHtmlFromCache(witnessIndex: number, tokenIndex: number) {
    return this.getDataFieldFromTokenDataCache('popoverHtml', witnessIndex, tokenIndex);
  }

  storePopoverHtmlInCache(witnessIndex: number, tokenIndex: number, popoverHtml: string) {
    this.storeDataFieldInTokenDataCache('popoverHtml', witnessIndex, tokenIndex, popoverHtml);
  }

  _setupPanelContent() {
    this.verbose && console.log(`Setting up CT panel content`);
    this.replaceContent(`Loading collation table...`);
    this.popoversSetup();
    this.setupTableEditor();
    this.verbose && console.log(`Setting tableEditor edit mode '${this.tableEditModeToRestore}'`);
    this.tableEditor.setEditMode(this.tableEditModeToRestore, false);
  }

  setupTableEditor() {
    let collationTable = this.ctData;
    let rowDefinition = [];
    let columnsPerRow;
    for (let i = 0; i < collationTable['witnessOrder'].length; i++) {
      let wIndex = collationTable['witnessOrder'][i];
      if (collationTable['witnesses'][wIndex]['witnessType'] === WitnessType.SOURCE) {
        continue;
      }
      let title = '';

      if (this.viewSettings.showWitnessTitles) {
        title = collationTable['witnessTitles'][wIndex];
        columnsPerRow = 10;
      } else {
        title = collationTable['sigla'][wIndex];
        columnsPerRow = 15;
      }


      let tokenArray = collationTable['collationMatrix'][wIndex];
      let isEditable = false;
      if (collationTable['witnesses'][wIndex]['witnessType'] === WitnessType.EDITION) {
        isEditable = true;
      }
      rowDefinition.push({
        title: title, values: tokenArray, isEditable: isEditable
      });
    }
    let icons = TableEditor.genTextIconSet();
    icons.editCell = this.icons.editText;
    icons.confirmCellEdit = this.icons.confirmEdit;
    icons.cancelCellEdit = this.icons.cancelEdit;

    this.tableEditor = new TableEditor({
      id: this.contentAreaId,
      textDirection: this.textDirection,
      redrawOnCellShift: false,
      showInMultipleRows: true,
      columnsPerRow: columnsPerRow,
      rowDefinition: rowDefinition,
      drawTableInConstructor: false,
      getEmptyValue: () => -1,
      isEmptyValue: this.genIsEmpty(),
      groupedColumns: this.ctData.groupedColumns,
      generateCellContent: this.genGenerateCellContentFunction(),
      generateCellContentEditMode: this.genGenerateCellContentEditModeFunction(),
      isCellEditable: this.genIsCellEditable(),
      onCellEnterEditMode: this.genOnEnterCellEditMode(),
      onCellLeaveEditMode: this.genOnLeaveCellEditMode(),
      onCellConfirmEdit: this.genOnCellConfirmEditFunction(),
      cellValidationFunction: this.genCellValidationFunction(),
      generateTableClasses: this.genGenerateTableClassesFunction(),
      generateCellClasses: this.genGenerateCellClassesFunction(),
      onColumnAdd: this.genOnColumnAdd(),
      onColumnDelete: this.genOnColumnDelete(),
      icons: icons
    });

    this.variantsMatrix = null; // will be calculated before table draw

    let thisObject = this;

    this.tableEditor.setOption('canDeleteColumn', this.genCanDeleteColumn());

    // hide popovers before moving cells
    this.tableEditor.on('cell-pre-shift', (data: any) => {
      for (const selector of data.detail.selectors) {
        $(selector).popover('hide');
      }
    });

    // recalculate variants before redrawing the table
    this.tableEditor.on('table-drawn-pre', () => {
      thisObject.recalculateVariants();
    });
    // handle cell shifts
    this.tableEditor.on('cell-post-shift', this.genOnCellPostShift());

    this.tableEditor.editModeOn(false);
    this.tableEditor.redrawTable();
    this.tableEditor.on('cell-shift content-changed', this.genOnCollationChanges());
    this.tableEditor.on(columnGroupEvent, this.genOnGroupUngroupColumn(true));
    this.tableEditor.on(columnUngroupEvent, this.genOnGroupUngroupColumn(false));
    this.tableEditor.on(columnSelectEvent, this.genOnSelectColumns());
    this.tableEditor.on(columnClearSelectionEvent, this.genOnClearColumnSelection());
    this.tableEditor.setEditMode(editModeOff);
  }

  genOnSelectColumns() {
    return (ev: any) => {
      //console.log(`Table editor says that columns ${ev.detail.from} to ${ev.detail.to} are selected`)
      this.selectedColumnsFrom = ev.detail.from;
      this.selectedColumnsTo = ev.detail.to;
      $(`${this.containerSelector} div.add-entry-dropdown`).removeClass('hidden');
    };
  }

  genOnClearColumnSelection() {
    return () => {
      //console.log(`Table editor says there are no selected columns`)
      this.selectedColumnsFrom = -1;
      this.selectedColumnsTo = -1;
      $(`${this.containerSelector} div.add-entry-dropdown`).addClass('hidden');
    };
  }

  genOnGroupUngroupColumn(isGrouped: boolean) {
    return (data: any) => {
      this.verbose && console.log(`Column ${data.detail.col} ${isGrouped ? 'grouped' : 'ungrouped'}`);
      this.verbose && console.log('New sequence grouped with next');
      this.ctData['groupedColumns'] = data.detail.groupedColumns;
      this.options.onCtDataChange(this.ctData);
    };
  }

  genOnCollationChanges() {
    return () => {
      this.ctData['collationMatrix'] = this.getCollationMatrixFromTableEditor();
      this.setCsvDownloadFile();
      this.options.onCtDataChange(this.ctData);
    };
  }

  getCollationMatrixFromTableEditor() {
    let matrix = this.tableEditor.getMatrix();
    let cMatrix: number[][] = [];
    for (let row = 0; row < matrix.nRows; row++) {
      let witnessIndex = this.ctData['witnessOrder'][row];
      cMatrix[witnessIndex] = [];
      for (let col = 0; col < matrix.nCols; col++) {
        cMatrix[witnessIndex][col] = matrix.getValue(row, col);
      }
    }
    return cMatrix;
  }

  setCsvDownloadFile() {
    let href = 'data:text/csv,' + encodeURIComponent(CtData.generateCsv(this.ctData, ',', this.viewSettings.showNormalizations));
    this.exportCsvButton.attr('href', href);
  }

  genOnColumnDelete() {
    return (deletedCol: number, lastDeletedColumnInOperation: number) => {
      this.ctData['groupedColumns'] = this.tableEditor.columnSequence.getGroupedNumbers();
      if (this.ctData['type'] === CollationTableType.COLLATION_TABLE) {
        // nothing else to do for regular collation tables
        return;
      }
      this.syncEditionWitnessAndTableEditorFirstRow();
      this.ctData['collationMatrix'] = this.getCollationMatrixFromTableEditor();
      // fix references in custom apparatuses
      this.ctData['customApparatuses'] = CtData.fixReferencesInCustomApparatusesAfterColumnAdd(this.ctData, deletedCol, -1);
      this.setCsvDownloadFile();
      if (lastDeletedColumnInOperation) {
        this.options.onCtDataChange(this.ctData);
      }
    };
  }

  syncEditionWitnessAndTableEditorFirstRow() {
    let editionWitnessIndex = this.ctData['witnessOrder'][0];
    this.verbose && console.log(`Syncing edition witness and editor's first row`);
    this.verbose && console.log(`There are ${this.tableEditor.matrix.nCols} columns in the editor 
    and ${this.ctData['witnesses'][editionWitnessIndex].tokens.length} tokens in the edition witness`);

    this.ctData['witnesses'][editionWitnessIndex].tokens = this.getEditionWitnessTokensFromMatrixRow(this.ctData['witnesses'][editionWitnessIndex].tokens, this.tableEditor.matrix.getRow(0));
    for (let i = 0; i < this.tableEditor.matrix.nCols; i++) {
      this.tableEditor.matrix.setValue(0, i, i);
    }
    this.verbose && console.log(`Now there are ${this.tableEditor.matrix.nCols} columns in the editor 
    and ${this.ctData['witnesses'][editionWitnessIndex].tokens.length} tokens in the edition witness`);
  }

  getEditionWitnessTokensFromMatrixRow(currentTokens: WitnessTokenInterface[], matrixRow: number[]): WitnessTokenInterface[] {
    return matrixRow.map(ref => ref === -1 ? {
      tokenClass: TokenClass.EDITION,
      tokenType: TranscriptionTokenType.EMPTY,
      text: '',
      fmtText: []
    } : currentTokens[ref]);
  }

  genOnColumnAdd() {
    return (newCol: number) => {
      this.verbose && console.log(`Adding new column: ${newCol}, at ${Date.now()}`);
      this.ctData['groupedColumns'] = this.tableEditor.columnSequence.getGroupedNumbers();
      if (this.ctData['type'] === CollationTableType.EDITION) {
        this.syncEditionWitnessAndTableEditorFirstRow();
      }
      this.ctData['collationMatrix'] = this.getCollationMatrixFromTableEditor();
      // fix references in custom apparatuses
      this.ctData['customApparatuses'] = CtData.fixReferencesInCustomApparatusesAfterColumnAdd(this.ctData, newCol - 1, 1);
      this.setCsvDownloadFile();
      this.options.onCtDataChange(this.ctData);
    };
  }

  genOnCellPostShift() {
    return (data: any) => {
      let direction = data.detail.direction;
      let numCols = data.detail.numCols;
      let firstCol = data.detail.firstCol;
      let lastCol = data.detail.lastCol;
      let theRow = data.detail.row;

      // deal with shifts in edition witness
      if (this.ctData.type === CollationTableType.EDITION && theRow === 0) {
        console.log(`Cell shift in edition witness: ${direction}, ${numCols} col(s), ${firstCol} to ${lastCol}`);
        this.syncEditionWitnessAndTableEditorFirstRow();
        this.ctData.customApparatuses = CtData.fixReferencesInCustomApparatusesAfterEditionWitnessCellShift(this.ctData, firstCol, lastCol, numCols, direction);
      }

      this.recalculateVariants();

      let firstColToRedraw = direction === 'right' ? firstCol : firstCol - numCols;
      let lastColToRedraw = direction === 'right' ? lastCol + numCols : lastCol;

      new Promise<void>((resolve) => {
        // TODO: somehow tell the user that something is happening!
        resolve();
      })
      .then(() => {
        // refresh the cells in the row being shifted
        for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
          this.tableEditor.refreshCell(theRow, col);
          this.tableEditor.setupCellEventHandlers(theRow, col);
        }
      })
      .then(() => {
        // refresh cell classes of the other cells so that variants are shown
        for (let col = firstColToRedraw; col <= lastColToRedraw; col++) {
          for (let row = 0; row < this.variantsMatrix.nRows; row++) {
            if (row !== theRow) {
              // this.verbose && console.log(`Refreshing classes for ${theRow}:${col}`)
              this.tableEditor.refreshCellClasses(row, col);
            }
          }
        }
        //profiler.lap('classes refreshed')
      });
    };
  }

  recalculateVariants() {
    let refWitness = -1;
    if (this.ctData.type === 'edition') {
      refWitness = this.ctData['editionWitnessIndex'];
    }
    this.variantsMatrix = CollationTableUtil.genVariantsMatrix(this.tableEditor.getMatrix(), this.ctData['witnesses'], this.ctData['witnessOrder'], refWitness);
    // console.log(`Variants recalculated`)
    // console.log(this.variantsMatrix)
  }

  genCanDeleteColumn() {
    return (col: number) => {
      switch (this.ctData['type']) {
        case CollationTableType.COLLATION_TABLE:
          return this.tableEditor.isColumnEmpty(col);

        case CollationTableType.EDITION:
          let theMatrixCol = this.tableEditor.getMatrix().getColumn(col);
          let editionWitnessIndex = this.ctData['witnessOrder'][0];
          let editionToken = this.ctData['witnesses'][editionWitnessIndex]['tokens'][theMatrixCol[0]];
          if (editionToken !== undefined && editionToken.tokenType !== TranscriptionTokenType.EMPTY) {
            // an undefined editionToken means that the edition token is empty
            return false;
          }
          for (let i = 1; i < theMatrixCol.length; i++) {
            if (theMatrixCol[i] !== -1) {
              return false;
            }
          }
          return true;

        default:
          console.warn('Unknown collation table type!');
          return false;
      }
    };
  }

  genIsEmpty() {
    return (row: number, _col: number, ref: number) => {
      if (ref === -1) {
        return true;
      }

      let witnessIndex = this.ctData['witnessOrder'][row];
      let token = this.ctData['witnesses'][witnessIndex]['tokens'][ref];
      return token.tokenType === TranscriptionTokenType.EMPTY;
    };
  }

  genGenerateTableClassesFunction() {
    return () => {
      let langCode = this.ctData['lang'];
      return [('te-table-' + langCode)];
    };
  }

  /**
   * Highlight a range of columns in the collation table
   * if colStart < 0, removes all current highlight
   * if colEnd < 0, only colStart is highlighted
   * if colEnd > max column number in the table, highlights from colStart until the end of the table
   */
  highlightColumnRange(colStart: number, colEnd: number = -1, scrollIntoView: boolean = true) {
    if (colStart < 0) {
      this.removeColumnHighlight();
      return;
    }
    let maxCol = this.ctData['collationMatrix'][0].length - 1;
    if (colEnd < 0) {
      colEnd = colStart;
    }
    if (colEnd > maxCol) {
      colEnd = maxCol;
    }
    if (colStart > colEnd || colStart > maxCol) {
      console.warn(`Attempted to highlight invalid column range: ${colStart} to ${colEnd}`);
      return;
    }
    this.removeColumnHighlight();
    for (let i = colStart; i <= colEnd; i++) {
      $(`${this.containerSelector} table.te-table th.te-col-${i}`).addClass('highlight');
    }
    if (scrollIntoView) {
      let domElement = $(`${this.containerSelector} table.te-table th.te-col-${colStart}`).get(0);
      if (domElement !== undefined) {
        domElement.scrollIntoView();
      }
    }
  }

  removeColumnHighlight() {
    $(`${this.containerSelector} table.te-table th`).removeClass('highlight');
  }

  genOnCellConfirmEditFunction() {
    return (tableRow: number, col: number, newText: string) => {
      let witnessIndex = this.ctData['witnessOrder'][tableRow];
      let ref = this.ctData['collationMatrix'][witnessIndex][col];
      if (ref === -1) {
        // TODO: deal with null refs in edition witness
        console.warn(`Trying to edit a -1 ref at witness ${witnessIndex}, row ${tableRow}, col ${col}`);
        return {valueChange: false, value: ref};  // forces TableEditor to keep current value
      }

      let currentText = this.ctData['witnesses'][witnessIndex]['tokens'][ref]['text'];
      if (currentText === newText) {
        // no change!
        return {valueChange: false, value: ref}; // forces TableEditor to keep current value
      }
      newText = Util.trimWhiteSpace(newText);
      if (newText === '') {
        // empty token
        this.ctData = CtData.emptyWitnessToken(this.ctData, witnessIndex, ref);
      } else {
        let tokenType = Punctuation.stringIsAllPunctuation(newText, this.lang) ? TranscriptionTokenType.PUNCTUATION : TranscriptionTokenType.WORD;
        if (this.ctData['witnesses'][witnessIndex]['tokens'][ref]['fmtText'] === undefined) {
          // no formatting, just copy the text
          this.ctData['witnesses'][witnessIndex]['tokens'][ref]['text'] = newText;
        } else {
          //there is some formatting
          console.log(`Replacing edition witness token that contains formatting`);
          console.log(`newText: ${newText}`);
          console.log(`current fmtText: `);
          console.log(this.ctData['witnesses'][witnessIndex]['tokens'][ref]['fmtText']);
          let newFmtText = FmtTextUtil.withPlainText(this.ctData['witnesses'][witnessIndex]['tokens'][ref]['fmtText'], newText);
          this.ctData['witnesses'][witnessIndex]['tokens'][ref]['fmtText'] = newFmtText;
          this.ctData['witnesses'][witnessIndex]['tokens'][ref]['text'] = FmtTextUtil.getPlainText(newFmtText);
          console.log(`new fmtText: `);
          console.log(this.ctData['witnesses'][witnessIndex]['tokens'][ref]['fmtText']);
        }
        this.ctData['witnesses'][witnessIndex]['tokens'][ref]['tokenType'] = tokenType;
        if (tokenType === TranscriptionTokenType.WORD) {
          let norm;
          let normSource;
          if (this.ctData['automaticNormalizationsApplied'].length !== 0) {
            // apply normalizations for this token
            norm = this.normalizerRegister.applyNormalizerList(this.ctData['automaticNormalizationsApplied'], newText);
            normSource = NormalizationSource.COLLATION_EDITOR_AUTOMATIC;
          }
          let normalizedTokens = EditionWitnessTokenStringParser.parse(newText, this.ctData.lang, true, true);
          console.log(`Parser normalized tokens`);
          console.log(normalizedTokens);
          if (normalizedTokens.length === 1) {
            // we can use the parsed result
            norm = normalizedTokens[0].normalizedText;
            normSource = NormalizationSource.PARSER_NORMALIZER;
          }
          if (newText !== norm) {
            this.verbose && console.log(`New text normalized:  ${newText} => ${norm}`);
            this.ctData['witnesses'][witnessIndex]['tokens'][ref]['normalizedText'] = norm;
            this.ctData['witnesses'][witnessIndex]['tokens'][ref]['normalizationSource'] = normSource;
          }
        }
      }

      this.invalidateTokenDataCacheForToken(witnessIndex, ref);
      this.recalculateVariants();
      this.options.onCtDataChange(this.ctData);

      //  this.verbose && console.log('Edition Witness updated')
      //  this.verbose && console.log(this.ctData['witnesses'][witnessIndex]['tokens'])
      // ref stays the same
      return {valueChange: true, value: ref};
    };
  }

  invalidateTokenDataCacheForToken(witnessIndex: number, tokenIndex: number) {
    if (this.tokenDataCache[witnessIndex] === undefined) {
      this.tokenDataCache[witnessIndex] = {};
    }
    if (this.tokenDataCache[witnessIndex][tokenIndex] !== undefined) {
      this.tokenDataCache[witnessIndex][tokenIndex] = {};
    }
  }

  genGenerateCellContentFunction() {
    let noteIconSpan = ' <span class="noteicon"><i class="far fa-comment"></i></span>';
    let normalizationSymbol = '<b><sub>N</sub></b>';
    const EMPTY_CONTENT = '&mdash;';
    const PARAGRAPH_MARK = '&para;';
    const UNKNOWN_MARK = '???';
    return (tableRow: number, col: number, ref: number) => {
      if (ref === -1) {
        return EMPTY_CONTENT;
      }

      let witnessIndex = this.ctData.witnessOrder[tableRow];

      let cellCachedContent = this.getDataFieldFromTokenDataCache('cellContent', witnessIndex, ref);
      if (cellCachedContent !== undefined) {
        return cellCachedContent;
      }

      let tokenArray = this.ctData.witnesses[witnessIndex].tokens;
      let token = tokenArray[ref];
      if (token.tokenClass === TokenClass.EDITION) {
        if (token.tokenType === WitnessTokenType.FORMAT_MARK) {
          switch (token.markType) {
            case 'par_end':
              return PARAGRAPH_MARK;

            default:
              return UNKNOWN_MARK;
          }
        }
        if (token.tokenType === WitnessTokenType.NUMBERING_LABEL) {
          return `<span class='numbering-label'>${token.text}</span>`;
        }
        if (token.text === '') {
          return EMPTY_CONTENT;
        }
        if (token['fmtText'] === undefined) {
          return token['text'];
        }
        let renderer = new HtmlRenderer({plainMode: true});
        return renderer.render(token['fmtText']);
      }
      let postNotes = this.getPostNotes(witnessIndex, col, ref);
      const sourceItems = token.sourceItems ?? [];
      if (sourceItems.length === 1 && postNotes.length === 0) {
        if (this.viewSettings.showNormalizations && token['normalizedText'] !== undefined) {
          return token['normalizedText'] + normalizationSymbol;
        }
        this.storeDataFieldInTokenDataCache('cellContent', witnessIndex, ref, token.text);
        return token.text;
      }
      // spans for different items
      let itemWithAddressArray = this.ctData['witnesses'][witnessIndex]['items'] ?? [];
      let cellHtml = '';
      for (const itemData of sourceItems) {
        let theItem = itemWithAddressArray[itemData['index']];
        let itemText = '';
        if (theItem['text'] !== undefined) {
          itemText = theItem['text'].substring(itemData['charRange'].from, itemData['charRange'].to + 1);
        }
        if (theItem.type === 'TextualItem' && itemText !== "\n") {
          cellHtml += '<span class="' + this.getClassesFromItem(theItem).join(' ') + '">';
          // TODO: check to see if this is a bug in itemization! see I-DE-BER-SB-4o.Inc.4619, AW47-47
          // filter out leading new lines
          let theText = itemText.replace(/^\n/, '');
          cellHtml += theText;
          cellHtml += '</span>';
        }
      }
      // if there are notes after the token, put the note icon

      if (postNotes.length > 0) {
        cellHtml += noteIconSpan;
      }

      this.storeDataFieldInTokenDataCache('cellContent', witnessIndex, ref, cellHtml);
      return cellHtml;
    };
  }

  getClassesFromItem(item: FullTxItemInterface) {
    let classes = [];
    let hand = 0;
    if (item.hand !== undefined) {
      hand = item.hand;
    }
    if (hand !== 0) {
      // no class for hand 0
      classes.push('hand-' + hand);
    }

    if (item.format !== undefined && item.format !== '') {
      classes.push(item.format);
    }
    if (item['clarity'] !== undefined && item['clarity'] !== 1) {
      classes.push('unclear');
    }
    if (item['textualFlow'] !== undefined && item['textualFlow'] === 1) {
      classes.push('addition');
    }
    if (item.deletion !== undefined && item.deletion !== '') {
      classes.push('deletion');
    }
    if (item['normalizationType'] !== undefined && item['normalizationType'] !== '') {
      classes.push(item['normalizationType']);
    }
    return classes;
  }

  genGenerateCellClassesFunction() {
    return (tableRow: number, col: number, value: number) => {
      if (value === -1) {
        return ['token-type-empty'];
      }
      let witnessIndex = this.ctData['witnessOrder'][tableRow];
      let tokenArray = this.ctData['witnesses'][witnessIndex]['tokens'];
      let itemWithAddressArray = this.ctData['witnesses'][witnessIndex]['items'] ?? [];

      let token = tokenArray[value];

      let classes = this.getTokenClasses(token);

      switch (token.tokenClass) {
        case TokenClass.FULL_TX:
          classes.push('withpopover');

          //variant class
          if (this.viewSettings.highlightVariants) {
            // Note that the variantsMatrix refers to the tableRow not to the witness row
            let variant = this.variantsMatrix.getValue(tableRow, col);
            if (variant !== 0) {
              // no class for variant 0
              classes.push('variant-' + variant);
            }
          }
          // get itemZero
          // @ts-ignore
          let itemZeroIndex = token['sourceItems'][0]['index'];
          let itemZero = itemWithAddressArray[itemZeroIndex];
          // language class
          let lang = this.ctData['witnesses'][witnessIndex]['lang'];
          if (itemZero['lang'] !== undefined) {
            lang = itemZero['lang'];
          }
          classes.push('text-' + lang);
          // @ts-ignore
          if (token['sourceItems'].length === 1) {
            // td inherits the classes from the single source item
            return classes.concat(this.getClassesFromItem(itemZero));
          }
          break;

        case TokenClass.EDITION:
          if (token.tokenType === 'formatMark') {
            //classes.push('mark')
            switch (token.markType) {
              case 'par_end':
                classes.push('paragraph-end');
                break;

              default:
                classes.push('unknown');
            }
          } else {
            classes.push('withpopover');
            let langCode = this.ctData['lang'];
            classes.push('text-' + langCode);
          }
      }

      return classes;
    };
  }

  getTokenClasses(token: WitnessTokenInterface) {
    let classes = [];
    classes.push('token-type-' + token.tokenType);
    classes.push('token-class-' + token.tokenClass);

    return classes;
  }

  genCellValidationFunction() {

    function areAllOtherRowsEmpty(theCol: number[], theRow: number) {
      for (let i = 0; i < theCol.length; i++) {
        if (i !== theRow && theCol[i] !== -1) {
          return false;
        }
      }
      return true;
    }

    return (tableRow: number, col: number, currentText: string) => {
      let returnObject = {isValid: true, warnings: [], errors: <string[]>[]};

      // this.verbose && console.log(`Validating text '${currentText}'`)
      let trimmedText = Util.trimWhiteSpace(currentText);
      if (EditionWitnessTokenStringParser.isWordToken(trimmedText)) {
        // TODO: do not allow words when the rest of the witnesses only have punctuation
        return returnObject;
      }
      let isPunctuationAllowed = areAllOtherRowsEmpty(this.tableEditor.getMatrix().getColumn(col), tableRow);
      if (Punctuation.stringIsAllPunctuation(trimmedText, this.lang) && isPunctuationAllowed) {
        return returnObject;
      }
      // deal parsable word tokens
      let normalizedTokens = EditionWitnessTokenStringParser.parse(currentText, this.ctData.lang, true, true);
      if (normalizedTokens.length === 1 && normalizedTokens[0].tokenType === WitnessTokenType.WORD) {
        // all good
        return returnObject;
      }
      returnObject.isValid = false;
      if (isPunctuationAllowed) {
        returnObject.errors.push(`Please enter either a single word, punctuation or leave blank`);
      } else {
        returnObject.errors.push(`Please enter a single word or leave blank`);
      }

      return returnObject;
    };
  }

  getPostNotes(witnessIndex: number, _col: number, tokenIndex: number) {
    // this.debug && console.log(`Getting post notes for witness ${witnessIndex}, col ${_col}, token index ${tokenIndex}`);
    if (this.aggregatedNonTokenItemIndexes[witnessIndex] === undefined) {
      console.warn(`Found undefined row in this.aggregatedNonTokenItemIndexes, row = ${witnessIndex}`);
      return [];
    }

    if (this.aggregatedNonTokenItemIndexes[witnessIndex][tokenIndex] === undefined) {
      // this.debug && console.log(`Undefined aggregate non-token item index for row ${witnessIndex}, tokenIndex ${tokenIndex}`);
      return [];
    }
    let postItemIndexes = this.aggregatedNonTokenItemIndexes[witnessIndex][tokenIndex]['post'];
    // this.debug && console.log(`postItemIndexes`, postItemIndexes);

    let itemWithAddressArray = this.ctData['witnesses'][witnessIndex]['items'] ?? [];
    let notes = [];
    for (const itemIndex of postItemIndexes) {
      let theItem = itemWithAddressArray[itemIndex];
      let itemNotes = [];
      if (theItem['notes'] !== undefined) {
        itemNotes = theItem['notes'];
      }
      for (const note of itemNotes) {
        notes.push(note);
      }
    }
    return notes;
  }

  getDataFieldFromTokenDataCache(fieldName: string, witnessIndex: number, tokenIndex: number) {
    if (this.tokenDataCache[witnessIndex] !== undefined && this.tokenDataCache[witnessIndex][tokenIndex] !== undefined) {
      return this.tokenDataCache[witnessIndex][tokenIndex][fieldName];
    }
    return undefined;
  }

  storeDataFieldInTokenDataCache(fieldName: string, witnessIndex: number, tokenIndex: number, data: any) {
    if (this.tokenDataCache[witnessIndex] === undefined) {
      this.tokenDataCache[witnessIndex] = {};
    }
    if (this.tokenDataCache[witnessIndex][tokenIndex] === undefined) {
      this.tokenDataCache[witnessIndex][tokenIndex] = {};
    }
    this.tokenDataCache[witnessIndex][tokenIndex][fieldName] = data;
  }

  calculateAggregatedNonTokenItemIndexes() {
    return CtData.calculateAggregatedNonTokenItemIndexes(this.ctData);
  }

  genGenerateCellContentEditModeFunction() {
    return (tableRow: number, col: number, value: number) => {
      if (value === -1) {
        console.warn(`Editing a null cell (value = -1) at row ${tableRow}, col ${col}`);
        return '';
      }
      let witnessIndex = this.ctData['witnessOrder'][tableRow];
      let tokenArray = this.ctData['witnesses'][witnessIndex]['tokens'];
      let token = tokenArray[value];
      if (token['tokenClass'] === TokenClass.EDITION) {
        return token['text'];
      }
      return 'ERROR!';
    };
  }

  genIsCellEditable() {
    return (row: number, _col: number, value: number) => {
      if (value === -1) {
        // can't edit empty references
        return false;
      }
      let witnessIndex = this.ctData['witnessOrder'][row];
      let witness = this.ctData['witnesses'][witnessIndex];
      if (witness['witnessType'] !== 'edition') {
        // can't edit other than edition witnesses
        return false;
      }
      let tokenArray = this.ctData['witnesses'][witnessIndex]['tokens'];
      let token = tokenArray[value];
      // do not allow editing format marks
      return token['tokenType'] !== 'formatMark';
    };
  }

  genOnEnterCellEditMode() {
    return (row: number, col: number) => {
      this.verbose && console.log(`Enter cell edit ${row}:${col}`);
      $(this.tableEditor.getTdSelector(row, col)).popover('hide').popover('disable');
      return true;
    };
  }

  genOnLeaveCellEditMode() {
    return (row: number, col: number) => {
      this.verbose && console.log(`Leave cell edit ${row}:${col}`);
      $(this.tableEditor.getTdSelector(row, col)).popover('enable');
      this.restoreHiddenPopovers();
    };
  }

  restoreHiddenPopovers() {
    // TODO: is this needed?
    // $('div.popover').show()
    // this.setUpPopovers()
  }

  private popoversTurnOn() {
    this.popoversAreOn = true;
    this.popoversSetup();
  }

  private popoversTurnOff() {
    this.popoversAreOn = false;
    $(this.getContentAreaSelector()).popover('dispose');
  }

  private popoversSetup() {
    $(this.getContentAreaSelector()).popover({
      trigger: "hover",
      selector: '.withpopover',
      delay: {show: 500, hide: 0},
      placement: 'auto',
      html: true,
      title: '',
      container: 'body',
      content: this._popoversGenContentFunction()
    });
  }

}