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

import { describe, expect, it } from 'vitest'
import { FmtTextToken } from '@/lib/FmtText/FmtTextToken.js'
import { FmtTextTokenFactory } from '@/lib/FmtText/FmtTextTokenFactory'
import * as FmtTextTokenType from '@/Edition/SubEntryPartType'



describe('FmtTextTokenFactory', ()=> {
    it("should build from token object", ()=>{
      const singleWordText = 'someText'
      let someToken = (new FmtTextToken()).setText(singleWordText)
      let newText = FmtTextTokenFactory.buildFromObject(someToken)
      expect(typeof newText).toBe('object')
      // expect(newText.getPlainText()).toBe(singleWordText)
    })

  it("should build from other object", ()=>{
    const singleWordText = 'someText'

    expect( () => { FmtTextTokenFactory.buildFromObject({text: singleWordText})}).toThrow()

    let newText = FmtTextTokenFactory.buildFromObject( { type: FmtTextTokenType.TEXT, text: singleWordText})
    expect(typeof newText).toBe('object')

    newText = FmtTextTokenFactory.buildFromObject( {
      type: FmtTextTokenType.TEXT,
      text: singleWordText,
      fontWeight: 'bold',
      fontStyle: 'italic',
      other: 'other'
    })
    expect(typeof newText).toBe('object')
    expect(newText.fontStyle).toBe('italic')
    expect(newText.fontWeight).toBe('bold')
    expect(newText.verticalAlign).toBe('')
    // @ts-expect-error Using array access on purpose on a non-existing property
    expect(newText['other'] === undefined).toBe(true)
  })

})