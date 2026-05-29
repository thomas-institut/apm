import Inline from 'quill/blots/inline'

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