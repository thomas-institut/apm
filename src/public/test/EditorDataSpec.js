/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/* global expect, EditorData, ELEMENT_LINE, ITEM_TEXT, ELEMENT_CUSTODES, ELEMENT_HEAD, ELEMENT_LINE_GAP, ELEMENT_PAGE_NUMBER, ELEMENT_GLOSS, ELEMENT_ADDITION, ELEMENT_NOTE_MARK */

describe("EditorData", function() {

    
//  beforeEach(function() {
//
//  })
  
  describe("getApiDataFromQuillDelta", function (){
    
    let editorInfo = { 
      pageId: 100, 
      columnNumber: 1, 
      lang: 'la', 
      editorId: 200, 
      handId: 1, 
      edNotes: [], 
      people: []
    }
    
    it("should return empty arrays on empty delta", function (){
      let emptyDelta = {ops:[]}
      let apiData = EditorData.getApiDataFromQuillDelta( emptyDelta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
    })
    
    it("should return simple lines and text on bare text inserts", function () {
      let bareTextDelta = { 
        ops: [ 
          {insert: 'Line 1\nLine 2\nLine 3\n'}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( bareTextDelta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(3)
      let i = 0
      for (const ele of apiData.elements) {
        expect(ele.type).toBe(ELEMENT_LINE)
        expect(ele.items.length).toBe(1)
        let item = ele.items[0]
        expect(item.type).toBe(ITEM_TEXT)
        expect(item.theText).toBe('Line ' + (i+1))
        expect(item.lang).toBe(editorInfo.defaultLang)
        i++
      }
    })
      
    it("should support head elements (type " + ELEMENT_HEAD + ")", function () {
      let delta = {  
        ops: [ 
          {insert: 'Text'},
          {attributes: {head:true}, insert:"\n"}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_HEAD)
      expect(ele.items.length).toBe(1)
      let item = ele.items[0]
      expect(item.type).toBe(ITEM_TEXT)
      expect(item.theText).toBe('Text')
      expect(item.lang).toBe(editorInfo.defaultLang)
    })
    
    it("should support gloss elements(type " + ELEMENT_GLOSS + ")", function () {
      let gElementId = 100
      let gPlace = 'margin top'
      let delta = { 
        ops: [ 
          {insert: 'Text'},
          {attributes: {gloss: {elementId: gElementId, place: gPlace}}, insert:"\n"}
        ]
      }
       let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_GLOSS)
      expect(ele.placement).toBe(gPlace)
      expect(ele.items.length).toBe(1)
      let item = ele.items[0]
      expect(item.type).toBe(ITEM_TEXT)
      expect(item.theText).toBe('Text')
      expect(item.lang).toBe(editorInfo.defaultLang)
    })
    
    it("should support page number elements(type " + ELEMENT_PAGE_NUMBER + ")", function () {
      let delta = { 
        ops: [ 
          {insert: 'Text'},
          {attributes: {pagenumber:true}, insert:"\n"}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_PAGE_NUMBER)
      expect(ele.items.length).toBe(1)
      let item = ele.items[0]
      expect(item.type).toBe(ITEM_TEXT)
      expect(item.theText).toBe('Text')
      expect(item.lang).toBe(editorInfo.defaultLang)
    })
    
    it("should support custodes elements (type " + ELEMENT_CUSTODES + ")", function () {
      let delta = { 
        ops: [ 
          {insert: 'Text'},
          {attributes: {custodes:true}, insert:"\n"}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_CUSTODES)
      expect(ele.items.length).toBe(1)
      let item = ele.items[0]
      expect(item.type).toBe(ITEM_TEXT)
      expect(item.theText).toBe('Text')
      expect(item.lang).toBe(editorInfo.defaultLang)
    })
    
    it("note mark elements NOT supported yet (type " + ELEMENT_NOTE_MARK + ")", function () {
      expect(true).toBe(true)
    })
    
    it("should not support addition elements(type " + ELEMENT_ADDITION + ")", function () {
      let aElementId = 100
      let aPlace = 'margin top'
      let aTarget = 100
      let delta = { 
        ops: [ 
          {insert: 'Text'},
          {attributes: {additionelement: {elementId: aElementId, place: aPlace, target: aTarget}}, insert:"\n"}
        ]
      }
       let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_ADDITION)
      expect(ele.placement).toBe(aPlace)
      expect(ele.reference).toBe(aTarget)
      expect(ele.items.length).toBe(1)
      let item = ele.items[0]
      expect(item.type).toBe(ITEM_TEXT)
      expect(item.theText).toBe('Text')
      expect(item.lang).toBe(editorInfo.defaultLang)
    })
    
    
    it("should support line gap elements(type " + ELEMENT_LINE_GAP + ")", function () {
      let lgEditorId = 1
      let lgLineCount = 5
      let delta = { 
        ops: [ 
          {insert:{linegap:{editorid:lgEditorId,linecount:lgLineCount}}},
          {insert:"\n"}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele = apiData.elements[0]
      expect(ele.type).toBe(ELEMENT_LINE_GAP)
      expect(ele.reference).toBe(lgLineCount)
      expect(ele.items.length).toBe(0)
    })
      
  })
    
})
  

  