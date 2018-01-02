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
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP, ELEMENT_INVALID, ITEM_CHARACTER_GAP, ITEM_PARAGRAPH_MARK, ITEM_MATH_TEXT */

/* exported EditorData */
class EditorData {
  
  static getApiDataFromQuillDelta(delta, editorInfo, blockBlots, formatBlots) {
    const ops = delta.ops
    const elements = []
    const itemIds = []
    let currentItemSeq = 0
    let currentElementSeq = 0
    let currentElementId = 0
    
    let previousElementType = ELEMENT_INVALID
    
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
        type: ELEMENT_INVALID,
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
        type: ITEM_TEXT,
        lang: editorInfo.defaultLang,
        handId: 0,
        theText: '',
        altText: null,
        extraInfo: null,
        length: null,
        target: null
      }
    }
    
    /**
     * 
     * @param {type} curOps an Ops object from Quill
     * @returns {Boolean} false on error
     */
    function processNonTextualItem(curOps) {
      const theInsert = curOps.insert
      if ('linegap' in curOps.insert) {
        if (curElement.items.length > 0) {
          // this means the line gap does not have newline before
          // which is possible in Quill
          curElement.type = ELEMENT_LINE
          elements.push(curElement)
          curElement = createNewElement()
        }
        curElement.type = ELEMENT_LINE_GAP
        curElement.reference = theInsert.linegap.thelength
        curElement.items = []
        elements.push(curElement)
        previousElementType = ELEMENT_LINE_GAP
        curElement = createNewElement()
        return true
      }
      
      const item = createNewItem()
      if ('mark' in theInsert) {
        item.type = ITEM_MARK
        item.id = theInsert.mark.itemid
      }
      if ('chgap' in curOps.insert) {
        item.type = ITEM_CHARACTER_GAP
        item.id = theInsert.chgap.itemid
        item.length = theInsert.chgap.thelength
      }
      if ('nowb' in curOps.insert) {
        item.type = ITEM_NO_WORD_BREAK
        item.id = theInsert.nowb.itemid
      }
      if ('illegible' in curOps.insert) {
        item.type = ITEM_ILLEGIBLE
        item.id = theInsert.illegible.itemid
        item.extraInfo = theInsert.illegible.extrainfo
        item.length = parseInt(theInsert.illegible.thelength)
      }
      if ('chunkmark' in curOps.insert) {
        item.type = ITEM_CHUNK_MARK
        item.id = theInsert.chunkmark.itemid
        item.altText = theInsert.chunkmark.alttext
        item.target = parseInt(theInsert.chunkmark.target)
        item.theText = theInsert.chunkmark.text
      }
      if ('pmark' in theInsert) {
        item.type = ITEM_PARAGRAPH_MARK
        item.id = theInsert.pmark.itemid
      }
      item.id = parseInt(item.id)
      itemIds.push(item.id)
      curElement.items.push(item)
      return true
    }

    for (const entry of ops.entries()) {
      //console.log('Processing ops ' + i)
      //console.log(JSON.stringify(curOps))
      const curOps = entry[1]
      if ('attributes' in curOps) {
        if (curOps.insert === '\n') {
          //
          // End of element, element.type !== ELEMENT_LINE
          //
          //console.log("Insert is newline with attributes")
          if (previousElementType === ELEMENT_LINE_GAP) {
            // ignore this ops
            console.warn('WARNING: Quill 2 API : Ignoring newline, prev element was line gap')
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
          // Simple block elements
          for (const blockBlot of blockBlots) {
            if (curOps.attributes[blockBlot.name]) {
              curElement.type = blockBlot.type
            }
          }

          if (curElement.type === ELEMENT_INVALID) {
            console.warn('WARNING: Quill 2 API : single newline without valid attribute')
            console.warn(JSON.stringify(curOps))
          }
          
          //console.log(curElement)
          elements.push(curElement)
          previousElementType = curElement.type
          curElement = createNewElement()
          continue;
        } 
        
        // Insert can be text or a  gap
        
        if (typeof curOps.insert !== 'string') {
          processNonTextualItem(curOps)
          continue
        }
        
        //
        // Item with some text in it
        //
        //
        //console.log("insert is text with attributes")
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
//        if (curOps.attributes.addition) {
//          item.type = ITEM_ADDITION
//          item.extraInfo = curOps.attributes.addition.place
//          item.id = curOps.attributes.addition.itemid
//          item.target = curOps.attributes.addition.target
//        }
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
              const item = createNewItem()
              item.type = ITEM_TEXT
              item.theText = text
              // no need to push the item id to itemIds
              curElement.items.push(item) 
              text = ''
            }
            if (curElement.items.length > 0) {
              //console.log("Storing element")
              curElement.type = ELEMENT_LINE
              elements.push(curElement)
              previousElementType = curElement.type
              curElement = createNewElement()
            } else if (previousElementType === ELEMENT_LINE_GAP) {
              console.warn('INFO: Quill 2 API : Ignoring newline, prev element was line gap')
            } else {
              console.warn('INFO: Quill 2 API : Ignoring newline, no items')
            }
            // continue to next character
            continue 
          }
          // character is not a new line
          text += curOps.insert[i]
        }
        // Store last item if there's text
        if (text !== '') {
          //console.log('Creating new text item')
          const item = createNewItem()
          item.type = ITEM_TEXT
          item.theText = text
          // no need to push the item id to itemIds
          curElement.items.push(item) 
          text = ''
        }
        // continue to next ops
        continue 
      }
      
      processNonTextualItem(curOps)
     
    }

    // filter out stray notes
    const filteredEdnotes = []
    //console.log(itemIds)
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
  /**
   * Builds an  
   * @param {Object} columnData
   * @param {int} editorId
   * @param {Object} langDef
   * @param {int} minItemId
   * @param {array} formatBlots
   * @returns {delta, mainLanguage, minItemId}
   */
  static getEditorDataFromApiData(columnData, editorId, langDef, minItemId, formatBlots)
  {
    const ops = []
    const formats = []
    const additionTargetTexts = []
    
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
            switch (item.type) {
              case ITEM_TEXT:
                ops.push({
                  insert: item.theText,
                  attributes: {
                    lang: item.lang
                  }
                })
                break

              case ITEM_MARK:
                ops.push({
                  insert: {
                    mark: {
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break
                
              case ITEM_NO_WORD_BREAK:
                ops.push({
                  insert: {
                    nowb: {
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break

//              case ITEM_ADDITION:
//                ops.push({
//                  insert: item.theText,
//                  attributes: {
//                    addition: {
//                      extrainfo: item.extraInfo,
//                      target: item.target,
//                      targetText: additionTargetTexts[item.target],
//                      itemid: item.id,
//                      editorid: editorId
//                    },
//                    lang: item.lang
//                  }
//                })
//                break

              case ITEM_ILLEGIBLE:
                ops.push({
                  insert: {
                    illegible: {
                      thelength: item.length,
                      extrainfo: item.extraInfo,
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break
                
              case ITEM_CHUNK_MARK:
                ops.push({
                  insert: {
                    chunkmark: {
                      alttext: item.altText,
                      text: item.theText,
                      target: item.target,
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break
                
              case ITEM_CHARACTER_GAP: 
                ops.push({
                  insert: {
                    chgap: {
                      thelength: item.length,
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break;
                
              case ITEM_PARAGRAPH_MARK:
                ops.push({
                  insert: {
                    pmark: {
                      itemid: item.id,
                      editorid: editorId
                    }
                  }
                })
                break
                
              default:
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
  
}
