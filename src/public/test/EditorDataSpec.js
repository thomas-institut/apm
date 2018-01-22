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

/* global expect, EditorData, ELEMENT_LINE, ITEM_TEXT, ELEMENT_CUSTODES, ELEMENT_HEAD, ELEMENT_LINE_GAP, ELEMENT_PAGE_NUMBER, ELEMENT_GLOSS, ELEMENT_ADDITION, ELEMENT_NOTE_MARK, ITEM_RUBRIC, ITEM_GLIPH, ITEM_INITIAL, ITEM_SIC, ITEM_ABBREVIATION, ITEM_DELETION, ITEM_ADDITION, ITEM_UNCLEAR, ITEM_MARK, ITEM_NO_WORD_BREAK, ITEM_ILLEGIBLE, ITEM_CHUNK_MARK, TranscriptionEditor, ITEM_MATH_TEXT, ITEM_PARAGRAPH_MARK, ITEM_CHARACTER_GAP */

describe("EditorData", function() {

    
//  beforeEach(function() {
//
//  })
  
  describe("getApiDataFromQuillDelta", function (){
    
    let editorInfo = { 
      pageId: 100, 
      columnNumber: 1, 
      defaultLang: 'la', 
      editorId: 200, 
      handId: 1, 
      edNotes: [], 
      people: []
    }
    
    let basicBlockFormats = [ 
        { type: ELEMENT_LINE, lastInsert: { insert: '\n'} },
        { type: ELEMENT_HEAD, lastInsert: {attributes: {headelement:true}, insert:"\n"}},
        { type: ELEMENT_PAGE_NUMBER, lastInsert: {attributes: {pagenumber:true}, insert:"\n"}},
        { type: ELEMENT_CUSTODES, lastInsert: {attributes: {custodes:true}, insert:"\n"}},
        { type: ELEMENT_GLOSS, lastInsert: { attributes: {gloss:  {elementId: 500, place: 'margin left'}}, insert: '\n'}},
        { type: ELEMENT_ADDITION, lastInsert: { attributes: {additionelement:  {elementId: 500, place: 'margin left', target:102}}, insert: '\n'}}
    ]
    
    it("should return empty arrays on empty delta", function (){
      let emptyDelta = {ops:[]}
      let apiData = EditorData.getApiDataFromQuillDelta( emptyDelta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
    })
    
    it("should return simple lines and text on bare text inserts", function () {
      let someText = 'Line 1\nLine 2\nLine 3'
      let bareTextDelta = { 
        ops: [ 
          {insert: someText + '\n'}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta(bareTextDelta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1) 
      let text = ''
      for (const item of apiData.elements[0].items) {
        expect(item.type).toBe(ITEM_TEXT)
        expect(item.lang).toBe(editorInfo.defaultLang)
        text += item.theText
      }
      expect(text).toEqual(someText)
    })
    
    it("should handle mixed elements in inserts", function () {
      let someText = 'Line 1\nLine 2'
      let headText = 'Head'
      
      let bareTextDelta = { 
        ops: [ 
          {insert: someText + '\n' + headText},
          {insert: '\n', attributes: {headelement: true}}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta(bareTextDelta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(2) 
      
      let element0 = apiData.elements[0]
      expect(element0.type).toBe(ELEMENT_LINE)
      expect(element0.items.length).toBe(1)
      expect(element0.items[0].theText).toEqual(someText)
      expect(element0.items[0].lang).toBe(editorInfo.defaultLang)
      
      let element1 = apiData.elements[1]
      expect(element1.type).toBe(ELEMENT_HEAD)
      expect(element1.items.length).toBe(1)
      expect(element1.items[0].theText).toEqual(headText)
      expect(element1.items[0].lang).toBe(editorInfo.defaultLang)
      
    })
    
    
    it("should support simple textual items in all element types", function () {
      let delta = { 
        ops: [ 
          {attributes: { rubric: {itemid: 100}}, insert: 'some text'},
          {attributes: { initial: {itemid: 101}}, insert: 'some text'},
          {attributes: { gliph: {itemid: 102}}, insert: 'some text'},
          {attributes: { mathtext: {itemid: 103}}, insert: 'some text'},
          {attributes: { sic: {itemid: 104, correction: 'some expansion'}}, insert: 'some text'},
          {attributes: { abbr: {itemid: 105, expansion: 'some expansion'}}, insert: 'some text'},
          {attributes: { unclear: {itemid: 106, reading2: 'some reading', reason: 'some reason'}}, insert: 'some text'},
          {attributes: { deletion: {itemid: 107, technique: 'some technique'}}, insert: 'some text'},
          {attributes: { addition: {itemid: 108, place: 'margin left', target: 107}}, insert: 'some text'}
        ]
      }
      
      let opsLength = delta.ops.length

      for (const block of basicBlockFormats) {
        delta.ops[opsLength] = block.lastInsert
        let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
        expect(apiData.elements).toBeDefined()
        expect(apiData.people).toBeDefined()
        expect(apiData.ednotes).toBeDefined()
        expect(apiData.elements.length).toBe(1)
        expect(apiData.elements[0].type).toBe(block.type)
        expect(apiData.elements[0].items.length).toBe(9)
        let i = 100
        let seq = 0
        for (const item of apiData.elements[0].items) {
          expect(item.theText).toBe('some text')
          expect(item.lang).toBe(editorInfo.defaultLang)
          expect(item.id).toBe(i)
          expect(item.seq).toBe(seq)
          i++
          seq++
        }
        expect(apiData.elements[0].items[0].type).toBe(ITEM_RUBRIC)
        expect(apiData.elements[0].items[1].type).toBe(ITEM_INITIAL)
        expect(apiData.elements[0].items[2].type).toBe(ITEM_GLIPH)
        expect(apiData.elements[0].items[3].type).toBe(ITEM_MATH_TEXT)
        expect(apiData.elements[0].items[4].type).toBe(ITEM_SIC)
        expect(apiData.elements[0].items[5].type).toBe(ITEM_ABBREVIATION)
        expect(apiData.elements[0].items[6].type).toBe(ITEM_UNCLEAR)
        expect(apiData.elements[0].items[7].type).toBe(ITEM_DELETION)
        expect(apiData.elements[0].items[8].type).toBe(ITEM_ADDITION)
      }
    })
    
    it("should support non-textual items in all element types ", function () {
      let delta = { 
        ops: [ 
          {insert: {mark: {itemid: 100}}},
          {insert: {nowb: {itemid: 101}}},
          {insert: {illegible: {itemid: 102, extrainfo: 'some reason', thelength: 5}}},
          {insert: {chunkmark: {itemid: 103, alttext: 'start', target: '45', text: 'AW47'}}},
          {insert: {chgap: {itemid: 104, thelength: 5}}},
          {insert: {pmark: {itemid: 105}}}
        ]
      }
      
      let opsLength = delta.ops.length

      for (const block of basicBlockFormats) {
        delta.ops[opsLength] = block.lastInsert
        let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
        expect(apiData.elements).toBeDefined()
        expect(apiData.people).toBeDefined()
        expect(apiData.ednotes).toBeDefined()
        expect(apiData.elements.length).toBe(1)
        expect(apiData.elements[0].type).toBe(block.type)
        expect(apiData.elements[0].items.length).toBe(6)
        let i = 100
        for (const item of apiData.elements[0].items) {
          expect(item.lang).toBe(editorInfo.defaultLang)
          expect(item.id).toBe(i)
          i++
        }
        expect(apiData.elements[0].items[0].type).toBe(ITEM_MARK)
        expect(apiData.elements[0].items[0].theText).toBe('')

        expect(apiData.elements[0].items[1].type).toBe(ITEM_NO_WORD_BREAK)
        expect(apiData.elements[0].items[1].theText).toBe('')

        expect(apiData.elements[0].items[2].type).toBe(ITEM_ILLEGIBLE)
        expect(apiData.elements[0].items[2].theText).toBe('')
        expect(apiData.elements[0].items[2].length).toBe(5)
        expect(apiData.elements[0].items[2].extraInfo).toBe('some reason')

        expect(apiData.elements[0].items[3].type).toBe(ITEM_CHUNK_MARK)
        expect(apiData.elements[0].items[3].theText).toBe('AW47')

        expect(apiData.elements[0].items[4].type).toBe(ITEM_CHARACTER_GAP)
        expect(apiData.elements[0].items[4].theText).toBe('')
        expect(apiData.elements[0].items[4].length).toBe(5)

        expect(apiData.elements[0].items[5].type).toBe(ITEM_PARAGRAPH_MARK)
        expect(apiData.elements[0].items[5].theText).toBe('')
      }
    })
    
    
    it("should support line gaps", function () {
      let delta = { 
        ops: [ 
          // Normal case
          {insert: 'Line 1\n'},
          {insert: {linegap: {thelength: 1}}},
          {insert: '\n'},   
          // Line gap in a regular line element
          {insert: 'Line 3'},
          {insert: {linegap: {thelength: 1}}},
          {insert: '\n'},
          // Line gap in a non-line element, element should convert into line element
          {insert: 'Line 5'},
          {insert: {linegap: {thelength: 1}}},
          {attributes: {head:true}, insert:"\n"},
          // Line gap with lang attribute
          {insert: 'Line 7'},
          {attributes:{lang:"la"},insert:{linegap:{thelength:1}}},
          {insert: '\n'}
        ]
      }
      //console.log("---- LINE GAP test ---")
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(8)
      expect(apiData.elements[0].type).toBe(ELEMENT_LINE)
      expect(apiData.elements[0].items.length).toBe(1)
      expect(apiData.elements[0].items[0].type = ITEM_TEXT)
      expect(apiData.elements[0].items[0].theText = 'Line 1')
      
      expect(apiData.elements[1].type).toBe(ELEMENT_LINE_GAP)
      expect(apiData.elements[1].reference).toBe(1)
      expect(apiData.elements[1].items.length).toBe(0)
      
      expect(apiData.elements[2].type).toBe(ELEMENT_LINE)
      expect(apiData.elements[2].items.length).toBe(1)
      expect(apiData.elements[2].items[0].type = ITEM_TEXT)
      expect(apiData.elements[2].items[0].theText = 'Line 3')
      
      expect(apiData.elements[3].type).toBe(ELEMENT_LINE_GAP)
      expect(apiData.elements[3].reference).toBe(1)
      expect(apiData.elements[3].items.length).toBe(0)
      
      expect(apiData.elements[4].type).toBe(ELEMENT_LINE)
      expect(apiData.elements[4].items.length).toBe(1)
      expect(apiData.elements[4].items[0].type = ITEM_TEXT)
      expect(apiData.elements[4].items[0].theText = 'Line 5')
      
      expect(apiData.elements[5].type).toBe(ELEMENT_LINE_GAP)
      expect(apiData.elements[5].reference).toBe(1)
      expect(apiData.elements[5].items.length).toBe(0)
      
      expect(apiData.elements[6].type).toBe(ELEMENT_LINE)
      expect(apiData.elements[6].items.length).toBe(1)
      expect(apiData.elements[6].items[0].type = ITEM_TEXT)
      expect(apiData.elements[6].items[0].theText = 'Line 7')
      
      expect(apiData.elements[7].type).toBe(ELEMENT_LINE_GAP)
      expect(apiData.elements[7].items.length).toBe(0)
      expect(apiData.elements[7].reference).toBe(1)
      
      
    })
    
    it("should properly deal with inserts starting with newline (issues #20 and #32)", function () {
      let delta = { 
        ops: [ 
          {attributes: {lang: 'he'}, insert: 'Line 1'},
          {insert: '\nLine 2\n'}
        ]
      }
      let apiData = EditorData.getApiDataFromQuillDelta( delta, editorInfo)
      expect(apiData.elements).toBeDefined()
      expect(apiData.people).toBeDefined()
      expect(apiData.ednotes).toBeDefined()
      expect(apiData.elements.length).toBe(1)
      let ele1 = apiData.elements[0]
      console.log(ele1)
      expect(ele1.type).toBe(ELEMENT_LINE)
      expect(ele1.items.length).toBeGreaterThan(1)
      expect(ele1.items[0].lang).toBe('he')
      expect(ele1.items[0].theText).toBe('Line 1')
      let laText = ''
      for (let i=1; i < ele1.items.length; i++) {
        expect(ele1.items[i].lang).toBe('la')
        laText += ele1.items[i].theText
      }
      expect(laText).toBe('\nLine 2')
    })
  })
  
  describe("getEditorDataFromApiData", function (){
    
    let langDef = TranscriptionEditor.getOptions([]).langDef
    let formatBlots = TranscriptionEditor.formatBlots
    let blockBlots = TranscriptionEditor.blockBlots
    let minimalColumnData = {elements: []}
    let editorId = 123456
    
    it("should return empty delta on empty column data", function () {
      
      
      let editorData = EditorData.getTranscriptionEditorDataFromApiData(minimalColumnData, editorId, langDef, 0)
      
      expect(editorData.delta).toBeDefined()
      expect(editorData.delta.ops).toBeDefined()
      expect(editorData.mainLang).toBeDefined()
      expect(editorData.minItemId).toBeDefined()
      expect(editorData.minItemId).toBe(0)
     
    })
    
    it("should support simple formats: rubric, initial, gliph, math text, sic, abbr, unclear, deletion, addition", function () {
      
      let columnData = JSON.parse(`
{
  "elements": [
    {
      "id": 1,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 1,
      "seq": 0,
      "items": [
        {
          "id": 1,
          "columnElementId": 1,
          "seq": 0,
          "type": 2,
          "lang": "la",
          "theText": "Rubric",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 2,
          "columnElementId": 1,
          "seq": 1,
          "type": 13,
          "lang": "la",
          "theText": "Initial",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 3,
          "columnElementId": 1,
          "seq": 2,
          "type": 6,
          "lang": "la",
          "theText": "Gliph",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 4,
          "columnElementId": 1,
          "seq": 3,
          "type": 17,
          "lang": "la",
          "theText": "MathText",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 5,
          "columnElementId": 1,
          "seq": 4,
          "type": 3,
          "lang": "la",
          "theText": "Sic",
          "altText": "correction",
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 6,
          "columnElementId": 1,
          "seq": 5,
          "type": 11,
          "lang": "la",
          "theText": "Abbr",
          "altText": "abbreviation",
          "extraInfo": null,
          "length": null,
          "target": null
        },
        {
          "id": 7,
          "columnElementId": 1,
          "seq": 6,
          "type": 4,
          "lang": "la",
          "theText": "Unclear",
          "altText": "altreading",
          "extraInfo": "unclear",
          "length": null,
          "target": null
        },
        {
          "id": 8,
          "columnElementId": 1,
          "seq": 7,
          "type": 8,
          "lang": "la",
          "theText": "Deletion",
          "altText": null,
          "extraInfo": "strikeout",
          "length": null,
          "target": null
        },
      {
          "id": 9,
          "columnElementId": 1,
          "seq": 8,
          "type": 7,
          "lang": "la",
          "theText": "Addition",
          "altText": null,
          "extraInfo": "inline",
          "length": null,
          "target": 0
        }
      
      ],
      "reference": null,
      "placement": null
    }
  ],
  "ednotes": [],
  "people": [
    {
      "fullname": "No editor"
    },
    {
      "fullname": "Editor 1"
    }
  ],
  "info": {
    "pageId": 1,
    "col": 1,
    "lang": "la",
    "numCols": 1
  }
}
`)
      let itemSequence = [
        { name: 'rubric', itemid: 1, text: 'Rubric' },
        { name: 'initial', itemid: 2, text: 'Initial' },
        { name: 'gliph', itemid: 3, text: 'Gliph' },
        { name: 'mathtext', itemid: 4, text: 'MathText' },
        { name: 'sic', itemid: 5, text: 'Sic', alttext: 'correction' },
        { name: 'abbr', itemid: 6, text: 'Abbr', alttext: 'abbreviation' },
        { name: 'unclear', itemid: 7, text: 'Unclear', alttext: 'altreading' },
        { name: 'deletion', itemid: 8, text: 'Deletion', extrainfo: 'strikeout' },
        { name: 'addition', itemid: 9, text: 'Addition', extrainfo: 'inline' }
      ]
      
      let editorData = EditorData.getTranscriptionEditorDataFromApiData(columnData, editorId, langDef, 0)
      
      expect(editorData.delta).toBeDefined()
      expect(editorData.delta.ops).toBeDefined()
      expect(editorData.mainLang).toBeDefined()
      expect(editorData.minItemId).toBeDefined()
      expect(editorData.mainLang).toBe('la')
      expect(editorData.minItemId).toBe(0)
      
      let ops = editorData.delta.ops
      
      expect(ops.length).toBe(itemSequence.length+1) // one per item plus a newline
      for (let i=0; i < itemSequence.length; i++) {
        let item = itemSequence[i]
        expect(ops[i].insert).toBe(item.text)
        expect(ops[i].attributes).toBeDefined()
        expect(ops[i].attributes[item.name]).toBeDefined()
        expect(ops[i].attributes[item.name].itemid).toBe(item.itemid)
        expect(ops[i].attributes[item.name].editorid).toBe(editorId)
        if (item.alttext !== undefined) {
          expect(ops[i].attributes[item.name].alttext).toBe(item.alttext)
        }
        if (item.extrainfo !== undefined) {
          expect(ops[i].attributes[item.name].extrainfo).toBe(item.extrainfo)
        }
      }
    })
    
    it("should support image elements: chgap, mark, etc", function (){
let columnData = JSON.parse(`
{
  "elements": [
    {
      "id": 1,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 1,
      "seq": 0,
      "items": [
      {
          "id": 2,
          "columnElementId": 1,
          "seq": 1,
          "type": 10,
          "lang": "la",
          "theText": null,
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
            {
          "id": 3,
          "columnElementId": 1,
          "seq": 2,
          "type": 16,
          "lang": "la",
          "theText": null,
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
      {
          "id": 4,
          "columnElementId": 1,
          "seq": 3,
          "type": 15,
          "lang": "la",
          "theText": null,
          "altText": null,
          "extraInfo": null,
          "length": 5,
          "target": null
        },
      {
          "id": 5,
          "columnElementId": 1,
          "seq": 4,
          "type": 9,
          "lang": "la",
          "theText": null,
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        },
      {
          "id": 6,
          "columnElementId": 1,
          "seq": 5,
          "type": 5,
          "lang": "la",
          "theText": null,
          "altText": null,
          "extraInfo": null,
          "length": 5,
          "target": null
        },
      {
          "id": 7,
          "columnElementId": 1,
          "seq": 6,
          "type": 14,
          "lang": "la",
          "theText": "AW47",
          "altText": "start",
          "extraInfo": null,
          "length": null,
          "target": 150
        }
      ],
      "reference": null,
      "placement": null
    }
  ],
  "ednotes": [],
  "people": [
    {
      "fullname": "No editor"
    },
    {
      "fullname": "Editor 1"
    }
  ],
  "info": {
    "pageId": 1,
    "col": 1,
    "lang": "la",
    "numCols": 1
  }
}
`)      
      
      let itemSequence = [
        'nowb',
        'pmark',
        'chgap',
        'mark',
        'illegible', 
        'chunkmark'
      ]
      
      let editorData = EditorData.getTranscriptionEditorDataFromApiData(columnData, editorId, langDef, 0)
      expect(editorData.delta).toBeDefined()
      expect(editorData.delta.ops).toBeDefined()
      expect(editorData.mainLang).toBeDefined()
      expect(editorData.minItemId).toBeDefined()
      expect(editorData.minItemId).toBe(0)
      
      let ops = editorData.delta.ops
      expect(ops.length).toEqual(itemSequence.length+1)
      for (let i = 0; i < itemSequence.length; i++) {
        expect(ops[i].insert).toBeDefined()
        expect(ops[i].insert[itemSequence[i]]).toBeDefined()
      }
    })
    
    it("should support basic elements: line, head, pagenumber, custodes, gloss", function() {
      let columnData = JSON.parse(`
{
  "elements": [
    {
      "id": 1,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 2,
      "seq": 0,
      "items": [
        {
          "id": 1,
          "columnElementId": 1,
          "seq": 0,
          "type": 1,
          "lang": "la",
          "theText": "Head",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        }
      ],
      "reference": null,
      "placement": null
    },
    {
      "id": 2,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 4,
      "seq": 1,
      "items": [
        {
          "id": 2,
          "columnElementId": 2,
          "seq": 0,
          "type": 1,
          "lang": "la",
          "theText": "PageNumber",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        }
      ],
      "reference": null,
      "placement": null
    },
    {
      "id": 3,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 5,
      "seq": 2,
      "items": [
        {
          "id": 3,
          "columnElementId": 3,
          "seq": 0,
          "type": 1,
          "lang": "la",
          "theText": "Custodes",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        }
      ],
      "reference": null,
      "placement": null
    },
    {
      "id": 4,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 1,
      "seq": 3,
      "items": [
        {
          "id": 4,
          "columnElementId": 4,
          "seq": 0,
          "type": 1,
          "lang": "la",
          "theText": "Line",
          "altText": null,
          "extraInfo": null,
          "length": null,
          "target": null
        }
      ],
      "reference": null,
      "placement": null
    },
      {
      "id": 5,
      "pageId": 1,
      "columnNumber": 1,
      "lang": "la",
      "editorId": 1,
      "type": 3,
      "seq": 4,
      "items": [
        {
          "id": 5,
          "columnElementId": 5,
          "seq": 0,
          "type": 1,
          "lang": "la",
          "theText": "Gloss",
          "altText": null,
          "extraInfo": "margin left",
          "length": null,
          "target": null
        }
      ],
      "reference": null,
      "placement": null
    }
  ],
  "ednotes": [],
  "people": [
    {
      "fullname": "No editor"
    },
    {
      "fullname": "Editor 1"
    }
  ],
  "info": {
    "pageId": 1,
    "col": 1,
    "lang": "la",
    "numCols": 1
  }
}
`)
      let elementSequence = [
        { name: 'headelement', text: 'Head' },
        { name: 'pagenumber', text: 'PageNumber'},
        { name: 'custodes', text: 'Custodes' },
        { text: 'Line' },
        { name: 'gloss', text: 'Gloss' }
      ]
      
      let editorData = EditorData.getTranscriptionEditorDataFromApiData(columnData, editorId, langDef, 0)
      expect(editorData.delta).toBeDefined()
      expect(editorData.delta.ops).toBeDefined()
      expect(editorData.mainLang).toBeDefined()
      expect(editorData.minItemId).toBeDefined()
      expect(editorData.mainLang).toBe('la')
      expect(editorData.minItemId).toBe(0)
      
      let ops = editorData.delta.ops
      
      expect(ops.length).toBe(2*elementSequence.length) // each element generates a text and a \n
      for (let i=0; i < elementSequence.length; i++) {
        let textOp = ops[2*i]
        let newLineOp = ops[2*i+1]
        let element = elementSequence[i]
        expect(newLineOp.attributes[element.name]).toBeDefined()
        expect(newLineOp.attributes[element.name]).toBeTruthy()
        expect(textOp.insert).toBe(element.text)
      }
    })
  })
})
  

  
  