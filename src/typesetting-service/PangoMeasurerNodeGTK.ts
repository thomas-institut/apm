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


// @ts-ignore
import GI from 'node-gtk/lib/index.js';
import {PangoMeasurements, PangoMeasurer} from './PangoMeasurer.js';
import {Typesetter2} from '../www/js/Typesetter2/Typesetter2.mjs';
import {TextBox} from '../www/js/Typesetter2/TextBox.js';

const Cairo = GI.require('cairo');
const Pango = GI.require('Pango');
const PangoCairo = GI.require('PangoCairo');

const measuringScale = 1000;

interface Extents {
  ink: any;
  logical: any;
  baseline: any;
}

export class PangoMeasurerNodeGTK extends PangoMeasurer {
  private readonly ctx: any;
  private layout: any;

  constructor() {
    super();
    const surface = new Cairo.ImageSurface(Cairo.Format.RGB24, 300, 300);
    this.ctx = new Cairo.Context(surface);
    this.layout = PangoCairo.createLayout(this.ctx);
    this.debug = false;
  }

  measureText(text: string, fontDescr: string): Extents {
    const fd = Pango.fontDescriptionFromString(fontDescr);
    this.layout.setFontDescription(fd);
    this.layout.setText(text);
    let extents = this.layout.getExtents();
    return {ink: extents[0], logical: extents[1], baseline: this.layout.getBaseline()};
  }

  getStats() {
    return {};
  }

  getPangoMeasurements(textBox: TextBox): Promise<PangoMeasurements> {
    let fontDesc = `${textBox.getFontFamily()} ${textBox.getFontWeight()} ${textBox.getFontStyle()} ${Typesetter2.px2pt(textBox.getFontSize()) * measuringScale}`;
    let extents = this.measureText(textBox.getText(), fontDesc);

    let divisor = Pango.SCALE * measuringScale;
    let measurements: PangoMeasurements = {
      fontSize: textBox.getFontSize(),
      width: extents.logical.width / divisor,
      height: extents.logical.height / divisor,
      baseline: extents.baseline / divisor,
      blToFsRatio: extents.baseline / (divisor * textBox.getFontSize()),
      inkHeight: extents.ink.height / divisor,
      inkToBaseLineRatio: extents.ink.height / extents.baseline
    };
    return Promise.resolve(measurements);
  }

}