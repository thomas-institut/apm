/* 
 *  Copyright (C) 2019 Universität zu Köln
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

/* global ApmUtil, expect*/

describe("ApmUtil", function() {
  
  describe("API to JS glue code", function (){
    it("should convert languages array to langDef object", function (){
      let emptyLangArray = []
      expect(ApmUtil.getLangDefFromLanguagesArray(emptyLangArray)).toEqual({})
      
      let langArray1 = [ 
        { code: 'ar', name: 'Arabic', rtl: true, fontsize: 3},
        { code: 'la', name: 'Latin', rtl: false, fontsize: 3}
      ]
      let langDef1 = ApmUtil.getLangDefFromLanguagesArray(langArray1)
      expect(langDef1.ar).toBeDefined()
      expect(langDef1.ar).toEqual(langArray1[0])
      expect(langDef1.la).toBeDefined()
      expect(langDef1.la).toEqual(langArray1[1])
      
    })
  })
  
})
  