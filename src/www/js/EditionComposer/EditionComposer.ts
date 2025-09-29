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
 // *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

// defaults
import {defaultLanguageDefinition} from '@/defaults/languages';

// utilities
import * as Util from '../toolbox/Util';
import {capitalizeFirstLetter, deepCopy} from '@/toolbox/Util';
import {OptionsChecker} from '@thomas-inst/optionschecker';
import * as ArrayUtil from '../lib/ToolBox/ArrayUtil';
import {AsyncKeyCache} from '@/toolbox/KeyCache/AsyncKeyCache';
import {ServerLogger} from '@/Server/ServerLogger';

// MultiPanel UI
import {horizontalMode, MultiPanelUI, verticalMode} from '@/MultiPanelUI/MultiPanelUI';
import {TabConfig, TabConfigInterface} from '@/MultiPanelUI/TabConfig';

// Panels
import {WitnessInfoPanel} from './WitnessInfoPanel';
import {CollationTablePanel} from './CollationTablePanel';
import {AdminPanel} from './AdminPanel';
import type {MainTextPanel} from './MainTextPanel';
import type {ApparatusPanel} from './ApparatusPanel';
import {EditionPreviewPanel} from './EditionPreviewPanel';
import type {TechSupportPanel} from './TechSupportPanel';

// Widgets
import {EditableTextField} from '@/widgets/EditableTextField';

// Normalizations
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';
import {ToLowerCaseNormalizer} from '@/normalizers/TokenNormalizer/ToLowerCaseNormalizer';
import {IgnoreArabicVocalizationNormalizer} from '@/normalizers/TokenNormalizer/IgnoreArabicVocalizationNormalizer';
import {IgnoreShaddaNormalizer} from '@/normalizers/TokenNormalizer/IgnoreShaddaNormalizer';
import {
  RemoveHamzahMaddahFromAlifWawYahNormalizer
} from '@/normalizers/TokenNormalizer/RemoveHamzahMaddahFromAlifWawYahNormalizer';
import {IgnoreTatwilNormalizer} from '@/normalizers/TokenNormalizer/IgnoreTatwilNormalizer';
import {IgnoreIsolatedHamzaNormalizer} from '@/normalizers/TokenNormalizer/IgnoreIsolatedHamzaNormalizer';

// CtData and Edition core
import {CtData} from '@/CtData/CtData';
import {CtDataEditionGenerator} from '@/Edition/EditionGenerator/CtDataEditionGenerator';
import * as CollationTableType from '../constants/CollationTableType';
import {Edition} from '@/Edition/Edition';
import * as NormalizationSource from '../constants/NormalizationSource';
import * as WitnessType from '../Witness/WitnessType';
import {EditionWitnessReferencesCleaner} from '@/CtData/CtDataCleaner/EditionWitnessReferencesCleaner';
import {CollationTableConsistencyCleaner} from '@/CtData/CtDataCleaner/CollationTableConsistencyCleaner';
import * as WitnessTokenType from '../Witness/WitnessTokenType';

// import { IgnoreHyphen } from '../normalizers/TokenNormalizer/IgnoreHyphen'
import {ApmPage} from '@/pages/ApmPage';
import {ApmFormats} from '@/pages/common/ApmFormats';
import {urlGen} from '@/pages/common/SiteUrlGen';
import {DataId_EC_ViewOptions} from '@/constants/WebStorageDataId';
import {CtDataInterface} from "@/CtData/CtDataInterface";

// import { Punctuation} from '../defaults/Punctuation.mjs'
// CONSTANTS

// tab ids
const editionTitleId = 'edition-title';
const collationTableTabId = 'collation-table';
const mainTextTabId = 'main-text-panel';
// const editionPreviewTabId = 'edition-preview'
const editionPreviewNewTabId = 'edition-preview-new';
const witnessInfoTabId = 'witness-info';
const adminPanelTabId = 'admin';
const techSupportTabId = 'tech';

// save button
const saveButtonTextClassNoChanges = 'text-muted';
const saveButtonTextClassChanges = 'text-primary';
const saveButtonTextClassSaving = 'text-warning';
const saveButtonTextClassError = 'text-danger';

const ViewOptionsCacheTtl = 180 * 24 * 3600;  // 6 months


interface SourceData {
  title: string;
  defaultSiglum: string;
  tid: number;
}

export class EditionComposer extends ApmPage {
  private readonly options: any;
  private readonly tableId: number;
  private readonly icons: {
    moveUp: string;
    moveDown: string;
    busy: string;
    checkOK: string;
    checkFail: string;
    checkCross: string;
    editText: string;
    editSettings: string;
    confirmEdit: string;
    cancelEdit: string;
    alert: string;
    savePreset: string;
    saveEdition: string;
    loadPreset: string;
    error: string;
    addEntry: string
  };
  private errorDetected: boolean;
  private errorDetail: string;
  private readonly apiSaveCollationUrl: string;
  private serverLogger: ServerLogger;
  private ctData: CtDataInterface;
  private readonly isNew: boolean;
  private lang: string;
  private readonly normalizerRegister: NormalizerRegister;
  private lastSavedCtData: CtDataInterface;
  private versionInfo: any;
  private lastVersion: string;
  private versionId: any;
  private cache: AsyncKeyCache;
  private edition: Edition;
  private convertingToEdition: boolean;
  private saving: boolean;
  private witnessUpdates: any[];
  private editionSources: any[] | null;
  private unsavedChanges: boolean;
  private viewOptions!: any;
  private collationTablePanel!: CollationTablePanel;
  private witnessInfoPanel!: WitnessInfoPanel;
  private adminPanel!: AdminPanel;
  private apparatusPanels!: ApparatusPanel[];
  private mainTextPanel!: MainTextPanel;
  private techSupportPanel!: TechSupportPanel;
  private editionPreviewPanel!: EditionPreviewPanel;
  private multiPanelUI!: MultiPanelUI;
  private titleField!: EditableTextField;
  private saveButtonPopoverContent!: string;
  private saveButtonPopoverTitle!: string;
  private saveButton!: JQuery<HTMLElement>;
  private errorButton!: JQuery<HTMLElement>;
  private errorButtonPopoverContent!: string;
  private errorButtonPopoverTitle!: string;
  private saveErrors!: boolean;

  constructor(options: any) {
    super(options);
    console.log(`Common Apm Page Data`);
    console.log(this.commonData);
    console.log(`Initializing Edition Composer`);

    // first load the fonts!

    // let fontsToLoad = [  '14pt AdobeArabic', 'bold 14pt AdobeArabic', '1em Apm_FreeSerif', '1em Noto Sans']
    //
    // fontsToLoad.forEach( (fontName) => {
    //   document.fonts.load(fontName).then( () => { console.log(`Font '${fontName}' loaded`)}).catch( (e) => {
    //     console.log(`Error loading font '${fontName}'`)
    //   })
    // })

    let optionsDefinition = {
      isTechSupport: {type: 'boolean', default: false},
      lastVersion: {type: 'boolean', required: true},
      collationTableData: {type: 'object', required: true},
      workId: {type: 'string', required: true},
      chunkNumber: {type: 'NonZeroNumber', required: true},
      tableId: {type: 'NonZeroNumber', required: true},
      versionId: {type: 'NonZeroNumber', required: true},
      langDef: {type: 'object', default: defaultLanguageDefinition},
      availableWitnesses: {
        type: 'Array', default: []
      }, // urlGenerator: { type: 'object', objectClass: ApmUrlGenerator, required: true},
      workInfo: {type: 'object', default: {}},
      peopleInfo: {type: 'object', default: {}},
      docInfo: {type: 'object', default: {}},
      versionInfo: {type: 'object', default: {}}
    };

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'EditionComposer'});
    this.options = oc.getCleanOptions(options);
    this.tableId = this.options.tableId;

    console.log(`EditionComposer Options`);
    console.log(this.options);

    // icons
    this.icons = {
      moveUp: '&uarr;',
      moveDown: '&darr;',
      busy: '<i class="fas fa-circle-notch fa-spin"></i>',
      checkOK: '<i class="far fa-check-circle"></i>',
      checkFail: '<i class="fas fa-exclamation-triangle"></i>',
      checkCross: '<i class="fas fa-times"></i>',
      editText: '<small><i class="fas fa-pen"></i></small>',
      editSettings: '<i class="fas fa-cog"></i>',
      confirmEdit: '<i class="fas fa-check"></i>',
      cancelEdit: '<i class="fas fa-times"></i>',
      alert: '<i class="fas fa-exclamation-triangle"></i>',
      savePreset: '<i class="fas fa-save"></i>',
      saveEdition: '<i class="bi bi-cloud-arrow-up"></i>',
      loadPreset: '<i class="fas fa-upload"></i>',
      error: '<i class="bi bi-bug-fill"></i>',
      addEntry: '<i class="bi bi-plus-lg"></i>'
    };

    this.errorDetected = false;
    this.errorDetail = '';

    this.apiSaveCollationUrl = urlGen.apiCollationTable_save();

    this.serverLogger = new ServerLogger({
      apiCallUrl: urlGen.apiAdminLog(), module: 'EditionComposer'
    });

    this.ctData = CtData.getCleanAndUpdatedCtData(this.options['collationTableData']);
    this.ctData.tableId = this.tableId;
    this.ctData = this.addMissingDataForCollationTable(this.ctData);

    console.log('Clean CT Data');

    console.log(this.ctData);


    this.isNew = this.ctData.tableId === -1;

    this.lang = this.ctData.lang;

    // Normalizers
    this.normalizerRegister = new NormalizerRegister();
    this.registerStandardNormalizers();
    this.lastSavedCtData = Util.deepCopy(this.ctData);

    // this.ctData['tableId'] = this.tableId
    this.versionInfo = this.options.versionInfo;
    this.lastVersion = this.options.lastVersion;
    this.versionId = this.options.versionId;

    if (!this.lastVersion) {
      console.warn('Working on an older version of the Edition/CollationTable');
    }

    this.cache = new AsyncKeyCache();

    this.edition = new Edition();
    this.reGenerateEdition();

    document.title = `${this.ctData.title} (${this.ctData['chunkId']})`;

    this.convertingToEdition = false;
    this.saving = false;
    this.witnessUpdates = [];
    this.editionSources = null;
    this.unsavedChanges = false;

    $(window).on('beforeunload', () => {
      if (this.unsavedChanges || this.convertingToEdition) {
        return false; // make the browser ask if the user wants to leave
      }
    });
    this.initPage().then(() => {
      console.log(`EditionComposer ready`);
    });

  }

  async initPage() {
    await super.initPage();
    this.viewOptions = await this.getViewOptions();
    console.log(`ViewOptions`, this.viewOptions);

    // Construct panels


    this.collationTablePanel = new CollationTablePanel({
      containerSelector: `#${collationTableTabId}`,
      normalizerRegister: this.normalizerRegister,
      icons: this.icons,
      ctData: this.ctData,
      onCtDataChange: this.genOnCtDataChange('collationTablePanel'),
      contentAreaId: 'ct-panel-content',
      peopleInfo: this.options.peopleInfo,
      editApparatusEntry: (apparatusIndex: number, ctIndexFrom: number, ctIndexTo: number) => {
        this.editApparatusEntryFromCollationTable(apparatusIndex, ctIndexFrom, ctIndexTo);
      },
      verbose: true
    });

    this.apparatusPanels = [];
    if (this.ctData.type === CollationTableType.EDITION) {
      console.log(`Loading ApparatusPanel and MainTextPanel`);
      const { ApparatusPanel} = await import('./ApparatusPanel.js');
      const { MainTextPanel} = await import('./MainTextPanel.js');
      console.log(`ApparatusPanel and MainTextPanel loaded`);
      this.apparatusPanels = this.edition.apparatuses
      .map((apparatus, appIndex) => {
        return new ApparatusPanel({
          ctData: this.ctData,
          containerSelector: `#apparatus-${appIndex}`,
          edition: this.edition,
          apparatusIndex: appIndex,
          highlightMainText: this.genHighlightMainTextForApparatusPanel(apparatus.type),
          hoverMainText: (entryIndex: number, on: boolean) => {
            if (this.ctData.type === CollationTableType.EDITION) {
              this.mainTextPanel.hoverEntry(appIndex, entryIndex, on);
            }
          },
          highlightCollationTableRange: this.genHighlightCollationTable(),
          onCtDataChange: this.genOnCtDataChange(`ApparatusPanel ${appIndex}`),
          onError: (msg: string) => {
            this._setError(`${msg} (Apparatus ${appIndex})`);
          },
          verbose: true,
          editApparatusEntry: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => {
            this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo);
          }
        });
      });

      this.mainTextPanel = new MainTextPanel({
        containerSelector: `#${mainTextTabId}`,
        ctData: this.ctData,
        edition: this.edition,
        apparatusPanels: this.apparatusPanels,
        debug: true,
        onError: (msg: string) => {
          this._setError(`${msg} (Main Text Panel)`);
        },
        onCtDataChange: this.genOnCtDataChange('mainTextPanel'),
        editApparatusEntry: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => {
          this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo);
        },
        editionWitnessTokenNormalizer: this.genEditionWitnessTokenNormalizer(),
        highlightEnabled: this.viewOptions.highlightEnabled,
        popoversEnabled: this.viewOptions.popoversEnabled,
        onChangeHighlightEnabled: (newStatus: boolean) => {
          this.viewOptions.highlightEnabled = newStatus;
          this.storeViewOptions(this.viewOptions);
        },
        onChangePopoversEnabled: (newStatus: boolean) => {
          this.viewOptions.popoversEnabled = newStatus;
          this.storeViewOptions(this.viewOptions);
        }
      });
    }
    this.witnessInfoPanel = new WitnessInfoPanel({
      verbose: true,
      userId: this.userId,
      apmDataProxy: this.apiClient,
      containerSelector: `#${witnessInfoTabId}`,
      ctData: this.ctData,
      onWitnessOrderChange: this.genOnWitnessOrderChange(),
      onSiglaChange: this.genOnSiglaChange(),
      onCtDataChange: this.genOnCtDataChange('witnessInfoPanel'),
      updateWitness: this.genUpdateWitness(),
      getWitnessData: this.genGetWitnessData(),
      fetchSiglaPresets: this.genFetchSiglaPresets(),
      fetchSources: this.genFetchSources(),
      addEditionSources: this.genAddEditionSources(),
      saveSiglaPreset: this.genSaveSiglaPreset(),
      getPageInfo: this.genGetPageInfo(),
    });

    this.adminPanel = new AdminPanel({
      apmDataProxy: this.apiClient,
      urlGen: urlGen,
      tableId: this.tableId,
      verbose: false,
      containerSelector: `#${adminPanelTabId}`,
      versionInfo: this.versionInfo,
      peopleInfo: this.options.peopleInfo,
      ctType: this.ctData['type'],
      archived: this.ctData['archived'],
      canArchive: true,
      onConfirmArchive: this.genOnConfirmArchive()
    });


    this.editionPreviewPanel = new EditionPreviewPanel({
      containerSelector: `#${editionPreviewNewTabId}`,
      edition: this.edition,
      langDef: this.options.langDef,
      onEditionTypeset: (typesetEdition: any) => {
        if (this.options.isTechSupport) {
          this.techSupportPanel.updateTypesetEdition(typesetEdition);
        }
      },
      getPdfDownloadUrl: this.genGetPdfDownloadUrlForPreviewPanel(),
      debug: true
    });


    let panelOneTabs: TabConfigInterface[] = [];
    if (this.ctData.type === CollationTableType.EDITION) {
      panelOneTabs.push(TabConfig.createTabConfig(mainTextTabId, 'Main Text', this.mainTextPanel));
    }
    panelOneTabs.push(TabConfig.createTabConfig(collationTableTabId, 'Collation Table', this.collationTablePanel), TabConfig.createTabConfig(witnessInfoTabId, 'Witness Info', this.witnessInfoPanel));
    let panelTwoTabs: TabConfigInterface[] = [];
    if (this.ctData.type === CollationTableType.EDITION) {
      panelTwoTabs.push(...this.edition.apparatuses
      .map((apparatus, index) => {
        return TabConfig.createTabConfig(`apparatus-${index}`, this.getTitleForApparatusType(apparatus.type), this.apparatusPanels[index], this._getLinkTitleForApparatusType(apparatus.type));
      }));
      panelTwoTabs.push(TabConfig.createTabConfig(editionPreviewNewTabId, 'Edition Preview', this.editionPreviewPanel), TabConfig.createTabConfig(adminPanelTabId, 'Admin', this.adminPanel));
    } else {
      // not an edition, show admin panel first
      panelTwoTabs.push(TabConfig.createTabConfig(adminPanelTabId, 'Admin', this.adminPanel), TabConfig.createTabConfig(editionPreviewNewTabId, 'Edition Preview', this.editionPreviewPanel), );
    }


    if (this.options.isTechSupport) {
      const { TechSupportPanel} = await import('./TechSupportPanel.js');
      this.techSupportPanel = new TechSupportPanel({
        containerSelector: `#${techSupportTabId}`, active: false, ctData: this.ctData, edition: this.edition
      });

      this.techSupportPanel.setActive(true);
      panelTwoTabs.push(TabConfig.createTabConfig(techSupportTabId, 'Tech', this.techSupportPanel));
    }

    this.multiPanelUI = new MultiPanelUI({
      logo: `<a href="${urlGen.siteHome()}" title="Home">
<img src="${urlGen.images()}/apm-logo-plain.svg" height="40px" alt="logo"/></a>`, topBarContent: () => {
        let warningSign = '';
        if (!this.lastVersion) {
          warningSign = `<a href="" class="text-danger" title="WARNING: showing an older version of this edition">${this.icons.alert}</a>&nbsp;`;
        }
        return `<div class="top-bar-item top-bar-title" >${warningSign}<span id="${editionTitleId}">Multi-panel User Interface</span></div>${this.genCtInfoDiv()}`;
      }, topBarRightAreaContent: () => {
        return `<div class="toolbar-group"><button class="top-bar-button text-danger" id="error-button">${this.icons.error}</button>
<button class="top-bar-button" id="save-button">${this.icons.saveEdition}</button></div>`;
      }, icons: {
        closePanel: '&times;',
        horizontalMode: `<img src="${urlGen.images()}/horizontal-mode.svg" alt="Horizontal Mode"/>`,
        verticalMode: `<img src="${urlGen.images()}/vertical-mode.svg" alt="Vertical Mode"/>`
      }, mode: this.viewOptions.vertical ? verticalMode : horizontalMode, onModeChange: (newMode: string) => {
        this.viewOptions.vertical = newMode === verticalMode;
        this.storeViewOptions(this.viewOptions);
      }, panels: [{
        id: 'panel-one', type: 'tabs', tabs: panelOneTabs
      }, {
        id: 'panel-two', type: 'tabs', tabs: panelTwoTabs
      }]
    });

    await this.multiPanelUI.start();
    //  Edition title
    this.titleField = new EditableTextField({
      containerSelector: '#edition-title',
      initialText: this.ctData.title,
      editIcon: '<i class="bi bi-pencil"></i>',
      confirmIcon: '<i class="bi bi-check"></i>',
      cancelIcon: '<i class="bi bi-x"></i>',
      onConfirm: this.genOnConfirmTitleField()
    });

    // save area
    this.saveButtonPopoverContent = 'TBD';
    this.saveButtonPopoverTitle = 'TBD';
    this.saveButton = $('#save-button');
    this.saveButton.popover({
      trigger: 'hover', placement: 'left', html: true, title: () => {
        return this.saveButtonPopoverTitle;
      }, content: () => {
        return this.saveButtonPopoverContent;
      }
    });
    this._updateSaveArea();
    this.saveButton.on('click', this.genOnClickSaveButton());

    // error
    this.errorButton = $('#error-button');
    this.errorButtonPopoverContent = 'TBD';
    this.errorButtonPopoverTitle = 'Error';
    this.errorButton.popover({
      trigger: 'hover', placement: 'left', html: true, title: () => {
        return this.errorButtonPopoverTitle;
      }, content: () => {
        return this.errorButtonPopoverContent;
      }
    });
    this._updateErrorUi();
  }

  getViewOptionsStorageKey() {
    return `Apm-EC-ViewOptions-${this.userId}-${this.tableId}`;
  }

  async getViewOptions() {
    let viewOptions = this.localCache.retrieve(this.getViewOptionsStorageKey(), DataId_EC_ViewOptions);
    return viewOptions === null ? {
      vertical: true, percentage: 50, popoversEnabled: true, highlightEnabled: true
    } : viewOptions;
  }

  storeViewOptions(viewOptions: any) {
    this.localCache.store(this.getViewOptionsStorageKey(), viewOptions, ViewOptionsCacheTtl, DataId_EC_ViewOptions);
  }

  editApparatusEntryFromCollationTable(apparatusIndex: number, ctFrom: number, ctTo: number) {
    console.log(`Adding apparatus entry for apparatus ${apparatusIndex} from collation table: ${ctFrom} to ${ctTo}`);
    if (ctFrom === -1 || ctTo === -1) {
      console.warn(`Invalid CT column range`);
      return;
    }
    console.log(`Getting main text index from out of ct ${ctFrom}`);
    let mainTextFrom = this._getMainTextIndexFromCtIndex(ctFrom);
    if (mainTextFrom === -1) {
      console.warn(`No main text found for given CT index`);
      return;
    }
    console.log(`Getting main text index to out of ct ${ctTo}`);
    let mainTextTo = this._getMainTextIndexFromCtIndex(ctTo);
    if (mainTextTo === -1) {
      console.warn(`No main text found for given CT index`);
      return;
    }
    this.editApparatusEntry(apparatusIndex, mainTextFrom, mainTextTo);
  }

  _getMainTextIndexFromCtIndex(ctIndex: number) {
    let ctData = this.ctData;
    let editionWitnessTokenIndex = ctData.collationMatrix[ctData.editionWitnessIndex][ctIndex];
    console.log(`Edition witness token index for ct ${ctIndex} is ${editionWitnessTokenIndex}`);
    for (let i = 0; i < this.edition.mainText.length; i++) {
      if (this.edition.mainText[i].editionWitnessTokenIndex === editionWitnessTokenIndex) {
        return i;
      }
    }
    return -1;
  }

  /**
   *
   * @param {number}apparatusIndex
   * @param {number}mainTextFrom
   * @param {number}mainTextTo
   */
  editApparatusEntry(apparatusIndex: number, mainTextFrom: number, mainTextTo: number) {
    console.log(`Got request to edit apparatus entry in apparatus ${this.edition.apparatuses[apparatusIndex].type}, from ${mainTextFrom} to ${mainTextTo}`);
    this.apparatusPanels[apparatusIndex].editApparatusEntry(mainTextFrom, mainTextTo, true);
    $(`#apparatus-${apparatusIndex}-tab`).tab('show');
  }

  registerStandardNormalizers() {
    switch (this.ctData.lang) {
      case 'la':
        this.normalizerRegister.registerNormalizer('toLowerCase', new ToLowerCaseNormalizer(), {
          lang: 'la', label: 'Ignore Letter Case', help: 'E.g., \'Et\' and \'et\' will be taken to be the same word'
        });
        // this.normalizerRegister.registerNormalizer(
        //   'ignoreHyphen',
        //   new IgnoreHyphen(),
        //   {
        //     lang: 'la',
        //     label: 'Ignore Hyphens',
        //     help: "E.g., 'cor-de' and 'corde' will be taken to be the same word"
        //   }
        // )
        break;

      case 'ar':
        this.normalizerRegister.registerNormalizer('removeHamzahMaddahFromAlifWawYah', new RemoveHamzahMaddahFromAlifWawYahNormalizer(), {
          lang: 'ar',
          label: 'Ignore hamzah and maddah in ʾalif, wāw and yāʾ',
          help: 'آ , أ, إ &larr; ا      ؤ &larr; و      ئ &larr; ي'

        });

        this.normalizerRegister.registerNormalizer('ignoreVocalization', new IgnoreArabicVocalizationNormalizer(), {
          lang: 'ar', label: 'Ignore Vocalization', help: 'Ignore vocal diacritics, e.g., الْحُرُوف &larr; الحروف'

        });
        this.normalizerRegister.registerNormalizer('ignoreShadda', new IgnoreShaddaNormalizer(), {
          lang: 'ar', label: 'Ignore shaddah', help: 'Ignore shaddah, e.g., درّس &larr; درس'
        });
        this.normalizerRegister.registerNormalizer('ignoreTatwil', new IgnoreTatwilNormalizer(), {
          lang: 'ar', label: 'Ignore taṭwīl', help: 'Ignore taṭwīl'
        });
        this.normalizerRegister.registerNormalizer('ignoreIsolatedHamza', new IgnoreIsolatedHamzaNormalizer(), {
          lang: 'ar', label: 'Ignore isolated hamza', help: 'Ignore isolated hamza'
        });
        break;

      case 'he':
        break;
    }
  }

  async _updateDataInPanels(updateWitnessInfo = false) {
    if (this.errorDetected) {
      console.log(`Not updating data in panels because of error`);
      return;
    }

    if (this.ctData.type === CollationTableType.EDITION) {
      await this.mainTextPanel.updateData(this.ctData, this.edition);  // mainTextPanel takes care of updating the apparatus panels
    }

    this.collationTablePanel.updateCtData(this.ctData, 'EditionComposer');
    // this.editionPreviewPanel.updateData(this.ctData, this.edition)
    await this.editionPreviewPanel.updateData(this.edition);
    this.witnessInfoPanel.updateCtData(this.ctData, updateWitnessInfo);
    if (this.options.isTechSupport) {
      this.techSupportPanel.updateData(this.ctData, this.edition);
    }

  }

  genEditionWitnessTokenNormalizer() {
    return (token: any) => this.applyNormalizationsToWitnessToken(token);
  }

  applyNormalizationsToWitnessToken(token: any): any {
    if (token.tokenType !== WitnessTokenType.WORD) {
      return token;
    }
    if (token['normalizedText'] !== '') {
      // token has been normalized already by the parser
      return token;
    }
    let newToken = deepCopy(token);
    if (this.ctData['automaticNormalizationsApplied'].length !== 0) {
      // apply normalizations for this token
      let norm = this.normalizerRegister.applyNormalizerList(this.ctData['automaticNormalizationsApplied'], token.text);
      if (norm !== token.text) {
        newToken['normalizedText'] = norm;
        newToken['normalizationSource'] = NormalizationSource.COLLATION_EDITOR_AUTOMATIC;
      }
    }

    return newToken;
  }

  genOnConfirmArchive() {
    let thisObject = this;
    return () => {
      return new Promise((resolve, reject) => {
        // console.log(`About to archive table`)
        this.ctData['archived'] = true;
        let apiCallOptions = {
          collationTableId: this.tableId,
          collationTable: this.ctData,
          descr: 'Archived',
          source: 'edit',
          baseSiglum: this.ctData['sigla'][0]
        };
        $.post(this.apiSaveCollationUrl, {data: JSON.stringify(apiCallOptions)}).done((apiResponse) => {
          // console.log("Success archiving table")
          // console.log(apiResponse)
          this.lastSavedCtData = Util.deepCopy(thisObject.ctData);
          this.versionInfo = apiResponse.versionInfo;
          this.unsavedChanges = false;
          this._updateSaveArea();
          resolve(this.versionInfo);
        }).fail((resp) => {
          console.log('ERROR: cannot archive table');
          this.ctData['archived'] = false;
          console.log(resp);
          reject();
        });
      });
    };
  }

  /**
   *
   * @param {string} detail
   * @private
   */
  _setError(detail: string) {
    this.errorDetected = true;
    this.errorDetail = detail;
    this.serverLogger.error('main', detail, {tableId: this.ctData['tableId']});
    this._updateErrorUi();
  }

  _updateErrorUi() {
    if (this.errorDetected) {
      this.errorButton.removeClass('hidden').addClass('blink');
      this.errorButtonPopoverContent = `<p>Software error detected, please make a note of what you were doing and report it to the developers. </p>
<p>${this.errorDetail}</p>`;
    } else {
      this.errorButton.removeClass('blink').addClass('hidden');
    }
    this._updateSaveArea();
  }

  genGetPdfDownloadUrlForPreviewPanel() {
    return async (rawData: any) => {
      return this.apiClient.getPdfDownloadUrl(rawData);
    };
  }

  /**
   * Changes the 'text-xxx' class to the new class, removing all others
   * @param element
   * @param newClass
   * @private
   */
  _changeBootstrapTextClass(element: JQuery<HTMLElement>, newClass: string) {
    let allClasses = 'text-primary text-secondary text-success text-danger text-warning text-info text-light text-dark text-body text-muted text-white text-black-50 text-white-50';
    element.removeClass(allClasses).addClass(newClass);
  }

  genOnClickSaveButton() {
    return () => {
      if (this.saving) {
        console.warn(`Click on save button while saving`);
        return;
      }
      let changes = this.getChangesInCtData();
      if (changes.length !== 0) {
        this.saving = true;
        this.unsavedChanges = true;
        this.saveButton.popover('hide');
        this.saveButton.html(this.icons.busy);
        this.saveButtonPopoverContent = 'Saving...';
        this.saveButtonPopoverTitle = '';
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassSaving);
        console.log('Saving table via API call to ' + this.apiSaveCollationUrl);
        let description = this.lastVersion ? '' : `From version ${this.versionId}: `;
        description += changes.join('. ');
        let apiCallOptions: any = {
          collationTable: this.ctData, descr: description, source: 'edit', baseSiglum: this.ctData['sigla'][0]
        };
        if (!this.isNew) {
          apiCallOptions.collationTableId = this.tableId;
        }
        $.post(this.apiSaveCollationUrl, {data: JSON.stringify(apiCallOptions)}).done(async (apiResponse) => {
          console.log('Success saving table');
          console.log(apiResponse);
          if (this.isNew) {
            // redirect to proper url
            this.unsavedChanges = false;
            location.replace(urlGen.siteChunkEdition(apiResponse.tableId));
          }
          if (!this.lastVersion) {
            // redirect to last version
            this.unsavedChanges = false;
            location.replace(urlGen.siteCollationTableEdit(this.tableId));
          } else {
            this.saveButton.html(this.icons.saveEdition);
            this.lastSavedCtData = Util.deepCopy(this.ctData);
            this.versionInfo = apiResponse.versionInfo;
            await this.adminPanel.updateVersionInfo(this.versionInfo);
            this.witnessUpdates = [];
            this.witnessInfoPanel.onDataSave();
            this.unsavedChanges = false;
            this.saveErrors = false;
            this.saving = false;
            this._updateSaveArea();
          }
        }).fail((resp) => {
          this.saveErrors = true;
          this.saving = false;
          this.saveButton.html(this.icons.saveEdition);
          console.error('Could not save table');
          console.log(resp);
          this._updateSaveArea();
        });
      }
    };
  }

  genGetWitnessData() {
    return (witnessId: any) => {
      return new Promise((resolve, reject) => {
        let apiUrl = urlGen.apiWitnessGet(witnessId, 'standardData');
        $.get(apiUrl).then((resp) => {
          // got witness data
          // normalize its tokens first
          let witnessData = resp['witnessData'];
          witnessData['tokens'] = CtData.applyNormalizationsToWitnessTokens(witnessData['tokens'], this.normalizerRegister, this.ctData['automaticNormalizationsApplied']);

          resolve(witnessData);
        }).fail((resp: any) => {
          let errorMsg = `Server status ${resp.status}`;
          if (resp.responseJSON !== undefined) {
            errorMsg += `, error message: '${resp.responseJSON.error}'`;
          }
          console.warn(`Error getting witness data ${witnessId} from server: ${errorMsg}`);
          reject(`Server communication error`);
        });
      });
    };
  }

  genUpdateWitness() {
    return async (witnessIndex: number, changeData: any, newWitness: any) => {

      console.log(`Updating witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]})`);

      let originalTimeStamp = this.ctData['witnesses'][witnessIndex]['timeStamp'];

      //process column inserts
      let insertedColumns = 0;
      let newTokenIndexes: any[] = [];
      changeData.ctChanges.forEach((change: any) => {
        if (change.type === 'insertColAfter') {
          console.log(`Processing insertCol after ${change.afterCol}, newTokenIndex = ${change.tokenIndexInNewWitness}`);
          CtData.insertColumnsAfter(this.ctData, change.afterCol + insertedColumns, 1);
          insertedColumns++;
          newTokenIndexes.push({index: change.afterCol + insertedColumns, new: change.tokenIndexInNewWitness});
        }
      });

      // Update references in collation table
      // this takes care of all 'replace' and 'empty' changes
      console.log(`Updating references in collation table`);
      this.ctData['collationMatrix'][witnessIndex] = this.ctData['collationMatrix'][witnessIndex].map((ref, i) => {
        if (ref === -1) {
          // console.log(`Col ${i}: ref -1`)
          return ref;
        }
        let newRef = changeData['tokenConversionArray'][ref];
        if (newRef === undefined) {
          newRef = -1;
          console.warn(`Col ${i}: Found undefined new ref in token conversion array, currentRef = ${ref}, setting to -1 for now`);
        }
        // if (newRef === ref) {
        //   console.log(`Col ${i}: ref ${ref} does not change`)
        // } else {
        //   console.log(`Col ${i}: ref ${ref} changes to ${newRef}`)
        // }
        return newRef;
      });

      newTokenIndexes.forEach((nti) => {
        let oldRef = this.ctData['collationMatrix'][witnessIndex][nti.index];
        if (oldRef !== -1) {
          console.warn(`Col: ${nti.index}, reference is not -1, cannot change to ${nti.new}. This should not happen!`);
        } else {
          console.log(`Col: ${nti.index}, ref changes from ${oldRef}  to ${nti.new}`);
          this.ctData['collationMatrix'][witnessIndex][nti.index] = nti.new;
        }
      });

      // 3. replace witness in ctData
      this.ctData['witnesses'][witnessIndex] = newWitness;

      //4. Clean up references
      let referencesCleaner = new EditionWitnessReferencesCleaner({verbose: true});
      this.ctData = referencesCleaner.getCleanCtData(this.ctData);

      // 5.Fixes inconsistencies
      let consistencyCleaner = new CollationTableConsistencyCleaner({verbose: true});
      this.ctData = consistencyCleaner.getCleanCtData(this.ctData);
      let inconsistencyErrors = consistencyCleaner.getErrors();
      if (inconsistencyErrors.length !== 0) {
        console.warn(`Inconsistencies found after update!`);
        this.serverLogger.warning('witnessUpdate', `Inconsistencies found in witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]}), table ${this.ctData['tableId']}`, inconsistencyErrors);
      } else {
        this.serverLogger.info('witnessUpdate', `Witness ${witnessIndex} (${this.ctData['witnessTitles'][witnessIndex]}) updated in table ${this.ctData['tableId']}`);
      }

      console.log(`New CT data after update`);
      console.log(this.ctData);

      // 4. update panels
      this.witnessUpdates.push({
        witnessIndex: witnessIndex,
        originalTimeStamp: originalTimeStamp,
        updatedTimeStamp: this.ctData['witnesses'][witnessIndex]['timeStamp']
      });
      this._updateSaveArea();
      this.reGenerateEdition(`Witness Update`);
      await this._updateDataInPanels(false);
      this.witnessInfoPanel.markWitnessAsJustUpdated(witnessIndex);
      return true;
    };
  }

  genGetPageInfo() {
    return (pageIds: string[]): Promise<any> => {
      return new Promise(async (resolve, reject) => {

        let pageIdsToGetFromServer = [];
        let pageInfoInCache = [];
        for (const pageId of pageIds) {
          let cachedInfo = await this.cache.retrieve(`PageInfo-${pageId}`);
          if (cachedInfo === null) {
            pageIdsToGetFromServer.push(pageId);
          } else {
            pageInfoInCache.push(cachedInfo);
          }
        }
        if (pageIdsToGetFromServer.length === 0) {
          resolve(pageInfoInCache);
        }
        let apiUrl = urlGen.apiGetPageInfo();
        $.post(apiUrl, {data: JSON.stringify({pages: pageIdsToGetFromServer})})
        .done(async (pageInfoArrayFromServer) => {
          for (const pageInfo of pageInfoArrayFromServer) {
            await this.cache.store(`PageInfo-${pageInfo.id}`, pageInfo);
          }
          pageInfoInCache.push(...pageInfoArrayFromServer);
          console.log(`Page Info`, pageInfoInCache);
          resolve(pageInfoInCache);
        })
        .fail(function (resp) {
          console.error('Error getting page info');
          console.log(resp);
          reject();
        });
      });
    };
  }

  genAddEditionSources() {
    return async (sourceDataArray: SourceData[]) => {
      console.log(`Adding sources`);
      console.log(sourceDataArray);
      let currentNumWitnesses = this.ctData.witnesses.length;
      sourceDataArray.forEach((sourceData, index) => {
        this.ctData.witnesses.push({
          witnessType: WitnessType.SOURCE, title: sourceData.title, ApmWitnessId: 'source:' + sourceData.tid, tokens:[]
        });
        this.ctData.witnessTitles.push(sourceData.title);
        this.ctData.witnessOrder.push(currentNumWitnesses + index);
        this.ctData.sigla.push(sourceData.defaultSiglum);
      });
      console.log(`New CT data after adding sources`);
      console.log(this.ctData);
      this._updateSaveArea();
      this.reGenerateEdition(`Source added`);
      await this._updateDataInPanels(true);
    };
  }

  filterOutUsedSources(sourceInfoArray: any) {
    return sourceInfoArray.filter((sourceInfo: any) => {
      let sourceApmId = `source:${sourceInfo['tid']}`;
      for (let i = 0; i < this.ctData.witnesses.length; i++) {
        if (this.ctData.witnesses[i]['ApmWitnessId'] === sourceApmId) {
          return false;
        }
      }
      return true;
    });
  }

  genFetchSources() {
    return () => {
      return new Promise((resolve, reject) => {
        if (this.editionSources !== null) {
          resolve(this.filterOutUsedSources(this.editionSources));
        }
        $.get(urlGen.apiEditionSourcesGetAll())
        .done((apiResponse) => {
          this.editionSources = apiResponse;
          resolve(this.filterOutUsedSources(this.editionSources));
        })
        .fail((resp) => {
          reject(resp);
        });
      });
    };
  }

  genFetchSiglaPresets() {
    return () => {
      return new Promise((resolve, reject) => {
        let apiSiglaPresetsUrl = urlGen.apiGetSiglaPresets();
        let apiCallOptions = {
          lang: this.ctData['lang'], witnesses: this.ctData['witnesses'].filter(w => {
            return w['witnessType'] === 'fullTx';
          }).map(w => w['ApmWitnessId'])
        };
        $.post(apiSiglaPresetsUrl, {data: JSON.stringify(apiCallOptions)})
        .done(apiResponse => {
          //console.log(apiResponse)
          if (apiResponse['presets'] === undefined) {
            resolve([]);
          } else {
            resolve(apiResponse['presets']);
          }
        }).fail(resp => {
          console.log('Error loading sigla presets');
          console.log(resp);
          reject(resp);
        });
      });
    };
  }

  genSaveSiglaPreset() {
    return (apiCallData: any): Promise<void> => {
      return new Promise((resolve, reject) => {
        console.log('About to call save preset API');
        console.log(apiCallData);
        let apiUrl = urlGen.apiSaveSiglaPreset();
        $.post(apiUrl, {data: JSON.stringify(apiCallData)}).done(() => {
          resolve();
        }).fail((resp) => {
          reject(resp);
        });
      });
    };
  }

  _updateSaveArea() {

    // console.log(`Updating save area`)

    if (this.errorDetected) {
      this.saveButtonPopoverTitle = 'Saving is disabled';
      this.saveButtonPopoverContent = `<p>Software error detected</p>`;
      this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges);
      this.saveButton
      .prop('disabled', true);
      return;
    }

    if (this.ctData['archived']) {
      let lastVersion = this.versionInfo[this.versionInfo.length - 1];
      this.saveButtonPopoverTitle = 'Saving is disabled';
      this.saveButtonPopoverContent = `<p>Edition is archived.</p><p>Last save: ${ApmFormats.timeString(lastVersion['timeFrom'])}</p>`;
      this.saveButton
      .prop('disabled', true);
      return;
    }

    let changes = this.getChangesInCtData();
    if (changes.length !== 0) {
      console.log(`There are changes`);
      console.log(changes);
      this.unsavedChanges = true;
      this.adminPanel.disallowArchiving('Save or discard changes before attempting to archive this table/edition');

      this.saveButtonPopoverContent = '<p>';
      this.saveButtonPopoverContent += '<ul>';
      for (const change of changes) {
        this.saveButtonPopoverContent += '<li>' + change + '</li>';
      }
      this.saveButtonPopoverContent += '</ul></p>';
      this.saveButtonPopoverTitle = 'Click to save changes';

      if (this.saveErrors) {
        this.saveButtonPopoverContent += `<p class="text-danger">Edition could not be saved, please try again</p>`;
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassError);
      } else {
        this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassChanges);
        this.saveButton.prop('disabled', false);
      }
    } else {
      // console.log(`No changes`)
      this.unsavedChanges = false;
      if (this.isNew) {
        this.saveButtonPopoverContent = `Last save: never`;
      } else {
        this.adminPanel.allowArchiving();
        let lastVersion = this.versionInfo[this.versionInfo.length - 1];
        this.saveButtonPopoverContent = `Last save: ${ApmFormats.timeString(lastVersion['timeFrom'])}`;

      }
      this.saveButtonPopoverTitle = 'Nothing to save';
      this._changeBootstrapTextClass(this.saveButton, saveButtonTextClassNoChanges);
      this.saveButton.prop('disabled', true);
    }
  }

  genOnCtDataChange(source: string) {
    return async (newCtData: CtDataInterface) => {
      console.log(`New CT Data received from ${source}`);
      this.ctData = CtData.copyFromObject(newCtData);
      console.log(this.ctData);
      this.reGenerateEdition(`New data received from ${source}`);
      // even if the new data source is mainTextPanel, need to tell the panel that there's a new edition
      if (this.ctData.type === CollationTableType.EDITION) {
        await this.mainTextPanel.updateData(this.ctData, this.edition);
      }

      if (source !== 'collationTablePanel') {
        this.collationTablePanel.updateCtData(newCtData, 'EditionComposer');
      }
      await this.editionPreviewPanel.updateData(this.edition);
      this.witnessInfoPanel.updateCtData(this.ctData, true);
      this._updateSaveArea();

    };
  }

  getChangesInCtData(): string[] {
    let changes = [];

    if (this.ctData['title'] !== this.lastSavedCtData['title']) {
      changes.push('New title: \'' + this.ctData['title'] + '\'');
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['collationMatrix'], this.lastSavedCtData['collationMatrix'], (a, b) => {
      return a === b;
    }, 2)) {
      changes.push('Changes in collation alignment');
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['witnessOrder'], this.lastSavedCtData['witnessOrder'])) {
      changes.push('New witness order');
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['sigla'], this.lastSavedCtData['sigla'])) {
      changes.push('Changes in sigla');
    }

    if (!ArrayUtil.varsAreEqual(this.ctData['siglaGroups'], this.lastSavedCtData['siglaGroups'])) {
      changes.push('Changes in sigla groups');
    }

    if (!ArrayUtil.varsAreEqual(this.ctData['customApparatuses'], this.lastSavedCtData['customApparatuses'])) {
      changes.push('Changes in custom apparatus entries');
    }

    if (this.ctData['type'] === CollationTableType.EDITION) {
      let editionWitnessIndex = this.ctData.editionWitnessIndex;
      let oldText = this.lastSavedCtData.witnesses[editionWitnessIndex].tokens?.map(token => token.text).join(' ') ?? '';
      let newText = this.ctData.witnesses[editionWitnessIndex].tokens?.map(token => token.text).join(' ') ?? '';
      if (oldText !== newText) {
        changes.push('Changes in edition text');
      } else {
        if (!ArrayUtil.varsAreEqual(this.ctData['witnesses'][editionWitnessIndex]['tokens'], this.lastSavedCtData['witnesses'][editionWitnessIndex]['tokens'])) {
          changes.push('Formatting changes in edition text');
        }
      }
      if (!ArrayUtil.varsAreEqual(this.ctData['excludeFromAutoCriticalApparatus'], this.lastSavedCtData['excludeFromAutoCriticalApparatus'])) {
        changes.push(`Changes to automatic critical apparatus witnesses`);
      }
      if (!ArrayUtil.varsAreEqual(this.ctData['includeInAutoMarginalFoliation'], this.lastSavedCtData['includeInAutoMarginalFoliation'])) {
        changes.push(`Changes to automatic marginal foliation witnesses`);
      }
    }

    this.witnessUpdates.forEach((updateInfo) => {
      let index = updateInfo.witnessIndex;
      changes.push(`Witness ${this.ctData['witnessTitles'][index]} updated from ${updateInfo.originalTimeStamp} to ${updateInfo.updatedTimeStamp}`);
    });

    if (!ArrayUtil.arraysAreEqual(this.ctData['groupedColumns'], this.lastSavedCtData['groupedColumns'])) {
      changes.push(`Changes in column grouping`);
    }

    if (!ArrayUtil.arraysAreEqual(this.ctData['automaticNormalizationsApplied'], this.lastSavedCtData['automaticNormalizationsApplied'])) {
      if (this.ctData['automaticNormalizationsApplied'].length === 0) {
        changes.push(`Disabled automatic normalizations`);
      } else {
        changes.push(`Applied automatic normalizations: ${this.ctData['automaticNormalizationsApplied'].join('+')}`);
      }
    }

    return changes;
  }

  genOnWitnessOrderChange() {
    return async (newOrder: number[]) => {
      this.ctData.witnessOrder = newOrder;
      if (this.ctData.type === CollationTableType.COLLATION_TABLE) {
        // keep the edition witness as the top one
        console.log(`New witness order`, newOrder);
        console.log(`Setting edition witness index to ${newOrder[0]}, was ${this.ctData.editionWitnessIndex}`);
        this.ctData.editionWitnessIndex = newOrder[0];
      }
      this.reGenerateEdition(`Change in witness order`);
      await this._updateDataInPanels();
      this._updateSaveArea();
    };
  }

  genOnSiglaChange() {
    return async (newSigla: string[]) => {
      this.ctData.sigla = newSigla;
      this.reGenerateEdition(`Sigla change`);
      await this._updateDataInPanels();
      this._updateSaveArea();
    };
  }

  genOnConfirmTitleField() {
    return (data: any) => {
      if (data.detail.newText !== data.detail.oldText) {
        let normalizedNewTitle = this.normalizeTitleString(data.detail.newText);
        if (normalizedNewTitle === '') {
          console.debug('Empty new title');
          this.titleField.setText(this.ctData['title']);
          return true;
        }
        //console.debug('New title: ' + normalizedNewTitle)
        this.ctData['title'] = normalizedNewTitle;
        this.titleField.setText(normalizedNewTitle);
        this._updateSaveArea();
        document.title = `${this.ctData.title} (${this.ctData['chunkId']})`;
      }
      return true;
    };
  }

  normalizeTitleString(title: string) {
    return title.replace(/^\s*/, '').replace(/\s*$/, '');
  }

  genCtInfoDiv() {
    let workTitle = this.options.workInfo['title'];
    let workAuthorTid = this.options.workInfo['authorId'];
    let workAuthorName = this.options.peopleInfo[workAuthorTid]['name'];
    return `<div id="ct-info" title="${workAuthorName}, ${workTitle}; table ID: ${this.tableId}">${this.options.workId}-${this.options.chunkNumber}</div>`;
  }

  /**
   *
   * @param {string}type
   * @return {string}
   * @private
   */
  _getLinkTitleForApparatusType(type: string): string {
    return `Click to show the Apparatus ${capitalizeFirstLetter(type)}`;
  }

  /**
   *
   * @param {CtDataInterface }ctData
   * @return {CtDataInterface}
   */
  private addMissingDataForCollationTable(ctData: CtDataInterface): CtDataInterface {
    ctData.customApparatuses = ctData.customApparatuses ?? [];
    return ctData;
  }

  private genHighlightCollationTable() {
    return (colStart: number, colEnd: number | undefined) => {
      if (colEnd === undefined) {
        console.warn(`Undefined col end`);
        console.trace();
      }
      //console.log(`Highlighting CT ${colStart} - ${colEnd}`)
      this.collationTablePanel.highlightColumnRange(colStart, colEnd);
    };
  }

  private genHighlightMainTextForApparatusPanel(apparatusType: string) {
    return (index: number[], on: boolean) => {
      if (this.ctData.type === CollationTableType.EDITION) {
        this.mainTextPanel.highlightTextForLemma(apparatusType, index, on);
      }
    };
  }

  private reGenerateEdition(context = 'N/A') {
    let eg = new CtDataEditionGenerator({ctData: this.ctData});
    try {
      this.edition = eg.generateEdition();
    } catch (e) {
      console.error(`Error generating edition`);
      console.error(e);
      this._setError(`Error re-generating edition, context: ${context}`);
    }
    if (!this.errorDetected) {
      console.log(`Edition Recalculated`);
      console.log(this.edition);
    }
  }

  private getTitleForApparatusType(type: string): string {
    return 'App ' + capitalizeFirstLetter(type);
  }
}

// Load as global variable so that it can be referenced in the Twig template
// @ts-ignore
window.EditionComposer = EditionComposer;