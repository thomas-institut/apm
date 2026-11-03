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
 * Main Text Panel
 *
 *  - Edition text and apparatus manipulation in a printed edition type user interface
 */

import {OptionsChecker} from '@thomas-inst/optionschecker';
import {wait} from '@/toolbox/wait';
import {MultiToggle} from '@/widgets/MultiToggle';
import {ApparatusCommon, MainTextTypesettingInfo} from './ApparatusCommon';
import * as EditionMainTextTokenType from '../Edition/MainTextTokenType.js';
import {Edition} from '@/Edition/Edition';
import {HtmlRenderer} from '@thomas-inst/fmt-text';
import {PanelWithToolbar, PanelWithToolbarOptions} from '@/MultiPanelUI/PanelWithToolbar';
import {numericSort, varsAreEqual} from '@/lib/ToolBox/ArrayUtil';
import {CtData} from '@/CtData/CtData';
import {capitalizeFirstLetter, deepCopy, trimWhiteSpace} from '@/toolbox/Util';
import {EditionMainTextEditor, EditionMainTextEditorFormatState} from './EditionMainTextEditor';
import {AsyncMyersDiff} from '@/toolbox/MyersDiff/AysncMyersDiff';
import * as WitnessTokenType from '../Witness/WitnessTokenType';
import * as EditionWitnessFormatMarkType from '../Witness/EditionWitnessFormatMark';

import {WitnessToken} from '@/Witness/WitnessToken';
import {CollapsePanel} from '@/widgets/CollapsePanel';
import {MainText} from '@/Edition/MainText';
import {NiceToggle, toggleEvent} from '@/widgets/NiceToggle';
import {EventThrottle} from '@/toolbox/EventThrottle';
import {UiToolBox} from '@/toolbox/UiToolBox';
import {SimpleProfiler} from '@/SimpleProfiler';
import {ApparatusPanel} from "@/EditionComposer/ApparatusPanel";
import {CtDataInterface, WitnessTokenInterface} from "@/CtData/CtDataInterface";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {Apparatus} from "@/Edition/Apparatus";
import {
  applyMainTextChangesToCtData,
  calculateMainTextChanges,
  convertMainTextToFmtText,
  fmtTextToEditionWitnessTokens,
  MainTextEditChange
} from '@/Edition/MainTextEditChanges';
import {createElement} from 'react';
import {createRoot, Root} from 'react-dom/client';
import MainTextEditorToolbar from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextEditorToolbar';

const EDIT_MODE_OFF = 'off';
const EDIT_MODE_APPARATUS = 'apparatus';
const EDIT_MODE_TEXT = 'text';

const typesetInfoDelay = 200;

const betaEditorDivId = 'text-editor';
const betaEditorToolbarDivId = 'text-editor-toolbar';
const betaEditorInfoDiv = 'text-editor-info';

const icons = {
  addEntry: '<i class="bi bi-plus-lg"></i>',
  commitEdit: '<i class="bi bi-check-lg"></i>',
  revertEdit: '<i class="bi bi-arrow-counterclockwise"></i>',
  popoverSettings: '<i class="bi bi-gear"></i>',
  toggleOn: '<i class="fas fa-toggle-on"></i>',
  toggleOff: '<i class="fas fa-toggle-off"></i>'
};
interface MainTextPanelOptions extends PanelWithToolbarOptions {
  ctData: CtDataInterface;
  edition: Edition;
  apparatusPanels: ApparatusPanel[];
  onError: (error: string) => void;
  onCtDataChange: (ctData: CtDataInterface) => Promise<void>;
  editionWitnessTokenNormalizer: (token: WitnessToken) => WitnessToken;
  editApparatusEntry: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => void;
  onChangeHighlightEnabled: (newStatus: boolean) => void;
  onChangePopoversEnabled: (newStatus: boolean) => void;
  popoversEnabled?: boolean;
  highlightEnabled?: boolean;
}

type ChangeInterface = MainTextEditChange;

export class MainTextPanel extends PanelWithToolbar {

  private options: MainTextPanelOptions;
  private ctData: CtDataInterface;
  private edition: Edition;
  private readonly lang: string;
  private mainTextNeedsToBeRedrawnOnNextOnShownEvent: boolean;
  private currentEditMode: string;
  private editingTextToken: boolean;
  private originalTokenText: string;
  private tokenBeingEdited: number;
  private readonly textTokenEditor: any;
  private selection: { from: number; to: number };
  private selecting: boolean;
  private cursorInToken: boolean;
  private tokenIndexOne: number;
  private tokenIndexTwo: number;
  private lastMainTextTypesettingInfo: MainTextTypesettingInfo | null;
  private detectNumberingLabels: boolean;
  private detectIntraWordQuotationMarks: boolean;
  private diffEngine: AsyncMyersDiff;
  private onchangeMainTextFreeTextEditorWaiting: boolean;
  private popoversEnabled: any;
  private highlightEnabled: any;
  private changesInfoDivConstructed: boolean;
  private htmlRenderer: HtmlRenderer;
  private modeToggle!: MultiToggle;
  private popoverToggle!: NiceToggle;
  private highlightToggle!: NiceToggle;
  private textEditCommitDiv!: JQuery<HTMLElement>;
  private textEditRevertDiv!: JQuery<HTMLElement>;
  private numberingLabelsToggle: any;
  private ignoreIntraWordQuotesToggle: any;
  private freeTextEditor!: EditionMainTextEditor;
  private textEditorToolbarRoot: Root | null = null;
  private betaEditorInfoDiv!: JQuery<HTMLElement>;
  private commitedFreeText: any;
  private changes: ChangeInterface[] = [];
  private done!: boolean;
  private numChangesPar!: JQuery<HTMLElement>;
  private revisionsPanel!: CollapsePanel;
  private ctChangesPanel!: CollapsePanel;

  constructor(options: MainTextPanelOptions) {
    super(options);
    let optionsDefinition = {
      ctData: {type: 'object'},
      edition: {type: 'object', objectClass: Edition},
      apparatusPanels: {type: 'array'},
      onError: {
        type: 'function', default: () => {
        }
      },
      onCtDataChange: {
        type: 'function', default: () => {
        }
      },
      editionWitnessTokenNormalizer: {
        type: 'function', default: (token: WitnessTokenInterface) => {
          return token;
        }
      },
      editApparatusEntry: {
        // function that opens an apparatus entry editor, provided by EditionComposer
        type: 'function', default: (apparatusIndex: number, mainTextFrom: number, mainTextTo: number) => {
          console.log(`Edit apparatus ${apparatusIndex}, from ${mainTextFrom} to ${mainTextTo}`);
        }
      },
      onChangeHighlightEnabled: {
        type: 'function', default: (newStatus: boolean) => {
          console.log(`New highlight main text status`, newStatus);
        }
      },
      onChangePopoversEnabled: {
        type: 'function', default: (newStatus: boolean) => {
          console.log(`New popover enable status`, newStatus);
        }
      },
      highlightEnabled: {type: 'boolean', default: true},
      popoversEnabled: {type: 'boolean', default: true}
    };

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: 'Main Text Panel'});
    this.options = oc.getCleanOptions(options);
    this.ctData = CtData.copyFromObject(options.ctData);
    this.edition = options.edition;
    this.lang = this.ctData.lang;
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true;
    this.currentEditMode = EDIT_MODE_OFF;
    this.editingTextToken = false;
    this.originalTokenText = '__null__';
    this.tokenBeingEdited = -1;
    this.textTokenEditor = null;
    this.selection = {from: -1, to: -1};
    this.selecting = false;
    this.cursorInToken = false;
    this.tokenIndexOne = -1;
    this.tokenIndexTwo = -1;
    this.lastMainTextTypesettingInfo = null;
    this.detectNumberingLabels = false;
    this.detectIntraWordQuotationMarks = (this.lang === 'he');
    this.diffEngine = new AsyncMyersDiff();
    this.onchangeMainTextFreeTextEditorWaiting = false;
    this.popoversEnabled = options.popoversEnabled ?? true;
    this.highlightEnabled = options.highlightEnabled ?? true;
    this.changesInfoDivConstructed = false;
    this.htmlRenderer = new HtmlRenderer({});
    this.debug = true;
  }

  async updateData(ctData: CtDataInterface, edition: Edition) {
    this.verbose && console.log(`New data received`);
    this.ctData = CtData.copyFromObject(ctData);
    this.edition = edition;

    this.options.apparatusPanels.forEach((ap) => {
      ap.updateData(ctData, edition);
    });

    if (this.visible) {
      this.verbose && console.log(`MainTextPanel is visible, regenerating content`);
      $(this.getContentAreaSelector()).html(await this.generateContentHtml('', '', true));
      this.addApparatusEntryClassesToMainText();
      if (this.highlightEnabled) {
        this.setApparatusHighlightInMainText(true);
      }
      this._setupMainTextDivEventHandlers();
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false;
      this._updateLineNumbersAndApparatuses()
      .then(() => {
        this.addApparatusPopovers();
        this.verbose && console.log(`Finished showing edition on update data`);
      });
    } else {
      // use current typeset info if already calculated
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true;
      if (this.lastMainTextTypesettingInfo === null) {
        // typeset info not calculated, just get one even if it's incorrect

        this._updateLineNumbersAndApparatuses()
        .then(() => {
          this.addApparatusPopovers();
          this.verbose && console.log(`Finished showing edition on update data`);
        });
      } else {
        this.options.apparatusPanels.forEach((p) => {
          p.updateApparatus(this.lastMainTextTypesettingInfo);
        });
      }
    }

  }

  generateToolbarHtml(_tabId: string, _mode: string, _visible: boolean): string {

    let apparatusLinks = this.edition.apparatuses.map((app, index) => {
      return `<a class="dropdown-item add-entry-apparatus-${index}" href="">${capitalizeFirstLetter(app.type)}</a>`;
    }).join('');

    return `<div class="panel-toolbar-group">
            <div class="panel-toolbar-group" id="edition-panel-mode-toggle"></div>
              <div class="panel-toolbar-group popover-toolbar-group">
                <div class="panel-toolbar-item popover-toggle"></div>
<!--                <div class="panel-toolbar-item">-->
<!--                        <a class="btn tb-button popover-settings" title="Popover Settings">${icons.popoverSettings}</a>-->
<!--                </div>-->
            </div> 
            <div class="panel-toolbar-group highlight-toolbar-group">
                <div class="panel-toolbar-item highlight-toggle"></div>
            </div>
            <div class="panel-toolbar-group apparatus-toolbar">
               <div class="panel-toolbar-item add-entry-dropdown hidden">
                  <div class="dropdown">
                     <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="add-entry-dropdown" data-toggle="dropdown" aria-expanded="false">
                            ${icons.addEntry}
                     </button>
                     <div class="dropdown-menu" aria-labelledby="add-entry-dropdown">${apparatusLinks}</div>
                  </div>
               </div>
            </div>
          
            <div class="panel-toolbar-group text-edit-toolbar">
                <div class="panel-toolbar-group">
                    <div class="panel-toolbar-item numbering-labels-toggle"></div>
                    <div class="panel-toolbar-item">&nbsp;&nbsp;</div>
                    <div class="panel-toolbar-item intra-word-quotes-toggle"></div>
                </div>
                <div class="panel-toolbar-group">
                    <div class="panel-toolbar-item text-edit-revert">
                        <a class="btn tb-button text-edit-revert-btn" title="Revert Changes">${icons.revertEdit}</a>
                    </div>
                    <div class="panel-toolbar-item text-edit-commit">
                        <a class="btn tb-button text-edit-commit-btn" title="Commit Changes">${icons.commitEdit}</a>
                    </div>
                </div>
            </div>
        </div>`;
  }

  async generateContentHtml(_tabId: string, _mode: string, visible: boolean) {
    if (!visible) {
      // if (mode !== this.lastMode) {
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true;
      // }
      return `Waiting to be shown to generate content`;
    }
    // this.verbose && console.log(`Generating html for main text panel`)
    this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false;
    return this._generateMainTextHtml();
  }

  getContentAreaClasses() {
    return super.getContentAreaClasses().concat(['main-text', `text-${this.lang}`, `mode-${this.currentEditMode}`]);
  }

  onResize(visible: boolean) {
    super.onResize(visible);
    if (!visible) {
      // force redraw on the next onShown event
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = true;
      return;
    }
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      // the main text is not typeset properly yet, just wait until the next onShown event
      this.verbose && console.log(`Edition panel resize but not shown yet, nothing to do`);
      return;
    }
    // the panel is visible and the main text is drawn in the content area
    switch (this.currentEditMode) {
      case EDIT_MODE_OFF:
      // case EDIT_MODE_TEXT_OLD:
      case EDIT_MODE_APPARATUS:
        // this.verbose && console.log(`Resize: about to update apparatuses`)
        this._updateLineNumbersAndApparatuses()
        .then(() => {
          this.addApparatusPopovers();
          // this.verbose && console.log(`Done resizing`)
        });
        break;

      case EDIT_MODE_TEXT:
        //console.log(`Resize in beta editor mode, nothing to do`)
        break;

      default:
        console.error(`Unknown edit mode ${this.currentEditMode} on resize`);
    }

  }

  onShown() {
    super.onShown();
    //this.verbose && console.log(`Edition Panel shown`)
    if (this.mainTextNeedsToBeRedrawnOnNextOnShownEvent) {
      this.mainTextNeedsToBeRedrawnOnNextOnShownEvent = false;
      this.generateContentHtml('', '', true).then((html) => {
        $(this.getContentAreaSelector()).html(html);
        switch (this.currentEditMode) {
          case EDIT_MODE_OFF:
          case EDIT_MODE_APPARATUS:
            this.addApparatusEntryClassesToMainText();
            this.addApparatusPopovers();
            if (this.highlightEnabled) {
              this.setApparatusHighlightInMainText(true);
            }
            this._setupMainTextDivEventHandlers();
            this._updateLineNumbersAndApparatuses()
            .then(() => {
              this.verbose && console.log(`Finished generating edition panel on shown`);
            });
            break;

          case EDIT_MODE_TEXT:
            this.verbose && console.log(`Beta editor shown`);
            break;

          default:
            console.error(`Unknown edit mode ${this.currentEditMode}`);
        }
      });
    }
  }

  /**
   * Highlights the main text that corresponds to the given lemma index
   */
  highlightTextForLemma(apparatusType: string, lemmaIndex: number[], on: boolean) {
    // ignore section index for now
    // TODO: support multiple sections

    if (lemmaIndex.length < 2) {
      return;
    }
    let theIndex = lemmaIndex[1];
    let appIndex = this.edition.apparatuses.map((app) => {
      return app.type;
    }).indexOf(apparatusType);
    if (appIndex === -1) {
      console.warn(`Asked to highlight text for nonexistent apparatus: ${apparatusType}`);
      return;
    }

    let entry = this.edition.apparatuses[appIndex].entries[theIndex];
    if (entry === undefined) {
      console.warn(`Asked to highlight text for nonexistent entry ${apparatusType} : [0, ${theIndex}]`);
      return;
    }

    for (let i = entry.from; i <= entry.to; i++) {
      let textElement = $(`${this.containerSelector} .main-text-token-${i}`);
      if (on) {
        textElement.addClass('token-highlighted');
      } else {
        textElement.removeClass('token-highlighted');
      }
    }


  }


  postRender(id: string, mode: string, visible: boolean) {
    // this.verbose && console.log(`Post render main text panel, visible = ${visible}`)
    this.onResize(visible);
    this.modeToggle = new MultiToggle({
      containerSelector: '#edition-panel-mode-toggle',
      title: 'Mode: ',
      buttonClass: 'tb-button',
      initialOption: this.currentEditMode,
      wrapButtonsInDiv: true,
      buttonsDivClass: 'panel-toolbar-item',
      buttonDef: [{label: 'Off', name: EDIT_MODE_OFF, helpText: 'Turn off editing'}, {
        label: 'Apparatus', name: EDIT_MODE_APPARATUS, helpText: 'Add/Edit apparatus entries'
      }, {label: 'Text', name: EDIT_MODE_TEXT, helpText: 'Edit main text'}]
    });
    this.modeToggle.on('toggle', (ev: any) => {
      let previousEditMode = this.currentEditMode;
      let newEditMode = ev.detail.currentOption;
      this._changeEditMode(newEditMode, previousEditMode);
    });
    this.popoverToggle = new NiceToggle({
      containerSelector: 'div.popover-toggle',
      title: 'Popovers: ',
      initialValue: this.popoversEnabled,
      onIcon: icons.toggleOn,
      onPopoverText: 'Click to disable popovers',
      offIcon: icons.toggleOff,
      offPopoverText: 'Click to enable popovers'
    });
    this.popoverToggle.on(toggleEvent, (ev: any) => {
      this.popoversEnabled = !!ev.detail.toggleStatus;
      if (this.popoversEnabled) {
        this.addApparatusPopovers();
      } else {
        this.removeApparatusPopovers();
      }
      this.options.onChangePopoversEnabled(this.popoversEnabled);
    });

    this.highlightToggle = new NiceToggle({
      containerSelector: 'div.highlight-toggle',
      title: 'Highlight: ',
      initialValue: this.highlightEnabled,
      onIcon: icons.toggleOn,
      onPopoverText: 'Click to disable highlighting text with apparatus entries',
      offIcon: icons.toggleOff,
      offPopoverText: 'Click to enable highlighting text with apparatus entries'
    });
    this.highlightToggle.on(toggleEvent, (ev: any) => {
      this.highlightEnabled = !!ev.detail.toggleStatus;
      if (this.highlightEnabled) {
        this.setApparatusHighlightInMainText(true);
      } else {
        this.setApparatusHighlightInMainText(false);
      }
      this.options.onChangeHighlightEnabled(this.highlightEnabled);
    });

    this.edition.apparatuses.forEach((app, index) => {
      $(`${this.containerSelector} .add-entry-apparatus-${index}`).on('click', this._genOnClickAddEntryButton(index));
    });

    switch (this.currentEditMode) {
      case EDIT_MODE_OFF:
      // case EDIT_MODE_TEXT_OLD:
      case EDIT_MODE_APPARATUS:
        $(`${this.containerSelector} .popover-toolbar-group`).removeClass('force-hidden');
        this.addApparatusEntryClassesToMainText();
        if (this.highlightEnabled) {
          this.setApparatusHighlightInMainText(true);
        }
        this._setupMainTextDivEventHandlers();
        break;

      case EDIT_MODE_TEXT:
        this.verbose && console.log(`Post render text mode`);
        break;
    }

    this.textEditCommitDiv = $(`${this.containerSelector} div.text-edit-commit`);
    this.textEditRevertDiv = $(`${this.containerSelector} div.text-edit-revert`);

    this.textEditCommitDiv.addClass('hidden');
    this.textEditRevertDiv.addClass('hidden');
  }


  _changeEditMode(newEditMode: string, previousEditMode: string) {
    this.verbose && console.log(`Edit mode changed from ${previousEditMode} to ${newEditMode}`);

    if (this.editingTextToken) {
      this._stopEditingMainText(this.originalTokenText);
    }
    this._clearSelection();
    $(this.getContentAreaSelector()).removeClass(`mode-${previousEditMode}`).addClass(`mode-${newEditMode}`);

    switch (newEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_APPARATUS:
        this.currentEditMode = newEditMode;
        if (previousEditMode === EDIT_MODE_TEXT) {
          this.textEditorToolbarRoot?.unmount();
          this.textEditorToolbarRoot = null;
          $(this.getContentAreaSelector()).html(this.getMainTextHtmlVersion());
          $(`${this.containerSelector} .popover-toolbar-group`).removeClass('force-hidden');
          $(`${this.containerSelector} .highlight-toolbar-group`).removeClass('force-hidden');
          this.addApparatusEntryClassesToMainText();
          if (this.highlightEnabled) {
            this.setApparatusHighlightInMainText(true);
          }

          this._setupMainTextDivEventHandlers();
          this._updateLineNumbersAndApparatuses().then(() => {

            if (this.popoversEnabled) {
              this.addApparatusPopovers();
            }
            this.verbose && console.log(`Finished switching mode to ${this.currentEditMode}`);
          });

          delete this.numberingLabelsToggle;
          delete this.ignoreIntraWordQuotesToggle;
          $('div.numbering-labels-toggle').html('');
          $('div.intra-word-quotes-toggle').html('');
          this.textEditRevertDiv.addClass('hidden');
          this.textEditCommitDiv.addClass('hidden');
        }
        break;

      case EDIT_MODE_TEXT:
        this.currentEditMode = newEditMode;
        this._setupTextEditMode();

        break;

      default:
        console.error(`Unknown edit mode ${newEditMode}`);
    }
  }

  addApparatusEntryClassesToMainText() {
    if (this.currentEditMode !== EDIT_MODE_OFF && this.currentEditMode !== EDIT_MODE_APPARATUS) {
      // this is only applicable to OFF and APPARATUS modes
      return;
    }
    // add classes for apparatus entries
    // console.log(`Adding apparatus highlight`);
    this.edition.apparatuses.forEach((app, appIndex) => {
      let appType = app['type'];
      app.entries.forEach((entry, entryIndex) => {
        for (let i = entry.from; i <= entry.to; i++) {
          let textElement = $(`${this.containerSelector} .main-text-token-${i}`);
          textElement.addClass(`token-in-app token-in-app-${appType} entry-index-${appIndex}-${entryIndex}`);
        }
      });
    });
  }

  setApparatusHighlightInMainText(on: boolean) {
    if (this.currentEditMode !== EDIT_MODE_OFF && this.currentEditMode !== EDIT_MODE_APPARATUS) {
      // this is only applicable to OFF and APPARATUS modes
      return;
    }
    let textElements = $(`${this.containerSelector} .token-in-app`);
    if (on) {
      textElements.addClass('main-text-apparatus-highlight');
    } else {
      textElements.removeClass('main-text-apparatus-highlight');
    }
  }


  _setupTextEditMode() {
    // console.log(`--- Setting up text edit mode ---`)
    this.textEditorToolbarRoot?.unmount();
    this.textEditorToolbarRoot = null;
    this.removeApparatusPopovers();
    $(`${this.containerSelector} .popover-toolbar-group`).addClass('force-hidden');
    $(`${this.containerSelector} .highlight-toolbar-group`).addClass('force-hidden');
    $(this.getContentAreaSelector()).html(this._getMainTextBetaEditor());
    this.textEditorToolbarRoot = createRoot(document.querySelector<HTMLElement>(`#${betaEditorToolbarDivId}`)!);
    this.freeTextEditor = new EditionMainTextEditor({
      containerSelector: `#${betaEditorDivId}`,
      lang: this.lang,
      onChange: this._genOnChangeMainTextFreeTextEditor(),
      onFormatStateChange: formatState => this.renderTextEditorToolbar(formatState),
      debug: true
    });
    this.renderTextEditorToolbar(this.freeTextEditor.getFormatState());

    this.numberingLabelsToggle = new NiceToggle({
      containerSelector: 'div.numbering-labels-toggle',
      title: 'Auto NL: ',
      initialValue: this.detectNumberingLabels,
      onIcon: '<i class="fas fa-toggle-on"></i>',
      onPopoverText: 'Click to disable automatic detection of Numbering Labels (e.g. [1], [1.2])',
      offIcon: '<i class="fas fa-toggle-off"></i>',
      offPopoverText: 'Click to enable automatic detection of Numbering Labels (e.g. [1], [1.2])'
    });

    this.numberingLabelsToggle.on(toggleEvent, (ev: any) => {
      console.log(`Numbering labels toggles: ${ev.detail.toggleStatus}`);
      this.detectNumberingLabels = !!ev.detail.toggleStatus;
      this.__detectAndReportChangesInEditedMainText(true);
    });
    if (this.lang === 'he') {
      this.ignoreIntraWordQuotesToggle = new NiceToggle({
        containerSelector: 'div.intra-word-quotes-toggle',
        title: 'Smart QM: ',
        initialValue: this.detectIntraWordQuotationMarks,
        onIcon: '<i class="fas fa-toggle-on"></i>',
        onPopoverText: 'Click to disable detecting starting quotation marks after a letter inside a word (e.g. הספר== ה”ספר)',
        offIcon: '<i class="fas fa-toggle-off"></i>',
        offPopoverText: 'Click to enable detecting starting quotation marks after a letter inside a word (e.g. הספר== ה”ספר)'
      });

      this.ignoreIntraWordQuotesToggle.on(toggleEvent, (ev: any) => {
        console.log(`Intra word quotation detection  toggles: ${ev.detail.toggleStatus}`);
        this.detectIntraWordQuotationMarks = !!ev.detail.toggleStatus;
        this.__detectAndReportChangesInEditedMainText(true);
      });
    }

    // console.log(` - Setting text in free text editor -`)
    this.freeTextEditor.setText(convertMainTextToFmtText(this.edition.mainText), true);
    // console.log(` - updating no changes label - `)
    this.betaEditorInfoDiv = $(`#${betaEditorInfoDiv}`).html('No changes');
    this.changesInfoDivConstructed = false;
    this.commitedFreeText = deepCopy(this.freeTextEditor.getFmtText());
    $(`${this.containerSelector} a.text-edit-revert-btn`).off('click').on('click', this._genOnClickTextEditRevertChanges());
    $(`${this.containerSelector} a.text-edit-commit-btn`).off('click').on('click', this._genOnClickTextEditCommitChanges());
    // console.log(`--- Now in text mode ---`)
  }

  _genMainTextWithChanges(currentWitnessTokens: WitnessTokenInterface[], changeList: ChangeInterface[]) {

    const replaceSign = "<span class=replace-sign'>|</span>";
    let html = '';

    let preAdditions = changeList.filter((change) => {
      return change.index === -1;
    });
    preAdditions.forEach((change) => {
      if (change.change !== 'add') {
        console.warn(`Found a change before the first CT column that is not an addition`);
        console.log(change);
      } else {
        html += `<span class='added'>${this.getWitnessTokenHtml(change.newToken)}</span> `;
      }
    });

    currentWitnessTokens.forEach((token, index) => {
      let changesForToken = changeList.filter((change) => {
        return change.index === index;
      });
      if (changesForToken.length === 0) {
        html += `${this.getWitnessTokenHtml(token)} `;
      } else {
        if (changesForToken.filter((change) => {
          return change.change === 'replace' || change.change === 'delete';
        }).length === 0) {
          // the token is neither replaced nor deleted
          html += `${this.getWitnessTokenHtml(token)} `;
        }

        changesForToken.forEach((change) => {
          switch (change.change) {
            case 'replace':
              if (change.newToken === undefined) {
                throw new Error(`Found a replacement with a null or undefined new token`);
              }
              if (token.text === change.newToken.text) {
                // a change in format only
                html += `<span class="replacement">${this.getWitnessTokenHtml(change.newToken, false)}</span> `;
              } else {
                html += `<span class='replaced'>${this.getWitnessTokenHtml(token)}</span>${replaceSign}<span class="replacement">${this.getWitnessTokenHtml(change.newToken)}</span> `;
              }
              break;

            case 'delete':
              html += `<span class='deleted'>${this.getWitnessTokenHtml(token)}</span> `;
              break;

            case 'add':
              html += `<span class='added'>${this.getWitnessTokenHtml(change.newToken)}</span> `;
          }
        });
      }
    });
    return html;
  }

  __detectAndReportChangesInEditedMainText(forceParsing = false) {
    if (forceParsing || !varsAreEqual(this.commitedFreeText, this.freeTextEditor.getFmtText())) {
      this.textEditRevertDiv.removeClass('hidden');
      this.textEditCommitDiv.addClass('hidden');
      this.debug && console.log(`Changes in editor`);

      let currentWitnessTokens = this.ctData.witnesses[this.ctData.editionWitnessIndex].tokens;
      // this.debug && console.log(`Current witness tokens`)
      // this.debug && console.log(currentWitnessTokens)

      let newFmtText = this.freeTextEditor.getFmtText();
      // this.debug && console.log(`fmtText from editor`)
      // this.debug && console.log(newFmtText)

      let witnessTokens = fmtTextToEditionWitnessTokens(newFmtText, this.edition.lang, this.detectNumberingLabels,
        this.detectIntraWordQuotationMarks, this.options.editionWitnessTokenNormalizer);
      // this.debug && console.log(`Current witness tokens`, currentWitnessTokens)
      // this.debug && console.log(`Witness tokens from editor`, witnessTokens);

      this.betaEditorInfoDiv.html(`Calculating changes... <span class="spinner-border spinner-border-sm" role="status"></span>`);
      this.changesInfoDivConstructed = false;
      wait(1000).then(() => {
        if (this.diffEngine.isRunning()) {
          // need to report completion so that the user does not get scared
          let interval = setInterval(() => {
            if (this.diffEngine.isRunning()) {
              this.betaEditorInfoDiv.html(`Calculating changes... ${this.diffEngine.getIterations()} calculations of max. ${this.diffEngine.getMaxIterations()}`);
            } else {
              clearInterval(interval);
            }
          }, 250);
        }
      });
      this._getChangesInTextEditor(currentWitnessTokens, witnessTokens).then((changes) => {
        if (changes === null) {
          // aborted operation
          return;
        }
        this.changes = changes;
        // this.debug && console.log(`Changes`)
        // this.debug && console.log(changes)
        let changeListHtml = changes.map((change) => {
          switch (change.change) {
            case 'replace':
              return `${change.index + 1}: ${this.getWitnessTokenHtml(change.currentToken)} &rarr; ${this.getWitnessTokenHtml(change.newToken)}`;

            case 'add':
              if (change.index === -1) {
                return `0: <em>add</em> ${this.getWitnessTokenHtml(change.newToken)}`;
              }
              return ` ${change.index + 1}: ${this.getWitnessTokenHtml(change.currentToken)} <em>add</em> ${this.getWitnessTokenHtml(change.newToken)}`;

            case 'delete':
              return `${change.index + 1}: ${this.getWitnessTokenHtml(change.currentToken)} &rarr; <em>empty</em>`;
          }
        }).map((changeHtml) => {
          return `<li>${changeHtml}</li>`;
        }).join('');
        let mainTextWithChangesHtml = this._genMainTextWithChanges(currentWitnessTokens, changes);
        if (!this.changesInfoDivConstructed) {
          this.done = true;
          this.betaEditorInfoDiv.html(`<p id="num-changes"> </p>
                <div id="revisions"></div><div id="ct-changes"></div>`);
          this.numChangesPar = $('#num-changes');
          this.revisionsPanel = new CollapsePanel({
            containerSelector: '#revisions',
            title: 'Revisions',
            contentClasses: ['main-text-with-changes'],
            iconWhenShown: '<i class="bi bi-caret-down"></i>',
            iconWhenHidden: '<i class="bi bi-caret-right"></i>',
            initiallyShown: false
          });
          this.ctChangesPanel = new CollapsePanel({
            containerSelector: '#ct-changes',
            title: 'Collation Table Changes',
            iconWhenShown: '<i class="bi bi-caret-down"></i>',
            iconWhenHidden: '<i class="bi bi-caret-right"></i>',
            initiallyShown: false
          });
          this.changesInfoDivConstructed = true;
        }

        this.numChangesPar.html(changes.length === 1 ? 'There is 1 change:' : `There are ${changes.length} changes:`);
        this.revisionsPanel.setContent(mainTextWithChangesHtml);
        this.ctChangesPanel.setContent(`<ul>${changeListHtml}</ul>`);
        this.betaEditorInfoDiv.removeClass('hidden');
        if (changes.length !== 0) {
          this.textEditCommitDiv.removeClass('hidden');
        }
      });
    } else {
      this.changes = [];
      this.textEditRevertDiv.addClass('hidden');
      this.textEditCommitDiv.addClass('hidden');
      this.betaEditorInfoDiv.html('No changes');
      this.changesInfoDivConstructed = false;
    }
  }

  _genOnChangeMainTextFreeTextEditor() {
    let throttle = new EventThrottle(() => {
      console.log(`Handling change in main text free text editor`);
      this.__detectAndReportChangesInEditedMainText(true);
    }, 'OnChangeMainTextFreeTextEditor', 500);
    return throttle.getHandler();
  }

  _genOnClickTextEditRevertChanges() {
    return async () => {
      this.verbose && console.log(`Reverting changes in text editor`);
      this.diffEngine.abort();
      await wait(50); // wait some time for the diff engine to actually abort
      this.changes = [];
      this.freeTextEditor.setText(this.commitedFreeText, true);
      this.textEditRevertDiv.addClass('hidden');
      this.textEditCommitDiv.addClass('hidden');
      this.betaEditorInfoDiv.html('No changes');
      this.changesInfoDivConstructed = false;
    };
  }

  _getChangesInTextEditor(currentWitnessTokens: WitnessTokenInterface[], newWitnessTokens: WitnessTokenInterface[]): Promise<ChangeInterface[] | null> {
    return calculateMainTextChanges(this.diffEngine, currentWitnessTokens, newWitnessTokens);

  }

  _genOnClickTextEditCommitChanges() {
    return () => {
      console.log(`Click on TextEditCommitChanges`);
      if (this.diffEngine.isRunning()) {
        // need to wait until the engine is done
        return;
      }
      this.verbose && console.log(`Committing changes`);
      let newFmtText = this.freeTextEditor.getFmtText();
      // if (varsAreEqual(this.commitedFreeText, newFmtText)) {
      //   this.verbose && console.log(`No changes, nothing to do`)
      //   this.textEditRevertDiv.addClass('hidden')
      //   this.textEditCommitDiv.addClass('hidden')
      //   return
      // }
      this.verbose && console.log(`There are changes, now it's almost for real`);
      this.textEditRevertDiv.addClass('hidden');
      let newWitnessTokens = fmtTextToEditionWitnessTokens(newFmtText, this.edition.lang, this.detectNumberingLabels,
        this.detectIntraWordQuotationMarks, this.options.editionWitnessTokenNormalizer);
      this.debug && console.log('New witness tokens');
      this.debug && console.log(newWitnessTokens);
      // TODO: show something if there are more than, say, 5 affected columns
      this.updateEditionWitness();
      console.log(`:::::: Finished processing on click TextEditCommitChanges`);
    };
  }

  updateEditionWitness() {
    let p = new SimpleProfiler('>>>> updateEditionWitness');
    let changes = this.changes;
    // console.log(`Changes`)
    // console.log(changes)
    this.ctData = applyMainTextChangesToCtData(this.ctData, changes);
    p.lap(`changes processed`);
    this.changes = [];
    this.lastMainTextTypesettingInfo = null;
    this.modeToggle.setOptionByName(EDIT_MODE_OFF, false);
    this._changeEditMode(EDIT_MODE_OFF, EDIT_MODE_TEXT);
    p.lap(`edit mode changed to OFF`);
    // console.log(`About to trigger onCtDataChange`)
    // console.log(`CtData before`)
    // console.log(deepCopy(this.ctData))
    this.options.onCtDataChange(this.ctData);
    // console.log(`onCtDataChange finished`)
    p.stop(`onCtDataChange finished`);
  }
  _getLemmaFromSelection() {
    if (this.isSelectionEmpty()) {
      return '';
    }
    let lemma = this.edition.mainText.filter((token, i) => {
      return i >= this.selection.from && i <= this.selection.to;
    }).map((token) => {
      return token.getPlainText();
    }).join('');
    this.verbose && console.log(`Lemma from selection ${this.selection.from}-${this.selection.to}: '${lemma}'`);
    return lemma;
    // let lemma = ''
    // for (let i=this.selection.from; i <= this.selection.to; i++) {
    //   lemma += $(`${this.containerSelector} .main-text-token-${i}`).text() + ' '
    // }
    // return removeExtraWhiteSpace(lemma)
  }

  _genOnClickAddEntryButton(appIndex: number) {
    return (ev: any) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      this.verbose && console.log(`Click on add entry button for apparatus ${appIndex}`);

      let entryText = this._getLemmaFromSelection();
      let from = this.selection.from;
      let to = this.selection.to;
      this.verbose && console.log(`Selection ${from} to ${to}, '${entryText}'`);

      this.options.editApparatusEntry(appIndex, from, to);
      // @ts-ignore
      this._eleAddEntryDropdownButton().dropdown('hide');

    };
  }

  _setupMainTextDivEventHandlers() {
    $(`${this.containerSelector} .main-text`)
    .off()
    .on('click', this._genOnClickMainTextDiv())
    .on('mousedown', this._genOnMouseDownMainTextDiv())
    .on('mouseup', this._genOnMouseUpMainTextDiv())
    .on('mouseleave', this._genOnMouseLeaveDiv());
    $(`${this.containerSelector} span.main-text-token`)
    .off()
    .on('click', this._genOnClickMainTextToken())
    .on('mousedown', this._genOnMouseDownMainTextToken())
    .on('mouseup', this._genOnMouseUpMainTexToken())
    .on('mouseenter', this._genOnMouseEnterToken())
    .on('mouseleave', this._genOnMouseLeaveToken());
  }

  /**
   * @private
   */
  removeApparatusPopovers() {
    this.getTokensWithApparatusEntry().forEach((tokenIndex) => {
      // @ts-ignore
      $(`${this.containerSelector} span.main-text-token-${tokenIndex}`).popover('dispose');
    });
  }

  /**
   * @private
   */
  addApparatusPopovers() {
    this.getTokensWithApparatusEntry().forEach((tokenIndex) => {
      let element = $(`${this.containerSelector} span.main-text-token-${tokenIndex}`);
      let entries = UiToolBox.getIntArrayIdFromClasses(element, 'entry-index-');
      if (entries.length === 0) {
        console.warn(`Token ${tokenIndex} does not have proper apparatus entry indices `);
        return;
      }
      let mainTextToken = this.edition.mainText[tokenIndex];
      // @ts-ignore
      element.popover('dispose').popover({
        content: () => {
          return this.getApparatusPopoverContent(tokenIndex, entries as [number, number][]);
        }, html: true, placement: 'bottom', container: 'body', boundary: 'window', trigger: 'manual', title: () => {
          return `${mainTextToken.lineNumber}: ${mainTextToken.getPlainText()}`;
        }, customClass: `text-${this.edition.lang}`
      });
    });
  }

  /**
   * Takes an array of tuples `[ appIndex, entryIndex]`
   * and generates an array in which each numerical key contains
   * the entry indices for the apparatus with that index.
   *
   * For example, the input array `[ [0,1], [0,4], [1, 0]]`
   * generates the output `[ [1,4], [0]]`
   * @private
   */
  arrangeIndicesByApparatus(entryIndices: [number, number][]) {
    let indicesByApparatus: number[][] = [];
    entryIndices.forEach((duple) => {
      let [appIndex, entryIndex] = duple;
      if (indicesByApparatus[appIndex] === undefined) {
        indicesByApparatus[appIndex] = [];
      }
      indicesByApparatus[appIndex].push(entryIndex);
    });
    return indicesByApparatus;
  }

  /**
   *
   * @param {number}tokenIndex
   * @param {number[][]}entryIndices
   * @return {string}
   * @private
   */
  getApparatusPopoverContent(tokenIndex: number, entryIndices: [number, number][]): string {
    if (entryIndices.length === 0) {
      return `No apparatus entries`;
    }
    // 1. group entry indices by apparatus
    let indicesByApparatus = this.arrangeIndicesByApparatus(entryIndices);

    // helper function
    let getSubEntriesHtml = (entry: ApparatusEntry) => {
      let html = '';
      entry.subEntries.forEach((subEntry) => {
        let disabledClass = subEntry.enabled ? '' : 'sub-entry-disabled';
        html += `<div class="sub-entry ${disabledClass}">${trimWhiteSpace(ApparatusCommon.genSubEntryHtmlContent(this.edition.lang, subEntry, this.edition.getSigla(), this.edition.siglaGroups, true))}</div>`;
      });
      return html;
    };

    // helper function
    let getEntryHtml = (apparatus: Apparatus, entryIndex: number) => {
      if (this.lastMainTextTypesettingInfo === null) {
        throw new Error(`lastMainTextTypesettingInfo is null`);
      }
      let entry = apparatus.entries[entryIndex];
      let lineNumberString = ApparatusCommon.getLineNumberString(entry, this.lastMainTextTypesettingInfo, this.edition.lang);
      let lemmaHtml = ApparatusCommon.getLemmaHtml(entry, this.lastMainTextTypesettingInfo, this.edition.lang);
      return `<div class="entry">
        <div class="entry-label"><span class="entry-line-number">${lineNumberString}</span> ${lemmaHtml}]</div>
        <div class="sub-entries">
            ${getSubEntriesHtml(entry)}    
        </div>
       </div>`;
    };

    return indicesByApparatus.map((entryIndices, appIndex) => {
      let apparatus = this.edition.apparatuses[appIndex];
      return `
        <div class="app app-${appIndex}">
          <div class="apparatus-label">${capitalizeFirstLetter(apparatus.type)}</div>
          <div class="entries">
              ${entryIndices.map(entryIndex => getEntryHtml(apparatus, entryIndex)).join('')}    
            </ol>
          </div>
        </div>`;
    }).join('');
  }

  /**
   * Returns an array with all the token indices for main text tokens that
   * are associated with an apparatus entry
   * @private
   * @return {number[]}
   */
  getTokensWithApparatusEntry(): number[] {
    let indices: number[] = [];
    this.edition.apparatuses.forEach((app) => {
      app.entries.forEach((entry) => {
        for (let i = entry.from; i <= entry.to; i++) {
          if (indices.indexOf(i) === -1) {
            indices.push(i);
          }
        }
      });
    });
    return numericSort(indices);
  }

  _genOnMouseDownMainTextDiv() {
    return (ev: any) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      this._stopSelecting();
      this._clearSelection();
    };
  }

  _genOnMouseUpMainTextDiv() {
    return (ev: any) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      // this.verbose && console.log(`Mouse up on main text div`)
      if (this.cursorInToken) {
        return;
      }
      if (this.selecting) {
        this._stopSelecting();
        this._clearSelection();
      }
    };
  }

  _genOnClickMainTextDiv() {
    return (ev: any) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      // this.verbose && console.log(`Click on main text div`)
    };
  }

  _genOnClickMainTextToken() {
    return (ev: any) => {
      ev.stopPropagation();
    };
  }

  _genOnMouseDownMainTextToken() {
    // TODO: deal with right mouse click
    return (ev: any) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.editingTextToken) {
        return;
      }
      let tokenIndex = UiToolBox.getSingleIntIdFromAncestor('SPAN', $(ev.target), 'main-text-token-');
      if ($(ev.target).hasClass('whitespace')) {
        return;
      }
      switch (this.currentEditMode) {
        case EDIT_MODE_APPARATUS:
          // this.verbose && console.log(`Mouse down on main text ${tokenIndex} token in apparatus edit mode`)
          // @ts-ignore
          $(ev.target).popover('hide');
          this._setSelection(tokenIndex, tokenIndex);
          this.tokenIndexOne = tokenIndex;
          this._showSelectionInBrowser();
          this._processNewSelection();
          this._startSelecting();
          break;
      }
    };
  }

  _stopEditingMainText(text: string) {
    if (this.editingTextToken) {
      this.verbose && console.log(`Stopping editing token ${this.tokenBeingEdited}`);
      if (this.textTokenEditor !== undefined && this.textTokenEditor !== null) {
        this.textTokenEditor.destroy();
      }

      let tokenSelector = `.main-text-token-${this.tokenBeingEdited}`;
      this.tokenBeingEdited = -1;
      this.originalTokenText = '__null__';
      this.editingTextToken = false;
      $(tokenSelector).html(text)
      .on('click', this._genOnClickMainTextToken())
      .on('mousedown', this._genOnMouseDownMainTextToken())
      .on('mouseup', this._genOnMouseUpMainTexToken())
      .on('mouseenter', this._genOnMouseEnterToken())
      .on('mouseleave', this._genOnMouseLeaveToken());
    }
  }

  _startSelecting() {
    this.selecting = true;
  }

  _stopSelecting() {
    this.selecting = false;
  }

  _eleAddEntryDropdownButton() {
    return $(`${this.containerSelector} .add-entry-dropdown`);
  }

  _processNewSelection() {
    let addEntryDropdownButton = this._eleAddEntryDropdownButton();
    if (this.isSelectionEmpty()) {
      addEntryDropdownButton.addClass('hidden');
    } else {
      addEntryDropdownButton.removeClass('hidden');
    }
  }

  isSelectionEmpty() {
    return this.selection.from === -1;
  }

  _clearSelectionInBrowser() {
    $(`${this.containerSelector} .main-text-token`).removeClass('token-selected');
  }

  _clearSelection() {
    if (this._selectionsAreEqual(this.selection, this._createSelection(-1, -1))) {
      return;
    }
    this._setSelection(-1, -1);
    this._clearSelectionInBrowser();
    this._processNewSelection();
  }

  _setSelection(token1: number, token2: number) {
    this.selection = this._createSelection(token1, token2);
  }

  _selectionsAreEqual(sel1: any, sel2: any) {
    return sel1.from === sel2.from && sel1.to === sel2.to;
  }

  _createSelection(token1: number, token2: number) {
    return {
      from: Math.min(token1, token2), to: Math.max(token1, token2)
    };
  }

  _showSelectionInBrowser() {
    this._clearSelectionInBrowser();
    for (let i = this.selection.from; i <= this.selection.to; i++) {
      $(`${this.containerSelector} .main-text-token-${i}`).addClass('token-selected');
    }
  }

  _genOnMouseLeaveDiv() {
    return () => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      // this.verbose && console.log(`Mouse leave main text div, selecting = ${this.selecting}`)
      if (this.selecting) {
        this._stopSelecting();
      }
    };
  }

  /**
   * Add a 'hover' highlight to the main text corresponding to the given apparatus entry
   * @param appIndex
   * @param entryIndex
   * @param on
   */
  hoverEntry(appIndex: number, entryIndex: number, on: boolean) {
    let textElements = $(`${this.containerSelector} .entry-index-${appIndex}-${entryIndex}`);
    if (on) {
      textElements.addClass('main-text-hover');
    } else {
      textElements.removeClass('main-text-hover');
    }
  }

  /**
   * Calls the hoverEntry method in the appropriate apparatus panels for the given
   * element in the main text panel
   * @param {JQuery}eventTargetElement
   * @param {boolean}on
   * @private
   */
  hoverEntriesInApparatusPanels(eventTargetElement: JQuery, on: boolean) {
    let spanElement = UiToolBox.findAncestorWithTag(eventTargetElement, 'SPAN');
    if (spanElement === null) {
      console.warn(`Could not find span element for token`, eventTargetElement);
      return;
    }
    if (spanElement.hasClass('token-in-app')) {
      let entries = UiToolBox.getIntArrayIdFromClasses(spanElement, 'entry-index-');
      if (entries.length === 0) {
        return;
      }
      this.arrangeIndicesByApparatus(entries as [number, number][]).forEach((entryIndices, appIndex) => {
        entryIndices.forEach((entryIndex) => {
          // console.log(`Hover app ${appIndex}, ${entryIndex}, ${on ? 'ON' : 'OFF'}`);
          this.options.apparatusPanels[appIndex].hoverEntry(entryIndex, on);
        });
      });
    }
  }

  showElementPopover(element: any) {
    if (this.popoversEnabled && !this.selecting) {
      element.popover('show');
    }
  }

  _genOnMouseEnterToken() {

    return (ev: any) => {
      switch (this.currentEditMode) {
        case EDIT_MODE_OFF:
          this.hoverEntriesInApparatusPanels($(ev.target), true);
          this.showElementPopover($(ev.target.closest('.main-text-token')));
          break;

        case EDIT_MODE_APPARATUS:
          ev.preventDefault();
          ev.stopPropagation();
          this.cursorInToken = true;
          if (this.selecting) {
            this.tokenIndexTwo = UiToolBox.getSingleIntIdFromClasses($(ev.target), 'main-text-token-');
            // console.log(`Mouse enter on token ${this.tokenIndexTwo} while selecting`)
            this._setSelection(this.tokenIndexOne, this.tokenIndexTwo);
            this._showSelectionInBrowser();
            this._processNewSelection();
          } else {
            this.hoverEntriesInApparatusPanels($(ev.target), true);
            this.showElementPopover($(ev.target.closest('.main-text-token')));
          }
          break;

        default:
          return;
      }


    };
  }

  _genOnMouseLeaveToken() {
    return (ev: any) => {
      switch (this.currentEditMode) {
        case EDIT_MODE_OFF:
          this.hoverEntriesInApparatusPanels($(ev.target), false);
          // @ts-ignore
          $(ev.target.closest('.main-text-token')).popover('hide');
          break;

        case EDIT_MODE_APPARATUS:
          ev.stopPropagation();
          this.hoverEntriesInApparatusPanels($(ev.target), false);
          // @ts-ignore
          $(ev.target.closest('.main-text-token')).popover('hide');
          this.cursorInToken = false;
          break;

        default:
          return;
      }
    };
  }

  async _updateLineNumbersAndApparatuses() {
    await wait(typesetInfoDelay);
    this.lastMainTextTypesettingInfo = ApparatusCommon.getMainTextTypesettingInfo(this.containerSelector, 'main-text-token-', this.edition.mainText);
    this._drawLineNumbers(this.lastMainTextTypesettingInfo);
    this.options.apparatusPanels.forEach((p) => {
      p.updateApparatus(this.lastMainTextTypesettingInfo);
    });
  }

  _generateMainTextHtml() {
    switch (this.currentEditMode) {
      case EDIT_MODE_OFF:
      case EDIT_MODE_APPARATUS:
        return this.getMainTextHtmlVersion();

      case EDIT_MODE_TEXT:
        return this._getMainTextBetaEditor();

      default:
        return `Error: unknown edit mode: ${this.currentEditMode}`;
    }
  }

  _getMainTextBetaEditor() {
    return `<div id="${betaEditorToolbarDivId}"></div><div id="${betaEditorDivId}">Editor will be here</div><div id="${betaEditorInfoDiv}" >Info will be here </div>`;
  }

  private renderTextEditorToolbar(formatState: EditionMainTextEditorFormatState) {
    this.textEditorToolbarRoot?.render(createElement(MainTextEditorToolbar, {
      lang: this.lang,
      formatState,
      onToggleFormat: format => this.freeTextEditor.toggleFormat(format),
      onToggleHeading: headingNumber => this.freeTextEditor.toggleHeading(headingNumber),
      onInsertCharacter: characterKey => this.freeTextEditor.insertCharacter(characterKey)
    }));
  }

  private getMainTextHtmlVersion(): string {
    let fmtTextRenderer = new HtmlRenderer({plainMode: true});
    let paragraphs = MainText.getParagraphs(this.edition.mainText);
    // console.log(`Main text paragraphs: ${paragraphs.length}`, paragraphs);

    return paragraphs.map((paragraph, paragraphIndex) => {
      let paragraphInnerHtml = paragraph.tokens.map((token) => {
        let tokenClasses = [];
        switch (token.type) {
          case EditionMainTextTokenType.GLUE:
            tokenClasses = ['main-text-token', `main-text-token-${token.originalIndex}`, 'whitespace'];
            return `<span class="${tokenClasses.join(' ')}"> </span>`;

          case EditionMainTextTokenType.TEXT:
          case EditionMainTextTokenType.NUMBERING_LABEL:
          case EditionMainTextTokenType.FOLIATION_CHANGE_MARKER:
            let ctIndex = CtData.getCtIndexForEditionWitnessTokenIndex(this.ctData, token.editionWitnessTokenIndex);
            let typeClass = token.type === EditionMainTextTokenType.TEXT ? 'edition-text' : 'numbering-label';
            tokenClasses = ['main-text-token', `main-text-token-${token.originalIndex}`, `ct-index-${ctIndex}`, typeClass];
            // console.log(`Token ${token.originalIndex} has ctIndex ${ctIndex}`, token);
            return `<span class="${tokenClasses.join(' ')} ">${fmtTextRenderer.render(token.fmtText)}</span>`;

          default:
            return '';
        }
      }).join('');
      let paragraphClasses = ['paragraph', `paragraph-${paragraphIndex}`];
      if (paragraph.type !== '') {
        paragraphClasses.push(`paragraph-${paragraph.type}`);
      }
      if (paragraphInnerHtml === '') {
        // an empty paragraph
        paragraphClasses.push(`paragraph-empty`);
      }
      return `<p class="${paragraphClasses.join(' ')}">${paragraphInnerHtml}</p>`;
    }).join('');


  }

  _drawLineNumbers(mainTextTokensWithTypesettingInfo: MainTextTypesettingInfo) {

    let lineFrequency = 5;
    let mainTexDiv = $(`${this.containerSelector} .main-text`);
    // let lineHeight = this.lang === 'la' ? "1em" : "1.5em"

    let fontBaseLineRatio = 0.920;
    let lineNumberFontSizeFactor = 0.8;
    let fontLineHeightFactor = 1.13;
    // TODO: find this programmatically
    let mainTextFontSize = 18;


    let offsetY = mainTexDiv.offset()?.top ?? -1;
    let margin = this.lang === 'la' ? 'left' : 'right';
    let posX = margin === 'left' ? 50 : 50;
    let lineNumberOverlays = mainTextTokensWithTypesettingInfo.lineMap
    .filter((lineSpec) => {
      return lineSpec.line === 1 || (lineSpec.line % lineFrequency === 0);
    })
    .map((lineSpec) => {
      let posY = lineSpec.pY - offsetY;
      if (this.lang === 'la') {
        // TODO: do this for the other languages
        let lineOffset = mainTextFontSize * fontBaseLineRatio * (1 - lineNumberFontSizeFactor);
        posY = lineSpec.pY - offsetY + lineOffset;
        // console.log(`Line number for line ${lineSpec.line}: pY = ${lineSpec.pY}, offset = ${lineOffset}`)
      }

      let lineString = ApparatusCommon.getNumberString(lineSpec.line, this.lang);
      return `<div class="line-number text-${this.lang}" style="position: absolute; 
top: ${posY}px; ${margin}: ${posX}px; line-height: ${fontLineHeightFactor}em;
font-size: ${mainTextFontSize * lineNumberFontSizeFactor}px;">${lineString}</div>`;
    })
    .join('');

    $('#main-text-line-numbers').remove();
    mainTexDiv.append(`<div id="main-text-line-numbers">${lineNumberOverlays}</div>`);
  }

  private getWitnessTokenHtml(token: WitnessTokenInterface | undefined | null, full = true) {
    if (token === null || token === undefined || token.tokenType === WitnessTokenType.EMPTY) {
      return '';
    }

    if (token.tokenType === WitnessTokenType.WHITESPACE) {
      return ' ';
    }
    if (token.tokenType === WitnessTokenType.FORMAT_MARK) {
      if (token.markType === EditionWitnessFormatMarkType.PARAGRAPH_END) {
        let styleHtml = '';
        if (token.style !== 'normal') {
          styleHtml = `(${token.style})`;
        }
        let html = `<span class="format-mark"><i class="bi bi-paragraph"></i> ${styleHtml}</span>`;
        if (full) {
          html += "<br/>";
        }
        return html;
      }
    }

    if (token.tokenType === WitnessTokenType.NUMBERING_LABEL) {
      return `<span class='numbering-label'>${token.text}</span>`;
    }


    // if (token.fmtText !== undefined) {
    //   return this.htmlRenderer.render(token.fmtText);
    // }
    return token.text;
  }
  /**
   *
   * @private
   */
  private _genOnMouseUpMainTexToken() {
    return (ev: any) => {
      if (this.currentEditMode !== EDIT_MODE_APPARATUS) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if ($(ev.target).hasClass('whitespace')) {
        return;
      }
      let tokenIndex = UiToolBox.getSingleIntIdFromAncestor('SPAN', $(ev.target), 'main-text-token-');
      if (tokenIndex === -1) {
        this.verbose && console.log(`Mouse up on a token -1`);
        return;
      }

      this.tokenIndexTwo = tokenIndex;
      if (!this._selectionsAreEqual(this.selection, this._createSelection(this.tokenIndexOne, this.tokenIndexTwo))) {
        this._setSelection(this.tokenIndexOne, this.tokenIndexTwo);
        this._showSelectionInBrowser();
        this._processNewSelection();
      }
      this._stopSelecting();

    };
  }
}