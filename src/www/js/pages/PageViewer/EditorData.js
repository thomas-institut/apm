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



/* exported EditorData */
import { TranscriptionEditor } from './TranscriptionEditor'
import {
  ELEMENT_ADDITION, ELEMENT_CUSTODES,
  ELEMENT_GLOSS, ELEMENT_HEAD,
  ELEMENT_INVALID,
  ELEMENT_LINE,
  ELEMENT_LINE_GAP, ELEMENT_PAGE_NUMBER,
  ELEMENT_SUBSTITUTION
} from './Element'
import { ITEM_TEXT } from './Item'

export class EditorData {
  
  static getApiDataFromQuillDelta(delta, editorInfo) {
    console.log(editorInfo)

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
     */
    function createNewElement() {
      currentItemSeq = 0
      return {
        id: -1,
        pageId: editorInfo.pageId,
        columnNumber: editorInfo.columnNumber,
        lang: editorInfo.defaultLangCode,
        editorTid: editorInfo.editorTid,
        handId: editorInfo.handId,
        type: invalidElementType,
        seq: currentElementSeq++,
        items: [],
        reference: null,
        placement: null
      }
    }
    
    let curElement = createNewElement()
    
      function createNewItem() {
      return {
        id: -1,
        columnElementId: currentElementId,
        seq: currentItemSeq++,
        type: normalTextItemType,
        lang: editorInfo.defaultLangCode,
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
          if (curElement.type !== previousElementType) {
            currentElementId++
          }
          curElement.id = currentElementId
          elements.push(curElement)
          curElement = createNewElement()
        }
        curElement.id = ++currentElementId
        curElement.type = lineGapElementType
        curElement.reference = theInsert.linegap.thelength
        curElement.items = []
        //console.log("Creating line gap element")
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
    // let opsCounter = 0
    for (const entry of ops.entries()) {
      const curOps = entry[1]
      //console.log('[' + (opsCounter++) + '] PROCESSING OPS: ')
      //console.log(curOps)
      if ('attributes' in curOps) {
        // 1. Insert with attributes
        if (curOps.insert === '\n') {
          // 1.a. End of line with attributes
          if (previousElementType === lineGapElementType) {
            // ignore this ops
            //console.log('Ignoring newline with attributes, prev element was line gap')
            previousElementType = -1
            continue
          }
          for (const blockBlot of blockBlots) {
            if (curOps.attributes[blockBlot.name]) {
              let saveId = false
              curElement.type = blockBlot.type
              if (blockBlot.place) {
                curElement.placement = curOps.attributes[blockBlot.name].place
                saveId = true
              }
              if (blockBlot.target) {
                curElement.reference = curOps.attributes[blockBlot.name].target
                saveId = true
              }
              if (saveId) {
                curElement.id = curOps.attributes[blockBlot.name].elementId
              }
              break
            }
          }

          if (curElement.type === invalidElementType) {
            console.warn('WARNING: Quill -> API : single newline without valid attribute')
            console.warn(JSON.stringify(curOps))
          }
          if (curElement.id === -1) {
            if (previousElementType !== curElement.type) {
              currentElementId++
            } 
            curElement.id = currentElementId
          }
          //console.log("Creating block element, type " + curElement.type)
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
          continue // 1.b.i
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
        continue // 1.b.ii
      }

      // 2. Insert without attributes
      if (typeof curOps.insert === 'string') {
        // 2.a. Insert text without attributes, possibly including new lines
        let text = curOps.insert
        // First take care of line gaps
        if (previousElementType===lineGapElementType) {
          if (!text.includes('\n')) {
            console.warn("Quill -> API: Found an insert without newlines after a lineGap, this is really odd! Skipping")
            previousElementType = -1
            continue
          }
          if (text === '\n') {
            // This is the normal case and it's quick to check
            //console.log("Single newline after lineGap found, skipping")
            previousElementType = -1
            continue
          }
          
          // Check the text inserted after the lineGap
          // all text up to a required new line must be ignored, the rest must be processed 
          // as if a normal "insert"
          
          // eat up all text up to the first newline 
          text = text.replace(/^.*\n/, '')
          if (text === '') {
            // after lineGap, there is some text plus a new line, ignore and continue
            // to next entry
            previousElementType = -1
            continue
          }
          // at this point, we know that the insert after the lineGap contains 
          // possibly some text, the required new line plus some other text.
          // Just move on to processing this text as if it was a normal insert,
          // but remove any trailing new line so that there's no empty line elements
          previousElementType = -1
          //console.log("Found text + newline + additionalText after lineGap. Odd, but OK, will process additional text")
          if (curOps.insert.match(/^\n.*/)) {
            // remove any trailing new line
            //console.log('Text after lineGap starts with a new line')
            curOps.insert = curOps.insert.replace(/^\n/, '')
          }
        }
          
        curElement.type = mainTextElementType
        let normalizedText = curOps.insert.replace(/\n+/g, '\n')
        text = normalizedText.replace(/\n$/, '')
        //console.log('Normalized text: "' + text + '"')
        if (text !== '') {
          // curOps.insert !== '\n' , that is, there is text in the insert
          // that needs to be put in text items
          let lines = text.split('\n')
          let lastLine = lines.pop()
          if (lines.length !== 0 ) {
            let linesText = lines.join('\n')
            //console.log({lines: lines, lastLine: lastLine, linesText: linesText})
            if (linesText !== '') {
              const item = createNewItem()
              item.type = normalTextItemType
              item.theText = linesText 
              curElement.items.push(item)
            } 
            
            // create a new mainTextElement
            //if (previousElementType !== lineGapElementType) {
              //console.log("Creating line element")
              curElement.type = mainTextElementType
              if (previousElementType !== curElement.type) {
                currentElementId++
              }
              curElement.id = currentElementId
              elements.push(curElement)
              previousElementType = curElement.type
              curElement = createNewElement()
//            }
//            else {
//              console.log("No element created from all but lastLine because prev element is lineGap")
//            }
          }
          const item = createNewItem()
          item.type = normalTextItemType
          item.theText = lastLine
          curElement.items.push(item) 
        }
        if (text !== normalizedText) {
          // text ends in a new line, create a new mainTextElement 
          // if there are items to store
          if (curElement.items.length > 0) {
            curElement.type = mainTextElementType
            if (previousElementType !== curElement.type) {
              currentElementId++
            }
            curElement.id = currentElementId
            elements.push(curElement)
            previousElementType = curElement.type
            curElement = createNewElement()
          }
        }
        continue  // 2.a.
      }
      // 2.b. Insert non-textual item without attributes
      processNonTextualItem(curOps)
      // 2.b.
    } // processing of ops.entries
    
    // Check if there are elements to store
    if (curElement.items.length !== 0) {
      //console.log("Pushing trailing element")
      elements.push(curElement)
    }
    
    // Implode elements with the same id, adding new line items
    // between them
    let processedElements = []
    let currentElement = undefined
    let currentSeq = 0
    //console.log("Before imploding elements...")
    //console.log(elements)
    for (const ele of elements) {
      if (currentElement===undefined || ele.id !== currentElement.id) {
        if (currentElement !== undefined) {
          currentElement.seq = currentSeq++
          processedElements.push(currentElement)
        }
        currentElement = ele
        continue
      }
      // still in the same element id
      // add a new line and ele.items
      let lastItemSeq = currentElement.items[currentElement.items.length-1].seq
      currentElement.items.push({
        id: -1,
        columnElementId: currentElement.id,
        seq: ++lastItemSeq,
        type: normalTextItemType,
        lang: editorInfo.defaultLang,
        handId: 0,
        theText: '\n',
        altText: null,
        extraInfo: null,
        length: null,
        target: null
      })
      for (const item of ele.items) {
        item.seq = ++lastItemSeq
        currentElement.items.push(item)
      }
    }
    if (currentElement !== undefined) {
      currentElement.seq = currentSeq++
      processedElements.push(currentElement)
    }
    
    // filter out stray notes
    const filteredEdnotes = []
    for (const note of editorInfo.edNotes) {
      if (itemIds.includes(note.target)) {
        filteredEdnotes.push(note)
      } else {
        console.warn('WARNING: Quill -> API : stray editorial note')
        console.warn(note)
      }
    }
    return {elements: processedElements, ednotes: filteredEdnotes, people: editorInfo.people, info: editorInfo.info}
  }


  static getTranscriptionEditorDataFromApiData(columnData, editorId, langDef, minItemId)
  {

    function getTargetText(targetTexts, itemId) {
      let index = targetTexts.map( (tt) => {return tt.id}).indexOf(itemId)
      return index === -1 ? '[none]' : targetTexts[index].text
    }

    function getItemTypesThatCanBeTargets() {
      return TranscriptionEditor.formatBlots
      .filter( (blot) => { return blot.canBeTarget === undefined ? false : blot.canBeTarget })
      .map( (blot) => { return blot.type })
    }

    function generateNewLineOpsForElement(ele, formats, targetTexts) {
      const attr = {}
      switch(ele.type) {
        case ELEMENT_GLOSS:
           return {
            insert: '\n',
            attributes: {
              gloss:  {
                elementId: ele.id,
                place: ele.placement
              }
            }
          }

        case ELEMENT_ADDITION:
          return {
            insert: '\n',
            attributes: {
              additionelement:  {
                elementId: ele.id,
                place: ele.placement,
                target: ele.reference,
                targetText: getTargetText(targetTexts, parseInt(ele.reference))
              }
            }
          }

        case ELEMENT_SUBSTITUTION:
          return {
            insert: '\n',
            attributes: {
              substelement:  {
                elementId: ele.id,
                place: ele.placement,
                target: ele.reference,
                targetText: getTargetText(targetTexts, parseInt(ele.reference))
              }
            }
          }

        default:
          attr[formats[ele.type]] = true
          return {insert: '\n', attributes: attr}
      }
    }

    function getTargetTexts(columnData) {
      let targetTypes = getItemTypesThatCanBeTargets()
      let targets = []
      columnData.elements.forEach( (ele) => {
        ele.items.forEach( (item) => {
          if (targetTypes.indexOf(item.type) !== -1 ) {
            targets.push( {
              id: item.id,
              type: item.type,
              text: item.theText
            })
          }
        })
      })
      return targets
    }

    // console.log(`getTranscriptionEditorDataFromApiData`)
    const ops = []
    const formats = []
    // const additionTargetTexts = []
    let formatBlots = TranscriptionEditor.formatBlots
    // let blockBlots = TranscriptionEditor.blockBlots
    let imageBlots = TranscriptionEditor.imageBlots


    let targetTexts = getTargetTexts(columnData)
    console.log(`Target texts`)
    console.log(targetTexts)


    // notice that we're using the language code here, not the entity id!
    // items currently still use codes
    let languageCounts = {}
    langDef.forEach( (langDefEntry) => {
      languageCounts[langDefEntry['code']] = 0;
    });


    formats[ELEMENT_HEAD] = 'headelement'
    formats[ELEMENT_CUSTODES] = 'custodes'
    formats[ELEMENT_PAGE_NUMBER] = 'pagenumber'

    for (const ele of columnData.elements) {
      // const attr = {}
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
        case ELEMENT_SUBSTITUTION:
        case ELEMENT_PAGE_NUMBER:
          for (const item of ele.items) {
            minItemId = Math.min(minItemId, item.id)
            // Simple format blots
            let foundBlot = false
            for (const theBlot of formatBlots) {
              if (theBlot.type === item.type) {
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
                  // console.log(`There is a target for item inside element: ${item.target}`)
                  // console.log(additionTargetTexts)
                  theOps.attributes[theBlot.name].target = item.target
                  theOps.attributes[theBlot.name].targetText = getTargetText(targetTexts, item.target)
                }
                ops.push(theOps)
                languageCounts[item.lang]++
                foundBlot = true
                break
              }
            }
            if (foundBlot) {
              // we found a format blot for the item, we're done with it, move on to next item
              continue
            }
            // let's see if the item can be represented by an image blot
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
              // we found an image blot for the item, move on to the next item
              continue
            }
            // is it a text item?
            if (item.type === ITEM_TEXT) {
              let curString = ''
              // look for line breaks in the item's text and generate the appropriate block blots
              for (let i=0; i < item.theText.length; i++) {
                if (item.theText.charAt(i) === '\n') {
                  if (curString !== '') {
                    ops.push({
                      insert: curString,
                      attributes: {
                        lang: item.lang
                      }
                    })
                  }
                  ops.push(generateNewLineOpsForElement(ele, formats, targetTexts))
                  curString = ''
                }
                else {
                  curString += item.theText.charAt(i)
                }
              }
              if (curString !== '') {
                ops.push({
                  insert: curString,
                  attributes: {
                    lang: item.lang
                  }
                })
              }
            } else {
              console.warn('Unrecognized item type ' + item.type + ' when setting editor data')
            }
            languageCounts[item.lang]++
          }
          break
      }
      // generate a line break with the appropriate block blot
      ops.push(generateNewLineOpsForElement(ele, formats, targetTexts))
    }
    let mainLang = EditorData.getMainLanguage(languageCounts)
    return { delta: {ops: ops}, mainLang: mainLang, minItemId: minItemId }
  }
  
  static getMainLanguage(languageCounts) {
    console.log(`Getting main language`, languageCounts)
    let max = 0
    let mainLanguage = false
    for (const lang in languageCounts) {
      if (!languageCounts.hasOwnProperty(lang)) {
        continue
      }
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
