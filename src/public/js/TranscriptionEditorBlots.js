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


class SimpleImgBlot extends BlockEmbed {
  static create (value) {
    const node = super.create()
    node.setAttribute('itemid', value.itemid)
    node.setAttribute('editorid', value.editorid)
    if (value.extrainfo !== undefined) {
      node.setAttribute('extrainfo', value.extrainfo)
    }
    if (value.length !== undefined) {
      node.setAttribute('length', value.length)
    }
    node.setAttribute('alt', this.imageAlt)
    node.setAttribute('title', this.title)
    const size = Math.round(((this.size-1)*0.2+1)*14)
    node.setAttribute('src', this.getImageUrl(TranscriptionEditor.baseUrl, size, value))
    if (this.withPopover) {
      TranscriptionEditor.setUpPopover(node, this.title, '', value.editorid, value.itemid, true)
    }
    return node
  }

  static value (node) {
    let value = {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
    if (this.extrainfo !== undefined) {
      value.extrainfo = node.getAttribute('extrainfo')
    }
    if (this.length !== undefined) {
      value.length = node.getAttribute('length')
    }
    return value
  }
 }
SimpleImgBlot.tagName = 'img'