// noinspection ES6PreferShortImport

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

import {defaultStyleSheet, Glue} from '@thomas-inst/typesetter';
import {StyleSheet, StyleSheetDefinition} from '@thomas-inst/typesetter';
import {TextBoxMeasurer} from '@thomas-inst/typesetter';
import {
  AsyncFmtTextRenderer,
  FmtText,
  FONT_STYLE_ITALIC,
  FONT_WEIGHT_BOLD,
  TOKEN_TYPE_EMPTY,
  TOKEN_TYPE_GLUE,
  TOKEN_TYPE_TEXT,
  VALIGN_BASELINE,
  VALIGN_SUBSCRIPT,
  VALIGN_SUPERSCRIPT
} from '@thomas-inst/fmt-text';
import {TextBox} from '@thomas-inst/typesetter';
import {ObjectFactory} from '@thomas-inst/typesetter';
import {TypesetterItem} from "@thomas-inst/typesetter";

export interface Typesetter2StyleSheetTokenRendererOptions {
  styleSheet: StyleSheetDefinition;
  textBoxMeasurer: TextBoxMeasurer;
  defaultTextDirection: string;
  debug?: boolean;
}

export class Typesetter2StyleSheetTokenRenderer extends AsyncFmtTextRenderer {
  private options: Required<Typesetter2StyleSheetTokenRendererOptions>;
  private ss: StyleSheet;

  constructor(options: Typesetter2StyleSheetTokenRendererOptions) {
    super();

    this.options = {
      styleSheet: options.styleSheet ?? defaultStyleSheet,
      textBoxMeasurer: options.textBoxMeasurer,
      defaultTextDirection: options.defaultTextDirection,
      debug: options.debug ?? true
    };

    // this.options = oc.getCleanOptions(options);
    this.ss = new StyleSheet(this.options.styleSheet);

  }


  renderWithStyle(fmtText: FmtText, styleNames: string | string[]): Promise<TypesetterItem[]> {
    return new Promise(async (resolve) => {
      let items = [];
      for (let tokenIndex = 0; tokenIndex < fmtText.length; tokenIndex++) {
        let token = fmtText[tokenIndex];
        if (token.type === TOKEN_TYPE_EMPTY) {
          continue;
        }
        switch (token.type) {
          case TOKEN_TYPE_GLUE:
            let glueItem = await this.ss.apply(new Glue(), styleNames) as Glue;
            // token.space  controls glue, if it is a string other than '' then
            // glue should be set according to the named style given by it. However, this is not
            // actually implemented or used right now. An empty string in token.space
            // means that the glue's parameters should be set with the values given by the token's
            // width, stretch and shrink members
            if (token.space === '') {
              glueItem.setWidth(token.width ?? 0).setStretch(token.stretch ?? 0).setShrink(token.shrink ?? 0);
            }
            items.push(glueItem);
            break;

          case TOKEN_TYPE_TEXT:
            let textBox = await this.ss.apply((new TextBox().setText(token.text)), styleNames);

            if (token.fontStyle === FONT_STYLE_ITALIC) {
              textBox.setFontStyle('italic');
            }
            if (token.fontWeight === FONT_WEIGHT_BOLD) {
              textBox.setFontWeight('bold');
            }
            if ((token.fontSize ?? 1) < 1 && (token.verticalAlign === undefined || token.verticalAlign === VALIGN_BASELINE)) {
              // console.log(`Setting font size ${token.fontSize}`)
              textBox.setFontSize(textBox.getFontSize() * (token.fontSize ?? 1));
              // console.log(textBox)
            }
            if (token.verticalAlign === VALIGN_SUPERSCRIPT) {
              // console.log(`Setting superscript`)
              textBox = await this.ss.apply(textBox, 'superscript');
              // console.log(textBox)
            }
            if (token.verticalAlign === VALIGN_SUBSCRIPT) {
              textBox = await this.ss.apply(textBox, 'subscript');
            }
            // apply classes
            // TODO: make this generic, for now this will take care of sigla
            if (token.classList !== undefined && token.classList !== '') {
              let classes = token.classList.split(' ');
              if (classes.indexOf('sigla') !== -1) {
                // SIGLA class
                textBox = await this.ss.apply(textBox, 'sigla');
                textBox.setTextDirection(this.options.defaultTextDirection);
              }
            }
            items.push(textBox);
        }
      }
      // At this point we have a 1 to 1 mapping of the fmtText item into Typesetter items,
      // we need to split the text boxes so that each initial and final punctuation character gets its own box.
      // This is necessary for the Bidi algorithm to properly work
      let outputItems: TypesetterItem[] = [];
      items.forEach((item) => {
        if (item instanceof TextBox) {
          outputItems.push(...this.expandTextBox(item));
        } else {
          outputItems.push(item);
        }
      });
      resolve(outputItems);
    });
  }

  /**
   *
   * @param {TextBox}textBox
   * @return TextBox[]
   */
  expandTextBox(textBox: TextBox) {
    let theText = textBox.getText();
    if (theText === '' || theText.length === 1) {
      return [textBox];
    }
    const initials = ['(', '{'];
    const finals = [';', '.', ',', ')', '}'];

    let initialsChars = [];
    let finalsChars = [];

    for (let i = 0; i < theText.length; i++) {
      if (initials.includes(theText.charAt(i))) {
        initialsChars.push(theText.charAt(i));
      } else {
        break;
      }
    }

    for (let i = theText.length - 1; i >= 0; i--) {
      if (finals.includes(theText.charAt(i))) {
        finalsChars.unshift(theText.charAt(i));
      } else {
        break;
      }
    }
    if (initialsChars.length === 0 && finalsChars.length === 0) {
      return [textBox];
    }

    let parts = [];
    parts.push(...initialsChars);
    parts.push(theText.substring(initialsChars.length, theText.length - finalsChars.length));
    parts.push(...finalsChars);

    return this.buildTextBoxArrayFromStringArray(parts, textBox);
  }

  buildTextBoxArrayFromStringArray(stringArray: string[], seedTextBox: TextBox): TextBox[] {
    return stringArray.map((str) => {
      let tb = ObjectFactory.fromObject(seedTextBox.getExportObject()) as TextBox;
      tb.setText(str);
      return tb;
    });
  }

  render(fmtText: FmtText): Promise<TypesetterItem[]> {
    return this.renderWithStyle(fmtText, 'default');
  }
}