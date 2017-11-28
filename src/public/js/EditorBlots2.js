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

/* global Quill, TranscriptionEditor, ITEM_RUBRIC, ITEM_INITIAL, ITEM_GLIPH, ITEM_MATH_TEXT, ELEMENT_HEAD, ELEMENT_PAGE_NUMBER, ELEMENT_CUSTODES, ITEM_SIC, ITEM_ABBREVIATION, ITEM_UNCLEAR, Item, ITEM_DELETION */

const Inline = Quill.import('blots/inline')
const BlockEmbed = Quill.import('blots/embed')
const Block = Quill.import('blots/block')

class LangBlot extends Inline {
  static create (lang) {
    const node = super.create()
    node.setAttribute('lang', lang)
    let classes = $(node).attr('class').split(' ')
    for (let i = 0; i < classes.length; i++) {
      if (classes[i].endsWith('-text')) {
        $(node).removeClass(classes[i])
      }
    }
    $(node).addClass(lang + '-text')
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
      let popoverSecondaryHtml = ''
      if (value.alttext !== undefined) {
        node.setAttribute('alttext', value.alttext)
        if (value.alttext !== '') {
          popoverSecondaryHtml += '<b>' + this.alttext.title + '</b>: <br/><span class="prominent">' +
                value.alttext + '</span><br/>'
        }
      }
      if (value.extrainfo !== undefined) {
        node.setAttribute('extrainfo', value.extrainfo)
        popoverSecondaryHtml += '<b>' + this.extrainfo.title + '</b>: <br/>' +
                value.extrainfo + '<br/>'
      }
      TranscriptionEditor.setUpPopover(node, this.title, popoverSecondaryHtml, value.editorid, value.itemid)
      return node
    }

  static formats (node) {
    let value = {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
    if (this.alttext !== undefined) {
      value.alttext = node.getAttribute('alttext')
    }
    if (this.extrainfo !== undefined) {
      value.extrainfo = node.getAttribute('extrainfo')
    }
    return value
  }
}
SimpleFormatBlot.tagName = 'b'
SimpleFormatBlot.title = 'Generic Format'


class RubricBlot extends SimpleFormatBlot {}
class InitialBlot extends SimpleFormatBlot {}
class GliphBlot extends SimpleFormatBlot {}
class MathTextBlot extends SimpleFormatBlot {}
class SicBlot extends SimpleFormatBlot {}
class AbbrBlot extends SimpleFormatBlot {}
class UnclearBlot extends SimpleFormatBlot {}
class DeletionBlot extends SimpleFormatBlot {}

class HeadBlot extends SimpleBlockBlot {}
class PageNumberBlot extends SimpleBlockBlot{}
class CustodesBlot extends SimpleBlockBlot{}

TranscriptionEditor.registerFormatBlot(RubricBlot, { type: ITEM_RUBRIC, name: 'rubric', title: 'Rubric', icon: 'R'} )
TranscriptionEditor.registerFormatBlot(InitialBlot, { type: ITEM_INITIAL, name: 'initial', title: 'Initial', icon: 'I'} )
TranscriptionEditor.registerFormatBlot(GliphBlot, { type: ITEM_GLIPH, name: 'gliph', title: 'Gliph', icon: 'G'} )
TranscriptionEditor.registerFormatBlot(MathTextBlot, { type: ITEM_MATH_TEXT, name: 'mathtext', title: 'Math Text', icon: 'M'} )
TranscriptionEditor.registerFormatBlot(SicBlot, { 
  type: ITEM_SIC, 
  name: 'sic', 
  title: 'Sic', 
  icon: '<i class="fa fa-frown-o"></i>',
  alttext : { title: 'Correction' }
})
TranscriptionEditor.registerFormatBlot(AbbrBlot, { 
  type: ITEM_ABBREVIATION, 
  name: 'abbr', 
  title: 'Abbreviation', 
  icon: '<i class="fa fa-hand-spock-o">',
  alttext : { title: 'Expansion' }
})

TranscriptionEditor.registerFormatBlot(UnclearBlot, { 
  type: ITEM_UNCLEAR, 
  name: 'unclear', 
  title: 'Unclear', 
  icon: '<i class="fa fa-low-vision"></i>',
  alttext : { title: 'Alt. Reading' },
  extrainfo: { title: 'Reason', options : Item.getValidUnclearReasons() }
})

TranscriptionEditor.registerFormatBlot(DeletionBlot, { 
  type: ITEM_DELETION, 
  name: 'deletion', 
  title: 'Deletion', 
  icon: '<i class="fa fa-minus-square"></i>',
  extrainfo: { title: 'Technique', options : Item.getValidDeletionTechniques() }
})


TranscriptionEditor.registerBlockBlot(HeadBlot, { type: ELEMENT_HEAD, name: 'headelement', title: 'Head', icon: 'H'} )
TranscriptionEditor.registerBlockBlot(PageNumberBlot, { type: ELEMENT_PAGE_NUMBER, name: 'pagenumber', title: 'Page Number', icon: 'P'} )
TranscriptionEditor.registerBlockBlot(CustodesBlot, { type: ELEMENT_CUSTODES, name: 'custodes', title: 'Custodes', icon: 'C'} )


