/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
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
  