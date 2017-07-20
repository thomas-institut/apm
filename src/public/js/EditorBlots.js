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


/* global Twig, Quill, ELEMENT_LINE, ELEMENT_HEAD, ELEMENT_CUSTODES */
/* global ELEMENT_GLOSS, ELEMENT_PAGE_NUMBER, ITEM_TEXT, ITEM_MARK */
/* global ITEM_RUBRIC, ITEM_GLIPH, ITEM_INITIAL, ITEM_SIC, ITEM_ABBREVIATION */
/* global ITEM_DELETION, Item, ITEM_ADDITION, ITEM_UNCLEAR, ITEM_ILLEGIBLE, ELEMENT_PAGENUMBER */
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP, MarkBlot */
/* global IllegibleBlot, NoWordBreakBlot, ChunkMarkBlot, LineGapBlot, _, GlossBlot, EditorData, TranscriptionEditor */

let Inline = Quill.import('blots/inline')
let BlockEmbed = Quill.import('blots/embed')
let Block = Quill.import('blots/block')
let Clipboard = Quill.import('modules/clipboard');
let Delta = Quill.import('delta');




class LangBlot extends Inline {
  static create (lang) {
    let node = super.create()
    node.setAttribute('lang', lang)
    for (const l of ['ar', 'he', 'la']) {
      if (l === lang) {
        $(node).addClass(l + 'text')
        continue
      }
      $(node).removeClass(l + 'text')
    }
    return node
  }

  static formats (node) {
    return node.getAttribute('lang')
  }
}

LangBlot.blotName = 'lang'
LangBlot.tagName = 'em'
LangBlot.className = 'language'
Quill.register(LangBlot)

class RubricBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Rubric', '', value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

RubricBlot.blotName = 'rubric'
RubricBlot.tagName = 'b'
RubricBlot.className = 'rubric'
Quill.register(RubricBlot)

class GliphBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Gliph', '', value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

GliphBlot.blotName = 'gliph'
GliphBlot.tagName = 'b'
GliphBlot.className = 'gliph'
Quill.register(GliphBlot)

class InitialBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Initial', '', value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

InitialBlot.blotName = 'initial'
InitialBlot.tagName = 'b'
InitialBlot.className = 'initial'
Quill.register(InitialBlot)

class AdditionBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('place', value.place)
    node.setAttribute('target', value.target)
    let targetText = 'N/A'
    if (value.target === -1) {
      targetText = '[none]'
    } else {
      if (value.targetText) {
        targetText = value.targetText
      }
    }
    TranscriptionEditor.setUpPopover(node, 'Addition',
                '<b>Place</b>: ' + value.place +
                '<br/><b>Replaces</b>: ' + targetText, value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid'),
      place: node.getAttribute('place'),
      target: parseInt(node.getAttribute('target'))
    }
  }
}

AdditionBlot.blotName = 'addition'
AdditionBlot.tagName = 'b'
AdditionBlot.className = 'addition'
Quill.register(AdditionBlot)

class DeletionBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('technique', value.technique)
    TranscriptionEditor.setUpPopover(node, 'Deletion',
                '<b>Technique</b>: ' + value.technique, value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid'),
      technique: node.getAttribute('technique')
    }
  }
}

DeletionBlot.blotName = 'deletion'
DeletionBlot.tagName = 'b'
DeletionBlot.className = 'deletion'
Quill.register(DeletionBlot)

class SicBlot extends Inline {
  static create (value) {
    let node = super.create()
    if (value.correction === ' ') {
      node.setAttribute('correction', ' ')
      node.setAttribute('itemid', value.itemid)
      node.setAttribute('editorid', value.editorid)
      TranscriptionEditor.setUpPopover(node, 'Sic', '', value.editorid, value.itemid)
      return node
    }
    node.setAttribute('correction', value.correction)
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Sic', '<b>Correction</b>: ' +
                value.correction, value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      correction: node.getAttribute('correction'),
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

SicBlot.blotName = 'sic'
SicBlot.tagName = 'b'
SicBlot.className = 'sic'
Quill.register(SicBlot)

class AbbrBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('expansion', value.expansion)
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Abbreviation', '<b>Expansion</b>: ' +
                value.expansion, value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      expansion: node.getAttribute('expansion'),
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

AbbrBlot.blotName = 'abbr'
AbbrBlot.tagName = 'b'
AbbrBlot.className = 'abbr'
Quill.register(AbbrBlot)

class UnclearBlot extends Inline {
  static create (value) {
    let node = super.create()
    node.setAttribute('reading2', value.reading2)
    node.setAttribute('reason', value.reason)
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Unclear', '<b>Alt. Reading</b>: ' +
                value.reading2 + '<br/><b>Reason</b>:' + value.reason, value.editorid, value.itemid)
    return node
  }

  static formats (node) {
    return {
      reading2: node.getAttribute('reading2'),
      reason: node.getAttribute('reason'),
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

UnclearBlot.blotName = 'unclear'
UnclearBlot.tagName = 'b'
UnclearBlot.className = 'unclear'
Quill.register(UnclearBlot)

class IllegibleBlot extends BlockEmbed {
  
  static create (value) {
    let node = super.create()
    node.setAttribute('reason', value.reason)
    node.setAttribute('length', value.length)
    node.setAttribute('alt', 'Illegible')
    let size = Math.round(((IllegibleBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', IllegibleBlot.baseUrl + '/api/images/illegible/' + size + '/' + value.length)
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    TranscriptionEditor.setUpPopover(node, 'Illegible', '<b>Length</b>: ' +
                value.length + '<br/><b>Reason</b>:' + value.reason, value.editorid, value.itemid, true)
    return node
  }

  static value (node) {
    return {
      length: node.getAttribute('length'),
      reason: node.getAttribute('reason'),
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}

IllegibleBlot.blotName = 'illegible'
IllegibleBlot.tagName = 'img'
IllegibleBlot.className = 'illegible'
Quill.register(IllegibleBlot)

class MarkBlot extends BlockEmbed {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('alt', 'Comment')
    let size = Math.round(((MarkBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', MarkBlot.baseUrl + '/api/images/mark/' + size)
    TranscriptionEditor.setUpPopover(node, 'Note', '', value.editorid, value.itemid, true)
    return node
  }

  static value (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
 }
MarkBlot.blotName = 'mark'
MarkBlot.tagName = 'img'
MarkBlot.className = 'mark'
Quill.register(MarkBlot)

class ChunkMarkBlot extends BlockEmbed {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('dareid', value.dareid)
    node.setAttribute('chunkno', value.chunkno)
    node.setAttribute('type', value.type)
    node.setAttribute('alt', value.type + ' ' + value.dareid + '-' + value.chunkno)
    let size = Math.round(((ChunkMarkBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', ChunkMarkBlot.baseUrl + 
            '/api/images/chunkmark/' +
            value.dareid + '/' +
            value.chunkno + '/' +
            value.type + '/' +
            ChunkMarkBlot.dir + '/' +
            size)
    TranscriptionEditor.setUpPopover(node, 'Chunk ' + value.type, '', value.editorid, value.itemid, true)
    //console.log("Creating chunk mark ")
    //console.log(value)
    return node
  }

  static value (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid'),
      dareid: node.getAttribute('dareid'),
      chunkno: node.getAttribute('chunkno'),
      type: node.getAttribute('type')
    }
  }
 }
ChunkMarkBlot.blotName = 'chunkmark'
ChunkMarkBlot.tagName = 'img'
ChunkMarkBlot.className = 'chunkmark'
Quill.register(ChunkMarkBlot)


class CharacterGapBlot extends BlockEmbed {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('length', value.length)
    node.setAttribute('alt', 'Gap')
    node.setAttribute('title', 'Gap')
    let size = Math.round(((CharacterGapBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', CharacterGapBlot.baseUrl + '/api/images/charactergap/' + value.length + '/' + size)
    //TranscriptionEditor.setUpPopover(node, 'Note', '', value.editorid, value.itemid, true)
    return node
  }

  static value (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid'),
      length: node.getAttribute('length')
    }
  }
 }
CharacterGapBlot.blotName = 'chgap'
CharacterGapBlot.tagName = 'img'
CharacterGapBlot.className = 'chgap'
Quill.register(CharacterGapBlot)



class NoWordBreakBlot extends BlockEmbed {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('alt', 'No Word Break')
    let size = Math.round(((NoWordBreakBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', NoWordBreakBlot.baseUrl + '/api/images/nowb/' + size)
    //node.setAttribute('src', NoWordBreakBlot.baseUrl + '/api/images/nowb/16')
    TranscriptionEditor.setUpPopover(node, 'No Word Break', '', value.editorid, value.itemid, true)
    return node
  }

  static value (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
 }
NoWordBreakBlot.blotName = 'nowb'
NoWordBreakBlot.tagName = 'img'
NoWordBreakBlot.className = 'nowb'
Quill.register(NoWordBreakBlot)

class ParagraphMarkBlot extends BlockEmbed {
  static create (value) {
    let node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('alt', 'Paragraph')
    node.setAttribute('title', 'Paragraph')
    let size = Math.round(((ParagraphMarkBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', ParagraphMarkBlot.baseUrl + '/api/images/paragraphmark/' + size)
    return node
  }

  static value (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
 }
ParagraphMarkBlot.blotName = 'pmark'
ParagraphMarkBlot.tagName = 'img'
ParagraphMarkBlot.className = 'pmark'
Quill.register(ParagraphMarkBlot)

class GlossBlot extends Block {
  
  static create(value) {
    let node = super.create(value)
    let id = value.elementId
    node.setAttribute('id', 'gloss' + id)
    node.setAttribute('elementid', id)
    node.setAttribute('place', value.place)
    let ruleIndex = GlossBlot.styleSheet.cssRules.length
    GlossBlot.styleSheet.insertRule('p#gloss' + id +'::before { content: "Gloss @ ' + value.place + '"}', ruleIndex)
    //console.log(GlossBlot.styleSheet)
    return node
  }
  
  static formats(node) {
    return {
      elementId: node.getAttribute('elementid'),
      place: node.getAttribute('place')
    }
  }
}
GlossBlot.blotName = 'gloss'
GlossBlot.tagName = 'p'
GlossBlot.className = 'gloss'
Quill.register(GlossBlot)

class AdditionElementBlot extends Block {
  
  static create(value) {
    let node = super.create(value)
    let id = value.elementId
    node.setAttribute('id', 'add' + id)
    node.setAttribute('elementid', id)
    node.setAttribute('place', value.place)
    node.setAttribute('target', value.target)
    let ruleIndex = GlossBlot.styleSheet.cssRules.length
    GlossBlot.styleSheet.insertRule('p#add' + id +'::before { content: "Addition @ ' + value.place + ', target ' + value.target + '"}', ruleIndex)
    //console.log(GlossBlot.styleSheet)
    return node
  }
  
  static formats(node) {
    return {
      elementId: node.getAttribute('elementid'),
      place: node.getAttribute('place'),
      target: node.getAttribute('target')
    }
  }
}
AdditionElementBlot.blotName = 'additionelement'
AdditionElementBlot.tagName = 'p'
AdditionElementBlot.className = 'additionelement'
Quill.register(AdditionElementBlot)


class HeadBlot extends Block { 
  static formats (node) {
    return true
  }  
}
HeadBlot.blotName = 'head'
HeadBlot.tagName = 'p'
HeadBlot.className = 'headelement'
Quill.register(HeadBlot)

class CustodesBlot extends Block { 
  static formats (node) {
    return true
  }  
}
CustodesBlot.blotName = 'custodes'
CustodesBlot.tagName = 'p'
CustodesBlot.className = 'custodes'
Quill.register(CustodesBlot)

class PageNumberBlot extends Block { 
  static formats (node) {
    return true
  }  
}
PageNumberBlot.blotName = 'pagenumber'
PageNumberBlot.tagName = 'p'
PageNumberBlot.className = 'pagenumber'
Quill.register(PageNumberBlot)


class LineGapBlot extends BlockEmbed {
  static create(value) {
    let node = super.create()
    node.setAttribute('editorid', value.editorid)
    node.setAttribute('linecount', value.linecount)
    node.setAttribute('alt', 'Line Gap')
    let size = Math.round(((LineGapBlot.size-1)*0.2+1)*14)
    node.setAttribute('src', LineGapBlot.baseUrl + '/api/images/linegap/' + value.linecount + '/' + size)
    return node;
  }

  static value(node) {
    return {
      editorid: node.getAttribute('editorid'),
      linecount: node.getAttribute('linecount')
    };
  }
}
LineGapBlot.blotName = 'linegap'
LineGapBlot.tagName = 'img'
LineGapBlot.className = 'linegap'
Quill.register(LineGapBlot)