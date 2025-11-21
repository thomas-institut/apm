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

import {OptionsChecker} from '@thomas-inst/optionschecker';
import {Edition} from '@/Edition/Edition';
import {ApparatusCommon} from './ApparatusCommon';
import {PanelWithToolbar, PanelWithToolbarOptions} from '@/MultiPanelUI/PanelWithToolbar';
import {CtData} from '@/CtData/CtData';
import {onClickAndDoubleClick} from '@/toolbox/DoubleClick';
import {ApparatusEntryTextEditor} from './ApparatusEntryTextEditor';
import {capitalizeFirstLetter, getTextDirectionForLang, removeExtraWhiteSpace, trimWhiteSpace} from '@/toolbox/Util';
import {varsAreEqual} from '@/lib/ToolBox/ArrayUtil';
import * as SubEntryType from '../Edition/SubEntryType';
import * as SubEntrySource from '../Edition/SubEntrySource';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {MultiToggle} from '@/widgets/MultiToggle';
import {SiglaGroup} from '@/Edition/SiglaGroup';
import * as ArrayUtil from '../lib/ToolBox/ArrayUtil';
import {ConfirmDialog} from '@/pages/common/ConfirmDialog';
import {WitnessDataEditor} from './WitnessDataEditor';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {TagEditor} from '@/widgets/TagEditor';
import {getStringVal, UiToolBox} from '@/toolbox/UiToolBox';
import {horizontalMode, verticalMode} from '@/MultiPanelUI/MultiPanelUI';
import {
  CtDataInterface,
  CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO,
  CUSTOM_APPARATUS_SUB_ENTRY_TYPE_FULL_CUSTOM,
  CustomApparatusEntryInterface,
  CustomApparatusSubEntryInterface
} from "@/CtData/CtDataInterface";
import {WitnessDataItem} from "@/Edition/WitnessDataItem";
import {Apparatus} from "@/Edition/Apparatus";
import {fromCompactFmtText, getPlainText} from "@/lib/FmtText/FmtText";

const doubleVerticalLine = String.fromCodePoint(0x2016);
const verticalLine = String.fromCodePoint(0x007c);


const shortPanelThreshold = 400;
const minApparatusHeight = 250;
const apparatusPercentageHeight = 20;

const icons = {
  moveUp: '<i class="bi bi-arrow-up-short"></i>',
  moveDown: '<i class="bi bi-arrow-down-short"></i>',
  edit: '<small><i class="fas fa-pen"></i></small>',
  delete: '<i class="bi bi-trash"></i>',
  cancelEdit: '<i class="bi bi-x-circle"></i>',
  addEntry: '<i class="bi bi-plus-lg"></i>',
  deletePreviewBullet: '&bull;'
};

const editEntryButtonTitle = 'Click to edit selected apparatus entry';
const cancelEditButtonTitle = 'Click to cancel editing apparatus entry';

const entryFormStateNotInitialized = 0;
const entryFormStateEmpty = 1;
const entryFormStateDisplaying = 2;

interface ApparatusPanelOptions extends PanelWithToolbarOptions {
  ctData: CtDataInterface,
  edition: Edition,
  apparatusIndex: number,
  entrySeparator?: string,
  apparatusLineSeparator?: string,
  onCtDataChange: (ctData: CtDataInterface) => Promise<void>,
  onError: (error: string) => void,
  highlightMainText: (entryIndex: number[], on: boolean) => void,
  hoverMainText: (entryIndex: number, on: boolean) => void,
  editApparatusEntry: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => void,
  highlightCollationTableRange: (colStart: number, colEnd: number) => void,
}

interface ApparatusEntryEditor {
  text?: ApparatusEntryTextEditor,
  witnessData?: WitnessDataEditor,
  keyword?: MultiToggle,
  visible?: boolean,
}

type SubEntryEditorsArray = { [key: number]: ApparatusEntryEditor | null }

export class ApparatusPanel extends PanelWithToolbar {

  private options: ApparatusPanelOptions;
  private ctData: CtDataInterface;
  private edition: Edition;
  private apparatus: Apparatus;
  private lang: string;
  private readonly defaultTextDirection: string;
  private cachedHtml: string;
  private currentSelectedEntryIndex: number;
  private entryInEditor: ApparatusEntry | null;
  private editedEntry: ApparatusEntry | null;
  private selectNewEntry: boolean;
  private entryFormState: number;
  private newEntryMainTextFrom: number;
  private newEntryMainTextTo: number;
  private apparatusEntryFormIsVisible: boolean = false;
  private preLemmaToggle!: MultiToggle;
  private customPreLemmaTextInput!: JQuery<HTMLElement>;
  private lemmaToggle!: MultiToggle;
  private customLemmaTextInput!: JQuery<HTMLElement>;
  private postLemmaToggle!: MultiToggle;
  private customPostLemmaTextInput!: JQuery<HTMLElement>;
  private separatorToggle!: MultiToggle;
  private customSeparatorTextInput!: JQuery<HTMLElement>;
  private updateButton!: JQuery<HTMLElement>;
  private cancelButton!: JQuery<HTMLElement>;
  private tagEditor!: TagEditor;
  private subEntryEditors: SubEntryEditorsArray = [];


  constructor(options: ApparatusPanelOptions) {
    super(options);
    let optionsSpec = {

      ctData: {type: 'object'},
      edition: {type: 'object', objectClass: Edition, required: true},
      apparatusIndex: {type: 'number', required: true},
      entrySeparator: {type: 'string', default: verticalLine},
      apparatusLineSeparator: {type: 'string', default: doubleVerticalLine},
      onCtDataChange: {
        type: 'function', default: () => {
        }
      },
      onError: {
        type: 'function', default: () => {
        }
      },
      highlightMainText: {
        // function to be called when main text needs to be highlighted
        // (entryIndex, on) => { ... return nothing }
        type: 'function', default: (entryIndex: number, on: boolean) => {
          console.log(`Main Text HIGHLIGHT: ${this.options.apparatusIndex}:${entryIndex}, ${on}`);
        }
      },
      hoverMainText: {
        // function to be called when main text for an apparatus entry needs to be highlighted as if
        // the user were hovering over it.
        // (entryIndex, on) => { ... return nothing }
        type: 'function', default: (entryIndex: number, on: boolean) => {
          console.log(`Main Text HOVER: ${this.options.apparatusIndex}:${entryIndex}, ${on}`);
        }
      },
      highlightCollationTableRange: {
        // function to be called when a column range in the collation table
        // needs to be highlighted
        //  (colStart, colEnd) => { ... return nothing }
        type: 'function', default: () => {
        }
      },
      editApparatusEntry: {
        // function that opens an apparatus entry editor, provided by EditionComposer
        type: 'function', default: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => {
          console.log(`Edit apparatus ${apparatusIndex}, from ${mainTextFrom} to ${mainTextTo}`);
        }
      }
    };
    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'Apparatus Panel'});
    this.options = oc.getCleanOptions(options);

    this.ctData = this._buildWorkingCtData(options.ctData);
    this.edition = this.options.edition;

    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex];
    this.lang = this.edition.getLang();
    this.defaultTextDirection = getTextDirectionForLang(this.lang);
    this.cachedHtml = 'Apparatus coming soon...';
    this.currentSelectedEntryIndex = -1;
    this.hideApparatusEntryForm();
    this.entryInEditor = null;
    this.editedEntry = null;
    this.selectNewEntry = false;
    this.entryFormState = entryFormStateNotInitialized;
    this.newEntryMainTextFrom = -1;
    this.newEntryMainTextTo = -1;
    //this.debug = this.options.debug
    this.debug = true;
  }

  _buildWorkingCtData(ctData: CtDataInterface): CtDataInterface {
    let workingCtData = CtData.copyFromObject(ctData);
    workingCtData['siglaGroups'] = ctData['siglaGroups'].map((sg) => {
      return SiglaGroup.fromObject(sg);
    });
    return workingCtData;
  }

  onResize(visible: boolean) {
    super.onResize(visible);
    this.fitDivs();
  }

  /**
   * Adjusts the height or the width of the panel divs (apparatus entry form and apparatus)
   *
   * @private
   */
  fitDivs() {
    let apparatusDiv = $(this.getApparatusDivSelector());
    let contentArea = $(this.getContentAreaSelector());
    if (!this.apparatusEntryFormIsVisible) {
      // this.debug && console.log(`Apparatus entry form is NOT visible`)
      // this.debug && console.log(`Current apparatus height: ${apparatusDiv.outerHeight()}`)
      apparatusDiv.css('height', '');
      apparatusDiv.css('width', '');
      apparatusDiv.css('border-top', '');
      if (this.mode === horizontalMode) {
        // reset display grid used for horizontal mode
        contentArea.css('display', 'inline');
        contentArea.css('grid-template-columns', '');
      }
      $(this.getContentAreaSelector()).css('overflow-y', 'auto');
      return;
    }
    // this.debug && console.log(`Apparatus entry form is visible`);
    let currentContentHeight = $(this.getContentAreaSelector()).outerHeight() ?? 0;
    let formDiv = $(this.getApparatusEntryFormSelector());

    if (this.mode === verticalMode) {
      // first, reset apparatus css height so that we can measure its actual height
      apparatusDiv.css('height', '');
      apparatusDiv.css('border-top', '2px solid var(--panel-border-color)');
      formDiv.css('height', '');
      let currentApparatusHeight = apparatusDiv.outerHeight() ?? 0;
      this.debug && console.log(`Current container height: ${currentContentHeight}`);
      let currentFormHeight = formDiv.outerHeight() ?? 0;
      this.debug && console.log(`Current Form height: ${currentFormHeight}`);
      this.debug && console.log(`Current apparatus height: ${currentApparatusHeight}`);
      if (currentContentHeight < shortPanelThreshold) {
        // the panel is just too short for any meaningful fitting
        // this.debug && console.log(`Panel is too short, not doing any fitting`)
        return;
      }
      if (currentContentHeight > (currentApparatusHeight + currentFormHeight)) {
        // everything fits all right
        // this.debug && console.log(`Panel is larger than current content, no fitting is necessary`)
        return;
      }

      let newApparatusHeight = Math.max(minApparatusHeight, currentContentHeight * apparatusPercentageHeight / 100);
      apparatusDiv.css('height', newApparatusHeight);
      apparatusDiv.css('overflow-y', 'auto');
      formDiv.css('height', currentContentHeight - newApparatusHeight - 25);
      formDiv.css('overflow-y', 'auto');
      $(this.getContentAreaSelector()).css('overflow-y', 'clip');
    } else {
      // horizontal mode
      // apparatus and form use each half of the width of the panel
      // no need to calculate anything, the browser can do it with a grid
      contentArea.css('display', 'grid');
      contentArea.css('grid-template-columns', '1fr 1fr');
      apparatusDiv.css('border-left', '2px solid var(--panel-border-color)');
      apparatusDiv.css('overflow-y', 'auto');
      formDiv.css('overflow-y', 'auto');
    }
  }

  /**
   * Shows the entry editor, optionally adding a new custom sub-sentry
   * @param {number}mainTextFrom
   * @param {number}mainTextTo
   * @param {boolean}addCustom
   */
  editApparatusEntry(mainTextFrom: number, mainTextTo: number, addCustom: boolean = false) {
    this.verbose && console.log(`Editing apparatus entry main text ${mainTextFrom} to ${mainTextTo}`);
    let entryIndex = this.apparatus.entries.map((entry) => {
      return `${entry.from}-${entry.to}`;
    }).indexOf(`${mainTextFrom}-${mainTextTo}`);

    if (entryIndex === -1) {
      this.verbose && console.log(`New entry`);
      this._selectLemma(-1);
      this._loadEntryIntoEntryForm(-1, mainTextFrom, mainTextTo);
    } else {
      this.verbose && console.log(`Existing entry ${entryIndex}`);
      this._selectLemma(entryIndex);
      this._loadEntryIntoEntryForm(entryIndex);
    }
    if (addCustom) {
      this.addNewCustomSubEntry();
    }
    this._showApparatusEntryForm();
  }


  updateData(ctData: CtDataInterface, edition: Edition) {
    this.ctData = this._buildWorkingCtData(ctData);
    this.edition = edition;
    this.apparatus = this.edition.apparatuses[this.options.apparatusIndex];
    this.lang = this.edition.getLang();
  }

  _drawAndSetupSubEntryTableInForm() {
    if (this.editedEntry === null) {
      console.warn(`this.editedEntry is null`);
      return;
    }
    let formSelector = this.getApparatusEntryFormSelector();
    let apparatusIndex = this.options.apparatusIndex;
    let sigla = this.edition.getSigla();

    let subEntriesHtml = this.getSubEntriesHtml(this.editedEntry, apparatusIndex, sigla);
    $(`${formSelector} div.sub-entries`).html(subEntriesHtml);
    let numSubEntries = this.editedEntry.subEntries.length;
    $(this._getMoveUpDownButtonSelector(0, true)).addClass('disabled');
    $(this._getMoveUpDownButtonSelector(numSubEntries - 1, false)).addClass('disabled');

    // setup checkbox and arrow events
    $(`${formSelector} form-check-input`).off();

    this.editedEntry.subEntries.forEach((subEntry, i) => {
      $(this._getCheckboxSelector(i)).on('change', this._genOnChangeSubEntryEnabledCheckBox(i));
      $(this._getMoveUpDownButtonSelector(i, true)).on('click', this.genOnClickMoveUpDownButton(i, true, numSubEntries));
      $(this._getMoveUpDownButtonSelector(i, false)).on('click', this.genOnClickMoveUpDownButton(i, false, numSubEntries));
      this.subEntryEditors[i] = null;
      if (subEntry.source === 'user') {
        // custom entry
        this.debug && console.log(`Custom entry ${i}`);
        this.debug && console.log(subEntry);
        this.subEntryEditors[i] = {};

        if (subEntry.type === SubEntryType.FULL_CUSTOM) {
          this.subEntryEditors[i].text = new ApparatusEntryTextEditor({
            containerSelector: this._getSubEntryTextEditorDivSelector(i),
            lang: this.edition.lang,
            onChange: this._genOnChangeFreeTextEditor(i),
            debug: false
          });
          this.subEntryEditors[i].text.setText(subEntry.fmtText);

          this.subEntryEditors[i].witnessData = new WitnessDataEditor({
            containerSelector: this._getSubEntryWitnessEditorDivSelector(i),
            lang: this.edition.lang,
            sigla: this.ctData['sigla'],
            witnessData: subEntry.witnessData,
            onChange: this.genOnChangeWitnessDataEditor(i)
          });

          let emptyLabel = '&empty;';
          let omissionLabel = ApparatusCommon.getKeywordString('omission', this.edition.lang);
          let additionLabel = ApparatusCommon.getKeywordString('addition', this.edition.lang);

          let keywordToggle = new MultiToggle({
            containerSelector: this._getSubEntryKeywordToggleDivSelector(i),
            buttonClass: 'tb-button',
            wrapButtonsInDiv: true,
            buttonsDivClass: 'aei-multitoggle-button',
            initialOption: subEntry.keyword === '' ? 'none' : subEntry.keyword,
            buttonDef: [{label: emptyLabel, name: 'none', helpText: 'No keyword'}, {
              label: omissionLabel, name: 'omission', helpText: `Omission`
            }, {
              label: additionLabel, name: 'addition', helpText: `Addition`
            }, // { label: 'Custom', name: 'custom', helpText: "Enter custom pre-lemma text"},
            ]
          });
          this.subEntryEditors[i].keyword = keywordToggle;
          keywordToggle.on('toggle', () => {
            if (this.editedEntry === null) {
              console.warn(`this.editedEntry is null`);
              return;
            }
            let option = keywordToggle.getOption();
            let keywordValue = '';
            if (option !== 'none') {
              keywordValue = option;
            }
            this.editedEntry.subEntries[i].keyword = keywordValue;
            this.updateSubEntryPreview(i);
            this._updateUpdateApparatusButton();
          });
          this.subEntryEditors[i].visible = false;
        }
        $(this._getSubEntryEditButtonSelector(i)).on('click', this.genOnClickSubEntryEditButton(i));
        $(this._getSubEntryDeleteButtonSelector(i)).on('click', this.genOnClickSubEntryDeleteButton(i));
      }
    });
    $(this._getSubEntryAddCustomButtonSelector()).on('click', this.genOnClickAddCustomSubEntryButton());
  }

  _genOnChangeSubEntryEnabledCheckBox(index: number) {
    return () => {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      this.editedEntry.subEntries[index].enabled = $(this._getCheckboxSelector(index)).prop('checked');
      this._updateUpdateApparatusButton();
    };
  }

  _getCtColumnsText(ctFrom: number, ctTo: number) {
    if (ctFrom === ctTo) {
      return `${ctFrom + 1}`;
    }
    return `${ctFrom + 1}&ndash;${ctTo + 1}`;
  }

  async generateContentHtml(_tabId: string, _mode: string, _visible: boolean): Promise<string> {
    let textDirection = this.edition.lang === 'la' ? 'ltr' : 'rtl';
    return `<div class="aei-form" style="direction: ${textDirection}">${this.generateApparatusEntryFormHtml()}</div>
<div class="apparatus text-${this.lang}">${this.cachedHtml}</div>`;
  }

  getContentAreaClasses() {
    return super.getContentAreaClasses();
  }

  getApparatusDivSelector() {
    return `${this.containerSelector} div.apparatus`;
  }

  getApparatusEntryFormSelector() {
    return `${this.containerSelector} div.aei-form`;
  }

  postRender(id: string, mode: string, visible: boolean) {
    super.postRender(id, mode, visible);
    this._getEditEntryButtonElement().on('click', this._genOnClickEditEntryButton());
    this.edition.apparatuses.forEach((_app, index) => {
      $(`${this.containerSelector} .add-entry-apparatus-${index}`).on('click', this.genOnClickAddEntryButton(index));
    });
    $(this.getContainerSelector()).on('click', this._genOnClickPanelContainer());
    if (this.apparatusEntryFormIsVisible) {
      this._showApparatusEntryForm();
    } else {
      this.hideApparatusEntryForm();
    }
    this._setupApparatusEntryForm();
    this.entryFormState = entryFormStateEmpty;
  }

  _setupApparatusEntryForm() {
    let formSelector = this.getApparatusEntryFormSelector();
    this.updateButton = $(`${formSelector} .update-btn`);
    this.updateButton.on('click', this.genOnClickUpdateApparatusButton());
    this.cancelButton = $(`${formSelector} .cancel-btn`);
    this.cancelButton.on('click', this._genOnClickApparatusEntryCancelButton());

    // tags

    this.tagEditor = new TagEditor({
      containerSelector: `${formSelector} div.tags`,
      idPrefix: `app-tags-${this.options.apparatusIndex}`,
      getTagHints: async () => {
        return ['revise', 'remove', 'disjunctive error'];
      },
      saveTags: async (tags: string[]) => {
        if (this.editedEntry === null) {
          console.warn(`this.editedEntry is null`);
          return;
        }
        this.editedEntry.tags = [...tags];
        this._updateUpdateApparatusButton();
      },
      tags: [],
      mode: 'edit'
    });

    // preLemma
    let anteKeyword = ApparatusCommon.getKeywordString('ante', this.edition.lang);
    let postKeyword = ApparatusCommon.getKeywordString('post', this.edition.lang);
    let anteLabel = ApparatusCommon.getKeywordHtml('ante', this.edition.lang);
    let postLabel = ApparatusCommon.getKeywordHtml('post', this.edition.lang);
    this.preLemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .pre-lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [{label: 'Auto', name: 'auto', helpText: 'Let APM generate pre-lemma text'}, {
        label: anteLabel, name: 'ante', helpText: `Standard keyword '${anteKeyword}'`
      }, {label: postLabel, name: 'post', helpText: `Standard keyword '${postKeyword}'`}, {
        label: 'Custom', name: 'custom', helpText: "Enter custom pre-lemma text"
      },]
    });
    this.customPreLemmaTextInput = $(`${formSelector} .custom-pre-lemma-input`);
    this.customPreLemmaTextInput.addClass('hidden');
    this.preLemmaToggle.on('toggle', this.genOnToggleLemmaGroupToggle('preLemma', this.preLemmaToggle, this.customPreLemmaTextInput));
    this.customPreLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('preLemma', this.preLemmaToggle, this.customPreLemmaTextInput));

    // lemma
    this.lemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [{label: 'Auto', name: 'auto', helpText: 'Let APM generate lemma'}, {
        label: '<i>dash</i>', name: 'dash', helpText: "Force dash (&mdash;) between first and last words"
      }, {
        label: '<i>ellipsis</i>', name: 'ellipsis', helpText: "Force ellipsis (...) between first and last words"
      }, {label: 'Custom', name: 'custom', helpText: "Enter custom lemma text"},]
    });
    this.customLemmaTextInput = $(`${formSelector} .custom-lemma-input`);
    this.customLemmaTextInput.addClass('hidden');
    this.lemmaToggle.on('toggle', this.genOnToggleLemmaGroupToggle('lemma', this.lemmaToggle, this.customLemmaTextInput));
    this.customLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('lemma', this.lemmaToggle, this.customLemmaTextInput));


    // postLemma
    this.postLemmaToggle = new MultiToggle({
      containerSelector: `${formSelector} .post-lemma-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [{label: 'Auto', name: 'auto', helpText: 'Let APM generate post lemma text'}, {
        label: 'Custom', name: 'custom', helpText: "Enter custom post lemma text"
      },]
    });
    this.customPostLemmaTextInput = $(`${formSelector} .custom-post-lemma-input`);
    this.customPostLemmaTextInput.addClass('hidden');
    this.postLemmaToggle.on('toggle', this.genOnToggleLemmaGroupToggle('postLemma', this.postLemmaToggle, this.customPostLemmaTextInput));
    this.customPostLemmaTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('postLemma', this.postLemmaToggle, this.customPostLemmaTextInput));

    // separator
    this.separatorToggle = new MultiToggle({
      containerSelector: `${formSelector} .separator-toggle`,
      buttonClass: 'tb-button',
      wrapButtonsInDiv: true,
      buttonsDivClass: 'aei-multitoggle-button',
      buttonDef: [{label: 'Auto', name: 'auto', helpText: 'Let APM generate separator'}, {
        label: 'Off', name: 'off', helpText: "Turn off separator"
      }, {label: '&nbsp; : &nbsp;', name: 'colon', helpText: "Colon ':'"}, {
        label: 'Custom', name: 'custom', helpText: "Enter custom separator"
      },]
    });
    this.customSeparatorTextInput = $(`${formSelector} .custom-separator-input`);
    this.customSeparatorTextInput.addClass('hidden');
    this.separatorToggle.on('toggle', this.genOnToggleLemmaGroupToggle('separator', this.separatorToggle, this.customSeparatorTextInput));
    this.customSeparatorTextInput.on('keyup', this._genOnKeyUpLemmaGroupCustomTextInput('separator', this.separatorToggle, this.customSeparatorTextInput));

  }

  _genOnKeyUpLemmaGroupCustomTextInput(variable: string, toggle: MultiToggle, textInput: JQuery<Element>) {
    return () => {
      if (this.editedEntry !== null) {
        // @ts-expect-error using edited entry as object
        this.editedEntry[variable] = this.getLemmaGroupVariableFromToggle(toggle, textInput);
        this._updateUpdateApparatusButton();
      }
    };
  }

  _getCheckboxSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} .aei-sub-entry-${this.options.apparatusIndex}-${subEntryIndex}`;
  }

  /**
   *
   * @param {number}subEntryIndex
   * @param {boolean}up
   * @private
   */
  _getMoveUpDownButtonSelector(subEntryIndex: number, up: boolean) {
    return `${this.getApparatusEntryFormSelector()} span.move-${up ? 'up' : 'down'}-btn-${subEntryIndex}`;
  }

  _getSubEntryEditButtonSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} span.sub-entry-edit-btn-${subEntryIndex}`;
  }

  _getSubEntryDeleteButtonSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} span.sub-entry-delete-btn-${subEntryIndex}`;
  }

  _getSubEntryEditDivSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} div.sub-entry-edit-div-${subEntryIndex}`;
  }

  _getSubEntryTextEditorDivSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} div.sub-entry-text-editor-${subEntryIndex}`;
  }

  _getSubEntryWitnessEditorDivSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} div.sub-entry-witness-editor-${subEntryIndex}`;
  }

  _getSubEntryKeywordToggleDivSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} div.sub-entry-keyword-toggle-${subEntryIndex}`;
  }

  _getSubEntryPreviewSelector(subEntryIndex: number) {
    return `${this.getApparatusEntryFormSelector()} .aei-sub-entry-preview-${subEntryIndex}`;
  }

  _getSubEntryAddCustomButtonSelector() {
    return `${this.getApparatusEntryFormSelector()} span.add-custom-sub-entry-btn`;
  }

  _genOnChangeFreeTextEditor(subEntryIndex: number) {
    return () => {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      const textEditor = this.subEntryEditors[subEntryIndex]?.text ?? null;
      if (textEditor === null) {
        return;
      }
      this.editedEntry.subEntries[subEntryIndex].fmtText = textEditor.getFmtText();
      this.updateSubEntryPreview(subEntryIndex);
      this._updateUpdateApparatusButton();
    };
  }

  updateSubEntryPreview(subEntryIndex: number) {
    if (this.editedEntry === null) {
      console.warn(`this.editedEntry is null`);
      return;
    }
    $(this._getSubEntryPreviewSelector(subEntryIndex)).html(this.getSubEntryHtmlForEntryForm(this.editedEntry.subEntries[subEntryIndex], this.edition.getSigla()));
  }

  _updateUpdateApparatusButton() {
    if (!varsAreEqual(this.entryInEditor, this.editedEntry)) {
      this.updateButton.removeClass('hidden');
    } else {
      this.updateButton.addClass('hidden');
    }
    // console.log(`Changes in apparatus entry form`)
    // console.log(this.editedEntry)
  }

  _genOnClickApparatusEntryCancelButton() {
    return (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.hideApparatusEntryForm();
    };
  }

  _editSelectedEntry() {
    if (this.currentSelectedEntryIndex === -1) {
      return;
    }

    this._loadEntryIntoEntryForm(this.currentSelectedEntryIndex);
    this._showApparatusEntryForm();
    $(`.lemma-${this.options.apparatusIndex}-${this.currentSelectedEntryIndex}`)?.get(0)?.scrollIntoView();
  }

  _genOnClickEditEntryButton() {
    return (ev: any) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.apparatusEntryFormIsVisible) {
        this.hideApparatusEntryForm();
      } else {
        this._editSelectedEntry();
      }
    };
  }

  _genOnClickPanelContainer() {
    return (ev: any) => {
      if (this.apparatusEntryFormIsVisible) {
        return;
      }
      if ($(ev.target).hasClass('btn')) {
        return;
      }
      if ($(ev.target).hasClass('apparatus')) {
        return;
      }
      // click outside of apparatus when the entry form is hidden
      ev.preventDefault();
      ev.stopPropagation();
      if (this.currentSelectedEntryIndex !== -1) {
        this._selectLemma(-1);
      }
      this._getAddEntryDropdownButton().dropdown('hide');
    };
  }

  _getAllLemmaElements() {
    return $(`${this.getContentAreaSelector()} span.lemma`);
  }

  _getLemmaElement(entryIndex: number) {
    return $(`${this.getContentAreaSelector()} span.lemma-${this.options.apparatusIndex}-${entryIndex}`);
  }

  _showApparatusEntryForm() {
    if (this.entryInEditor === null) {
      return;
    }
    this.verbose && console.log(`Showing apparatus entry form`);
    $(this.getApparatusEntryFormSelector()).removeClass('hidden');
    this._getEditEntryButtonElement().html(icons.cancelEdit).attr('title', cancelEditButtonTitle).removeClass('hidden');
    this.options.highlightCollationTableRange(this.entryInEditor.metadata['ctGroup'].from, this.entryInEditor.metadata['ctGroup'].to);
    this.apparatusEntryFormIsVisible = true;
    this.fitDivs();
  }

  updateApparatus(mainTextTypesettingInfo: any) {
    // this.verbose && console.log(`Updating apparatus ${this.options.apparatusIndex}`)
    this.cachedHtml = this._genApparatusHtml(mainTextTypesettingInfo);
    $(this.getApparatusDivSelector()).html(this.cachedHtml);
    this._setUpEventHandlers();
    if (this.currentSelectedEntryIndex !== -1) {
      this._selectLemma(this.currentSelectedEntryIndex, false);
    } else {
      // this.verbose && console.log(`Apparatus update with no selected entry`)
      if (this.selectNewEntry) {
        this.verbose && console.log(`Finding new entry to select: ${this.newEntryMainTextFrom} - ${this.newEntryMainTextTo}`);
        this.currentSelectedEntryIndex = this.apparatus.entries.map((entry) => {
          return `${entry.from}-${entry.to}`;
        }).indexOf(`${this.newEntryMainTextFrom}-${this.newEntryMainTextTo}`);
        this._selectLemma(this.currentSelectedEntryIndex, false);
      }
    }
  }

  generateToolbarHtml(_tabId: string, _mode: string, _visible: boolean) {
    let appIndex = this.options.apparatusIndex;
    let apparatusLinks = this.edition.apparatuses.map((app, index) => {
      if (index === appIndex) {
        return '';
      }
      return `<a class="dropdown-item add-entry-apparatus-${index}" href="">${capitalizeFirstLetter(app.type)}</a>`;
    }).join('');

    return `<div class="panel-toolbar-group">
                <div class="panel-toolbar-item">
                    <a class="edit-entry-btn tb-button hidden" href="#" title="${editEntryButtonTitle}">${icons.edit}</a>
                </div>
                 <div class="panel-toolbar-item add-entry-dropdown hidden">
                  <div class="dropdown">
                     <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" 
                     id="add-entry-dropdown-${appIndex}" data-toggle="dropdown" aria-expanded="false" title="Click to add/edit entry in other apparatus">
                            ${icons.addEntry}
                     </button>
                     <div class="dropdown-menu" aria-labelledby="add-entry-dropdown-${appIndex}">${apparatusLinks}</div>
                  </div>
               </div>
               <div class="panel-toolbar-item"> 
                &nbsp;
               </div>
            </div>`;
  }

  _setUpEventHandlers() {
    let lemmaElements = this._getAllLemmaElements();
    lemmaElements.off()
    .on('mouseenter', this._genOnMouseEnterLemma())
    .on('mouseleave', this._genOnMouseLeaveLemma());
    onClickAndDoubleClick(lemmaElements, this._genOnClickLemma(), this._genOnDoubleClickLemma());
  }

  /**
   * Highlights the lemma for the given entryIndex with the standard
   * 'hover' style
   *
   * @param {number}entryIndex
   * @param {boolean}on
   */
  hoverEntry(entryIndex: number, on: boolean) {
    let lemmaElement = $(`${this.containerSelector} .lemma-${this.options.apparatusIndex}-${entryIndex}`);
    this.hoverLemma(lemmaElement, on);
  }

  hoverLemma(lemmaElement: JQuery<HTMLElement>, on: boolean) {
    if (this.apparatusEntryFormIsVisible) {
      return;
    }

    let entryIndexes = UiToolBox.getIntArrayIdFromAncestor('SPAN', lemmaElement, 'lemma-');
    if (entryIndexes.length < 1 || entryIndexes[0].length !== 2) {
      console.warn(`Found wrong lemma indices in element`, lemmaElement, entryIndexes);
      return;
    }
    let [, entryIndex] = entryIndexes[0];
    this.options.hoverMainText(entryIndex, on);

    if (on) {
      if (!lemmaElement.hasClass('lemma-selected')) {
        lemmaElement.addClass('lemma-hover');
      }
    } else {
      lemmaElement.removeClass('lemma-hover');
    }
  }

  _genOnMouseEnterLemma() {
    return (ev: any) => {
      this.hoverLemma($(ev.target), true);
    };
  }

  _genOnMouseLeaveLemma() {
    return (ev: any) => {
      this.hoverLemma($(ev.target), false);
    };
  }

  _genOnDoubleClickLemma() {
    return (ev: any) => {
      this._selectLemmaFromClickTarget(ev.target);
      this._editSelectedEntry();
    };
  }

  _genOnClickLemma() {
    return (ev: any) => {
      if (!this.apparatusEntryFormIsVisible) {
        this._selectLemmaFromClickTarget(ev.target);
      }
    };
  }

  _selectLemma(entryIndex: number, runCallbacks = true) {
    //console.log(`Selecting ${entryIndex}, runCallbacks = ${runCallbacks}`)
    this._getAllLemmaElements().removeClass('lemma-selected lemma-hover');
    this.options.highlightCollationTableRange(-1, -1);
    if (entryIndex === -1) {
      // Deselect
      if (runCallbacks && this.currentSelectedEntryIndex !== -1) {
        this.options.highlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false);
      }
      this.currentSelectedEntryIndex = -1;
      this._getEditEntryButtonElement().addClass('hidden');
      this._getAddEntryDropdownElement().addClass('hidden');
      this._getClearSelectionButtonElement().addClass('hidden');
      return;
    }
    this._getLemmaElement(entryIndex).addClass('lemma-selected');
    this._getEditEntryButtonElement().removeClass('hidden');
    this._getAddEntryDropdownElement().removeClass('hidden');
    this._getClearSelectionButtonElement().removeClass('hidden');
    let fullEntryArray = [this.options.apparatusIndex, entryIndex];
    if (runCallbacks) {
      if (this.currentSelectedEntryIndex !== -1) {
        this.options.highlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false);
      }
      this.options.highlightMainText(fullEntryArray, true);
    }
    this.currentSelectedEntryIndex = entryIndex;
  }

  _selectLemmaFromClickTarget(clickTarget: HTMLElement) {
    let target = $(clickTarget);
    let fullEntryArray = this._getLemmaIndexFromElement(target);
    this._selectLemma(fullEntryArray[1]);
  }

  onHidden() {
    super.onHidden();
    if (this.currentSelectedEntryIndex !== -1) {
      this.options.highlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], false);
    }

  }

  onShown() {
    super.onShown();
    if (this.currentSelectedEntryIndex !== -1) {
      this.options.highlightMainText([this.options.apparatusIndex, this.currentSelectedEntryIndex], true);
      if (this.apparatusEntryFormIsVisible && this.entryInEditor !== null) {

        this.options.highlightCollationTableRange(this.entryInEditor.metadata['ctGroup'].from, this.entryInEditor.metadata['ctGroup'].to);
      } else {
        this.options.highlightCollationTableRange(-1, -1);
      }
    } else {
      if (this.apparatusEntryFormIsVisible && this.entryInEditor !== null) {
        this.options.highlightCollationTableRange(this.entryInEditor.metadata['ctGroup'].from, this.entryInEditor.metadata['ctGroup'].to);
      } else {
        this.options.highlightCollationTableRange(-1, -1);
      }
    }
  }

  _getLemmaIndexFromElement(element: JQuery<HTMLElement>) {
    let indexes = UiToolBox.getIntArrayIdFromClasses(element, 'lemma-');
    if (indexes.length < 1) {
      return [-1, -1];
    }
    return indexes[0];
  }

  _getEditEntryButtonElement() {
    return $(`${this.containerSelector} .edit-entry-btn`);
  }

  _getAddEntryDropdownElement() {
    return $(`${this.containerSelector} div.add-entry-dropdown`);
  }

  _getAddEntryDropdownButton() {
    return $(`#add-entry-dropdown-${this.options.apparatusIndex}`);
  }

  _getClearSelectionButtonElement() {
    return $(`${this.containerSelector} .clear-selection-btn`);
  }

  _genApparatusHtml(mainTextTypesettingInfo: any) {
    // console.log(`Generating Apparatus html`)
    // console.log(mainTextTokensWithTypesettingInfo)
    // console.log(mainTextTokensWithTypesettingInfo.tokens.filter( (t) => { return t.type === 'text' && t.occurrenceInLine > 1}))
    let html = '';

    let lastLine = '';
    let sigla = this.edition.getSigla();
    let textDirectionMarker = this.edition.lang === 'la' ? '&lrm;' : '&rlm;';

    this.apparatus.entries.forEach((apparatusEntry, aeIndex) => {
      html += `<span class="apparatus-entry apparatus-entry-${this.options.apparatusIndex}-${aeIndex}">`;
      let currentLine = "__UNDEFINED__";
      try {
        currentLine = ApparatusCommon.getLineNumberString(ApparatusEntry.clone(apparatusEntry), mainTextTypesettingInfo, this.lang);
      } catch (e) {
        console.error(`Error getting lineNumber string in apparatus entry ${aeIndex}`);
        console.log(apparatusEntry);
      }

      let lineHtml = `${textDirectionMarker}&nbsp;${this.options.entrySeparator}&nbsp;`;
      if (currentLine !== lastLine) {
        let lineSep = aeIndex !== 0 ? `${this.options.apparatusLineSeparator}&nbsp;` : '';
        lineHtml = `${textDirectionMarker}${lineSep}<b class="apparatus-line-number">${currentLine}</b>`;
        lastLine = currentLine;
      }
      // build lemma section
      let preLemmaSpanHtml = '';
      const preLemmaText = getPlainText(fromCompactFmtText(apparatusEntry.preLemma));
      switch (preLemmaText) {
        case '':
          // do nothing
          break;

        case 'ante':
        case 'post':
          preLemmaSpanHtml = ApparatusCommon.getKeywordHtml(preLemmaText, this.edition.lang);
          break;

        default:
          preLemmaSpanHtml = ApparatusCommon.getKeywordHtml(preLemmaText, this.edition.lang);
      }
      let preLemmaSpan = preLemmaSpanHtml === '' ? '' : `<span class="pre-lemma">${preLemmaSpanHtml}</span> `;


      let lemmaSpan = `<span class="lemma lemma-${this.options.apparatusIndex}-${aeIndex}">${ApparatusCommon.getLemmaHtml(apparatusEntry, mainTextTypesettingInfo, this.edition.lang)}</span>`;

      let postLemmaSpan = '';
      const postLemmaText = getPlainText(fromCompactFmtText(apparatusEntry.postLemma));
      if (postLemmaText !== '') {
        let postLemma = ApparatusCommon.getKeywordHtml(postLemmaText, this.edition.lang);
        postLemmaSpan = ` <span class="pre-lemma">${postLemma}</span>`;
      }

      let separator;

      switch (apparatusEntry.separator) {
        case '':
          if (apparatusEntry.allSubEntriesAreOmissions()) {
            separator = '';
          } else {
            separator = ']';
          }
          break;

        case 'off':
          separator = '';
          break;

        case 'colon':
          separator = ':';
          break;

        default:
          separator = apparatusEntry.separator;
      }

      html += `${lineHtml} ${preLemmaSpan}${lemmaSpan}${postLemmaSpan}${separator} `;
      apparatusEntry.subEntries.forEach((subEntry, subEntryIndex) => {
        let classes = ['sub-entry', `sub-entry-${subEntryIndex}`, `sub-entry-type-${subEntry.type}`, `sub-entry-source-${subEntry.source}`];
        if (!subEntry.enabled) {
          classes.push('sub-entry-disabled');
        }
        html += `<span class="${classes.join(' ')}">
                            ${ApparatusCommon.genSubEntryHtmlContent(this.lang, subEntry, sigla, this.edition.siglaGroups)}
         </span>`;
        html += `<span style="direction: ${this.defaultTextDirection}; unicode-bidi: embed">&nbsp;</span>`;
      });
      html += '</span>';
    });
    if (html === '') {
      html = `<i>... empty ...</i>`;
    }
    return html;
  }

  private hideApparatusEntryForm() {
    $(this.getApparatusEntryFormSelector()).addClass('hidden');
    this._getEditEntryButtonElement().html(icons.edit).attr('title', editEntryButtonTitle);
    if (this.currentSelectedEntryIndex === -1) {
      this._getEditEntryButtonElement().addClass('hidden');
    }
    this.options.highlightCollationTableRange(-1, -1);
    this.apparatusEntryFormIsVisible = false;
    this.fitDivs();
  }

  private genOnClickUpdateApparatusButton() {
    return async () => {
      console.log(`Updating apparatus`);
      if (varsAreEqual(this.entryInEditor, this.editedEntry)) {
        // nothing to do
        console.log(`No changes in apparatus entry form`);
        return;
      }

      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      console.log(`About to update apparatus, edited entry: `);
      console.log(this.editedEntry);
      // so, there are changes
      this.updateButton.addClass('hidden');
      this.cancelButton.addClass('hidden');
      let infoDiv = $(`${this.getApparatusEntryFormSelector()} div.info-div`);
      infoDiv.html(`Updating edition...`);

      let customApparatusEntryForCtData: CustomApparatusEntryInterface = {
        subEntries: [],
        from: this.editedEntry.metadata['ctGroup'].from,
        to: this.editedEntry.metadata['ctGroup'].to,
        preLemma: this.editedEntry.preLemma,
        lemma: this.editedEntry.lemma,
        postLemma: this.editedEntry.postLemma,
        separator: this.editedEntry.separator,
        tags: [...this.editedEntry.tags]
      };

      customApparatusEntryForCtData.subEntries = this.editedEntry.subEntries.map((subEntry): CustomApparatusSubEntryInterface => {
        if (subEntry.source === SubEntrySource.AUTO) {
          // build a temporary ApparatusSubEntry object
          // in order to get a valid hash
          let se = new ApparatusSubEntry();
          se.fmtText = subEntry.fmtText;
          se.source = subEntry.source;
          se.type = subEntry.type;
          se.witnessData = subEntry.witnessData;
          se.position = subEntry.position;
          se.keyword = subEntry.keyword;
          se.tags = [...subEntry.tags];
          return {
            type: CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO,
            enabled: subEntry.enabled,
            position: subEntry.position,
            tags: [...subEntry.tags],
            hash: se.hashString()
          };
        } else {
          // custom entry
          return {
            type: CUSTOM_APPARATUS_SUB_ENTRY_TYPE_FULL_CUSTOM,
            enabled: subEntry.enabled,
            position: subEntry.position,
            fmtText: subEntry.fmtText,
            witnessData: subEntry.witnessData,
            keyword: subEntry.keyword,
            tags: [...subEntry.tags],
          };
        }
      });

      console.log(`Entry for CT data: `, customApparatusEntryForCtData);

      this.ctData = CtData.updateCustomApparatuses(this.ctData, this.apparatus.type, customApparatusEntryForCtData);
      this.cancelButton.removeClass('hidden');
      infoDiv.html('');
      this.hideApparatusEntryForm();
      if (this.currentSelectedEntryIndex === -1) {
        this.selectNewEntry = true;
        this.newEntryMainTextFrom = this.editedEntry.mainTextFrom;
        this.newEntryMainTextTo = this.editedEntry.mainTextTo;
        this.verbose && console.log(`Just updated a new entry: ${this.newEntryMainTextFrom} to ${this.newEntryMainTextTo}`);
      } else {
        this.selectNewEntry = false;
      }
      await this.options.onCtDataChange(this.ctData);
    };
  }

  private buildEntryToEdit(entryIndex: number, from = -1, to = -1) {
    let apparatusIndex = this.options.apparatusIndex;
    let theEntry;

    if (entryIndex !== -1) {
      // an existing entry
      theEntry = ApparatusEntry.clone(this.edition.apparatuses[apparatusIndex].entries[entryIndex]);
      from = theEntry.from;
      to = theEntry.to;
    } else {
      // new entry
      if (from === -1 || to === -1) {
        // need valid from and to indexes to create a new entry
        throw new Error(`Loading new entry with invalid 'from' and 'to' indexes: ${from} - ${to}`);
      }
      theEntry = new ApparatusEntry();
      theEntry.from = from;
      theEntry.to = to;
      theEntry.lemmaText = this.edition.getPlainTextForRange(from, to);
    }
    let ctIndexFrom = -1;
    let ctIndexTo = -1;
    if (from === -1) {
      if (theEntry.metadata['ctGroup'] !== undefined) {
        ctIndexFrom = theEntry.metadata['ctGroup'].from;
      } else {
        console.warn(`Undefined collation table indexes for existing apparatus entry`);
        console.log(theEntry);
      }
    } else {
      ctIndexFrom = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[from].editionWitnessTokenIndex);
    }
    if (to === -1) {
      if (theEntry.metadata['ctGroup'] !== undefined) {
        ctIndexTo = theEntry.metadata['ctGroup'].from;
      } else {
        console.warn(`Undefined collation table indexes for existing apparatus entry`);
        console.log(theEntry);
      }
    } else {
      ctIndexTo = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, this.edition.mainText[to].editionWitnessTokenIndex);
    }
    delete theEntry.metadata['ctGroup'];
    theEntry.metadata['ctGroup'] = {from: ctIndexFrom, to: ctIndexTo};
    return theEntry;
  }

  /**
   * Resets the apparatus entry form and loads it with the given entry
   */
  private _loadEntryIntoEntryForm(entryIndex: number, from: number = -1, to: number = -1) {
    let apparatusIndex = this.options.apparatusIndex;
    let formSelector = this.getApparatusEntryFormSelector();
    let formTitleElement = $(`${formSelector} .form-title`);
    console.log(`Loading entry: apparatus ${apparatusIndex}, entry ${entryIndex}`);

    this.entryInEditor = this.buildEntryToEdit(entryIndex, from, to);
    console.log(`Entry in editor = `, this.entryInEditor);

    // Form title
    if (entryIndex !== -1) {
      formTitleElement.html('Apparatus Entry');

    } else {
      formTitleElement.html('Apparatus Entry (new)');
    }
    // Edition text
    $(`${formSelector} div.entry-text`).html(this.entryInEditor.lemmaText);
    // Collation table columns
    $(`${formSelector} .ct-table-cols`).html(this._getCtColumnsText(this.entryInEditor.metadata['ctGroup'].from, this.entryInEditor.metadata['ctGroup'].to));
    // Lemma and separator section
    this.loadLemmaGroupVariableInForm('preLemma', this.entryInEditor, this.preLemmaToggle, this.customPreLemmaTextInput);
    this.loadLemmaGroupVariableInForm('lemma', this.entryInEditor, this.lemmaToggle, this.customLemmaTextInput);
    this.loadLemmaGroupVariableInForm('postLemma', this.entryInEditor, this.postLemmaToggle, this.customPostLemmaTextInput);
    this.loadLemmaGroupVariableInForm('separator', this.entryInEditor, this.separatorToggle, this.customSeparatorTextInput);

    this.tagEditor.setTags(this.entryInEditor.tags);

    this.editedEntry = ApparatusEntry.clone(this.entryInEditor);
    this.entryFormState = entryFormStateDisplaying;
    this._drawAndSetupSubEntryTableInForm();
    this._updateUpdateApparatusButton();
  }

  private getSubEntryHtmlForEntryForm(subEntry: ApparatusSubEntry, sigla: string[]) {
    let subEntryHtml = trimWhiteSpace(ApparatusCommon.genSubEntryHtmlContent(this.edition.lang, subEntry, sigla, this.edition.siglaGroups, true));
    if (subEntryHtml === '') {
      subEntryHtml = '<span class="empty-sub-entry">--empty--</span>';
    }
    return subEntryHtml;
  }

  private genOnChangeWitnessDataEditor(subEntryIndex: number) {
    return (newData: WitnessDataItem[]) => {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      this.editedEntry.subEntries[subEntryIndex].witnessData = newData;
      // update sub entry preview
      this.updateSubEntryPreview(subEntryIndex);
      this._updateUpdateApparatusButton();
    };
  }

  private genOnClickAddCustomSubEntryButton() {
    return () => {
      this.debug && console.log(`Click on add custom sub entry button`);
      this.addNewCustomSubEntry();
    };
  }

  /**
   * Adds a new custom sub entry to the entry currently being edited
   */
  private addNewCustomSubEntry() {
    if (this.editedEntry === null) {
      console.warn(`this.editedEntry is null`);
      return;
    }
    let newSubEntry = new ApparatusSubEntry();
    newSubEntry.type = SubEntryType.FULL_CUSTOM;
    newSubEntry.source = 'user';
    newSubEntry.position = this.editedEntry.subEntries.length;
    this.editedEntry.subEntries.push(newSubEntry);
    // redraw subEntry table
    this._drawAndSetupSubEntryTableInForm();
    this._updateUpdateApparatusButton();
    this.setSubEntryEditorVisibility(this.editedEntry.subEntries.length - 1, true);
  }

  private genOnClickSubEntryEditButton(subEntryIndex: number) {
    return () => {
      this.debug && console.log(`Click on edit button for subEntry ${subEntryIndex}`);
      if (this.subEntryEditors[subEntryIndex] === undefined || this.subEntryEditors[subEntryIndex] === null) {
        console.warn(`this.subEntryEditors[${subEntryIndex}] is undefined or null`);
        return;
      }
      this.setSubEntryEditorVisibility(subEntryIndex, !this.subEntryEditors[subEntryIndex].visible);
    };
  }

  private setSubEntryEditorVisibility(subEntryIndex: number, visible: boolean) {
    if (this.subEntryEditors[subEntryIndex] === undefined || this.subEntryEditors[subEntryIndex] === null) {
      console.warn(`this.subEntryEditors[${subEntryIndex}] is undefined or null`);
      return;
    }
    if (visible === this.subEntryEditors[subEntryIndex].visible) {
      return;
    }
    if (visible) {
      $(this._getSubEntryEditDivSelector(subEntryIndex)).removeClass('hidden');
      this.subEntryEditors[subEntryIndex].visible = true;
    } else {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      if (this.subEntryEditors[subEntryIndex].text === undefined) {
        console.warn(`this.subEntryEditors[${subEntryIndex}].text is undefined`);
        return;
      }
      this.subEntryEditors[subEntryIndex].text.setText(this.editedEntry.subEntries[subEntryIndex].fmtText);
      $(this._getSubEntryEditDivSelector(subEntryIndex)).addClass('hidden');
      this.subEntryEditors[subEntryIndex].visible = false;
    }
  }

  private genOnClickSubEntryDeleteButton(subEntryIndex: number) {
    return () => {
      this.debug && console.log(`About to delete subEntry ${subEntryIndex}`);
      let previewHtml = $(this._getSubEntryPreviewSelector(subEntryIndex)).html();
      let confirmDialog = new ConfirmDialog({
        body: `<p>Are you sure you want to delete this custom entry?</p>
            <p class="sub-entry-delete-preview">${icons.deletePreviewBullet} ${previewHtml}</p>
            <p>You can just disable it in case you change your mind about displaying it in the apparatus</p>
            `, acceptButtonLabel: 'Delete', cancelButtonLabel: 'Cancel', size: 'sm', acceptFunction: () => {
          if (this.editedEntry === null) {
            console.warn(`this.editedEntry is null`);
            return;
          }
          this.editedEntry.subEntries = this.editedEntry.subEntries.filter((_subEntry, i) => {
            return i !== subEntryIndex;
          }).map((subEntry, i) => {
            subEntry.position = i;
            return subEntry;
          });
          // redraw subEntry table
          this._drawAndSetupSubEntryTableInForm();
          this._updateUpdateApparatusButton();
        }
      });
      confirmDialog.show();
    };
  }

  private genOnClickMoveUpDownButton(subEntryIndex: number, up: boolean, numSubEntries: number) {
    let dir = up ? 'up' : 'down';
    return () => {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      this.debug && console.log(`Click on move ${dir} button, subEntry ${subEntryIndex}`);
      if (this.entryFormState !== entryFormStateDisplaying) {
        this.debug && console.log(`Not in 'displaying' state`);
        return;
      }

      if (!up && subEntryIndex === numSubEntries - 1) {
        this.debug && console.log(`Last subEntry, can't move lower`);
        return;
      }
      if (up && subEntryIndex === 0) {
        this.debug && console.log(`First subEntry, can't move higher`);
        return;
      }
      this.debug && console.log(`Moving sub entry ${subEntryIndex} ${dir}`);

      // swap this subEntry with the one before or after
      let indexOffset = up ? -1 : 1;
      ArrayUtil.swapElements(this.editedEntry.subEntries, subEntryIndex, subEntryIndex + indexOffset);
      // update position in array
      this.editedEntry.subEntries = this.editedEntry.subEntries.map((subEntry, i) => {
        subEntry.position = i;
        return subEntry;
      });

      this.debug && console.log(`Edited entry after move`);
      this.debug && console.log(this.editedEntry);

      // redraw subEntry table
      this._drawAndSetupSubEntryTableInForm();
      this._updateUpdateApparatusButton();

    };
  }

  private getSubEntriesHtml(entry: ApparatusEntry, apparatusIndex: number, sigla: string[]) {
    // Sub-entries
    let subEntriesHtml;
    if (entry.subEntries.length === 0) {
      subEntriesHtml = '<em>No sub-entries</em>';
    } else {
      subEntriesHtml = `<table class='sub-entries-table'>`;
      let tableRowsHtml = entry.subEntries.map((subEntry, sei) => {
        let typeLabel;
        let subEntryButtons = '';
        let editDiv = '';
        let sourceLabel = subEntry.source === 'auto' ? 'AUTO' : 'CUSTOM';
        switch (subEntry.type) {
          case SubEntryType.ADDITION:
            typeLabel = 'ADDITION';
            break;

          case SubEntryType.OMISSION:
            typeLabel = 'OMISSION';
            break;

          case SubEntryType.VARIANT:
            typeLabel = 'VARIANT';
            break;

          case SubEntryType.FULL_CUSTOM:
            typeLabel = '';
            break;

          case SubEntryType.AUTO_FOLIATION:
            typeLabel = 'FOLIATION';
            break;

          default:
            typeLabel = 'UNKNOWN';
            break;
        }

        if (subEntry.source === 'user') {
          subEntryButtons = `<span class="btn sub-entry-btn sub-entry-edit-btn-${sei}" title="Show/Hide Editor">${icons.edit}</span>
                <span class="btn sub-entry-btn sub-entry-delete-btn-${sei}" title="Delete">${icons.delete}</span>`;
          editDiv = `<div class="hidden sub-entry-edit-div sub-entry-edit-div-${sei}">
                    <div class="sub-entry-edit-container-${sei}">
                        <div class="sub-entry-keyword-edit sub-entry-keyword-edit-${sei}">
                            <div class="sub-entry-keyword-toggle-${sei} aei-multitoggle"></div>
                        </div>
                        <div class="sub-entry-text-editor-${sei}"></div>    
                        <div class="sub-entry-witness-editor-${sei}"></div>
                    </div>
                </div>`;
        }
        typeLabel = [sourceLabel, typeLabel].join(' ');
        let checkedString = subEntry.enabled ? 'checked' : '';
        let subEntryHtml = this.getSubEntryHtmlForEntryForm(subEntry, sigla);

        return `<tr>
            <td class="order-buttons">
               <span class="btn btn-sm move-up-btn-${sei}" title="Move up">${icons.moveUp}</span>
               <span class="btn btn-sm move-down-btn-${sei}" title="Move down">${icons.moveDown}</span>
            </td>
            <td class="sub-entry-label"><span class='sub-entry-type-label'>${typeLabel}</span></td>
            <td>
                <div class="form-check sub-entry-app-${apparatusIndex}">
                    <input class="form-check-input text-${this.edition.lang} aei-sub-entry-${apparatusIndex}-${sei}" type="checkbox" value="entry-${apparatusIndex}-${sei}" ${checkedString}>
                    <label class="form-check-label apparatus text-${this.edition.lang} aei-sub-entry-preview-${sei}" for="aei-subentry-${apparatusIndex}-${sei}"> 
                        ${subEntryHtml}
                    </label>
                    ${subEntryButtons}
                </div>
                ${editDiv}
            </td>
          </tr>`;
      }).join('');
      subEntriesHtml += tableRowsHtml;
      subEntriesHtml += `</table>`;
    }
    subEntriesHtml += `<span class="btn add-sub-entry-btn add-custom-sub-entry-btn">Add Custom</span>`;

    return subEntriesHtml;
  }

  private loadLemmaGroupVariableInForm(variable: string, appEntry: ApparatusEntry, toggle: MultiToggle, textInput: JQuery<HTMLElement>) {
    const entry = appEntry as { [key: string]: any };
    let option = this.getLemmaGroupVariableToggleOption(entry[variable]);
    toggle.setOptionByName(option);
    if (option === 'custom') {
      textInput.removeClass('hidden').val(entry[variable]);
    } else {
      textInput.addClass('hidden').val('');
    }
  }

  private getLemmaGroupVariableFromToggle(toggle: MultiToggle, textInputElement: JQuery<HTMLElement>) {
    switch (toggle.getOption()) {
      case 'auto':
        return '';

      case 'custom':
        return removeExtraWhiteSpace(getStringVal(textInputElement));

      default:
        return toggle.getOption();
    }
  }

  private genOnToggleLemmaGroupToggle(variable: string, toggle: MultiToggle, textInput: JQuery<HTMLElement>) {
    return () => {
      if (this.editedEntry === null) {
        console.warn(`this.editedEntry is null`);
        return;
      }
      // @ts-expect-error using editedEntry as { [key: string]: any }
      this.editedEntry[variable] = this.getLemmaGroupVariableFromToggle(toggle, textInput);
      // @ts-expect-error using editedEntry as { [key: string]: any }
      if (Array.isArray(this.editedEntry[variable])) {
        textInput.removeClass('hidden');
      } else {
        textInput.addClass('hidden');
      }
      this._updateUpdateApparatusButton();
    };
  }

  private getLemmaGroupVariableToggleOption(variableValue: any) {
    if (variableValue === '') {
      return 'auto';
    }
    if (Array.isArray(variableValue)) {
      return 'custom';
    }
    return variableValue;
  }

  private generateApparatusEntryFormHtml() {
    let shortCol = 2;
    let longCol = 12 - shortCol;
    const customTextSize = 10;
    const customSeparatorTextSize = 3;

    return `<div class="form-header">
                <h5 class="form-title">Apparatus Entry</h5>
            </div>
            <div class="form-body">
                <form>
                <div class="entry-header">
                    <div class="form-group row">
                        <div class="col-sm-${shortCol}">Edition Text:</div>
                        <div class="col-sm-${longCol} entry-text text-${this.edition.lang}">
                            some text  
                        </div>
                    </div>
                    <div class="form-group row">
                        <div class="col-sm-${shortCol}">Collation Table:</div>
                        <div class="col-sm-${longCol} ct-table-cols"></div>
                    </div>
                </div> <!-- entry-header-->
                  <div class="form-group row">
                        <div class="col-sm-${shortCol}">Tags:</div>
                        <div class="col-sm-${longCol} tags"></div>
                  </div>
                    <div class="form-group row">
                    <label for="pre-lemma-div" class="col-sm-${shortCol} col-form-label">Pre Lemma:</label>
                        <div class="col-sm-${longCol} aei-multitoggle-div pre-lemma-div">
                            <div class="pre-lemma-toggle aei-multitoggle"> </div>
                            <div><input type="text" class="custom-pre-lemma-input" size="${customTextSize}"></div>
                        </div>
                    
                    </div>
                    <div class="form-group row">
                        <label for="lemma-div" class="col-sm-${shortCol} col-form-label">Lemma:</label>
                        <div class="col-sm-${longCol} aei-multitoggle-div lemma-div">
                            <div class="lemma-toggle aei-multitoggle"> </div>
                            <div><input type="text" class="custom-lemma-input" size="${customTextSize}"></div>
                        </div>
                    </div>
                    <div class="form-group row">
                        <label for="post-lemma-div" class="col-sm-${shortCol} col-form-label">Post Lemma:</label>
                        <div class="col-sm-${longCol} aei-multitoggle-div post-lemma-div">
                            <div class="post-lemma-toggle aei-multitoggle"> </div>
                            <div><input type="text" class="custom-post-lemma-input" size="${customTextSize}"></div>
                        </div>
                    </div>
                    <div class="form-group row">
                         <label for="separator-div" class="col-sm-${shortCol} col-form-label">Separator:</label>
                        <div class="col-sm-${longCol} aei-multitoggle-div separator-div">
                            <div class="separator-toggle aei-multitoggle"> </div>
                            <div><input type="text" class="custom-separator-input" size="${customSeparatorTextSize}"></div>
                        </div>
                    </div>
                <div class="sub-entries"></div>
                </form>
            </div>
            <div class="form-footer">
                <button type="button" class="btn btn-sm btn-danger update-btn">Update Apparatus</button>
                <button type="button" class="btn btn-sm btn-primary cancel-btn">Cancel</button>
            </div>
            <div class="info-div"></div>`;
  }

  private genOnClickAddEntryButton(appIndex: number) {
    return (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();

      this.verbose && console.log(`Click on add entry button for apparatus ${appIndex}, currently selected entry: ${this.currentSelectedEntryIndex}`);
      if (this.currentSelectedEntryIndex === -1) {
        return;
      }
      let entryToEdit = this.buildEntryToEdit(this.currentSelectedEntryIndex);
      console.log(entryToEdit);
      this.options.editApparatusEntry(appIndex, entryToEdit.from, entryToEdit.to);
      this._getAddEntryDropdownButton().dropdown('hide');
    };
  }

  // _getLineNumberString(apparatusEntry, mainTextTypesettingInfo, lang) {
  //   if (mainTextTypesettingInfo.tokens[apparatusEntry.from] === undefined) {
  //     // before the main text
  //     return ApparatusCommon.getNumberString(1, this.lang)
  //   }
  //
  //   let startLine = mainTextTypesettingInfo.tokens[apparatusEntry.from].lineNumber
  //   let endLine = mainTextTypesettingInfo.tokens[apparatusEntry.to] === undefined ? '???' :
  //     mainTextTypesettingInfo.tokens[apparatusEntry.to].lineNumber
  //
  //   if (startLine === endLine) {
  //     return ApparatusCommon.getNumberString(startLine, lang)
  //   }
  //   return `${ApparatusCommon.getNumberString(startLine, lang)}-${ApparatusCommon.getNumberString(endLine, lang)}`
  // }


}