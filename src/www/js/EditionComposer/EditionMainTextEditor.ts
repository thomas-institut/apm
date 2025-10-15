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

// @ts-ignore
import Inline from 'quill/blots/inline';
import {isRtl} from '@/toolbox/Util';
import {toolbarCharactersDefinition} from './ToolbarCharactersDefinition';
import Quill from '../QuillLoader';
import Small from './QuillBlots/Small';
import Superscript from './QuillBlots/Superscript';
import NumberingLabel from './QuillBlots/NumberingLabel';
import {QuillDeltaRenderer} from './QuillDelta/QuillDeltaRenderer';
import {GenericQuillDeltaConverter} from './QuillDelta/GenericQuillDeltaConverter';
import {CompactFmtText, fromCompact} from "@/lib/FmtText/FmtText";
import {QuillRange} from "@/lib/types/Quill";


const simpleFormats = ['bold', 'italic', 'numberingLabel'
  // 'small',
  // 'superscript'
];


Inline.order = ['cursor', 'inline',   // Must be lower
  'underline', 'strike', 'italic', 'bold', 'numberingLabel', 'script', 'link', 'code'        // Must be higher
];

const headingDepth = 3;

const formatButtons: { [key: string]: { icon: string, title: string } } = {
  bold: {icon: '<i class="bi bi-type-bold"></i>', title: 'Bold'},
  italic: {icon: '<i class="bi bi-type-italic"></i>', title: 'Italic'},
  numberingLabel: {icon: '<small class="fte-icon">x.y</small>', title: 'Numbering Label'}
  // small: { icon: '<small class="fte-icon">S</small>', title: 'Small Font'},
  // superscript: { icon: '<small class="fte-icon">x<sup>2</sup>', title: 'Superscript'}
};

const headingIcons = ['', '<span class="mte-icon">H<sub>1</sub></span>', '<span class="mte-icon">H<sub>2</sub></span>', '<span class="mte-icon">H<sub>3</sub></span>'];

const toolbarSeparator = '<span class="mte-tb-sep">&nbsp;</span>';

interface EditionMainTextEditorOptions {
  containerSelector: string,
  lang: string,
  verbose?: boolean,
  debug?: boolean,
  initialText?: CompactFmtText,
  onChange: (text: string) => void
}

/**
 * A one-line editor for free text
 */
export class EditionMainTextEditor {
  private readonly lang: string;
  private readonly verbose: boolean;
  private readonly debug: boolean;
  private readonly containerSelector: string;
  private container: JQuery<HTMLElement>;
  private readonly quillEditor: Quill;
  private readonly onChange: (text: string) => void;
  private quillDeltaRenderer: QuillDeltaRenderer;
  private quillDeltaConverter: GenericQuillDeltaConverter;

  constructor(options: EditionMainTextEditorOptions) {
    this.lang = options.lang;
    this.verbose = options.verbose ?? false;
    this.debug = options.debug ?? false;
    if (this.debug) {
      this.verbose = true;
    }
    this.containerSelector = options.containerSelector;
    this.container = $(this.containerSelector);
    this.container.html(this._getHtml());
    this.quillEditor = new Quill(`${this.containerSelector} .fte-editor`, {});
    this.onChange = options.onChange;
    this.quillDeltaRenderer = new QuillDeltaRenderer({
      classToAttrTranslators: {
        numberingLabel: (attr: any) => {
          attr.numberingLabel = true;
          return attr;
        }
      }, defaultTextAttrObject: {numberingLabel: false}, defaultGlueAttrObject: {} // for some reason, putting any attribute in glue messes everything up!
    });
    this.quillDeltaConverter = new GenericQuillDeltaConverter({
      verbose: this.verbose, debug: false, ignoreParagraphs: false, attrToClassTranslators: {
        numberingLabel: (value, classList) => {
          // console.log(`Attr to class `)
          if (value) {
            classList = 'numberingLabel';
          }
          return classList;
        }
      }
    });


    this.setText(options.initialText ?? []);
    this.quillEditor.on('text-change', () => {
      this.onChange(this.getText());
    });

    simpleFormats.forEach((fmt) => {
      let btnSelector = this._getBtnSelectorFormat(fmt);
      $(btnSelector).on('click', this._genOnClickFormat(fmt, this.quillEditor, btnSelector));
    });

    for (let i = 0; i < headingDepth; i++) {
      $(this._getBtnSelectorHeading(i + 1)).on('click', this._genOnClickHeadingButton(i + 1, this.quillEditor));
    }

    Object.keys(toolbarCharactersDefinition[this.lang]).forEach((key) => {
      let btnSelector = this._getBtnSelectorCharacter(key);
      $(btnSelector).on('click', this._genOnClickCharacter(key, this.quillEditor));
    });

    this.quillEditor.on('selection-change', (range: QuillRange | null) => {
      if (range === null) {
        this.debug && console.log(`Editor out of focus`);
        return;
      }
      // if (oldRange === null) {
      //   oldRange = {index: -1, length: -1};
      // }
      // this.debug && console.log(`Selection change from ${oldRange.index}:${oldRange.length} to ${range.index}:${range.length}, source ${source}`)
      let currentFormat = this.quillEditor.getFormat();
      simpleFormats.forEach((fmt) => {
        setButtonState($(this._getBtnSelectorFormat(fmt)), currentFormat[fmt]);
      });
      for (let i = 0; i < headingDepth; i++) {
        setButtonState($(this._getBtnSelectorHeading(i + 1)), currentFormat.header === i + 1);
      }
    });
  }

  getText() {
    return this.quillEditor.getText();
  }

  getQuillDelta() {
    return this.quillEditor.getContents();
  }

  getFmtText() {
    // this.debug && console.log(`Current Quill Delta`)
    // this.debug && console.log(this.getQuillDelta())
    return this.quillDeltaConverter.toFmtText(this.getQuillDelta());
  }


  setText(newText: CompactFmtText, silent = false) {
    this.debug && console.log(`Setting text`);
    this.debug && console.log(newText);
    let newDelta = this.quillDeltaRenderer.render(fromCompact(newText));
    this.debug && console.log(`Setting text with new delta`);
    this.debug && console.log(newDelta);
    let source = silent ? 'silent' : 'api';
    this.quillEditor.setContents(newDelta, source);
  }

  _getBtnSelectorFormat(format: string) {
    return `${this.containerSelector} .${format}-btn`;
  }

  _getBtnSelectorCharacter(characterKey: string) {
    return `${this.containerSelector} .${characterKey}-btn`;
  }


  _getBtnSelectorHeading(headingNumber: number) {
    return `${this.containerSelector} .heading${headingNumber}-btn`;
  }

  _genOnClickFormat(format: string, quill: Quill, buttonSelector: string) {
    return (ev: any) => {
      ev.preventDefault();
      let currentFormat = quill.getFormat();
      let currentState = false;
      if (currentFormat[format] !== undefined) {
        currentState = currentFormat[format];
      }
      // console.log(`Click on format ${format}`)
      // console.log(`Current state: ${currentState}`)
      let btn = $(buttonSelector);
      quill.format(format, !currentState);
      currentState = !currentState;
      setButtonState(btn, currentState);
    };
  }

  _genOnClickCharacter(characterKey: string, quill: Quill) {
    return (ev: any) => {
      ev.preventDefault();
      let range = quill.getSelection();
      if (range === null) {
        return;
      }
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, toolbarCharactersDefinition[this.lang][characterKey].character);
    };
  }

  _genOnClickHeadingButton(headingNumber: number, quill: Quill) {
    return (ev: any) => {
      ev.preventDefault();
      let currentFormat = quill.getFormat();
      let currentHeading = currentFormat['header'] !== undefined ? currentFormat['header'] : -1;
      if (currentHeading === headingNumber) {
        // turn off heading
        this.verbose && console.log(`Turning off heading ${currentHeading}`);
        quill.format('header', false);
        setButtonState($(this._getBtnSelectorHeading(currentHeading)), false);
      } else {
        this.verbose && console.log(`Setting heading ${headingNumber}`);
        quill.format('header', headingNumber);
        for (let i = 0; i < headingDepth; i++) {
          let buttonState = headingNumber === i + 1;
          setButtonState($(this._getBtnSelectorHeading(i + 1)), buttonState);
        }
      }
    };
  }


  _getHtml() {

    let buttonsHtml = simpleFormats
    .map((fmt) => {
      return `<button class="${fmt}-btn" title="${formatButtons[fmt].title}">${formatButtons[fmt].icon}</button>`;
    })
    .join('');
    let headingButtonsHtml = '';
    for (let i = 0; i < headingDepth; i++) {
      headingButtonsHtml += `<button class="heading${i + 1}-btn" title="Heading ${i + 1}">${headingIcons[i + 1]}</button>`;
    }

    let characterButtonsHtml = Object.keys(toolbarCharactersDefinition[this.lang]).map((key) => {
      let btnDef = toolbarCharactersDefinition[this.lang][key];
      let char = isRtl(this.lang) && btnDef['rtlVersion'] !== undefined ? btnDef['rtlVersion'] : btnDef.character;
      return `<button class="${key}-btn" title="${btnDef.title}">${char}</button>`;
    }).join('');
    return `<div class="fte-toolbar text-${this.lang}">${buttonsHtml}${toolbarSeparator}${headingButtonsHtml}${toolbarSeparator}${characterButtonsHtml}</div>
<div class="fte-editor text-${this.lang}"></div>`;
  }
}


function setButtonState(btn: JQuery<Element>, state: boolean) {
  if (state) {
    btn.addClass('on');
  } else {
    btn.removeClass('on');
  }
}

// Initialization
Quill.register({
  'formats/small': Small, 'formats/superscript': Superscript, 'formats/numberingLabel': NumberingLabel
}, true);