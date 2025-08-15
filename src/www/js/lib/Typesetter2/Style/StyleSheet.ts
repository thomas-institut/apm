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

import {Glue} from '../Glue.js';
import {TextBox} from '../TextBox.js';
import {Dimension} from '../Dimension.js';
import {deepGetValuesForKey} from '../../../toolbox/ObjectUtil.js';

const categories = ['strings', 'page', 'paragraph', 'text', 'glue'];

export interface StyleSheetDefinition {
  _metaData: Metadata;
  fontConversions?: FontConversionDefinitions;
  specialStrings?: SpecialStringsDef;
  default: StyleDef;
  latinText?: StyleDef;
  arabicText?: StyleDef;
  hebrewText?: StyleDef;
  greekText?: StyleDef;
  normal?: StyleDef;
  small?: StyleDef;
  superscript?: StyleDef;
  subscript?: StyleDef;
  apparatus?: StyleDef;
  marginalia?: StyleDef;

  [key: string]: StyleDef | Metadata | FontConversionDefinitions | SpecialStringsDef | undefined;
}

interface FontConversionDefinition {
  from: any;
  to: any;
}

type FontConversionDefinitions = FontConversionDefinition[];

interface Metadata {
  name: string;
  description: string;
}

interface SpecialStringDef {
  string: string;
  fontFamily: string;
}

type SpecialStringsDef = SpecialStringDef[];

export interface StyleDef {
  parent?: string;
  strings?: any;
  page?: PageStyleDef;
  paragraph?: ParagraphStyleDef;
  text?: TextStyleDef;
  glue?: GlueStyleDef;
}

export interface TextStyleDef {
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  fontSize?: string;
  shiftY?: string;
}

export interface ParagraphStyleDef {
  lineSkip?: string;
  indent?: string;
  spaceBefore?: string;
  spaceAfter?: string;
  align?: string;

}

export interface GlueStyleDef {
  width?: string;
  stretch?: string;
  shrink?: string;
}

export interface PageStyleDef {
  width?: string,
  height?: string,
  marginTop?: string,
  marginLeft?: string,
  marginBottom?: string,
  marginRight?: string,
  minDistanceFromApparatusToText?: string,
  minInterApparatusDistance?: string,
  lineNumbers?: 'arabic' | 'western' | 'none',
  lineNumbersToTextDistance?: string,
  lineNumbersFontSize?: string,
  lineNumbersPosition?: string,
  resetLineNumbersEachPage?: boolean
}


export class StyleSheet {
  private readonly styles: StyleSheetDefinition;
  private names: string[];
  private readonly fontConversionDefinitions: FontConversionDefinitions;
  private readonly specialStrings: SpecialStringsDef;


  constructor(styleSheetDef: StyleSheetDefinition) {
    this.styles = styleSheetDef;
    if (this.styles === undefined) {
      console.error('Undefined styles!!!');
    }
    this.names = this.getNameArray(this.styles);
    this.fontConversionDefinitions = this.styles.fontConversions ?? [];
    this.specialStrings = this.styles.specialStrings ?? [];
  }

  getStrings(style = 'default') {
    let defaultStrings = this.getStyleDef(style).strings;
    return defaultStrings === undefined ? {} : defaultStrings;
  }

  /**
   * Returns an array with all the font families mentioned in the
   * stylesheet
   */
  getFontFamilies(): string[] {
    return deepGetValuesForKey(this.styles, 'fontFamily')
    .filter((family) => {
      return family !== '';
    })
    .filter((item, pos, theArray) => {
      return theArray.indexOf(item) === pos;
    });
  }

  merge(anotherStyleSheetDef: any) {
    Object.keys(anotherStyleSheetDef).forEach((styleName) => {
      this.__updateStyle(styleName, anotherStyleSheetDef[styleName]);
    });
    this.names = this.getNameArray(this.styles);
  }

  getStyleDefinitions() {
    return this.styles;
  }

  getFontConversionDefinitions() {
    return this.fontConversionDefinitions;
  }


  __updateStyle(styleName: string, styleDef: StyleDef) {
    if (this.styleExists(styleName)) {
      // merge
      let currentDef = this.getStyleDef(styleName);
      if (styleDef.parent !== undefined) {
        currentDef.parent = styleDef.parent;
      }
      categories.forEach((category) => {
        // @ts-expect-error Using def as object
        if (currentDef[category] !== undefined || styleDef[category] !== undefined) {
          // @ts-expect-error Using def as object
          currentDef[category] = this.mergeObjects(currentDef[category], styleDef[category]);
        }
      });
    } else {
      // add the style
      this.styles[styleName] = styleDef;
    }
  }

  apply<T>(item: T, styles: string | string[]): Promise<T> {
    return new Promise(async (resolve) => {
      let stylesToApply = this.getStylesToApply(styles);
      if (stylesToApply.length === 0) {
        stylesToApply = ['default'];
      }

      let styleDefs = stylesToApply.map((styleName) => {
        return this.getStyleDef(styleName);
      });
      let baseTextBox = new TextBox();

      for (let i = 0; i < styleDefs.length; i++) {
        let styleDef = styleDefs[i];
        if (item instanceof Glue) {
          [item as Glue, baseTextBox] = await this.applyStyleToGlue(item, styleDef, baseTextBox);
        } else if (item instanceof TextBox) {
          (item as TextBox) = await this.applyStyleToTextBox(item, styleDef);
        }
      }
      // Special characters that need specific font conversions
      if (item instanceof TextBox) {
        for (let i = 0; i < this.specialStrings.length; i++) {
          let specialString = this.specialStrings[i];
          if (item.getText() === specialString.string) {
            item.setFontFamily(specialString.fontFamily);
            break;
          }
        }
      }

      resolve(item);
    });
  }

  /**
   *
   * @param {Glue}glueItem
   * @param {{}}styleDef
   * @param {TextBox}baseTextBox
   * @return {Promise<[Glue, TextBox]>}
   */
  applyStyleToGlue(glueItem: Glue, styleDef: StyleDef, baseTextBox: TextBox): Promise<[Glue, TextBox]> {
    return new Promise(async (resolve) => {
      // first, apply the style to the base text box
      baseTextBox = await this.applyStyleToTextBox(baseTextBox, styleDef);
      if (styleDef.glue !== undefined) {
        // then set the glue
        let glueDef = styleDef.glue;
        if (glueDef.width !== undefined && glueDef.width !== '') {
          let pixelValue = Dimension.getPixelValue(glueDef.width, baseTextBox.getFontSize());
          glueItem.setWidth(pixelValue);
        }
        if (glueDef.stretch !== undefined && glueDef.stretch !== '') {
          let pixelValue = Dimension.getPixelValue(glueDef.stretch, baseTextBox.getFontSize());
          glueItem.setStretch(pixelValue);
        }
        if (glueDef.shrink !== undefined && glueDef.shrink !== '') {
          let pixelValue = Dimension.getPixelValue(glueDef.shrink, baseTextBox.getFontSize());
          glueItem.setShrink(pixelValue);
        }
      }
      resolve([glueItem, baseTextBox]);
    });
  }

  /**
   *
   * @param {TextBox}textBox
   * @param {{}}styleDef
   * @return {Promise<TextBox>}
   */
  applyStyleToTextBox(textBox: TextBox, styleDef: StyleDef): Promise<TextBox> {
    return new Promise(async (resolve) => {
      // this.debug && console.log(`Applying style to text box`)
      // this.debug && console.log(styleDef)
      // this.debug && console.log(textBox)
      if (styleDef.text !== undefined) {
        let fontDef = styleDef.text;
        if (fontDef.fontFamily !== undefined && fontDef.fontFamily !== '') {
          textBox.setFontFamily(fontDef.fontFamily);
        }
        if (fontDef.fontStyle !== undefined && fontDef.fontStyle !== '') {
          textBox.setFontStyle(fontDef.fontStyle);
        }
        if (fontDef.fontWeight !== undefined && fontDef.fontWeight !== '') {
          textBox.setFontWeight(fontDef.fontWeight);
        }
        if (fontDef.fontSize !== undefined && fontDef.fontSize !== '') {
          if (textBox.getText() === 'scripts') {
            console.log(`Changing font size text box, current font size = ${textBox.getFontSize()}`);
          }
          let newFontSize = Dimension.getPixelValue(fontDef.fontSize, textBox.getFontSize());
          textBox.setFontSize(newFontSize);
        }
        if (fontDef.shiftY !== undefined && fontDef.shiftY !== '') {
          let newShiftY = Dimension.getPixelValue(fontDef.shiftY, textBox.getFontSize());
          textBox.setShiftY(newShiftY);
        }
      }
      resolve(textBox);
    });
  }

  __getStyleAncestryLine(styleName: string): string[] {
    let line = [styleName];

    let styleDef = this.getStyleDef(styleName);
    if (styleDef !== undefined && styleDef.parent !== undefined && styleDef.parent !== '') {
      let parentAncestry = this.__getStyleAncestryLine(styleDef.parent);
      line = parentAncestry.concat(line);
    }
    return line;
  }

  /**
   *
   * @param {string}styleName
   * @return {boolean}
   */
  styleExists(styleName: string): boolean {
    return this.names.indexOf(styleName) !== -1;
  }

  getStyleDef(styleName: string): StyleDef {
    const def = this.styles[styleName];
    if (def === undefined) {
      console.warn(`Style '${styleName}' does not exist`);
      return {};
    }
    return def as StyleDef;
  }

  /**
   *
   * @param styles
   */
  getParagraphStyle(styles: string | string[]): Promise<ParagraphStyleDef> {
    return new Promise(async (resolve) => {
      let stylesToApply = this.getStylesToApply(styles);
      if (stylesToApply.length === 0) {
        stylesToApply = ['default'];
      }
      // this.debug && console.log(`Getting paragraph style, styles to apply:`)
      // this.debug && console.log(stylesToApply)
      let styleDefs = stylesToApply.map((styleName) => {
        return this.getStyleDef(styleName);
      });
      // this.debug && console.log(styleDefs)
      let baseTextBox = new TextBox();
      let paragraphStyle: ParagraphStyleDef = {};
      for (let i = 0; i < styleDefs.length; i++) {
        let styleDef = styleDefs[i];
        if (styleDef === undefined) {
          console.warn(`Undefined style found '${stylesToApply[i]}'`);
          continue;
        }
        [paragraphStyle, baseTextBox] = await this.applyStyleToParagraph(paragraphStyle, styleDef, baseTextBox);
      }
      resolve(paragraphStyle);
    });
  }

  applyStyleToParagraph(paragraphDef: ParagraphStyleDef, styleDef: StyleDef, baseTextBox: TextBox): Promise<[ParagraphStyleDef, TextBox]> {

    return new Promise(async (resolve) => {
      // first, apply the style to the base text box
      baseTextBox = await this.applyStyleToTextBox(baseTextBox, styleDef);
      if (styleDef.paragraph !== undefined) {
        // then set the glue
        let parDef = styleDef.paragraph;
        let dimensionFields = ['lineSkip', 'indent', 'spaceBefore', 'spaceAfter'];
        for (let i = 0; i < dimensionFields.length; i++) {
          let field = dimensionFields[i];
          // @ts-expect-error Using def as object
          if (parDef[field] !== undefined && parDef[field] !== '') {
            // @ts-expect-error Using def as object
            paragraphDef[field] = Dimension.getPixelValue(parDef[field], baseTextBox.getFontSize());
          }
        }
        if (parDef.align !== undefined && parDef.align !== '') {
          paragraphDef['align'] = parDef.align;
        }
      }
      resolve([paragraphDef, baseTextBox]);
    });
  }

  private mergeObjects(objA: { [key: string]: any }, objB: { [key: string]: any }) {
    let newObject: { [key: string]: any } = {};
    // first, copy all keys defined in objA
    if (objA !== undefined) {
      Object.keys(objA).forEach((key) => {
        newObject[key] = objA[key];
      });
    }
    // then, overwrite all those defined in objB
    if (objB !== undefined) {
      Object.keys(objB).forEach((key) => {
        newObject[key] = objB[key];
      });
    }
    return newObject;
  }

  private getNameArray(styleDefArray: any): string[] {
    return Object.keys(styleDefArray);
  }

  private getStylesToApply(styles: string | string[]) {
    let styleString;
    if (Array.isArray(styles)) {
      styleString = styles.join(' ');
    } else {
      styleString = styles;
    }
    //this.debug && console.log(`Style string: '${styleString}'`)

    let styleArray = styleString.split(' ').filter((styleName) => {
      let styleExists = this.styleExists(styleName);
      if (!styleExists) {
        console.warn(`Style '${styleName}' does not exist`);
      }
      return styleExists;
    });
    let stylesToApply: string[] = [];
    styleArray.forEach((styleName) => {
      stylesToApply = stylesToApply.concat(this.__getStyleAncestryLine(styleName));
    });
    return stylesToApply;
  }

}