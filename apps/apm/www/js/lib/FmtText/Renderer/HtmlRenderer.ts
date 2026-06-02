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

import * as FmtTextTokenType from '../FmtTextTokenType.js';
import * as FontStyle from '../FontStyle.js';
import * as FontWeight from '../FontWeight.js';
import * as FontSize from '../FontSize.js';
import * as VerticalAlign from '../VerticalAlign.js';
import {FmtTextRenderer} from './FmtTextRenderer.js';
import {FmtText} from "../FmtText.js";

export interface HtmlRendererOptions {
  plainMode?: boolean;
  tokenClasses?: string[];
  tokenIndexClassPrefix?: string;
  textClasses?: string[];
  glueClasses?: string[];
}

export class HtmlRenderer extends FmtTextRenderer {
  private options: Required<HtmlRendererOptions>;

  constructor(options: HtmlRendererOptions = {}) {
    super();
    this.options = {
      plainMode: options.plainMode ?? false,
      tokenClasses: options.tokenClasses ?? ['token'],
      tokenIndexClassPrefix: options.tokenIndexClassPrefix ?? 'token-',
      textClasses: options.textClasses ?? ['text'],
      glueClasses: options.glueClasses ?? ['glue']
    };
    if (this.options.plainMode) {
      this.options.tokenClasses = [];
      this.options.tokenIndexClassPrefix = '';
      this.options.textClasses = [];
      this.options.glueClasses = [];
    }
  }

  render(fmtText: FmtText, _lang = ''): string {
    return fmtText.map((t, i) => {
      let tokenClasses = this.options.tokenClasses;
      let classes = [];
      switch (t.type) {
        case FmtTextTokenType.TOKEN_TYPE_GLUE:
          tokenClasses = tokenClasses.concat(this.options.glueClasses);
          classes = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses);
          if (classes.length === 0) {
            return ' ';
          }
          return `<span class="${classes.join(' ')}"> </span>`;

        case FmtTextTokenType.TOKEN_TYPE_TEXT :
          tokenClasses = tokenClasses.concat(this.options.textClasses);
          classes = getClassArrayForToken(this.options.tokenIndexClassPrefix, i, tokenClasses);
          let spanStart = '';
          let spanEnd = '';
          if (classes.length !== 0) {
            spanStart = `<span class="${classes.join(' ')}">`;
            spanEnd = '</span>';
          }
          if (t.classList !== undefined && t.classList.indexOf('sigla') !== -1) {
            // TODO: don't use this hack. Implement a generic solution for different FmtTextToken classes
            return `<b class="sigla">${t.text}</b>`;
          }
          let textWrappers = [];
          if (t.fontStyle === FontStyle.FONT_STYLE_ITALIC) {
            textWrappers.push('i');
          }
          if (t.fontWeight === FontWeight.FONT_WEIGHT_BOLD) {
            textWrappers.push('b');
          }
          if (t.verticalAlign === VerticalAlign.VALIGN_SUPERSCRIPT) {
            textWrappers.push('sup');
          }
          if (t.verticalAlign === VerticalAlign.VALIGN_SUBSCRIPT) {
            textWrappers.push('sub');
          }
          if (t.fontSize === FontSize.FONT_SIZE_SMALL && (t.verticalAlign === undefined || t.verticalAlign === VerticalAlign.VALIGN_BASELINE)) {
            textWrappers.push('small');
          }
          let startWrappers = '';
          for (let j = 0; j < textWrappers.length; j++) {
            startWrappers += `<${textWrappers[j]}>`;
          }
          let endWrappers = '';
          for (let j = textWrappers.length - 1; j >= 0; j--) {
            endWrappers += `</${textWrappers[j]}>`;
          }
          return `${spanStart}${startWrappers}${t.text}${endWrappers}${spanEnd}`;
      }
    }).join('');
  }
}

/**
 *
 * @param {string} indexPrefix
 * @param {number} index
 * @param {string[]} tokenClasses
 * @return {string[]}
 */
function getClassArrayForToken(indexPrefix: string, index: number, tokenClasses: string[]): string[] {
  let indexClass = indexPrefix !== '' ? `${indexPrefix}${index}` : '';
  let classArray: string[] = [];
  if (tokenClasses.length !== 0) {
    classArray = classArray.concat(tokenClasses);
  }
  if (indexClass !== '') {
    classArray.push(indexClass);
  }
  return classArray;

}