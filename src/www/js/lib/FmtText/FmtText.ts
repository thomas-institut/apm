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


import * as FmtTextTokenType from './FmtTextTokenType.js';
import * as FontStyle from './FontStyle.js';
import * as FontSize from './FontSize.js';
import * as FontWeight from './FontWeight.js';
import * as VerticalAlign from './VerticalAlign.js';

export const DEFAULT_GLUE_SPACE = 'normal';


export interface FmtTextEmptyToken {
  type: 'empty';
}
/**
 * A formatted text token.
 */
export interface FmtTextTextToken {
  type: 'text';
  text: string;
  /**
   * The font style, for example 'normal' or 'italic'.
   */
  fontStyle?: string;
  /**
   * The font weight, for example 'normal' or 'bold'.
   */
  fontWeight?: string;
  /**
   * The text's vertical alignment, for example 'baseline', 'subscript' or 'superscript'.
   */
  verticalAlign?: string;
  /**
   * Font size in ems (i.e., relative to a default font size)
   */
  fontSize?: number;
  /**
   * Space separated list of strings representing display classes defined in a typesetter
   */
  classList?: string;
  /*
   * If undefined or an empty string, the typesetter needs to infer the text direction from the text.
   */
  textDirection?: '' | 'ltr' | 'rtl';
}

/**
 * A glue token.
 *
 * The term 'glue' is taken from Donald Knuth's "The TeX book", where it is explained in
 * chapter 12.
 *
 * Glue is meant to represent a potentially variable-length space that may or
 * may not eventually appear in a representation of the text. It may not appear, for example, in
 * a printed version of the text if it is an inter-word space that falls at the end of the line.
 * This allows for more sophisticated typesetting in printed form.
 */
export interface FmtTextGlueToken {

  type: 'glue';
  /**
   * A string that a typesetter may interpret as a style or kind of space, for example 'normal' or 'em',
   * in case the a width is not specified.
   */
  space?: string;
  /**
   * The glue base width in pixels.
   *
   * If negative or undefined, defaults to a standard size or to the style given in ``space``
   */
  width?: number;
  /**
   * Extra pixels the space can stretch to.
   *
   * This is only a suggestion, the typesetting algorithm may stretch spaces more than this in extreme
   * situations.
   */
  stretch?: number;
  /**
   * How many pixels less the space can have. This allows the typesetter to make lines more compact to
   * a certain extent.
   *
   * ``space - shrink`` is the absolute minimum for the space
   */
  shrink?: number;
}

/**
 * A graphical mark, for example an icon or a symbol.
 */
export interface FmtTextMarkToken {
  type: 'mark';
  markType: string;
  style?: string;
  /**
   * Text to show if the visual output cannot produce a correct graphical representation of the mark.
   */
  altText?: string;
}

export type FmtTextToken = FmtTextEmptyToken | FmtTextTextToken | FmtTextGlueToken | FmtTextMarkToken;

/**
 * Formatted text with information about styles, space widths, graphical marks, etc.
 * A typesetter can use this information to produce a good-looking presentation of the text either on a
 * screen or in a printed document.
 *
 * FmtText is an array of text, glue and mark tokens.
 */
export type FmtText = FmtTextToken[];

export type CompactFmtText = (FmtTextToken|string)[] | string;

export function newTextToken(text: string): FmtTextTextToken {
  return {
    type: 'text', text: text,
  };
}

export function newGlueToken(width: number = -1, stretch: number = 0, shrink: number = 0): FmtTextGlueToken {
  const token: FmtTextGlueToken = {type: 'glue', width: width};
  if (stretch !== 0) {
    token.stretch = stretch;
  }
  if (shrink !== 0) {
    token.shrink = shrink;
  }
  return token;
}

export function newMarkToken(markType: string, style: string = ''): FmtTextMarkToken {
  const token: FmtTextMarkToken = {type: 'mark', markType: markType};
  if (style !== '') {
    token.style = style;
  }
  return token;
}

export function getTokenPlainText(token: FmtTextToken): string {
  if (token.type === 'text') {
    return token.text;
  }

  if (token.type === 'glue') {
    return ' ';
  }

  if (token.type === 'empty') {
    return '';
  }

  return token.altText ?? '';
}

export function getPlainText(fmtText: FmtText): string {
  return fmtText.map(t => getTokenPlainText(t)).join('');
}


export function fmtTextFromString(str: string): FmtText {
  const wordTokens = str.split(' ').map(word => newTextToken(word));
  const fmtText: FmtText = [];
  for (let i = 0; i < wordTokens.length - 1; i++) {
    fmtText.push(wordTokens[i]);
    if (i < wordTokens.length - 2) {
      fmtText.push(newGlueToken());
    }
  }
  return fmtText;
}

export function fromCompact(input: CompactFmtText): FmtText {
  if (typeof input === 'string') {
    return fmtTextFromString(input);
  }
  if (input.length === 0) {
    return [];
  }
  const fmtText: FmtText = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (typeof item === 'string') {
      fmtText.push(...fmtTextFromString(item));
    } else {
      fmtText.push(item);
    }
  }
  return fmtText;
}
export interface FmtTextTokenInterface {

  type: string;

  text?: string;
  fontStyle?: string;
  fontWeight?: string;
  verticalAlign?: string;
  fontSize?: number;
  classList?: string;
  textDirection?: string;


  space?: string;
  width?: number;
  stretch?: number;
  shrink?: number;

  markType?: string;
  style?: string;
}

export class FmtTextTokenClass implements FmtTextTokenInterface {

  type: string;

  text?: string;
  fontStyle?: string;
  fontWeight?: string;
  verticalAlign?: string;
  fontSize?: number;
  classList?: string;
  textDirection?: string;


  space?: string;
  width?: number;
  stretch?: number;
  shrink?: number;

  markType?: string;
  style?: string;

  constructor(type = FmtTextTokenType.TEXT) {
    this.type = type;

    switch (type) {
      case FmtTextTokenType.TEXT:
        this.text = '';
        this.fontStyle = FontStyle.NORMAL;
        this.fontWeight = FontWeight.NORMAL;
        this.verticalAlign = VerticalAlign.BASELINE;
        this.fontSize = FontSize.NORMAL;
        this.classList = '';  // a space-separated list of arbitrary text labels
        this.textDirection = ''; // if empty, inferred from text, otherwise it can be 'rtl' or 'ltr'
        break;

      case FmtTextTokenType.GLUE:
        this.space = DEFAULT_GLUE_SPACE; // i.e., default size, whatever that means for the typesetter/presenter context
        break;

      case FmtTextTokenType.MARK:
        this.markType = '';
        this.style = '';
        break;

      default:
        console.warn(`Unsupported type in FormattedTextToken constructor: ${type}`);
        this.type = FmtTextTokenType.EMPTY;
    }
  }
  setText(text: string): this {
    this.text = text;
    return this;
  }
  addClass(className: string) {
    if (this.classList === '') {
      this.classList = className;
    } else {
      this.classList += ' ';
      this.classList += className;
    }
    return this;
  }

  removeClass(className: string) {
    let classArray = this.classList?.split(' ') ?? [];
    this.classList = classArray.filter((currentClassName) => {
      return currentClassName !== className;
    }).join(' ');
    if (this.classList.trim() === '') {
      this.classList = undefined;
    }
    return this;
  }

  setMarkType(markType: string) {
    this.type = FmtTextTokenType.MARK;
    this.markType = markType;
    this.style = '';
    return this;
  }

  setStyle(style: string): this {
    this.style = style;
    return this;
  }
}