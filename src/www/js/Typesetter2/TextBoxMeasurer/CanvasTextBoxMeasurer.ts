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

import {TextBoxMeasurer} from './TextBoxMeasurer';
import {BrowserUtilities} from '@/toolbox/BrowserUtilities';
import {FontBaselineInfo} from './FontBaselineInfo';
import {TextBox} from "@/Typesetter2/TextBox";


export class CanvasTextBoxMeasurer extends TextBoxMeasurer {
  private readonly useCache: boolean;
  private widthCache!: Map<string, number>;
  private cacheHits: number = 0;
  private realMeasurements: number = 0;
  private readonly debug: boolean;
  private canvas!: HTMLCanvasElement;

  constructor(useCache = true) {
    super();
    this.useCache = useCache;
    if (this.useCache) {
      this.widthCache = new Map();
      this.cacheHits = 0;
      this.realMeasurements = 0;
    }
    this.debug = false;
  }


  private getCacheKeyForTextBox(textBox: TextBox) {
    return `${textBox.getText()}${textBox.getFontFamily()}${textBox.getFontSize()}${textBox.getFontWeight()}${textBox.getFontStyle()}`;
  }

  getBoxWidth(textBox: TextBox): Promise<number> {
    if (this.useCache) {
      let cacheKey = this.getCacheKeyForTextBox(textBox);
      let cachedWidth = this.widthCache.get(cacheKey);
      if (cachedWidth !== undefined) {
        this.debug && console.log(`Getting width from cache`);
        this.cacheHits++;
        return Promise.resolve(cachedWidth);
      }
    }
    this.realMeasurements++;
    let context = this.getContext();
    if (context === null) {
      return Promise.reject('Could not get canvas context');
    }
    let fontWeight = textBox.getFontWeight() === '' ? 'normal' : textBox.getFontWeight();
    let fontStyle = textBox.getFontStyle() === '' ? 'normal' : textBox.getFontStyle();
    let fontVariant = 'normal';
    context.font = `${fontStyle} ${fontVariant} ${fontWeight} ${textBox.fontSize}px ${textBox.getFontFamily()}`;
    let metrics = context.measureText(textBox.text);
    return Promise.resolve(metrics.width);
  }

  getBoxHeight(token: any): Promise<number> {
    // use font data collected from Cairo so that canvas preview and PDF typesetting are almost identical
    return Promise.resolve(FontBaselineInfo.getBaseline(token.getFontFamily(), token.getFontSize()));
  }

  private getCanvas(): HTMLCanvasElement {
    if (this.canvas === undefined) {
      this.canvas = document.createElement("canvas");
      BrowserUtilities.setCanvasHiPDI(this.canvas, 100, 100);
    }
    return this.canvas;
  }

  private getContext() {
    return this.getCanvas().getContext("2d");
  }

}