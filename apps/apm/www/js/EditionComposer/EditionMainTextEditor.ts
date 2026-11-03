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
import {toolbarCharactersDefinition} from './ToolbarCharactersDefinition';
import Quill from '../QuillLoader';
import Small from './QuillBlots/Small';
import Superscript from './QuillBlots/Superscript';
import NumberingLabel from './QuillBlots/NumberingLabel';
import {QuillDeltaRenderer} from './QuillDelta/QuillDeltaRenderer';
import {GenericQuillDeltaConverter} from './QuillDelta/GenericQuillDeltaConverter';
import {CompactFmtText, fromCompactFmtText} from "@thomas-inst/fmt-text";
import {QuillRange} from "@/lib/types/Quill";


export const simpleFormats = ['bold', 'italic', 'numberingLabel', 'small', 'superscript'] as const;
export type EditionMainTextEditorFormat = typeof simpleFormats[number];

export interface EditionMainTextEditorFormatState {
  bold: boolean;
  italic: boolean;
  numberingLabel: boolean;
  small: boolean;
  superscript: boolean;
  heading: number | null;
}


Inline.order = ['cursor', 'inline',   // Must be lower
  'underline', 'strike', 'italic', 'bold', 'numberingLabel', 'script', 'link', 'code'        // Must be higher
];

export const headingDepth = 3;

export const formatButtons: Record<EditionMainTextEditorFormat, { icon: string, title: string }> = {
  bold: {icon: '<i class="bi bi-type-bold"></i>', title: 'Bold'},
  italic: {icon: '<i class="bi bi-type-italic"></i>', title: 'Italic'},
  numberingLabel: {icon: '<small class="fte-icon">x.y</small>', title: 'Numbering Label'},
  small: { icon: '<small class="fte-icon">S</small>', title: 'Small Font'},
  superscript: { icon: '<small class="fte-icon">x<sup>2</sup>', title: 'Superscript'}
};

export const headingIcons = ['', '<span class="mte-icon">H<sub>1</sub></span>', '<span class="mte-icon">H<sub>2</sub></span>', '<span class="mte-icon">H<sub>3</sub></span>'];

export interface EditionMainTextEditorOptions {
  containerSelector: string,
  lang: string,
  verbose?: boolean,
  debug?: boolean,
  initialText?: CompactFmtText,
  onChange: (text: string) => void,
  onFormatStateChange?: (formatState: EditionMainTextEditorFormatState) => void
}

/**
 * A one-line editor for free text
 */
export class EditionMainTextEditor {
  private readonly lang: string;
  private readonly verbose: boolean;
  private readonly debug: boolean;
  private readonly containerSelector: string;
  private container: HTMLElement;
  private readonly quillEditor: Quill;
  private readonly onChange: (text: string) => void;
  private readonly onFormatStateChange: (formatState: EditionMainTextEditorFormatState) => void;
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
    const container = document.querySelector<HTMLElement>(this.containerSelector);
    if (container === null) {
      throw new Error(`Container '${this.containerSelector}' not found`);
    }
    this.container = container;
    this.container.innerHTML = this._getHtml();
    this.quillEditor = new Quill(this.container.querySelector<HTMLElement>('.fte-editor')!, {});
    this.onChange = options.onChange;
    this.onFormatStateChange = options.onFormatStateChange ?? (() => {});
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

    this.quillEditor.on('selection-change', (range: QuillRange | null) => {
      if (range === null) {
        this.debug && console.log(`Editor out of focus`);
        this.onFormatStateChange(this.getFormatState());
        return;
      }
      // if (oldRange === null) {
      //   oldRange = {index: -1, length: -1};
      // }
      // this.debug && console.log(`Selection change from ${oldRange.index}:${oldRange.length} to ${range.index}:${range.length}, source ${source}`)
      this.onFormatStateChange(this.getFormatState());
    });
  }

  getFormatState(): EditionMainTextEditorFormatState {
    const currentFormat = this.quillEditor.getFormat();
    return {
      bold: !!currentFormat.bold,
      italic: !!currentFormat.italic,
      numberingLabel: !!currentFormat.numberingLabel,
      small: !!currentFormat.small,
      superscript: !!currentFormat.superscript,
      heading: typeof currentFormat.header === 'number' ? currentFormat.header : null
    };
  }

  toggleFormat(format: EditionMainTextEditorFormat) {
    const currentFormat = this.quillEditor.getFormat();
    this.quillEditor.format(format, !currentFormat[format]);
    this.onFormatStateChange(this.getFormatState());
  }

  toggleHeading(headingNumber: number) {
    const currentFormat = this.quillEditor.getFormat();
    const currentHeading = currentFormat.header !== undefined ? currentFormat.header : null;
    this.quillEditor.format('header', currentHeading === headingNumber ? false : headingNumber);
    this.onFormatStateChange(this.getFormatState());
  }

  insertCharacter(characterKey: string) {
    const range = this.quillEditor.getSelection();
    if (range === null) {
      return;
    }
    this.quillEditor.deleteText(range.index, range.length);
    this.quillEditor.insertText(range.index, toolbarCharactersDefinition[this.lang][characterKey].character);
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
    let newDelta = this.quillDeltaRenderer.render(fromCompactFmtText(newText));
    this.debug && console.log(`Setting text with new delta`);
    this.debug && console.log(newDelta);
    let source = silent ? 'silent' : 'api';
    this.quillEditor.setContents(newDelta, source);
  }

  _getHtml() {
    return `<div class="fte-editor text-${this.lang}"></div>`;
  }
}

// Initialization
Quill.register({
  'formats/small': Small,
  'formats/superscript': Superscript,
  'formats/numberingLabel': NumberingLabel
}, true);