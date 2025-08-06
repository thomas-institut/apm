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


import { TextBoxMeasurer } from '../www/js/Typesetter2/TextBoxMeasurer/TextBoxMeasurer.js'
import {TextBox} from "../www/js/Typesetter2/TextBox";


export interface PangoMeasurements {
  width: number;
  height: number;
  fontSize?: number;
  baseline?: number;
  blToFsRatio?: number;
  inkHeight?: number;
  inkToBaseLineRatio?: number;
}
export class PangoMeasurer extends TextBoxMeasurer {
  private cache: Map<any, any>;
  private cacheHits: number;
  private realMeasurements: number;
  protected debug: boolean;

  constructor () {
    super();
    this.cache = new Map();
    this.cacheHits = 0
    this.realMeasurements = 0
    this.debug = false
  }
  private getCacheKeyForTextBox(textBox: TextBox): string {
    return `${textBox.getText()}${textBox.getFontFamily()}${textBox.getFontSize()}${textBox.getFontWeight()}${textBox.getFontStyle()}`
  }

  async getBoxHeight (textBox: TextBox): Promise<number> {
    let measurements = await this.getMeasurements(textBox);
    return measurements.baseline ?? -1;
  }

  getMeasurements (textBox: TextBox): Promise<PangoMeasurements> {
    let cacheKey = this. getCacheKeyForTextBox(textBox);
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      return Promise.resolve(this.cache.get(cacheKey));
    }
    this.realMeasurements++;
    return new Promise ( (resolve) => {
      this.getPangoMeasurements(textBox).then((measurements) => {
        this.cache.set(cacheKey, measurements);
        resolve(measurements);
      })
    })
  }



  async getBoxWidth (textBox: TextBox): Promise<number> {
    let measurements = await this.getMeasurements(textBox);
    return measurements.width
  }

  protected getPangoMeasurements(_textBox: TextBox) : Promise<PangoMeasurements> {
    return Promise.resolve({width: -1, height: -1});
  }
}