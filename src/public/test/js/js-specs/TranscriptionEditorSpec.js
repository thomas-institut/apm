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

/* global TranscriptionEditor, expect */

describe("TranscriptionEditor", function() {

//  beforeEach(function() {
//
//  })
  
  describe("getMainLang", function (){
    it("should return false on empty counts", function (){
      let mainLang = TranscriptionEditor.getMainLanguage([])
      expect(mainLang).toBe(false)
    })
    
    it("should return false on zero counts", function (){
      let mainLang = TranscriptionEditor.getMainLanguage({la:0, he:0, ar:0})
      expect(mainLang).toBe(false)
    })
    
    it("should return 'la' ", function (){
      let mainLang = TranscriptionEditor.getMainLanguage({la:5, he:3, ar:3})
      expect(mainLang).toBe('la')
    })
    
    it("should return 'ar' ", function (){
      let mainLang = TranscriptionEditor.getMainLanguage({la:3, he:3, ar:5})
      expect(mainLang).toBe('ar')
    })
    
    it("should return 'he' ", function (){
      let mainLang = TranscriptionEditor.getMainLanguage({la:3, he:5, ar:3})
      expect(mainLang).toBe('he')
    })
  })
  
})
  