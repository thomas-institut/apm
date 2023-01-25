/*
 *  Copyright (C) 2023 Universität zu Köln
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


import { FmtTextFactory } from '../FmtText/FmtTextFactory.mjs'
import * as SubEntryPartType from './SubEntryPartType.mjs'

export class SubEntryPart {

  constructor () {
    this.type = SubEntryPartType.EMPTY
  }

  setText(fmtText) {
    this.type = SubEntryPartType.TEXT
    this.fmtText = FmtTextFactory.fromAnything(fmtText)
    return this
  }

  setSigla(witnessData) {
    this.type = SubEntryPartType.SIGLA
    this.witnessData = witnessData
    return this
  }
}