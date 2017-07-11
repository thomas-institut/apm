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
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP */

class EditorData {
  
  static getApiDataFromQuillDelta(delta, editorInfo) {
    let ops = delta.ops
    let elements = []
    let itemIds = []
    let currentItemSeq = 0
    let currentElementSeq = 0
    let currentElementId = 1
    
    let curElement = {
      id: currentElementId++,
      pageId: editorInfo.pageId,
      columnNumber: editorInfo.columnNumber,
      lang: editorInfo.defaultLang,
      editorId: editorInfo.editorId,
      handId: editorInfo.handId,
      type: ELEMENT_LINE,
      seq: currentElementSeq++,
      items: [],
      reference: null,
      placement: null
    }
    

    for (const [i, curOps] of ops.entries()) {
      console.log('Processing ops ' + i)
      console.log(JSON.stringify(curOps))
      let type = ITEM_TEXT
      let theLang = curElement.lang
      let altText = ''
      let extraInfo = ''
      let target = -1
      let length = -1
      if (curOps.insert === '\n\n') {
        console.log("Double newline in ops detected")
        curOps.insert = '\n'
      }
      if (curOps.insert !== '\n') {
        let itemId = -1
        let theText = curOps.insert
        if (typeof theText !== 'string') {
          let theOps = theText
          if ('mark' in theOps) {
            type = ITEM_MARK
            itemId = theText.mark.itemid
            theText = ''
          }
          if ('nowb' in theOps) {
            type = ITEM_NO_WORD_BREAK
            itemId = theText.nowb.itemid
            theText = ''
          }
          if ('illegible' in theOps) {
            type = ITEM_ILLEGIBLE
            itemId = theText.illegible.itemid
            extraInfo = theText.illegible.reason
            length = parseInt(theText.illegible.length)
            theText = ''
          }
          if ('chunkmark' in theOps) {
            type = ITEM_CHUNK_MARK
            itemId = theText.chunkmark.itemid
            altText = theText.chunkmark.type
            target = parseInt(theText.chunkmark.chunkno)
            theText = theText.chunkmark.dareid
          }
          if ('linegap' in theOps) {
            curElement.type = ELEMENT_LINE_GAP
            curElement.reference = theText.linegap.linecount
            curElement.items = []
            elements.push(curElement)
            curElement = {
              id: currentElementId++,
              pageId: editorInfo.pageId,
              columnNumber: editorInfo.columnNumber,
              lang: editorInfo.defaultLang,
              editorId: editorInfo.editorId,
              handId: editorInfo.handId,
              type: ELEMENT_LINE,
              seq: currentElementSeq++,
              items: [],
              reference: null, 
              placement: null
            }
            currentItemSeq = 0
            continue
          }
        }
        if ('attributes' in curOps) {
          if (curOps.attributes.rubric) {
            type = ITEM_RUBRIC
            itemId = curOps.attributes.rubric.itemid
          }

          if (curOps.attributes.gliph) {
            type = ITEM_GLIPH
            itemId = curOps.attributes.gliph.itemid
          }
          if (curOps.attributes.initial) {
            type = ITEM_INITIAL
            itemId = curOps.attributes.initial.itemid
          }

          if (curOps.attributes.sic) {
            type = ITEM_SIC
            altText = curOps.attributes.sic.correction
            itemId = curOps.attributes.sic.itemid
          }
          if (curOps.attributes.abbr) {
            type = ITEM_ABBREVIATION
            altText = curOps.attributes.abbr.expansion
            itemId = curOps.attributes.abbr.itemid
          }

          if (curOps.attributes.deletion) {
            type = ITEM_DELETION
            extraInfo = curOps.attributes.deletion.technique
            itemId = curOps.attributes.deletion.itemid
          }
          if (curOps.attributes.addition) {
            type = ITEM_ADDITION
            extraInfo = curOps.attributes.addition.place
            itemId = curOps.attributes.addition.itemid
            target = curOps.attributes.addition.target
          }
          if (curOps.attributes.unclear) {
            type = ITEM_UNCLEAR
            altText = curOps.attributes.unclear.reading2
            extraInfo = curOps.attributes.unclear.reason
            itemId = curOps.attributes.unclear.itemid
          }

          if (curOps.attributes.lang) {
            theLang = curOps.attributes.lang
          }
        }
        itemId = parseInt(itemId)
        if (type === ITEM_TEXT) {
          // Checking for non formatted text with new lines!
          let theTexts = theText.split("\n")
          if (theTexts.length > 1) {
            //console.log("Got multiple lines without format")
            for (const line of theTexts) {
              if (line === '') {
                continue
              }
              let item = {
                id: -1,
                columnElementId: currentElementId,
                seq: currentItemSeq++,
                type: ITEM_TEXT,
                lang: theLang,
                theText: line,
                altText: null,
                extraInfo: null,
                length: null,
                target: null
              }
              curElement.items.push(item)
              elements.push(curElement)
              curElement = {
                id: currentElementId++,
                pageId: editorInfo.pageId,
                columnNumber: editorInfo.columnNumber,
                lang: editorInfo.defaultLang,
                editorId: editorInfo.editorId,
                handId: editorInfo.handId,
                type: ELEMENT_LINE,
                seq: currentElementSeq++,
                items: [],
                reference: null, 
                placement: null
              }
              currentItemSeq = 0
            }
            continue
          }
        }
        
        let item = {
          id: itemId,
          columnElementId: currentElementId,
          seq: currentItemSeq++,
          type: type,
          lang: theLang,
          theText: theText,
          altText: altText,
          extraInfo: extraInfo,
          length: null,
          target: null
        }
        if (target !== -1) {
          item.target = target
        }
        if (length !== -1) {
          item.length = length
        }
        curElement.items.push(item)
        itemIds.push(itemId)
        continue
      }

      let currentString = ''
      for (const ch of curOps.insert) {
        if (ch === '\n') {
          if (currentString !== '') {
            let item = {
              id: -1,
              columnElementId: currentElementId,
              type: type,
              seq: currentItemSeq,
              lang: theLang,
              theText: currentString,
              altText: '',
              extraInfo: null,
              length: null,
              target: null
            }
            curElement.items.push(item)
          }
          if (curElement.items.length !== 0) {
            let elementType = ELEMENT_LINE
            if ('attributes' in curOps) {
              if (curOps.attributes.gloss) {
                elementType = ELEMENT_GLOSS
                curElement.id = curOps.attributes.gloss.elementId
                curElement.placement = curOps.attributes.gloss.place
              }
              if (curOps.attributes.additionelement) {
                elementType = ELEMENT_ADDITION
                curElement.id = curOps.attributes.additionelement.elementId
                curElement.placement = curOps.attributes.additionelement.place
                curElement.reference = curOps.attributes.additionelement.target
              }
              if (curOps.attributes.head) {
                elementType = ELEMENT_HEAD
              }
              if (curOps.attributes.custodes) {
                elementType = ELEMENT_CUSTODES
              }
              if (curOps.attributes.pagenumber) {
                elementType = ELEMENT_PAGE_NUMBER
              }
            }
            curElement.type = elementType
            elements.push(curElement)
            curElement = {
              id: currentElementId++,
              pageId: editorInfo.pageId,
              columnNumber: editorInfo.columnNumber,
              lang: editorInfo.defaultLang,
              editorId: editorInfo.editorId,
              handId: editorInfo.handId,
              type: ELEMENT_LINE,
              seq: currentElementSeq++,
              items: [],
              reference: null,
              placement: null
            }
            currentItemSeq = 0
          }
          currentString = ''
          continue
        }
        currentString += ch
      }
      if (currentString !== '') {
        let item = {
          id: -1,
          columnElementId: currentElementId,
          type: type,
          seq: currentItemSeq++,
          lang: theLang,
          theText: currentString,
          altText: ''
        }
        curElement.items.push(item)
      }
    }
        // filter out stray notes
    let filteredEdnotes = []
    //console.log(itemIds)
    for (const note of editorInfo.edNotes) {
      if (itemIds.includes(note.target)) {
        filteredEdnotes.push(note)
      }
    }

    return {elements: elements, ednotes: filteredEdnotes, people: editorInfo.people}
  }
  
}