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


import {Edition} from '../Edition.js';

export interface EditionGeneratorOptions {
  verbose?: boolean;
  debug?: boolean;
}

export class EditionGenerator {
  protected verbose: boolean;
  protected debug: boolean;

  constructor(options: EditionGeneratorOptions) {

    const defaultOptions = {
      verbose: false,
      debug: false
    };

    let cleanOptions = {...defaultOptions, ...options};
    this.verbose = cleanOptions.verbose;
    this.debug = cleanOptions.debug;
    if (this.debug) {
      this.verbose = true;
    }
  }

  generateEdition(): Edition {
    return new Edition();
  }
}