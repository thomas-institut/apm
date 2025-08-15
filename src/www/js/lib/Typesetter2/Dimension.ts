// noinspection ES6PreferShortImport

import {trimWhiteSpace} from '../../toolbox/Util.mjs';
import {Typesetter2} from './Typesetter2.js';


export class Dimension {

  /**
   * Parse
   * @param {any}someVariable
   * @return{[number, string]}
   */
  static parse(someVariable: any): [number, string] {
    if (someVariable === undefined) {
      return [0, 'px'];
    }
    if (typeof someVariable === 'number') {
      return [someVariable, 'px'];
    }
    let str = trimWhiteSpace(String(someVariable));
    // console.log(`String to parse: '${str}'`)
    let unit = 'px';
    let fields = str.split(' ');
    // console.log(`Fields`)
    // console.log(fields)
    if (fields.length > 1) {
      unit = fields[1];
    }
    let value = parseFloat(fields[0]);
    return [value, unit];
  }

  /**
   *
   * @param {any}someVariable
   * @param {number}emSize
   * @param {number}spaceSize
   */
  static str2px(someVariable: any, emSize: number = 0, spaceSize: number = 0) {
    let [value, unit] = this.parse(someVariable);
    return this.valueUnit2px(value, unit, emSize, spaceSize);
  }

  static str2pt(someVariable: any, emSize = 0, spaceSize = 0) {
    return Typesetter2.px2pt(this.str2px(someVariable, emSize, spaceSize));
  }

  static str2cm(someVariable: any, emSize = 0, spaceSize = 0) {
    return Typesetter2.px2cm(this.str2px(someVariable, emSize, spaceSize));
  }

  /**
   * Returns the pixel value of a dimension
   *
   * For example "2em" returns 2*emSize
   *
   * @param someVariable
   * @param emSize in pixels
   * @param spaceSize in pixels
   * @return {number}
   */
  static getPixelValue(someVariable: any, emSize: number, spaceSize = emSize * 0.25): number {
    let [value, unit] = this.parse(someVariable);
    return this.valueUnit2px(value, unit, emSize, spaceSize);
  }


  /**
   *
   * @param {number}value
   * @param {string}unit
   * @param {number}emSize
   * @param {number}spaceSize
   * @return {number}
   */
  static valueUnit2px(value: number, unit: string, emSize: number = 0, spaceSize: number = 0): number {
    switch (unit) {
      case 'px':
        return value;

      case 'pt':
      case 'pts':
        return this.pt2px(value);

      case 'cm':
      case 'cms':
        return this.cm2px(value);

      case 'mm':
      case 'mms':
        return this.cm2px(value / 10);

      case 'em':
      case 'ems':
        return emSize * value;

      case 'sp':
        if (spaceSize === 0) {
          console.warn(`Space size is zero when converting value to pixel dimension: ${value}`);
        }
        return spaceSize * value;

      default:
        console.warn(`Invalid unit '${unit}'`);
        return -1;
    }
  }

  static cm2px(cm: number): number {
    return cm * 37.795275590551184; //   = mm * 96 [px/in] / 2.54 [cm/in]
  }

  static px2cm(px: number): number {
    return px / 37.795275590551184; //   = px * 1/96 [in/px] * 2.54 [cm/in]
  }

  static pt2px(pt: number): number {
    return pt * 4 / 3;  // = pt * 72 [pt/in] *  1/96 [in/px]
  }

  static px2pt(px: number): number {
    return px * 3 / 4;
  }

}