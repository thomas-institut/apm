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


import {QuillDelta} from "@/lib/types/Quill";
import {FmtText} from "@/lib/FmtText/FmtText";


export interface QuillDeltaConverterOptions {
  verbose?: boolean,
  debug?: boolean,
  ignoreParagraphs?: boolean
}

export class QuillDeltaConverter {
  protected verbose: boolean;
  protected debug: boolean;
  protected ignoreParagraphs: boolean;

  constructor(options: QuillDeltaConverterOptions = {}) {
    this.ignoreParagraphs = options.ignoreParagraphs ?? true;
    this.verbose = options.verbose ?? false;
    this.debug = options.debug ?? false;
    if (this.debug) {
      this.verbose = true;
    }
  }

  toFmtText(_quillDelta: QuillDelta): FmtText {
    return [];
  }

}