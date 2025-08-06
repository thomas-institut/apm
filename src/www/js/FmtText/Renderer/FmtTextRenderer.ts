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

import { FmtTextToken } from '../FmtTextToken'
import {FmtTextUtil} from '../FmtTextUtil';

/**
 * Base class for FmtText renderers
 *
 */
export class FmtTextRenderer {

  /**
   * The render method can return anything.
   * The default is to return the plain text version of the text
   */
  render(fmtText: FmtTextToken[], lang = ''): any {
    return FmtTextUtil.getPlainText(fmtText)
  }

}