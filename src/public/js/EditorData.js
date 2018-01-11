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
/* global ITEM_DELETION, ITEM_ADDITION, ITEM_UNCLEAR, ITEM_ILLEGIBLE */
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP, ELEMENT_INVALID, ITEM_CHARACTER_GAP, ITEM_PARAGRAPH_MARK, ITEM_MATH_TEXT, TranscriptionEditor */

/* exported EditorData */
class EditorData {
  
  static getApiDataFromQuillDelta(delta, editorInfo) {
    
    // Transcription editor settings
    let formatBlots = TranscriptionEditor.formatBlots
    let blockBlots = TranscriptionEditor.blockBlots
    let imageBlots = TranscriptionEditor.imageBlots
    let mainTextElementType = ELEMENT_LINE
    let lineGapElementType = ELEMENT_LINE_GAP
    let invalidElementType = ELEMENT_INVALID
    let normalTextItemType = ITEM_TEXT
    let lineGapBlotName = TranscriptionEditor.lineGapBlot.blotName
    
    const ops = delta.ops
    const elements = []
    const itemIds = []
    let currentItemSeq = 0
    let currentElementSeq = 0
    let currentElementId = 0
    let previousElementType = invalidElementType
    
    /**
     * Updates item and element sequence numbers and creates a new empty Element object
     * 
     * @returns {Element} a new Element object
     */
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
        type: invalidElementType,
        seq: currentElementSeq++,
        items: [],
        reference: null,
        placement: null
      }
    }
    
    let curElement = createNewElement()
    
    /**
     * 
     * @returns {Item} a new Item object
     */
    function createNewItem() {
      return {
        id: -1,
        columnElementId: currentElementId,
        seq: currentItemSeq++,
        type: normalTextItemType,
        lang: editorInfo.defaultLang,
        handId: 0,
        theText: '',
        altText: null,
        extraInfo: null,
        length: null,
        target: null
      }
    }
    
    function processNonTextualItem(curOps) {
      const theInsert = curOps.insert
      if (lineGapBlotName in curOps.insert) {
        if (curElement.items.length > 0) {
          // this means the line gap does not have newline before
          // which is possible in Quill
          curElement.type = mainTextElementType
          elements.push(curElement)
          curElement = createNewElement()
        }
        curElement.type = lineGapElementType
        curElement.reference = theInsert.linegap.thelength
        curElement.items = []
        elements.push(curElement)
        previousElementType = lineGapElementType
        curElement = createNewElement()
        return true
      }
      
      const item = createNewItem()
      let formatFound = false
      for (const theBlot of imageBlots) {
        if (theBlot.name in theInsert) {
          item.type = theBlot.type
          item.id = theInsert[theBlot.name].itemid
          if (theBlot.text) {
            item.theText = theInsert[theBlot.name].text
          }
          if (theBlot.alttext) {
            item.altText = theInsert[theBlot.name].alttext
          }
          if (theBlot.extrainfo) {
            item.extraInfo = theInsert[theBlot.name].extrainfo
          }
          if (theBlot.target) {
            item.target = theInsert[theBlot.name].target
          }
          if (theBlot.thelength) {
            item.length = theInsert[theBlot.name].thelength
          }
          formatFound = true
          break
        }
      }
      if (!formatFound) {
        console.warn('Unknown non-textual format in ops')
        console.warn(curOps)
        return false
      }
      item.id = parseInt(item.id)
      itemIds.push(item.id)
      curElement.items.push(item)
      return true
    }

    // START of ops processing
    for (const entry of ops.entries()) {
      const curOps = entry[1]
      if ('attributes' in curOps) {
        // 1. Insert with attributes
        if (curOps.insert === '\n') {
          // 1.a. End of line with attributes
          if (previousElementType === lineGapElementType) {
            // ignore this ops
            console.warn('WARNING: Quill 2 API : Ignoring newline, prev element was line gap')
            continue
          }
          for (const blockBlot of blockBlots) {
            if (curOps.attributes[blockBlot.name]) {
              let saveId = false
              curElement.type = blockBlot.type
              if (blockBlot.place) {
                curElement.place = curOps.attributes[blockBlot.name].place
                saveId = true
              }
              if (blockBlot.target) {
                curElement.target = curOps.attributes[blockBlot.name].target
                saveId = true
              }
              if (saveId) {
                curElement.id = curOps.attributes[blockBlot.name].elementId
              }
              break
            }
          }

          if (curElement.type === invalidElementType) {
            console.warn('WARNING: Quill 2 API : single newline without valid attribute')
            console.warn(JSON.stringify(curOps))
          }
          elements.push(curElement)
          previousElementType = curElement.type
          curElement = createNewElement()
          continue   //1.a. 終
        }  
        
        // 1.b. Insert text or non-textual item with attributes 
        if (typeof curOps.insert !== 'string') {
          // 1.b.i. Insert non-textual item with attributes
          // the attributes will be ignored!
          processNonTextualItem(curOps)
          continue // 1.b.i. 終
        }
        
        // 1.b.ii Insert text with attributes
        const item = createNewItem()
        item.theText = curOps.insert
        if (curOps.attributes.lang) {
          item.lang = curOps.attributes.lang
        }
        // Simple format elements
        for (const formatBlot of formatBlots) {
          if (curOps.attributes[formatBlot.name]) {
            item.type = formatBlot.type
            item.id = curOps.attributes[formatBlot.name].itemid
            item.handId = curOps.attributes[formatBlot.name].handid
            if (formatBlot.alttext) {
              item.altText = curOps.attributes[formatBlot.name].alttext
            }
            if (formatBlot.extrainfo) {
              item.extraInfo = curOps.attributes[formatBlot.name].extrainfo
            }
            if (formatBlot.target) {
              item.target = curOps.attributes[formatBlot.name].target
            }
          }
        }
        // Make sure item id is an int
        item.id = parseInt(item.id)
        itemIds.push(item.id)
        curElement.items.push(item)
        continue // 1.b.ii. 終
      }

      // 2. Insert without attributes
      if (typeof curOps.insert === 'string') {
        // 2.a. Insert text without attributes, possibly including new lines
        curElement.type = mainTextElementType
        let normalizedText = curOps.insert.replace(/\n+/g, '\n')
        let text = normalizedText.replace(/\n$/, '')
        if (text !== '') {
          const item = createNewItem()
          item.type = normalTextItemType
          item.theText = text
          // no need to push the item id to itemIds
          curElement.items.push(item) 
          //text = ''
        }
        if (text !== normalizedText) {
          // text ends in a new line, create a new mainTextElement if last element
          // is not a line gap
          if (previousElementType !== lineGapElementType) {
            curElement.type = mainTextElementType
            elements.push(curElement)
            previousElementType = curElement.type
            curElement = createNewElement()
          }
        }
        continue  // 2.a. 終
      }
      // 2.b. Insert non-textual item without attributes
      processNonTextualItem(curOps)
      // 2.b. 終
    } // processing of ops.entries 終
    
    // Check if there are elements to store
    if (curElement.items.length !== 0) {
      elements.push(curElement)
    }
    // filter out stray notes
    const filteredEdnotes = []
    for (const note of editorInfo.edNotes) {
      if (itemIds.includes(note.target)) {
        filteredEdnotes.push(note)
      } else {
        console.warn('WARNING: Quill 2 API : stray ednote')
        console.warn(note)
      }
    }
    return {elements: elements, ednotes: filteredEdnotes, people: editorInfo.people, info: editorInfo.info}
  }
  



  static getTranscriptionEditorDataFromApiData(columnData, editorId, langDef, minItemId)
  {
    const ops = []
    const formats = []
    const additionTargetTexts = []
    let formatBlots = TranscriptionEditor.formatBlots
    let blockBlots = TranscriptionEditor.blockBlots
    let imageBlots = TranscriptionEditor.imageBlots
    
    additionTargetTexts[0] = '[none]'
    
    let languageCounts = {}
    for (const lang in langDef) {
      languageCounts[lang] = 0
    }
    
    formats[ELEMENT_HEAD] = 'headelement'
    formats[ELEMENT_CUSTODES] = 'custodes'
    formats[ELEMENT_PAGE_NUMBER] = 'pagenumber'

    for (const ele of columnData.elements) {
      const attr = {}
      switch (ele.type) {
        case ELEMENT_LINE_GAP:
          ops.push({
            insert: {
              linegap : {
                editorid: editorId,
                thelength: ele.reference
              }
            }
          })
          break;
        
        case ELEMENT_LINE:
        case ELEMENT_HEAD:
        case ELEMENT_CUSTODES:
        case ELEMENT_GLOSS:
        case ELEMENT_ADDITION:
        case ELEMENT_PAGE_NUMBER:
          for (const item of ele.items) {
            minItemId = Math.min(minItemId, item.id)
            // Simple format blots
            let foundBlot = false
            for (const theBlot of formatBlots) {
              if (theBlot.type === item.type) {
                if (theBlot.canBeTarget) {
                  additionTargetTexts[item.id] = theBlot.title + ': ' + item.theText
                }
                let theOps = {
                  insert: item.theText
                }
                theOps.attributes = {lang: item.lang}
                theOps.attributes[theBlot.name] = {
                    itemid: item.id,
                    editorid: editorId,
                    handid: item.handId
                }
                if (theBlot.alttext !== undefined) {
                  theOps.attributes[theBlot.name].alttext = item.altText
                }
                if (theBlot.extrainfo !== undefined) {
                  theOps.attributes[theBlot.name].extrainfo = item.extraInfo
                }
                if (theBlot.target !== undefined) {
                  theOps.attributes[theBlot.name].target = item.target
                  theOps.attributes[theBlot.name].targetText = additionTargetTexts[item.target]
                }
                ops.push(theOps)
                languageCounts[item.lang]++
                foundBlot = true
                break
              }
            }
            if (foundBlot) {
              continue
            }
            for (const theBlot of imageBlots) {
              if (theBlot.type === item.type) {
                let theAttr = {
                    itemid: item.id,
                    editorid: editorId
                }
                if (theBlot.text !== undefined) {
                  theAttr.text = item.theText
                }
                if (theBlot.alttext !== undefined) {
                  theAttr.alttext = item.altText
                }
                if (theBlot.extrainfo !== undefined) {
                  theAttr.extrainfo = item.extraInfo
                }
                if (theBlot.thelength !== undefined) {
                  theAttr.thelength = item.length
                }
                if (theBlot.target !== undefined) {
                  theAttr.target = item.target
                }
                let theOps = { insert: {} }
                theOps.insert[theBlot.name] = theAttr
                ops.push(theOps)
                foundBlot = true
                break
              }
            }
            if (foundBlot) {
              continue
            }
            if (item.type === ITEM_TEXT) {
              ops.push({
                insert: item.theText,
                attributes: {
                  lang: item.lang
                }
              })
            } else {
              console.warn('Unrecognized item type ' + item.type + ' when setting editor data')
            }
            languageCounts[item.lang]++
          }
          break
          
          // no default
      }
      
      switch(ele.type) {
        case ELEMENT_GLOSS:
          ops.push({
            insert: '\n',
            attributes: {
              gloss:  {
                elementId: ele.id,
                place: ele.placement
              }
            }
          })
          break;
          
          case ELEMENT_ADDITION:
            //onsole.log("Addition element")
            //console.log(ele)
          ops.push({
            insert: '\n',
            attributes: {
              additionelement:  {
                elementId: ele.id,
                place: ele.placement,
                target: ele.reference
              }
            }
          })
          break;
          
        default:
          attr[formats[ele.type]] = true
          ops.push({insert: '\n', attributes: attr})
          break;
      }
      
    }
    let mainLang = EditorData.getMainLanguage(languageCounts)
    return { delta: {ops: ops}, mainLang: mainLang, minItemId: minItemId }
  }
  
  static getMainLanguage(languageCounts) {
    let max = 0
    let mainLanguage = false
    for (const lang in languageCounts) {
      if (languageCounts[lang]===0) {
        continue
      }
      if (languageCounts[lang]>= max) {
        max = languageCounts[lang]
        mainLanguage = lang
      }
    }
    return mainLanguage
  }
  
}
