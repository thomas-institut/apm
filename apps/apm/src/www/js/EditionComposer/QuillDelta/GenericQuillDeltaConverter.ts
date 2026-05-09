/*
 *  Copyright (C) 2022 Universität zu Köln
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

import {QuillDeltaConverter, QuillDeltaConverterOptions} from './QuillDeltaConverter';
import {varsAreEqual} from '@/lib/ToolBox/ArrayUtil';
import * as FontWeight from '@/lib/FmtText/FontWeight.js';
import * as FontStyle from '@/lib/FmtText/FontStyle.js';
import * as FontSize from '@/lib/FmtText/FontSize.js';
import * as VerticalAlign from '@/lib/FmtText/VerticalAlign.js';
import * as ParagraphStyle from '@/lib/FmtText/ParagraphStyle.js';
import {rTrimNewlineCharacters} from '@/toolbox/Util';
import {QuillDelta} from "@/lib/types/Quill";
import {FmtText, fromString, getNormalizedFmtText, newParagraphMark} from "@/lib/FmtText/FmtText";


type AttrToClassTranslator = (attributeValue: any, currentClassList: string) => string

interface GenericQuillDeltaConverterOptions extends QuillDeltaConverterOptions {
  attrToClassTranslators?: { [key: string]: AttrToClassTranslator };
}

export class GenericQuillDeltaConverter extends QuillDeltaConverter {
  private options: GenericQuillDeltaConverterOptions;
  private readonly translators: { [p: string]: AttrToClassTranslator };
  private translatorsAvailable: string[];

  constructor(options: GenericQuillDeltaConverterOptions) {
    super(options);
    this.options = options;
    this.translators = this.options.attrToClassTranslators ?? {};
    this.translatorsAvailable = Object.keys(this.translators);

  }

  toFmtText(quillDelta: QuillDelta): FmtText {
    // this.debug && console.log(`Converting quill Delta`)
    if (varsAreEqual(quillDelta.ops, [{insert: "\n"}])) {
      // empty editor
      // this.debug && console.log(`Empty editor, returning []`)
      return [];
    }
    // this.debug && console.log(`There are ${quillDelta.ops.length} ops in delta`)
    let opsMap = quillDelta.ops.map((ops, i) => {
      // this.debug && console.log(`Processing ops ${i}`)
      // this.debug && console.log(ops)
      if (ops.insert === "\n") {
        // single paragraph mark
        if (this.options.ignoreParagraphs) {
          return [];
        }
        if (ops.attributes !== undefined && ops.attributes.header !== undefined) {
          let headerStyle = '';
          switch (ops.attributes.header) {
            case 1:
              headerStyle = ParagraphStyle.HEADING1;
              break;

            case 2:
              headerStyle = ParagraphStyle.HEADING2;
              break;

            case 3:
              headerStyle = ParagraphStyle.HEADING3;
              break;
          }
          return [newParagraphMark(headerStyle)];
        }
        return [newParagraphMark()];
      }
      // text with, possibly, some newline characters
      let insertText = ops.insert;
      if (i === quillDelta.ops.length - 1) {
        // remove trailing new lines
        insertText = rTrimNewlineCharacters(insertText);
      }
      let paragraphs;
      if (this.options.ignoreParagraphs) {
        insertText = insertText.replace("\n", ' ');
        // this.debug && console.log(`Ignoring paragraphs, ops.insert changed to: `)
        // this.debug && console.log(insertText)
        paragraphs = [insertText];
      } else {
        paragraphs = insertText.split("\n");
        if (paragraphs.length > 1) {
          this.debug && console.log(`-- ${paragraphs.length - 1} paragraph break(s) in ops`);
        }
      }

      let parsFmtText = paragraphs.map((paragraphText) => {
        let theFmtText = fromString(paragraphText);
        if (ops.attributes !== undefined) {
          for (let i = 0; i < theFmtText.length; i++) {
            const fmtTextToken = theFmtText[i];
            if (fmtTextToken.type !== 'text') {
              continue;
            }
            if (ops.attributes.bold) {
              fmtTextToken.fontWeight = FontWeight.BOLD;
            }
            if (ops.attributes.italic) {
              fmtTextToken.fontStyle = FontStyle.ITALIC;
            }
            if (ops.attributes.small) {
              fmtTextToken.fontSize = FontSize.SMALL;
            }
            if (ops.attributes.superscript) {
              fmtTextToken.fontSize = FontSize.SUPERSCRIPT;
              fmtTextToken.verticalAlign = VerticalAlign.SUPERSCRIPT;
            }
            let attributesToIgnore = ['bold', 'italic', 'small', 'superscript'];
            let attrKeys = Object.keys(ops.attributes);
            let classList = '';
            for (let j = 0; j < attrKeys.length; j++) {
              let key = attrKeys[j];
              if (attributesToIgnore.indexOf(key) !== -1) {
                continue;
              }
              if (this.translatorsAvailable.indexOf(key) !== -1) {
                classList = this.translators[key](ops.attributes[key], classList);
              }
            }
            fmtTextToken.classList = classList;
          }
        }
        return getNormalizedFmtText(theFmtText);
      });
      let fmtText: FmtText = [];
      parsFmtText.forEach((lineFmtTxt) => {
        fmtText.push(...lineFmtTxt);
        if (!this.options.ignoreParagraphs) {
          fmtText.push(newParagraphMark());
        }
      });
      if (!this.options.ignoreParagraphs) {
        // remove the final paragraph mark
        fmtText.pop();
      }
      return fmtText;
    });

    let fmtText: FmtText = [];
    opsMap.forEach((opsFmtText) => {
      fmtText.push(...opsFmtText);
    });
    // this.debug && console.log(`Final FmtText array`)
    // this.debug && console.log(fmtText)
    return fmtText;
  }

}

