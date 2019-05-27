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

class MarginalBlockBlot extends SimpleBlockBlot
{
  static create(value) {
    const node = super.create(value)
    const id = value.elementId
    node.setAttribute('elementid', id)
    if (value.place !== undefined) {
      node.setAttribute('place', value.place)
    }
    // Target is special, need to write also a text
    if (value.target !== undefined) {
      node.setAttribute('target', value.target)
      let tText = value.targetText
      if (tText === undefined) {
        tText = '[none]'
      }
      node.setAttribute('targettext', tText)
    }
    return node
  }
  
  static formats(node) {
    let value = {
      elementId: node.getAttribute('elementid')
    }
    if (this.place !== undefined) {
      value.place = node.getAttribute('place')
    }
    if (this.target !== undefined) {
      value.target = node.getAttribute('target')
      value.targetText = node.getAttribute('targettext')
    }
    return value
  }
}

class SimpleFormatBlot extends Inline {
    static create (value) {
      const node = super.create()
      node.setAttribute('itemid', value.itemid)
      node.setAttribute('editorid', value.editorid)
      if (value.handid === undefined) {
        value.handid = 0
      }
      node.setAttribute('handid', value.handid)
      if (value.handid !== 0) {
        $(node).addClass('hand' + value.handid)
      }
    
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
      // Target is special, need to write also a text
      if (value.target !== undefined) {
        node.setAttribute('target', value.target)
        node.setAttribute('targettext', value.targetText)
        popoverSecondaryHtml += '<b>' + this.target.title + '</b>: <br/>' +
                value.targetText + '<br/>'
      }
      popoverSecondaryHtml += '<b>Hand</b>: ' + (parseInt(value.handid)+1) + '<br/>'
      TranscriptionEditor.setUpPopover(node, this.title, popoverSecondaryHtml, value.editorid, value.itemid)
      return node
    }

  static formats (node) {
    let value = {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid'),
      handid: node.getAttribute('handid')
    }
    if (this.alttext !== undefined) {
      value.alttext = node.getAttribute('alttext')
    }
    if (this.extrainfo !== undefined) {
      value.extrainfo = node.getAttribute('extrainfo')
    }
    if (this.target !== undefined) {
      value.target = node.getAttribute('target')
      value.targetText = node.getAttribute('targettext')
    }
    return value
  }
}
SimpleFormatBlot.tagName = 'b'
SimpleFormatBlot.title = 'Generic Format'


class SimpleImgBlot extends BlockEmbed {
  static create (value) {
    const node = super.create()
    if (SimpleImgBlot.lastId===undefined) {
        SimpleImgBlot.lastId = 0
    }
    SimpleImgBlot.lastId++
    let uniqueId = SimpleImgBlot.lastId
    let htmlId = 'sib-' + value.editorid + '-' + uniqueId
    node.setAttribute('id', htmlId)
    node.setAttribute('itemid', value.itemid)
    
    node.setAttribute('editorid', value.editorid)
    if (value.text !== undefined) {
      node.setAttribute('bltext', value.text)
    }
    if (value.alttext !== undefined) {
      node.setAttribute('alttext', value.alttext)
    }
    if (value.extrainfo !== undefined) {
      node.setAttribute('extrainfo', value.extrainfo)
    }
    if (value.target !== undefined) {
      node.setAttribute('target', value.target)
    }
    if (value.thelength !== undefined) {
      node.setAttribute('length', value.thelength)
    }
    node.setAttribute('alt', this.imageAlt)
    node.setAttribute('title', this.title)
    const size = Math.round(((this.size-1)*0.2+1)*14)
    node.setAttribute('src', this.getImageUrl(TranscriptionEditor.baseUrl, size, value))
    if (this.withPopover) {
      let popoverSecondaryHtml = ''
      if (value.alttext !== undefined) {
        if (value.alttext !== '') {
          popoverSecondaryHtml += '<br/><b>' + this.alttext.title + '</b>: <br/><span class="prominent">' +
                value.alttext + '</span><br/>'
        }
      }
      if (value.thelength !== undefined) {
        popoverSecondaryHtml += '<b>' + this.thelength.title + '</b>: ' + value.thelength + '<br/>'
      }
      if (value.extrainfo !== undefined) {
        popoverSecondaryHtml += '<b>' + this.extrainfo.title + '</b>: ' + value.extrainfo + '<br/>'
      }
      TranscriptionEditor.setUpPopover(node, this.title, popoverSecondaryHtml, value.editorid, value.itemid, true)
    }
    if (this.renumberLinesOnImageLoad) {
      TranscriptionEditor.setOnLoadCallback(node, this.name, value)
    }
    
    return node
  }

  static value (node) {
    let value = {
      itemid: node.getAttribute('itemid'),
      editorid: node.getAttribute('editorid')
    }
    if (this.text !== undefined) {
      value.text = node.getAttribute('bltext')
    }
    if (this.alttext !== undefined) {
      value.alttext = node.getAttribute('alttext')
    }
    if (this.extrainfo !== undefined) {
      value.extrainfo = node.getAttribute('extrainfo')
    }
    if (this.target !== undefined) {
      value.target = node.getAttribute('target')
    }
    if (this.thelength !== undefined) {
      value.thelength = node.getAttribute('length')
    }
    return value
  }
 }
SimpleImgBlot.tagName = 'img'