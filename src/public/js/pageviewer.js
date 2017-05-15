/*
 * Copyright (C) 2016-7 Universität zu Köln
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

/* eslint-env jquery */

/* global Item */

var minDocumentFontSize = 8
var maxDocumentFontSize = 64
var currentDocumentFontSize = 12

var pageNumber
var docId
var apiBase
var numColumns

var cols = []

$(function () {
  $('div.split-pane').splitPane()
})

$(document).ready(function () {
  reportedFS = $('#right-component').css('font-size')
  currentDocumentFontSize = /\d+/.exec(reportedFS)
  apiGetColumnInfoUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/numcolumns'
  apiAddColumnUrl = apiBase + '/api/' + docId + '/' +
            pageNumber + '/newcolumn'

  setupEditItemModal()

  $('#realAddColumnButton').click(function () {
    console.log('I should add a column now!')
    $.getJSON(apiAddColumnUrl, function (resp) {
      location.replace('')
    })
  })

  $.getJSON(apiGetColumnInfoUrl, function (resp) {
    var col
    numColumns = resp
    if (numColumns === 0) {
      $('#pageinfoTab').addClass('active')
    } else {
      let theUl = ''
      for (col = 1; col <= numColumns; col++) {
        theUl += '<li id="colheader' + col + '">'
        theUl += '<a data-toggle="tab" href="#col' + col +
                        '">Column ' + col + '</a></li>'
      }
      $('#tabsUl').append(theUl)

      $('.nav-tabs a').click(function () {
        $(this).tab('show')
      })

      cols = []
      for (col = 1; col <= numColumns; col++) {
        var theDiv
        theDiv = '<div class="textcol tab-pane'
        if (col === 1) {
          theDiv += ' active'
        }
        theDiv += '" id="col' + col + '"></div>'
        $('#theTabs').append(theDiv)
        $.getJSON(apiBase + '/api/' + docId + '/' + pageNumber +
                        '/' + col + '/elements', function (resp) {
          var tc
          var theCol = resp.info['col']
          cols[theCol] = {}
          cols[theCol]['elements'] = resp.elements
          cols[theCol]['ednotes'] = resp.ednotes
          cols[theCol]['people'] = resp.people
          tc = buildPageTextContainer(theCol, resp.elements,
                            resp.ednotes, resp.people)
          $('#col' + theCol).html(tc['text'])
          setupTooltips(tc['tooltips'])
          if (theCol === 1) {
            $('#colheader' + theCol).tab('show')
          }
        })
      }
    }
  })
})

function buildPageTextContainer (colNumber, elements, ednotes, people) {
  function hasEdnotes (id, notes) {
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].target === id) {
        return true
      }
    }
    return false
  }

  if (elements.length === 0) {
    return {'text': '<p class="notranscription">' +
                    'No transcription available for this column</p>',
      'tooltips': []}
  }

  let rtl = isElementRtl(elements)
  let s = '<table class="textlines">'

  let richTooltips = {}
  for (let i = 0; i < elements.length; i++) {
    let elementHtmlId = 'element' + elements[i].id
    richTooltips[elementHtmlId] = {}
    richTooltips[elementHtmlId].text = ''
    richTooltips[elementHtmlId].type = 'element'
    let nLabel = ''
    let title = ''
    switch (elements[i].type) {
            // ColumnElement::LINE
      case 1:
        nLabel = elements[i].reference
        title = 'Line'
        break

                // ColumnElement::HEAD
      case 2:
        nLabel = 'H'
        title = 'Head'
        break

                // ColumnElement::CUSTODES:
      case 5:
        nLabel = 'C'
        title = 'Custodes'
        break

                // ColumnElement::GLOSS:
      case 3:
        nLabel = 'G'
        title = 'Gloss'
        break

      default:
        nLabel = 'Unk'
        title = 'Unsupported Element'
    }

    richTooltips[elementHtmlId].text += '<b>Transcriber:</b>' +
                people[elements[i].editorId].fullname +
                '<br/><b>Date/Time:</b>' +
                elements[i].timestamp

    s = s + '<tr>'
    let seqtd = '<td class="linenumber">' +
                '<div id="' + elementHtmlId + '" ' +
                'title="' + title + '">' +
                nLabel +
                '</div>' +
                '</td>'

    let theText = ''
    for (let j = 0; j < elements[i].items.length; j++) {
      let item = elements[i].items[j]
      let htmlId = 'item' + item.id
      let itemHasEdnotes = hasEdnotes(item.id, ednotes)
      theText += Item.getItemSpan(item, itemHasEdnotes)
      richTooltips[htmlId] = Item.getItemPopover(item, ednotes, people, colNumber, elements[i].id)
      richTooltips[htmlId]['text'] += getItemPopoverButtonText(item, colNumber, i, j)
    } // for all items
    let texttd = '<td class="text-' + elements[i].lang + '">' +
                theText + '</td>'
    if (rtl) {
      s = s + texttd + seqtd
    } else {
      s = s + seqtd + texttd
    }
    s = s + '</tr>'
  }

  s += '</table>'
  return {'text': s, 'tooltips': richTooltips}
}

function getItemPopoverButtonText (item, colNumber, elementArrayKey, itemArrayKey) {
    // Edit / close buttons
  return `<button class="btn btn-primary btn-xs" 
           data-toggle="modal"
           data-target="#editItemModal"
           data-itemid="` + item.id + `"
           data-colnumber="` + colNumber + `"
           data-elementkey="` + elementArrayKey + `"
           data-itemkey="` + itemArrayKey + `"
           type="button"> 
           Edit / Add Notes
            </button> 
          <button class="btn btn-xs"
             onclick="closePopover(this);"
             type="button"> 
           Close
            </button>`
}

function setupTooltips (richTooltips) {
  Object.keys(richTooltips).forEach(function (key, index) {
    switch (richTooltips[key].type) {
      case 'ednote':
        $('#' + key).popover({
          title: 'Inline Note',
          content: richTooltips[key]['text'],
          container: '#container',
          html: true,
          placement: 'auto',
          trigger: 'manual'})
        $('#' + key).on('click', function (e) { $(this).popover('toggle') })
        break

      case 'element':
        $('#' + key).popover({
          content: richTooltips[key]['text'],
          container: '#container',
          html: true,
          placement: 'auto left',
          trigger: 'click'})

        break
      default:
        $('#' + key).popover({
          content: richTooltips[key]['text'],
          container: '#container',
          html: true,
          placement: 'auto',
          trigger: 'manual'})
        $('#' + key).on('click', function (e) { $(this).popover('toggle') })
    }
  })
}

function isElementRtl (elements) {
  let r = false
  let rtl = 0
  let ltr = 0
  for (let i = 0; i < elements.length; i++) {
    switch (elements[i].lang) {
      case 'he':
      case 'ar':
        rtl++
        break

      default:
        ltr++
    }
  }
  if (rtl > ltr) {
    r = true
  }

  return r
}

function isItemRtl (item) {
  let r = false
  switch (item.lang) {
    case 'he':
    case 'ar':
      r = true
  }
  return r
}

function setupEditItemModal () {
  $('#editItemModal').on('show.bs.modal', function (event) {
    let button = $(event.relatedTarget) // Button that triggered the modal
    let itemId = button.data('itemid')
    let colNumber = button.data('colnumber')
    let elementKey = button.data('elementkey')
    let element = cols[colNumber]['elements'][elementKey]
    let itemKey = button.data('itemkey')
    let item = element.items[itemKey]
        // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
        // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    let modal = $(this)
    modal.find('#editItemData').text('Item ID: ' + item.id + ', column ' + colNumber + ', element ID ' + element.id)
    modal.find('#text').val(item.theText)
    modal.find('#alttext').val(item.altText)
    if (isItemRtl(item)) {
      modal.find('#textLabel').addClass('edit-rtl')
      modal.find('#text').addClass('edit-rtl')
      modal.find('#alttext').addClass('edit-rtl')
    }
  })
}

function closePopover (closeButton) {
    // $(closeButton.parentNode.parentNode).popover('toggle');
  $(closeButton.parentNode.parentNode).popover('hide')
}

function changeDocumentFontSize (bigger) {
  newFS = currentDocumentFontSize

  if (bigger && currentDocumentFontSize < maxDocumentFontSize) {
    newFS++
  } else if (!bigger && currentDocumentFontSize > minDocumentFontSize) {
    newFS--
  }
  if (newFS !== currentDocumentFontSize) {
    for (var i = 1; i <= numColumns; i++) {
      $('#col' + i).css('font-size', newFS)
    }

    currentDocumentFontSize = newFS
  }
}
