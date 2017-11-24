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

/* global Quill, TranscriptionEditor */

const Inline = Quill.import('blots/inline')
const BlockEmbed = Quill.import('blots/embed')
const Block = Quill.import('blots/block')

class SimpleBlockBlot extends Block 
{
  static formats()
  {
    return true
  }
 }
SimpleBlockBlot.tagName = 'p'

class SimpleFormatBlot extends Inline {
    static create (value) {
      const node = super.create()
      node.setAttribute('itemid', value.itemid)
      node.setAttribute('editorid', value.editorid)
      TranscriptionEditor.setUpPopover(node, SimpleFormatBlot.title, '', value.editorid, value.itemid)
      return node
    }

  static formats (node) {
    return {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
  }
}
SimpleFormatBlot.tagName = 'b'
SimpleFormatBlot.title = 'Generic Format'



class HeadBlot extends SimpleBlockBlot {}
class PageNumberBlot extends SimpleBlockBlot{}
class CustodesBlot extends SimpleBlockBlot{}

TranscriptionEditor.registerBlockBlot(HeadBlot, { name: 'headelement', title: 'Head', icon: 'H'} )
TranscriptionEditor.registerBlockBlot(PageNumberBlot, { name: 'pagenumber', title: 'Page Number', icon: 'P'} )
TranscriptionEditor.registerBlockBlot(CustodesBlot, { name: 'custodes', title: 'Custodes', icon: 'C'} )


//class RubricBlot extends Inline {
//  static create (value) {
//    const node = super.create()
//    node.setAttribute('itemid', value.itemid)
//    node.setAttribute('editorid', value.editorid)
//    TranscriptionEditor.setUpPopover(node, 'Rubric', '', value.editorid, value.itemid)
//    return node
//  }
//
//  static formats (node) {
//    return {
//      itemid: node.getAttribute('itemid'),
//      editorid: node.getAttribute('editorid')
//    }
//  }
//}
//
//RubricBlot.blotName = 'rubric'
//RubricBlot.tagName = 'b'
//RubricBlot.className = 'rubric'
//Quill.register(RubricBlot)

class RubricBlot extends SimpleFormatBlot {}

RubricBlot.blotName = 'rubric'
RubricBlot.className = 'rubric'
RubricBlot.prototype.title = 'Rubric'

Quill.register(RubricBlot)