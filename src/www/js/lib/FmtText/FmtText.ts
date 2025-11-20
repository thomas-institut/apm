/*
 *  Copyright (C) 2021-25 Universität zu Köln
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


import * as ParagraphStyle from "./ParagraphStyle.js";
import * as MarkType from "./MarkType.js";

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
   * If empty or undefined, the typesetter will use the default font style.
   */
  fontStyle?: string;
  /**
   * The font weight, for example 'normal' or 'bold'.
   * If empty or undefined, the typesetter will use the default font weight.
   */
  fontWeight?: string;
  /**
   * The text's vertical alignment, for example 'baseline', 'subscript' or 'superscript'.
   * if empty or undefined, the typesetter will use the default vertical alignment.
   */
  verticalAlign?: string;
  /**
   * Font size in ems (i.e., relative to a default font size)
   * if empty or undefined, the typesetter will use the default font size (that is,
   * fontSize will be considered to be 1)
   */
  fontSize?: number;
  /**
   * Space separated list of strings representing display classes defined in a typesetter.
   */
  classList?: string;
  /*
   * The text's direction: 'ltr' or 'rtl'
   * If undefined or an empty string, the typesetter may use the default direction or
   * infer it from the text.
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
   * in case a width is not specified.
   */
  space?: string;
  /**
   * The glue base width in pixels.
   *
   * If negative or undefined, defaults to a standard width or to the style given in ``space``
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
 * A  mark, for example an icon, a symbol, a paragraph break, etc.
 *
 * The typesetter may or may not display anything.
 */
export interface FmtTextMarkToken {
  type: 'mark';
  /**
   * The type of the mark, for example 'paragraph', 'footnote', 'icon', 'symbol', etc..
   */
  markType: string;
  /**
   * The mark's style.
   *
   * For example a paragraph mark may have a style like 'h1' or 'h2'. An icon
   * might have a style like 'icon-1' or 'icon-2'.
   */
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

export type CompactFmtText = (FmtTextToken | string)[] | string;

export function newTextToken(text: string): FmtTextTextToken {
  return {
    type: 'text', text: text,
  };
}

export function newGlueToken(width: number = -1, stretch: number = 0, shrink: number = 0): FmtTextGlueToken {
  const token: FmtTextGlueToken = {type: 'glue'};
  if (width >= 0) {
    token.width = width;
  }
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

export function newParagraphMark(style = ParagraphStyle.NORMAL): FmtTextMarkToken {
  return newMarkToken(MarkType.PARAGRAPH, style);
}



export function getPlainText(fmtText: FmtText): string {
  function getTokenPlainText(token: FmtTextToken): string {
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

  return fmtText.map(t => getTokenPlainText(t)).join('');
}


export function fromString(str: string): FmtText {
  let currentWord = '';
  const fmtText: FmtText = [];
  const spaceChars = [' ', '\n', '\t'];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (spaceChars.includes(char)) {
      if (currentWord !== '') {
        fmtText.push(newTextToken(currentWord));
        currentWord = '';
      }
      fmtText.push(newGlueToken());
    } else {
      currentWord += char;
    }
  }
  if (currentWord !== '') {
    fmtText.push(newTextToken(currentWord));
  }
  return fmtText;
}

export function fromCompactFmtText(input: CompactFmtText): FmtText {
  if (typeof input === 'string') {
    return fromString(input);
  }
  if (input.length === 0) {
    return [];
  }
  const fmtText: FmtText = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (typeof item === 'string') {
      fmtText.push(...fromString(item));
    } else {
      fmtText.push(item);
    }
  }
  return fmtText;
}


/**
 * Normalizes a token by removing all empty properties.
 * @param token
 */
export function getNormalizedToken<T extends FmtTextToken>(token: T): T {

  function getNormalizedEmptyToken(): FmtTextEmptyToken {
    return {type: "empty"};
  }

  function getNormalizedTextToken(token: FmtTextTextToken): FmtTextTextToken {
    const normalizedToken = newTextToken(token.text);
    if (token.fontSize !== undefined && token.fontSize !== 1) {
      normalizedToken.fontSize = token.fontSize;
    }
    if (token.fontStyle !== undefined && token.fontStyle !== '') {
      normalizedToken.fontStyle = token.fontStyle;
    }
    if (token.fontWeight !== undefined && token.fontWeight !== '') {
      normalizedToken.fontWeight = token.fontWeight;
    }
    if (token.verticalAlign !== undefined && token.verticalAlign !== '') {
      normalizedToken.verticalAlign = token.verticalAlign;
    }
    if (token.textDirection !== undefined && token.textDirection !== '') {
      normalizedToken.textDirection = token.textDirection;
    }
    if (token.classList !== undefined) {
      const theClassList = token.classList.replace(/^\s+/, '').replace(/\s+$/, '');
      if (theClassList !== '') {
        normalizedToken.classList = theClassList;
      }
    }
    return normalizedToken;
  }

  function getNormalizedGlueToken(token: FmtTextGlueToken): FmtTextGlueToken {
    const normalizedToken = newGlueToken();
    if (token.space !== undefined && token.space !== '') {
      normalizedToken.space = token.space;
    }
    if (token.width !== undefined && token.width >= 0) {
      normalizedToken.width = token.width;
    }
    if (token.shrink !== undefined && token.shrink !== 0) {
      normalizedToken.shrink = token.shrink;
    }
    if (token.stretch !== undefined && token.stretch !== 0) {
      normalizedToken.stretch = token.stretch;
    }
    return normalizedToken;
  }

  function getNormalizedMarkToken(token: FmtTextMarkToken): FmtTextMarkToken {
    const retMark = newMarkToken(token.markType);
    if (token.style !== undefined && token.style !== '') {
      retMark.style = token.style;
    }
    return retMark;
  }

  switch (token.type) {
    case "empty":
      return getNormalizedEmptyToken() as T;

    case "text":
      return getNormalizedTextToken(token) as T;

    case "glue":
      return getNormalizedGlueToken(token) as T;

    case "mark":
      return getNormalizedMarkToken(token) as T;
  }
}

/**
 * Normalizes a FmtText by removing all empty properties from all tokens.
 *
 * The result is a new FmtText object with exactly the same number of tokens as the input.
 * @param fmtText
 */
export function getNormalizedFmtText(fmtText: FmtText): FmtText {
  return fmtText.map(t => getNormalizedToken(t));
}

/**
 * Returns a new FmtText with normalized tokens and empty tokens removed.
 *
 * Empty tokens are:
 *  - tokens with type 'empty'
 *  - tokens with type 'text' and text === ''
 *  - tokens with type 'glue' and width === 0
 *  - tokens with type 'mark' and markType === ''
 *
 * @param fmtText
 */
export function getCleanFmtText(fmtText: FmtText): FmtText {
  return getNormalizedFmtText(fmtText)
  .filter(t => t.type !== 'empty')
  .filter(t => t.type !== 'text' || t.text !== '')
  .filter(t => t.type !== 'glue' || t.width !== 0)
  .filter(t => t.type !== 'mark' || t.markType !== '');
}

export function toCompactFmtText(fmtText: FmtText): CompactFmtText {

  function getCompactTextToken(token: FmtTextTextToken): string | FmtTextTextToken {
    if (token.text === '') {
      return '';
    }
    if (token.fontStyle === undefined && token.fontWeight === undefined && token.verticalAlign === undefined && token.fontSize === undefined && token.classList === undefined && token.textDirection === undefined) {
      return token.text;
    }
    return token;
  }

  function getCompactGlueToken(token: FmtTextGlueToken): string | FmtTextGlueToken {
    if (token.width === 0) {
      return '';
    }
    if (token.space === undefined && token.stretch === undefined && token.shrink === undefined) {
      return ' ';
    }
    return token;
  }

  const cleanFmtText = getCleanFmtText(fmtText);


  const compactedFmtText: (string | FmtTextToken)[] = cleanFmtText.map(t => {
    switch (t.type) {
      case "empty":
        return '';
      case 'text':
        return getCompactTextToken(t);
      case 'glue':
        return getCompactGlueToken(t);
      case 'mark':
        return t;
    }
  });

  const compactedArray: (string | FmtTextToken)[] = [];
  let currentConsolidatedString = '';

  for (let i = 0; i < compactedFmtText.length; i++) {
    const item = compactedFmtText[i];
    if (typeof item === 'string') {
      currentConsolidatedString += item;
    } else {
      if (currentConsolidatedString !== '') {
        compactedArray.push(currentConsolidatedString);
        currentConsolidatedString = '';
      }
      compactedArray.push(item);
    }
  }
  if (currentConsolidatedString !== '') {
    compactedArray.push(currentConsolidatedString);
  }
  if (compactedArray.length === 0) {
    return '';
  }
  if (compactedArray.length === 1 && typeof compactedArray[0] === 'string') {
    return compactedArray[0];
  }
  return compactedArray;
}