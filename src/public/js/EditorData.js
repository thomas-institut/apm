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

/* global ELEMENT_LINE, ELEMENT_HEAD, ELEMENT_CUSTODES */
/* global ELEMENT_GLOSS, ELEMENT_PAGE_NUMBER, ITEM_TEXT, ITEM_MARK */
/* global ITEM_RUBRIC, ITEM_GLIPH, ITEM_INITIAL, ITEM_SIC, ITEM_ABBREVIATION */
/* global ITEM_DELETION, Item, ITEM_ADDITION, ITEM_UNCLEAR, ITEM_ILLEGIBLE, ELEMENT_PAGENUMBER */
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP, ELEMENT_INVALID */

class EditorData {
  
  static getApiDataFromQuillDelta(delta, editorInfo) {
    let ops = delta.ops
    let elements = []
    let itemIds = []
    let currentItemSeq = 0
    let currentElementSeq = 0
    let currentElementId = 0
    
    
    function createNewElement() {
      currentItemSeq = 0
      currentElementId++
      return {
        id: currentElementId,
        pageId: editorInfo.pageId,
        columnNumber: editorInfo.columnNumber,
        lang: editorInfo.defaultLang,
        editorId: editorInfo.editorId,
        handId: editorInfo.handId,
        type: ELEMENT_INVALID,
        seq: currentElementSeq++,
        items: [],
        reference: null,
        placement: null
      }
    }
    
    function createNewItem() {
      return {
        id: -1,
        columnElementId: currentElementId,
        seq: currentItemSeq++,
        type: ITEM_TEXT,
        lang: editorInfo.defaultLang,
        theText: '',
        altText: null,
        extraInfo: null,
        length: null,
        target: null
      }
    }
    
    let previousElementType = ELEMENT_INVALID
    let curElement = createNewElement()
    

    for (const [i, curOps] of ops.entries()) {
      console.log('Processing ops ' + i)
      console.log(JSON.stringify(curOps))
      
      if ('attributes' in curOps) {
        if (curOps.insert === '\n') {
          //
          // End of element, element.type !== ELEMENT_LINE
          //
          //console.log("Insert is newline with attributes")
          if (previousElementType === ELEMENT_LINE_GAP) {
            // ignore this ops
            console.log("WARNING: Quill 2 API : Ignoring newline, prev element was line gap")
            continue
          }
          if (curOps.attributes.gloss) {
            curElement.type = ELEMENT_GLOSS
            curElement.id = curOps.attributes.gloss.elementId
            curElement.placement = curOps.attributes.gloss.place
          }
          if (curOps.attributes.additionelement) {
            curElement.type = ELEMENT_ADDITION
            curElement.id = curOps.attributes.additionelement.elementId
            curElement.placement = curOps.attributes.additionelement.place
            curElement.reference = curOps.attributes.additionelement.target
          }
          if (curOps.attributes.head) {
            curElement.type = ELEMENT_HEAD
          }
          if (curOps.attributes.custodes) {
            curElement.type = ELEMENT_CUSTODES
          }
          if (curOps.attributes.pagenumber) {
            curElement.type = ELEMENT_PAGE_NUMBER
          }
          if (curElement.type === ELEMENT_INVALID) {
            console.log("WARNING: Quill 2 API : single newline without valid attribute")
            console.log(JSON.stringify(curOps))
          }
          
          //console.log(curElement)
          elements.push(curElement)
          previousElementType = curElement.type
          curElement = createNewElement()
          continue;
        } 
        
        // Insert can be text or a line gap
        
        let theInsert = curOps.insert
        if (typeof curOps.insert !== 'string') {
          if ('linegap' in curOps.insert) {
            // if a line gap, then the only attribute should be language
            if (curElement.items.length > 0) {
              // this means the line gap does not have newline before
              // which is possible in Quill
              curElement.type = ELEMENT_LINE
              elements.push(curElement)
              curElement = createNewElement()
            }
            curElement.type = ELEMENT_LINE_GAP
            curElement.reference = theInsert.linegap.linecount
            curElement.items = []
            elements.push(curElement)
            previousElementType = ELEMENT_LINE_GAP
            curElement = createNewElement()
            continue;
          }
          console.log("ERROR: Quill 2 API : ops with attributes and a non-string")
          console.log(JSON.stringify(curOps))
          continue
        }
        
        //
        // Item with some text in it
        //
        //
        //console.log("insert is text with attributes")
        let item = createNewItem()
        
        item.theText =curOps.insert
        if (curOps.attributes.lang) {
          item.lang = curOps.attributes.lang
        }
        if (curOps.attributes.rubric) {
          item.type = ITEM_RUBRIC
          item.id = curOps.attributes.rubric.itemid
        }
        if (curOps.attributes.gliph) {
          item.type = ITEM_GLIPH
          item.id = curOps.attributes.gliph.itemid
        }
        if (curOps.attributes.initial) {
          item.type = ITEM_INITIAL
          item.id = curOps.attributes.initial.itemid
        }
        if (curOps.attributes.sic) {
          item.type = ITEM_SIC
          item.altText = curOps.attributes.sic.correction
          item.id = curOps.attributes.sic.itemid
        }
        if (curOps.attributes.abbr) {
          item.type = ITEM_ABBREVIATION
          item.altText = curOps.attributes.abbr.expansion
          item.id = curOps.attributes.abbr.itemid
        }
        if (curOps.attributes.deletion) {
          item.type = ITEM_DELETION
          item.extraInfo = curOps.attributes.deletion.technique
          item.id  = curOps.attributes.deletion.itemid
        }
        if (curOps.attributes.addition) {
          item.type = ITEM_ADDITION
          item.extraInfo = curOps.attributes.addition.place
          item.id = curOps.attributes.addition.itemid
          item.target = curOps.attributes.addition.target
        }
        if (curOps.attributes.unclear) {
          item.type = ITEM_UNCLEAR
          item.altText = curOps.attributes.unclear.reading2
          item.extraInfo = curOps.attributes.unclear.reason
          item.id = curOps.attributes.unclear.itemid
        }
        // Make sure item id is an int
        item.id = parseInt(item.id)
        itemIds.push(item.id)
        curElement.items.push(item)
        continue;
      }
      // No attributes in curOps
      
      if (typeof curOps.insert === 'string') {
        //
        // Text without attributes, possibly including new lines
        //
        //console.log("Insert is text without attributes")
        let text = ''
        for (let i = 0; i < curOps.insert.length; i++) {
          if (curOps.insert[i] === '\n') {
            if (text !== '') {
              //console.log('Creating new text item')
              let item = createNewItem()
              item.type = ITEM_TEXT
              item.theText = text
              curElement.items.push(item) // no need to push the item id to itemIds
              text = ''
            }
            if (curElement.items.length > 0) {
              //console.log("Storing element")
              curElement.type = ELEMENT_LINE
              elements.push(curElement)
              previousElementType = curElement.type
              curElement = createNewElement()
            } else {
              if (previousElementType === ELEMENT_LINE_GAP) {
                console.log("INFO: Quill 2 API : Ignoring newline, prev element was line gap")
              } else {
                console.log("INFO: Quill 2 API : Ignoring newline, no items")
              }
            }
            continue // i.e. next character
          }
          // character is not a new line
          text += curOps.insert[i]
        } // for all characters
        // Store last item if there's text
        if (text !== '') {
          //console.log('Creating new text item')
          let item = createNewItem()
          item.type = ITEM_TEXT
          item.theText = text
          curElement.items.push(item) // no need to push the item id to itemIds
          text = ''
        }
        continue // i.e., next ops
      }
      
      // no attributes and no text in curOps 
      // this means a non-textual item or a line gap
      //console.log("Insert is object without attributes")
      let theInsert = curOps.insert
      if ('linegap' in curOps.insert) {
        if (curElement.items.length > 0) {
          // this means the line gap does not have newline before
          // which is possible in Quill
          curElement.type = ELEMENT_LINE
          elements.push(curElement)
          curElement = createNewElement()
        }
        curElement.type = ELEMENT_LINE_GAP
        curElement.reference = theInsert.linegap.linecount
        curElement.items = []
        elements.push(curElement)
        previousElementType = ELEMENT_LINE_GAP
        curElement = createNewElement()
        continue;
      }
      let item = createNewItem()
      if ('mark' in curOps.insert) {
        item.type = ITEM_MARK
        item.id = theInsert.mark.itemid
      }
      if ('nowb' in curOps.insert) {
        item.type = ITEM_NO_WORD_BREAK
        item.id = theInsert.nowb.itemid
      }
      if ('illegible' in curOps.insert) {
        item.type = ITEM_ILLEGIBLE
        item.id = theInsert.illegible.itemid
        item.extraInfo = theInsert.illegible.reason
        item.length = parseInt(theInsert.illegible.length)
      }
      if ('chunkmark' in curOps.insert) {
        item.type = ITEM_CHUNK_MARK
        item.id = theInsert.chunkmark.itemid
        item.altText = theInsert.chunkmark.type
        item.target = parseInt(theInsert.chunkmark.chunkno)
        item.theText = theInsert.chunkmark.dareid
      }
      item.id = parseInt(item.id)
      itemIds.push(item.id)
      curElement.items.push(item)
    }

    // filter out stray notes
    let filteredEdnotes = []
    //console.log(itemIds)
    for (const note of editorInfo.edNotes) {
      if (itemIds.includes(note.target)) {
        filteredEdnotes.push(note)
      } else {
        console.log("WARNING: Quill 2 API : stray ednote")
        console.log(note)
      }
    }
    return {elements: elements, ednotes: filteredEdnotes, people: editorInfo.people}
  }
  
}