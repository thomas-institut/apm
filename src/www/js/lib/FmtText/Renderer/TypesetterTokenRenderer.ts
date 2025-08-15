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

import {FmtTextRenderer} from './FmtTextRenderer';
import * as FmtTokenType from '../FmtTextTokenType';
import {TypesetterToken} from '@/Typesetter/TypesetterToken';
import {TypesetterTokenFactory} from '@/Typesetter/TypesetterTokenFactory';
import * as FontStyle from '../FontStyle';
import * as FontWeight from '../FontWeight';
import * as VerticalAlign from '../VerticalAlign';

import {OptionsChecker} from '@thomas-inst/optionschecker';
import {FmtTextToken} from "@/lib/FmtText/FmtTextToken.js";

const superScriptFontSize = 0.58;
const subScriptFontSize = 0.58;

export class TypesetterTokenRenderer extends FmtTextRenderer {
  private options: any;

  constructor(options = {}) {
    super();
    let optionsSpec = {
      normalFontSize: {type: 'number', default: 12},
    };

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context: 'FmtText Html Renderer'});

    this.options = oc.getCleanOptions(options);
  }


  render(fmtText: FmtTextToken[], lang = ''): TypesetterToken[] {
    // console.log(`Rendering fmtText as Typesetter2 tokens`)

    return fmtText.filter((t) => {
      return t.type !== FmtTokenType.EMPTY;
    }).map((fmtTextToken): TypesetterToken => {
      switch (fmtTextToken.type) {
        case FmtTokenType.GLUE:
          if (typeof fmtTextToken.space === 'number' || fmtTextToken.space === undefined) {
            // This is to deal with old fmtText, where normal was coded as space -1
            return (new TypesetterToken()).setSpace('normal');
          }
          if (fmtTextToken.space !== '') {
            return (new TypesetterToken()).setSpace(fmtTextToken.space);
          } else {
            return (new TypesetterToken()).setGlue(fmtTextToken.width ?? 0.2, fmtTextToken.stretch, fmtTextToken.shrink);
          }

        case FmtTokenType.TEXT:
          let ttToken = TypesetterTokenFactory.simpleText(fmtTextToken.text ?? '', lang);
          if (fmtTextToken.fontStyle === FontStyle.ITALIC) {
            ttToken.setItalic();
          }
          if (fmtTextToken.fontWeight === FontWeight.BOLD) {
            ttToken.setBold();
          }
          // TODO: deal properly with font sizes
          if (fmtTextToken.fontSize !== undefined && fmtTextToken.fontSize < 1) {
            ttToken.setFontSize(fmtTextToken.fontSize * this.options.normalFontSize);
          } else {
            ttToken.setFontSize(this.options.normalFontSize);
          }

          if (fmtTextToken.verticalAlign === VerticalAlign.SUPERSCRIPT) {
            ttToken.setVerticalAlign('superscript');
            ttToken.setFontSize(superScriptFontSize);
          }

          if (fmtTextToken.verticalAlign === VerticalAlign.SUBSCRIPT) {
            ttToken.setVerticalAlign('subscript');
            ttToken.setFontSize(subScriptFontSize);
          }

          return ttToken;


        default:
          throw new Error('Unknown token type');
      }
    });
  }

}