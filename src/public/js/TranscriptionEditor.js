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

/* eslint-env jquery */

/* global Twig, Quill, ELEMENT_LINE, ELEMENT_HEAD, ELEMENT_CUSTODES */
/* global ELEMENT_GLOSS, ELEMENT_PAGE_NUMBER, ITEM_TEXT, ITEM_MARK */
/* global ITEM_RUBRIC, ITEM_GLIPH, ITEM_INITIAL, ITEM_SIC, ITEM_ABBREVIATION */
/* global ITEM_DELETION, Item, ITEM_ADDITION, ITEM_UNCLEAR, ITEM_ILLEGIBLE, ELEMENT_PAGENUMBER */
/* global ITEM_NO_WORD_BREAK, ITEM_CHUNK_MARK, ELEMENT_ADDITION, ELEMENT_LINE_GAP, MarkBlot */
/* global IllegibleBlot, NoWordBreakBlot, ChunkMarkBlot, LineGapBlot, _, GlossBlot, EditorData, ITEM_CHARACTER_GAP, CharacterGapBlot, ParagraphMarkBlot, ITEM_MATH_TEXT */


class TranscriptionEditor {
  constructor (containerSelector, id, baseUrl, editorId = 1,
            defaultLang = 'la', handId = 0, sizeGuide = {}) {
    this.id = id
    this.editorId = editorId
    this.handId = handId
    this.pageId = -1
    this.columnNumber = -1
    this.edNotes = []
    this.people = []
    this.maxItemId = 0
    this.baseUrl = baseUrl
    this.minItemId = 0
    this.minNoteId = 0
    this.enabled = false
     
    this.containerSelector = containerSelector
    this.sizeGuide = sizeGuide
    
    this.templateLoaded = false
    let thisObject = this
    TranscriptionEditor.editors[editorId] = thisObject

    MarkBlot.baseUrl = baseUrl
    IllegibleBlot.baseUrl = baseUrl
    NoWordBreakBlot.baseUrl = baseUrl
    ChunkMarkBlot.baseUrl = baseUrl
    LineGapBlot.baseUrl = baseUrl
    CharacterGapBlot.baseUrl = baseUrl
    ParagraphMarkBlot.baseUrl = baseUrl
    if (!TranscriptionEditor.editorTemplate) {
      TranscriptionEditor.editorTemplate = Twig.twig({
        id: 'editor',
        href: baseUrl + '/templates/editor.twig',
        async: false
      })
    }
    
    if (!TranscriptionEditor.modalsTemplate) {
      TranscriptionEditor.modalsTemplate = Twig.twig({
        id: 'editor-modals',
        href: baseUrl + '/templates/editor-modals.twig',
        async: false
      })
    }

    let editorHtml = TranscriptionEditor.editorTemplate.render({id: id})
    $(containerSelector).html(editorHtml)
    // Disable drag and drop in editor (too many issues)
    $(containerSelector).on('dragstart drag dragend drop', function (e){
      return false
    })
    $(window).on('resize', function (e){
      console.log("Resizing")
      console.log($(containerSelector + ' .ql-editor').height())
      return false
    })
    
    this.setFontSize(3)
    let modalsHtml = TranscriptionEditor.modalsTemplate.render({id: id})
    $('body').append(modalsHtml)

    let quillObject = new Quill('#editor-container-' + id, {})
    this.quillObject = quillObject
    this.disable()
    
    this.resizeEditor()
    
    let styleElement = document.createElement('style')
    document.head.appendChild(styleElement)
    this.styleSheet = styleElement.sheet
    GlossBlot.styleSheet = this.styleSheet

    $('#item-modal-' + id).modal({show: false})
    $('#alert-modal-' + id).modal({show: false})
    $('#save-button-' + id).hide()
    $('#reset-button-' + id).hide()

    quillObject.on('selection-change', function (range, oldRange, source) {
      if (!range) {
        return false
      }
      //console.log("Selection: @" + range.index + ", l=" + range.length)
      let hasFormat = TranscriptionEditor.selectionHasFormat(quillObject, range)
      //console.log("Has format: " + hasFormat)
      if (range.length === 0) {
        $('.selFmtBtn').prop('disabled', true)
        thisObject.setDisableLangButtons(true)
        $('#edit-button-' + id).prop('disabled', true)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#note-button-' + id).prop('disabled', true)
          $('#illegible-button-' + id).prop('disabled', true)
          $('#nowb-button-' + id).prop('disabled', true)
          $('#chunk-start-button-' + id).prop('disabled', true)
          $('#chunk-end-button-' + id).prop('disabled', true)
          $('#edit-button-' + id).prop('disabled', false)
          return false
        }
        $('#note-button-' + id).prop('disabled', false)
        $('#illegible-button-' + id).prop('disabled', false)
        $('#nowb-button-' + id).prop('disabled', false)
        $('#chunk-start-button-' + id).prop('disabled', false)
        $('#chunk-end-button-' + id).prop('disabled', false)

        return false
      }
      // Selection's length >= 1
      
      $('#note-button-' + id).prop('disabled', true)
      $('#illegible-button-' + id).prop('disabled', true)
      $('#nowb-button-' + id).prop('disabled', true)
      $('#chunk-start-button-' + id).prop('disabled', true)
      $('#chunk-end-button-' + id).prop('disabled', true)
      
      let text = quillObject.getText(range)
      if (text.search('\n') !== -1) {
        // Selection includes new lines
        $('.selFmtBtn').prop('disabled', true)
        thisObject.setDisableLangButtons(false)
        return false
      }
      // Selection does not include new lines
      thisObject.setDisableLangButtons(false)
      if (hasFormat) {
        $('.selFmtBtn').prop('disabled', true)
        $('#clear-button-' + id).prop('disabled', false)
        if (TranscriptionEditor.rangeIsInMidItem(quillObject, range)) {
          $('#edit-button-' + id).prop('disabled', false)
          $('#clear-button-' + id).prop('disabled', true)
          return false
        }
        $('#edit-button-' + id).prop('disabled', true)
      } else {
        $('.selFmtBtn').prop('disabled', false)
        $('#edit-button-' + id).prop('disabled', true)
        $('#clear-button-' + id).prop('disabled', true)
      }
    })

    quillObject.on('text-change', function (delta, oldDelta, source) {
      
      if (!thisObject.enabled) {
        return false
      }
      if (!_.isEqual(quillObject.getContents(), thisObject.lastSavedData)) {
        thisObject.setContentsChanged()
      } else {
        thisObject.setContentsNotChanged()
      }
      if (delta.ops.length === 2) {
        if (delta.ops[0].retain) {
          if (delta.ops[1].delete) {
//            console.log('Text has been deleted at pos ' +
//                            delta.ops[0].retain + ', ' + delta.ops[1].delete +
//                            ' characters')
            let deletionRanges = TranscriptionEditor.getDeletionRanges(oldDelta.ops)
            let coveredDeletions =
                                TranscriptionEditor.getCoveredDeletions(deletionRanges,
                                    delta.ops[0].retain,
                                    delta.ops[1].delete
                                    )
            if (coveredDeletions.length > 0) {
              let theOps = quillObject.getContents().ops
              for (const del of coveredDeletions) {
                let add = TranscriptionEditor.getAdditionRangeByTarget(theOps, del.id)
                if (add) {
//                  console.log('Updating addition ' + add.id)
//                  console.log(add)
                  quillObject.formatText(
                                            add.index,
                                            add.length,
                                            'addition', {
                                              itemid: add.id,
                                              editorid: thisObject.id,
                                              place: add.place,
                                              target: -1
                                            })
                } else {
                  //console.log('No addition associated with deletion ' + del.id)
                }
              }
            }
            TranscriptionEditor.hideAllPopovers()
          }
        }
      }
    })
    $('#ar-button-' + id).click(function () {
      quillObject.format('lang', 'ar')
      let range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
    })

    $('#la-button-' + id).click(function () {
      quillObject.format('lang', 'la')
      let range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
    })

    $('#he-button-' + id).click(function () {
      quillObject.format('lang', 'he')
      let range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
    })

    $('#rubric-button-' + id).click(
            TranscriptionEditor.genSimpleFormatClickFunction(thisObject, quillObject, 'rubric')
        )

    $('#mathtext-button-' + id).click(
            TranscriptionEditor.genSimpleFormatClickFunction(thisObject, quillObject, 'mathtext')
        )
    $('#gliph-button-' + id).click(
            TranscriptionEditor.genSimpleFormatClickFunction(thisObject, quillObject, 'gliph')
        )
    $('#initial-button-' + id).click(
            TranscriptionEditor.genSimpleFormatClickFunction(thisObject, quillObject, 'initial')
        )

    $(containerSelector).on('dblclick', '.rubric',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )
    $(containerSelector).on('dblclick', '.gliph',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )
    $(containerSelector).on('dblclick', '.initial',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )
    $(containerSelector).on('dblclick', '.sic',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )

    $(containerSelector).on('dblclick', '.abbr',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )

    $(containerSelector).on('dblclick', '.deletion',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )

    $(containerSelector).on('dblclick', '.addition',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )

    $(containerSelector).on('dblclick', '.unclear',
            TranscriptionEditor.genSimpleDoubleClickFunction(thisObject, quillObject)
        )

    $('#note-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Note')
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
                // Take care of notes!
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          let itemId = thisObject.getOneItemId()
          thisObject.addNewNote(itemId, noteText)
          quillObject.insertEmbed(range.index, 'mark', {
            itemid: itemId,
            editorid: thisObject.id
          })
          quillObject.setSelection(range.index + 1)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })

    $(containerSelector).on('dblclick', '.mark',
            TranscriptionEditor.genEmbedDoubleClickFunction(thisObject, quillObject))

    $(containerSelector).on('dblclick', '.illegible',
            TranscriptionEditor.genEmbedDoubleClickFunction(thisObject, quillObject))

    $('#clear-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (TranscriptionEditor.selectionHasFormat(quillObject, range)) {
        $('#alert-modal-title-' + this.id).html('Please confirm')
        $('#alert-modal-submit-button-' + thisObject.id).html('Clear formatting')
        $('#alert-modal-cancel-button-' + thisObject.id).html('Cancel')
        $('#alert-modal-text-' + thisObject.id).html(
                        'Are you sure you want to clear formatting of this text?</p><p>Formats and notes will be lost.</p><p class="text-danger">This can NOT be undone!')
        $('#alert-modal-submit-button-' + thisObject.id).off()
        $('#alert-modal-submit-button-' + thisObject.id).on('click', function () {
          $('#alert-modal-' + thisObject.id).modal('hide')
          TranscriptionEditor.removeFormat(quillObject, range)
        })
        $('#alert-modal-' + thisObject.id).modal('show')
      } else {
        TranscriptionEditor.removeFormat(quillObject, range)
      }
    })

    $('#sic-button-' + id).click(function () {
      let range = quillObject.getSelection()
      let text = quillObject.getText(range.index, range.length)
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Sic')
      $('#item-modal-text-' + thisObject.id).html(text)
      $('#item-modal-text-fg-' + thisObject.id).show()
      $('#item-modal-alttext-label-' + thisObject.id).html('Correction:')
      $('#item-modal-alttext-' + thisObject.id).val('')
      $('#item-modal-alttext-fg-' + thisObject.id).show()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        let correction = $('#item-modal-alttext-' + thisObject.id).val()
        if (correction === '') {
          correction = ' '
        }
        let itemid = thisObject.getOneItemId()
        quillObject.format('sic', {
          correction: correction,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + range.length)
                // Take care of notes!
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })

    $('#abbr-button-' + id).click(function () {
      let range = quillObject.getSelection()
      let text = quillObject.getText(range.index, range.length)
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Abbreviation')
      $('#item-modal-text-' + thisObject.id).html(text)
      $('#item-modal-text-fg-' + thisObject.id).show()
      $('#item-modal-alttext-' + thisObject.id).val('')
      $('#item-modal-alttext-label-' + thisObject.id).html('Expansion:')
      $('#item-modal-alttext-fg-' + thisObject.id).show()
      $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      $('#item-modal-ednotes-' + thisObject.id).html('')
      $('#item-note-' + thisObject.id).val('')
      $('#item-note-time-' + thisObject.id).html('New note')
      $('#item-note-id-' + thisObject.id).val('new')
      $('#item-modal-submit-button-' + thisObject.id).off()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        let expansion = $('#item-modal-alttext-' + thisObject.id).val()
        if (expansion === '') {
          expansion = ' '
        }
        let itemid = thisObject.getOneItemId()
        quillObject.format('abbr', {
          expansion: expansion,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + range.length)
                // Take care of notes!
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })

    $('#unclear-button-' + id).click(function () {
      let range = quillObject.getSelection()
      let text = quillObject.getText(range.index, range.length)
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Unclear')
      $('#item-modal-text-' + thisObject.id).html(text)
      $('#item-modal-text-fg-' + thisObject.id).show()
      $('#item-modal-alttext-label-' + thisObject.id).html('Alt. Reading:')
      $('#item-modal-alttext-' + thisObject.id).val('')
      $('#item-modal-alttext-fg-' + thisObject.id).show()

      $('#item-modal-text-fg-' + thisObject.id).show()
      $('#item-modal-extrainfo-label-' + thisObject.id).html('Reason:')
      $('#item-modal-extrainfo-fg-' + thisObject.id).show()
      let optionsHtml = ''
      for (const reason of Item.getValidUnclearReasons()) {
        optionsHtml += '<option value="' + reason + '"'
        if (reason === 'unclear') {
          optionsHtml += ' selected'
        }
        optionsHtml += '>' + reason + '</option>'
      }
      $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)

      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        let reading2 = $('#item-modal-alttext-' + thisObject.id).val()
        if (reading2 === '') {
          reading2 = ' '
        }
        let itemid = thisObject.getOneItemId()
        let reason = $('#item-modal-extrainfo-' + thisObject.id).val()
        quillObject.format('unclear', {
          reading2: reading2,
          reason: reason,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + range.length)
                // Take care of notes!
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })
    
    $('#chunk-start-button-' + id).click(TranscriptionEditor.genChunkButtonFunction(thisObject, quillObject, 'start'))
    $('#chunk-end-button-' + id).click(TranscriptionEditor.genChunkButtonFunction(thisObject, quillObject, 'end'))

    $('#illegible-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Illegible')
      $('#item-modal-extrainfo-label-' + thisObject.id).html('Reason:')
      $('#item-modal-extrainfo-fg-' + thisObject.id).show()
      let optionsHtml = ''
      for (const reason of Item.getValidIllegibleReasons()) {
        optionsHtml += '<option value="' + reason + '"'
        if (reason === 'illegible') {
          optionsHtml += ' selected'
        }
        optionsHtml += '>' + reason + '</option>'
      }
      $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
      $('#item-modal-length-fg-' + thisObject.id).show()
      $('#item-modal-length-' + thisObject.id).val(4)

      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        let itemid = thisObject.getOneItemId()
        let reason = $('#item-modal-extrainfo-' + thisObject.id).val()
        let length = $('#item-modal-length-' + thisObject.id).val()
        quillObject.insertEmbed(range.index, 'illegible', {
          length: length,
          reason: reason,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
                // Take care of notes!
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })
    
    $('#pcircledot-button-'+ id).click(function () {
      let range = quillObject.getSelection()
      quillObject.insertText(range.index, '⊙')
      quillObject.setSelection(range.index + 1)
    })
    $('#chgap-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      quillObject.insertEmbed(range.index, 'chgap', {
          length: 5,
          itemid: thisObject.getOneItemId(),
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
    })
    
    $('#pmark-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      quillObject.insertEmbed(range.index, 'pmark', {
          itemid: thisObject.getOneItemId(),
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
    })    

    $('#edit-button-' + id).click(function () {
      let currentRange = quillObject.getSelection()
      let [blot, offset] = quillObject.getLeaf(currentRange.index+1)
      let range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)

      let format = quillObject.getFormat(range)
      let text = quillObject.getText(range.index, range.length)
      let altText = ''
      let itemid = -1
      let additionTargets = []
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Unknown')
      if (format.abbr) {
        altText = format.abbr.expansion
        itemid = format.abbr.itemid
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
        $('#item-modal-alttext-' + thisObject.id).val(altText)
        $('#item-modal-alttext-label-' + thisObject.id).html('Expansion:')
        $('#item-modal-alttext-fg-' + thisObject.id).show()
        $('#item-modal-title-' + thisObject.id).html('Abbreviation')
      }
      if (format.sic) {
        altText = format.sic.correction
        itemid = format.sic.itemid
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
        $('#item-modal-alttext-' + thisObject.id).val(altText)
        $('#item-modal-alttext-label-' + thisObject.id).html('Correction')
        $('#item-modal-alttext-fg-' + thisObject.id).show()
        $('#item-modal-title-' + thisObject.id).html('Sic')
      }
      if (format.unclear) {
        altText = format.unclear.reading2
        itemid = format.unclear.itemid
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-extrainfo-label-' + thisObject.id).html('Reason:')
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const reason of Item.getValidUnclearReasons()) {
          optionsHtml += '<option value="' + reason + '"'
          if (reason === format.unclear.reason) {
            optionsHtml += ' selected'
          }
          optionsHtml += '>' + reason + '</option>'
        }
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
        $('#item-modal-alttext-' + thisObject.id).val(altText)
        $('#item-modal-alttext-label-' + thisObject.id).html('Alt. Reading')
        $('#item-modal-alttext-fg-' + thisObject.id).show()
        $('#item-modal-title-' + thisObject.id).html('Unclear')
      }
      if (format.deletion) {
        itemid = format.deletion.itemid
        let technique = format.deletion.technique
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-alttext-fg-' + thisObject.id).hide()
        $('#item-modal-extrainfo-label-' + thisObject.id).html('Technique:')
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const tech of Item.getValidDeletionTechniques()) {
          optionsHtml += '<option value="' + tech + '"'
          if (tech === technique) {
            optionsHtml += ' selected'
          }
          optionsHtml += '>' + tech + '</option>'
        }
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
        $('#item-modal-title-' + thisObject.id).html('Deletion')
      }
      if (format.addition) {
        itemid = format.addition.itemid
        let target = format.addition.target
        let place = format.addition.place
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-alttext-fg-' + thisObject.id).hide()
        $('#item-modal-extrainfo-label-' + thisObject.id).html('Place:')
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()

        let optionsHtml = ''
        for (const thePlace of Item.getValidAdditionPlaces()) {
          optionsHtml += '<option value="' + thePlace + '"'
          if (thePlace === place) {
            optionsHtml += ' selected'
          }
          optionsHtml += '>' + thePlace + '</option>'
        }
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
        additionTargets = thisObject.getAdditionTargets(itemid)
                // console.log(additionTargets);

        let targetsHtml = ''
        for (const theTarget of additionTargets) {
          targetsHtml += '<option value="' + theTarget.itemid + '"'
          if (theTarget.itemid === target) {
            targetsHtml += ' selected'
          }
          targetsHtml += '>' + theTarget.text + '</option>'
        }
        $('#item-modal-target-' + thisObject.id).html(targetsHtml)
        $('#item-modal-target-label-' + thisObject.id).html('Replaces:')
        $('#item-modal-target-fg-' + thisObject.id).show()

        $('#item-modal-title-' + thisObject.id).html('Addition')
      }
      if (format.rubric) {
        itemid = format.rubric.itemid
        $('#item-modal-title-' + thisObject.id).html('Rubric')
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-alttext-fg-' + thisObject.id).hide()
        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      }
      if (format.initial) {
        itemid = format.initial.itemid
        $('#item-modal-title-' + thisObject.id).html('Initial')
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-alttext-fg-' + thisObject.id).hide()
        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      }
      if (format.gliph) {
        itemid = format.gliph.itemid
        $('#item-modal-title-' + thisObject.id).html('Gliph')
        $('#item-modal-text-fg-' + thisObject.id).show()
        $('#item-modal-alttext-fg-' + thisObject.id).hide()
        $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      }

      TranscriptionEditor.setupNotesInItemModal(thisObject, itemid)
      $('#item-modal-text-' + thisObject.id).html(text)

      $('#item-modal-cancel-button-' + thisObject.id).on('click', function () {
                // $('#item-modal-' + thisObject.id).modal('hide');
        quillObject.setSelection(currentRange)
      })
      $('#item-modal-submit-button-' + thisObject.id).off()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
                // First, take care of the value
        if (format.sic) {
          let altText = $('#item-modal-alttext-' + thisObject.id).val()
          if (altText === '') {
            altText = ' '
          }
          quillObject.format('sic', {correction: altText, itemid: itemid, editorid: thisObject.id })
        }
        if (format.abbr) {
          let altText = $('#item-modal-alttext-' + thisObject.id).val()
          if (altText === '') {
            altText = ' '
          }
          quillObject.format('abbr', {expansion: altText, itemid: itemid, editorid: thisObject.id })
        }
        if (format.unclear) {
          let altText = $('#item-modal-alttext-' + thisObject.id).val()
          if (altText === '') {
            altText = ' '
          }
          let reason = $('#item-modal-extrainfo-' + thisObject.id).val()
          quillObject.format('unclear', {reading2: altText, reason: reason, itemid: itemid, editorid: thisObject.id })
        }
        if (format.deletion) {
          let technique = $('#item-modal-extrainfo-' + thisObject.id).val()
          quillObject.format('deletion', {technique: technique, itemid: itemid, editorid: thisObject.id })
        }
        if (format.addition) {
          let place = $('#item-modal-extrainfo-' + thisObject.id).val()
          let target = parseInt($('#item-modal-target-' + thisObject.id).val())
          let targetText = ''
          for (const someT of additionTargets) {
            if (target === someT.itemid) {
              targetText = someT.text
              break
            }
          }
          quillObject.format('addition', {place: place,
            itemid: itemid,
            editorid: thisObject.id,
            target: target,
            targetText: targetText
          })
        }
        quillObject.setSelection(range.index + range.length)
                // Then, care of editorial notes
        let noteId = $('#item-note-id-' + thisObject.id).val()
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteId === 'new') {
          thisObject.addNewNote(itemid, noteText)
        } else {
          thisObject.updateNote(noteId, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })

    $('#add-above-' + id).click(function () {
      thisObject.setAddition('above')
    })

    $('#add-below-' + id).click(function () {
      thisObject.setAddition('below')
    })

    $('#add-inline-' + id).click(function () {
      thisObject.setAddition('inline')
    })

    $('#add-inspace-' + id).click(function () {
      thisObject.setAddition('inspace')
    })

    $('#add-overflow-' + id).click(function () {
      thisObject.setAddition('overflow')
    })
    
    $('#add-marginleft-' + id).click(function () {
      thisObject.setAddition('margin left')
    })
    
     $('#add-marginright-' + id).click(function () {
      thisObject.setAddition('margin right')
    })

    $('#del-strikeout-' + id).click(function () {
      thisObject.setDeletion('strikeout')
    })
    $('#del-dots-above-' + id).click(function () {
      thisObject.setDeletion('dots-above')
    })
    $('#del-dot-above-dot-under-' + id).click(function () {
      thisObject.setDeletion('dot-above-dot-under')
    })
    $('#del-dots-underneath-' + id).click(function () {
      thisObject.setDeletion('dots-underneath')
    })
    $('#del-dot-above-' + id).click(function () {
      thisObject.setDeletion('dot-above')
    })
    $('#del-line-above-' + id).click(function () {
      thisObject.setDeletion('line-above')
    })
    $('#del-no-sign-' + id).click(function () {
      thisObject.setDeletion('no-sign')
    })
    
    
    $('#nowb-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      let itemId = thisObject.getOneItemId()
      quillObject.insertEmbed(range.index, 'nowb', {
            itemid: itemId,
            editorid: thisObject.id
      })
      quillObject.setSelection(range.index + 1)
    })
    
    $('#line-button-' + id).click(function () {
      quillObject.format('head', false)
      quillObject.format('gloss', false)
      quillObject.format('custodes', false)
      quillObject.format('pagenumber', false)
    })
    
    $('#gloss-top-' + id).click(function () {
      thisObject.setGloss('margin top')
    })
    
    $('#gloss-bottom-' + id).click(function () {
      thisObject.setGloss('margin bottom')
    })
    
    $('#gloss-left-' + id).click(function () {
      thisObject.setGloss('margin left')
    })
    
    $('#gloss-right-' + id).click(function () {
      thisObject.setGloss('margin right')
    })

    $('#head-button-' + id).click(function () {
      quillObject.format('head', true)
    })
    
    $('#custodes-button-' + id).click(function () {
      quillObject.format('custodes', true)
    })
    
    $('#pagenumber-button-' + id).click(function () {
      quillObject.format('pagenumber', true)
    })
    
    $('#linegap-button-' + id).click(function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      TranscriptionEditor.resetItemModal(thisObject.id)
      $('#item-modal-title-' + thisObject.id).html('Line Gap')
      $('#item-modal-text-fg-' + thisObject.id).hide()
      $('#item-modal-alttext-fg-' + thisObject.id).hide()
      $('#item-modal-extrainfo-fg-' + thisObject.id).hide()
      $('#item-modal-length-label-' + thisObject.id).html('Lines not transcribed:')
      $('#item-modal-length-' + thisObject.id).val(1)
      $('#item-modal-length-fg-' + thisObject.id).show()
      $('#item-modal-ednote-fg-' + thisObject.id).hide()
      $('#item-modal-submit-button-' + thisObject.id).off()
      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')
        let count = $('#item-modal-length-' + thisObject.id).val()
        if (count <= 0) {
          console.log("Bad line count for line gap: " + count)
          return false
        }
        thisObject.insertLineGap(range.index, count)
      })
      $('#item-modal-' + thisObject.id).modal('show')
    })

    $('#set-arabic-' + id).click(function () {
      thisObject.setDefaultLang('ar')
      $('#lang-button-' + id).html('ar')
    })

    $('#set-latin-' + id).click(function () {
      thisObject.setDefaultLang('la')
      $('#lang-button-' + id).html('la')
    })

    $('#set-hebrew-' + id).click(function () {
      thisObject.setDefaultLang('he')
      $('#lang-button-' + id).html('he')
    })
    
    $('#toggle-button-'+ id).click(function() {
      thisObject.toggleEnable()
      return true
    });
    
    $('#save-button-' + id).click(function(){
      thisObject.save()
      return true
    });
    
    $('#reset-button-' + id).click(function(){
      thisObject.reset()
      return true
    });
    
    
    $('#zoom-in-button-'+ id).click(function() {
      thisObject.makeTextBigger()
      return true
    });
    
    $('#zoom-out-button-'+ id).click(function() {
      thisObject.makeTextSmaller()
      return true
    });

    this.setDefaultLang(defaultLang)
    thisObject.quillObject = quillObject
    TranscriptionEditor.editors[this.id] = thisObject
    this.saving = false
    this.setContentsNotChanged()
    
  }
  
  setContentsChanged() {
    $('#save-button-' + this.id).prop('disabled', false)
    $('#reset-button-' + this.id).prop('disabled', false)
    this.contentsChanged = true
  }
  
  setContentsNotChanged() {
    $('#save-button-' + this.id).prop('disabled', true)
    $('#reset-button-' + this.id).prop('disabled', true)
    this.contentsChanged = false
  }
  
  setFontSize(size) {
    if (this.fontSize) {
      $('#editor-container-'+this.id).removeClass('fontsize' + this.fontSize)
    }
    $('#editor-container-'+this.id).addClass('fontsize' + size)
    this.fontSize = size
    IllegibleBlot.size = this.fontSize
    NoWordBreakBlot.size = this.fontSize
    MarkBlot.size = this.fontSize
    ChunkMarkBlot.size = this.fontSize
    LineGapBlot.size = this.fontSize
    CharacterGapBlot.size = this.fontSize
    ParagraphMarkBlot.size = this.fontSize
  }
  
  makeTextSmaller() {
    if (this.fontSize > 1) {
      this.setFontSize(this.fontSize-1)
    }
  }
  
  makeTextBigger() {
    if (this.fontSize < 8) {
      this.setFontSize(this.fontSize+1)
    }
  }
  
  enable() {
    this.enabled = true
    $('#toolbar-'+ this.id).show()
    this.quillObject.enable(this.enabled)
    $('#save-button-' + this.id).prop('disabled', true)
    $('#reset-button-' + this.id).prop('disabled', true)
    $('#save-button-' + this.id).show()
    $('#reset-button-' + this.id).show()
    $('#toggle-button-' + this.id).prop('title', 'Leave editor')
    $('#toggle-button-' + this.id).html('<i class="fa fa-power-off"></i>')
    this.resizeEditor()
    this.setContentsNotChanged()
    this.quillObject.setSelection(this.quillObject.getLength())
    let event = new Event('edit-enable')
    $(this.containerSelector).get()[0].dispatchEvent(event)
  }
  
  disable() {
    let thisObject = this
    if (this.contentsChanged) {
      $('#alert-modal-title-' + this.id).html('There are changes to the text')
      $('#alert-modal-text-' + this.id).html(
          '<p>Are you sure you want to leave the editor?</p><p class="text-danger">Changes will be lost!</p>')
      $('#alert-modal-submit-button-' + thisObject.id).html('Yes, leave!')
      $('#alert-modal-cancel-button-' + thisObject.id).html('Cancel')
      $('#alert-modal-submit-button-' + this.id).off()
      $('#alert-modal-submit-button-' + this.id).on('click', function () {
          $('#alert-modal-' + thisObject.id).modal('hide')
          thisObject.enabled = false
          $('#toolbar-' + thisObject.id).hide()
          $('#save-button-' + thisObject.id).hide()
          $('#reset-button-' + thisObject.id).hide()
          $('#toggle-button-' + thisObject.id).prop('title', 'Edit')
          $('#toggle-button-' + thisObject.id).html('<i class="fa fa-pencil"></i>')
          thisObject.quillObject.setContents(thisObject.lastSavedData)
          thisObject.quillObject.enable(thisObject.enabled)
          thisObject.resizeEditor()
          let event = new Event('edit-disable')
          $(thisObject.containerSelector).get()[0].dispatchEvent(event)
        })
      $('#alert-modal-' + this.id).modal('show')
      return true
    }
    this.enabled = false
    $('#toolbar-' + this.id).hide()
    $('#save-button-' + this.id).hide()
    $('#reset-button-' + this.id).hide()
    $('#toggle-button-' + this.id).prop('title', 'Edit')
    $('#toggle-button-' + this.id).html('<i class="fa fa-pencil"></i>')
    this.quillObject.enable(this.enabled)
    this.contentsChanged = false
    this.resizeEditor()
    let event = new Event('edit-disable')
    $(this.containerSelector).get()[0].dispatchEvent(event)
    
  }
  
  save() {
//    let currentContents = this.quillObject.getContents()
//    if (_.isEqual(currentContents, this.lastSavedData)) {
//      console.log("Nothing to save")
//      return true
//    }
    if (!this.contentsChanged) {
      //console.log("Nothing to save")
      return true
    }
    this.saving = true
    $('#save-button-' + this.id).prop('title', 'Saving changes...')
    $('#save-button-' + this.id).html('<i class="fa fa-spinner fa-spin fa-fw"></i>')
    this.quillObject.enable(false)
    let event = new Event('editor-save')
    $(this.containerSelector).get()[0].dispatchEvent(event)
  }
  
  saveSuccess(newData) {
    this.lastSavedData = newData
    this.setData(newData)
    this.setContentsNotChanged()
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Save changes')
    $('#save-button-' + this.id).html('<i class="fa fa-save"></i>')
    this.quillObject.enable(true)
  }
  
  saveFail(reason) {
    this.saving = false
    $('#save-button-' + this.id).prop('title', 'Could not save: ' + reason + ' (click to try again)')
    $('#save-button-' + this.id).html('<span class="fa-stack"><i class="fa fa-save fa-stack-1x"></i><i class="fa fa-exclamation-triangle fa-stack-1x text-danger"></i></span>')
    this.quillObject.enable(true)
  }
  
  reset() {
    this.quillObject.setContents(this.lastSavedData)
    $('#save-button-' + this.id).prop('title', 'Save changes')
    $('#save-button-' + this.id).html('<i class="fa fa-save"></i>')
    let event = new Event('editor-reset')
    $(this.containerSelector).get()[0].dispatchEvent(event)
  }

  toggleEnable() {
    if (this.enabled) {
      this.disable()
    } else {
      this.enable()
    }
  }
  getAdditionTargets (additionId = -1) {
    let ops = this.quillObject.getContents().ops
    let targets = [ {itemid: -1, text: '[none]'}]
    let deletions = []
    let additionTargets = []
    for (const curOps of ops) {
      if (curOps.insert !== '\n' &&
                        'attributes' in curOps) {
        if (curOps.attributes.deletion) {
          deletions.push({
            itemid: parseInt(curOps.attributes.deletion.itemid),
            text: curOps.insert
          })
        }
        if (curOps.attributes.addition) {
          if (curOps.attributes.addition.itemid !== additionId) {
            additionTargets[curOps.attributes.addition.target] = true
          }
        }
      }
    }

    for (const del of deletions) {
      if (!(del.itemid in additionTargets)) {
        targets.push(del)
      }
    }
    return targets
  }

  static statusBarAlert (id, text) {
    $('#status-bar-alert-' + id).html('<i class="fa fa-exclamation-triangle"></i> ' +
                text)
    $('#status-bar-alert-' + id).addClass('alert-danger')
    $('#status-bar-alert-' + id).show()
    $('#status-bar-alert-' + id).fadeOut(3000)
  }

  static selectionHasFormat (quillObject, range) {
    if (range.length < 1) {
      return false
    }
    let delta = quillObject.getContents(range.index, range.length)
    for (const [i, op] of delta.ops.entries()) {
      if (typeof op.insert !== 'object') {
        continue
      }
      for (const type of ['chunkmark', 'nowb', 'mark', 'illegible']) {
        if (type in op.insert) {
          //console.log('Found mark: ' + type)
          return true
        }
      }
    }
    for (let i = range.index; i < range.index + range.length; i++) {
      let format = quillObject.getFormat(i, 1)
      if ($.isEmptyObject(format)) {
        continue
      }
      if (TranscriptionEditor.formatHasItem(format)) {
        return true
      }
    }
    return false
  }

  static formatHasItem (format) {
    for (const type of ['rubric', 'gliph', 'initial', 'sic', 'abbr', 'deletion', 'addition', 'unclear', 'nowb', 'mathtext']) {
      if (type in format) {
        return type
      }
    }
    return false
  }

  static rangeIsInMidItem (quillObject, range) {
 
    let prevFormat = quillObject.getFormat(range.index, 0)
    let nextFormat = quillObject.getFormat(range.index + range.length + 1, 0)
    let prevItem = TranscriptionEditor.formatHasItem(prevFormat)
    let nextItem = TranscriptionEditor.formatHasItem(nextFormat)
    if (prevItem === nextItem) {
      if (prevItem === false) {
        return false
      }
      return true
    }
    return false
  }

  setDeletion (technique) {
    this.quillObject.format('deletion', {
      itemid: this.getOneItemId(),
      editorid: this.id,
      technique: technique
    })
    let range = this.quillObject.getSelection()
    this.quillObject.setSelection(range.index + range.length)
  }
  
  setGloss(place) {
    this.quillObject.format('gloss', {
      elementId: this.getOneItemId(),
      place: place
    })
  }
 
  insertLineGap(position, count) {
    if (position !== 0) {
      this.quillObject.insertText(position, '\n')
      position++
    }
     this.quillObject.insertEmbed(position, 'linegap', {
            editorid: this.id,
            linecount: count
      })
      this.quillObject.insertText(position +1, '\n')
      this.quillObject.setSelection(position +2)
  }
  setAddition (place, target = -1) {
    this.quillObject.format('addition', {
      itemid: this.getOneItemId(),
      editorid: this.id,
      place: place,
      target: target
    })
    let range = this.quillObject.getSelection()
    this.quillObject.setSelection(range.index + range.length)
  }

  static removeFormat (quillObject, range) {
    for (let i = range.index; i < range.index + range.length; i++) {
      let format = quillObject.getFormat(i, 1)
      if ($.isEmptyObject(format)) {
        continue
      }
      let lang = format.lang
      let elementType = ''
      for (const type of ['head', 'gloss', 'custodes']) {
        if (type in format) {
          elementType = type
          break
        }
      }
      quillObject.removeFormat(i, 1)
      quillObject.formatText(i, 1, 'lang', lang)
      if (elementType !== '') {
        quillObject.formatLine(i, 1, elementType, true)
      }
    }
    quillObject.setSelection(range.index + range.length)
  }
  
  
  static genChunkButtonFunction(thisObject, quillObject, type) {
    return function () {
      let range = quillObject.getSelection()
      if (range.length > 0) {
        return false
      }
      $('#chunk-modal-title-' + thisObject.id).html('Chunk ' + type)
      $('#chunk-modal-worknumber-' + thisObject.id).val(1)
      $('#chunk-modal-chunknumber-' + thisObject.id).val(1)

      $('#chunk-modal-submit-button-' + thisObject.id).off()
      $('#chunk-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#chunk-modal-' + thisObject.id).modal('hide')
        let itemid = thisObject.getOneItemId()
        let dareid = 'AW'+ $('#chunk-modal-worknumber-' + thisObject.id).val()
        let chunkno = $('#chunk-modal-chunknumber-' + thisObject.id).val()
        quillObject.insertEmbed(range.index, 'chunkmark', {
          type: type,
          chunkno: chunkno,
          dareid: dareid,
          itemid: itemid,
          editorid: thisObject.id
        })
        quillObject.setSelection(range.index + 1)
                // Take care of notes!
        let noteText = $('#chunk-note-' + thisObject.id).val()
        if (noteText !== '') {
          thisObject.addNewNote(itemid, noteText)
        }
      })
      $('#chunk-modal-' + thisObject.id).modal('show')
    }
  }

  static genSimpleFormatClickFunction (thisObject, quillObject, format) {
    return function () {
      if (!thisObject.enabled) {
        return true
      }
      quillObject.format(format, {
        itemid: thisObject.getOneItemId(),
        editorid: thisObject.id
      })
      let range = quillObject.getSelection()
      quillObject.setSelection(range.index + range.length)
    }
  }

  static genSimpleDoubleClickFunction (thisObject, quillObject) {
    return function (event) {
      if (!thisObject.enabled) {
        return true
      }
      let blot = Quill.find(event.target)
      let range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)
      $('#edit-button-' + thisObject.id).prop('disabled', false)
    }
  }

  static genEmbedDoubleClickFunction (thisObject, quillObject) {
    return function (event) {
      if (!thisObject.enabled) {
        return true
      }
      let blot = Quill.find(event.target)
      let range = {
        index: blot.offset(quillObject.scroll),
        length: blot.length()
      }
      quillObject.setSelection(range)
      let delta = quillObject.getContents(range.index, range.length)
      let unrecognizedEmbed = true
      let itemid = -1
      let length = -1
      let reason = ''
      TranscriptionEditor.resetItemModal(thisObject.id)
      if (delta.ops[0].insert.mark) {
        itemid = delta.ops[0].insert.mark.itemid
        $('#item-modal-title-' + thisObject.id).html('Note')
        unrecognizedEmbed = false
      }
      if (delta.ops[0].insert.illegible) {
        itemid = delta.ops[0].insert.illegible.itemid
        reason = delta.ops[0].insert.illegible.reason
        length = delta.ops[0].insert.illegible.length
        unrecognizedEmbed = false
        $('#item-modal-title-' + thisObject.id).html('Illegible')
        $('#item-modal-extrainfo-label-' + thisObject.id).html('Reason:')
        $('#item-modal-extrainfo-fg-' + thisObject.id).show()
        let optionsHtml = ''
        for (const theReason of Item.getValidIllegibleReasons()) {
          optionsHtml += '<option value="' + theReason + '"'
          if (theReason === reason) {
            optionsHtml += ' selected'
          }
          optionsHtml += '>' + theReason + '</option>'
        }
        $('#item-modal-length-fg-' + thisObject.id).show()
        $('#item-modal-length-' + thisObject.id).val(length)
        $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml)
      }

      if (unrecognizedEmbed) {
        return false
      }

      TranscriptionEditor.setupNotesInItemModal(thisObject, itemid)

      $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
        $('#item-modal-' + thisObject.id).modal('hide')

        if (delta.ops[0].insert.illegible) {
          let reason = $('#item-modal-extrainfo-' + thisObject.id).val()
          let length = $('#item-modal-length-' + thisObject.id).val()
          quillObject.deleteText(range.index, 1)
          quillObject.insertEmbed(range.index, 'illegible', {
            reason: reason,
            length: length,
            itemid: itemid,
            editorid: thisObject.id
          })
        }

                // Take care of notes!
        let noteId = $('#item-note-id-' + thisObject.id).val()
        let noteText = $('#item-note-' + thisObject.id).val()
        if (noteId === 'new') {
          thisObject.addNewNote(itemid, noteText)
        } else {
          thisObject.updateNote(noteId, noteText)
        }
      })
      $('#item-modal-' + thisObject.id).modal('show')
    }
  }
  
  resizeEditor() {
    if (!this.sizeGuide.selector) {
      return false
    }
    let totalHeight = $(this.sizeGuide.selector).height()
    //console.log(this.sizeGuide.selector + ': ' + totalHeight)
    let controlsHeight = $('#editor-controls-' + this.id).height()
    //console.log('Editor controls: '+ controlsHeight)
    let toolbarHeight = $('#toolbar-' + this.id).height()
    if (!this.enabled) {
      toolbarHeight = 0
    }
    //console.log('Toolbar: '+ toolbarHeight)
    //console.log('Offset:' + this.sizeGuide.offset)
    let editorHeight = totalHeight - controlsHeight - toolbarHeight - this.sizeGuide.offset - 1
    //console.log(editorHeight)
    $('#editor-container-' + this.id).find('div.ql-editor').prop(
        'style',
        'max-height: ' +  editorHeight + 'px;'
    )
  }

  static resetItemModal (id) {
    $('#item-modal-title-' + id).html('')
    $('#item-modal-text-fg-' + id).hide()
    $('#item-modal-alttext-fg-' + id).hide()
    $('#item-modal-extrainfo-fg-' + id).hide()
    $('#item-modal-length-fg-' + id).hide()
    $('#item-modal-target-fg-' + id).hide()
    $('#item-modal-ednote-fg-' + id).show()
    $('#item-modal-ednotes-' + id).html('')
    $('#item-note-' + id).val('')
    $('#item-note-time-' + id).html('New note')
    $('#item-note-id-' + id).val('new')
    $('#item-modal-submit-button-' + id).off()
  }

  static setupNotesInItemModal (thisObject, itemid) {
    let ednotes = thisObject.getEdnotesForItemId(itemid)
    let noteToEdit = thisObject.getLatestNoteForItemAndAuthor(itemid,
                    thisObject.editorId)
    if (($.isEmptyObject(noteToEdit) && ednotes.length > 0) ||
                    (ednotes.length > 1)) {
      let ednotesHtml = '<h3>Other notes</h3>'
      for (const note of ednotes) {
        if (note.id === noteToEdit.id) {
          continue
        }
        ednotesHtml += '<blockquote><p>' + note.text + '</p>'
        ednotesHtml += '<footer>' +
                    thisObject.people[note.authorId].fullname +
                    ' @ ' +
                    note.time + '</footer>'
        ednotesHtml += '</blockquote>'
      }
      $('#item-modal-ednotes-' + thisObject.id).html(ednotesHtml)
    } else {
      $('#item-modal-ednotes-' + thisObject.id).html('')
    }
    if (!$.isEmptyObject(noteToEdit)) {
      $('#item-note-' + thisObject.id).val(noteToEdit.text)
      $('#item-note-id-' + thisObject.id).val(noteToEdit.id)
      $('#item-note-time-' + thisObject.id).html(
                    'Note last edited <time datetime="' +
                    noteToEdit.time +
                    '" title="' +
                    noteToEdit.time +
                    '">' +
                    thisObject.timeSince(noteToEdit.time) +
                    ' ago</time>'
                )
    } else {
      $('#item-note-' + thisObject.id).val('')
      $('#item-note-time-' + thisObject.id).html('New note')
      $('#item-note-id-' + thisObject.id).val('new')
    }
  }

  getMySqlDate (d) {
    return d.getFullYear() + '-' +
            ('00' + (d.getMonth() + 1)).slice(-2) + '-' +
            ('00' + d.getDate()).slice(-2) + ' ' +
            ('00' + d.getHours()).slice(-2) + ':' +
            ('00' + d.getMinutes()).slice(-2) + ':' +
            ('00' + d.getSeconds()).slice(-2)
  }

  timeSince (dateString) {
    let date = Date.parse(dateString)

    var seconds = Math.floor((new Date() - date) / 1000)
    var interval = seconds / 31536000

    if (interval > 1) {
      return interval.toFixed(1) + ' years'
    }
    interval = seconds / 2592000
    if (interval > 1) {
      return interval.toFixed(1) + ' months'
    }
    interval = seconds / 86400
    if (interval > 1) {
      return interval.toFixed(1) + ' days'
    }
    interval = seconds / 3600
    if (interval > 1) {
      return interval.toFixed(1) + ' hours'
    }
    interval = seconds / 60
    if (interval > 1) {
      let minutes = Math.floor(interval)
      if (minutes === 1) {
        return '1 minute'
      }
      return minutes + ' minutes'
    }
    let secs = Math.floor(seconds)
    if (secs === 1) {
      return '1 second'
    }
    return secs + ' seconds'
  }

  addNewNote (itemId, text) {
    if (text === '') {
      return false
    }
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    let noteId = this.getOneNoteId()
    this.edNotes.push({
      id: noteId,
      authorId: this.editorId,
      target: itemId,
      type: 2,
      text: text,
      time: this.getMySqlDate(new Date()),
      lang: 'en'
    })
  }

  updateNote (noteId, text) {
    if (typeof noteId === 'string') {
      noteId = parseInt(noteId)
    }
    let indexToErase = -1
    for (let i = 0; i < this.edNotes.length; i++) {
      if (this.edNotes[i].id === noteId) {
        if (text.trim() === '') {
          indexToErase = i
          break
        }
        this.edNotes[i].text = text
        this.edNotes[i].time = this.getMySqlDate(new Date())
        break
      }
    }
    if (indexToErase !== -1) {
      this.edNotes.splice(indexToErase, 1)
    }
  }

  getEdnotesForItemId (itemId) {
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    let ednotes = []
    for (const note of this.edNotes) {
      if (note.type === 2 && note.target === itemId) {
        ednotes.push(note)
      }
    }
    return ednotes
  }

  getLatestNoteForItemAndAuthor (itemId, authorId) {
    if (typeof itemId === 'string') {
      itemId = parseInt(itemId)
    }
    let latestTime = ''
    let latestNote = {}
    for (const note of this.edNotes) {
      if (note.type === 2 && note.target === itemId &&
                    note.authorId === authorId &&
                    note.time > latestTime) {
        latestTime = note.time
        latestNote = note
      }
    }
    return latestNote
  }

  setDefaultLang (lang) {
    let labels = {
      la: 'Latin',
      he: 'Hebrew',
      ar: 'Arabic'
    }
    if (lang !== 'ar' && lang !== 'he') {
      lang = 'la'
    }
    //console.log("Setting up default lang: " + lang)
    for (const l of ['ar', 'he', 'la']) {
      if (l === lang) {
        $('#editor-container-' + this.id).addClass(l + 'text')
        continue
      }
      $('#editor-container-' + this.id).removeClass(l + 'text')
    }
    $('#' + lang + '-button-' + this.id).prop('disabled', true)
    $('#lang-button-'+this.id).attr('title', labels[lang])
    $('#lang-button-'+this.id).html(lang)
    this.defaultLang = lang
    ChunkMarkBlot.dir = (lang === 'la') ? 'ltr' : 'ltr';
    
  }

  setDisableLangButtons (disable = true) {
    for (const lang of ['la', 'ar', 'he']) {
//            if (lang === this.defaultLang) {
//                $('#' + lang + "-button-" + this.id).prop('disabled', true);
//                continue;
//            }
      $('#' + lang + '-button-' + this.id).prop('disabled', disable)
    }
  }

  getQuillObject () {
    return this.quillObject
  }

  getOneItemId () {
    if (this.minItemId >= 0) {
      this.minItemId = -1000
    }
    this.minItemId--
    return this.minItemId
  }

  getOneNoteId () {
    if (this.minNoteId >= 0) {
      this.minNoteId = -100
    }
    this.minNoteId--
    return this.minNoteId
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
    * Loads the given elements and items into the editor
    * @param {array} columnData
    * @returns {none}
    */
  setData (columnData) {
    let delta = []
    let formats = []
    let deletionTexts = []
    let languageCounts = {'ar': 0, 'he': 0, 'la':0}
    formats[ELEMENT_HEAD] = 'head'
    formats[ELEMENT_CUSTODES] = 'custodes'
    formats[ELEMENT_PAGE_NUMBER] = 'pagenumber'
    

    this.edNotes = columnData.ednotes
    for (const note of this.edNotes) {
      this.minNoteId = Math.min(this.minNoteId, note.id)
    }

    this.people = columnData.people
    this.pageId = columnData.info.pageId
    this.columnNumber = columnData.info.col
    this.pageDefaultLang = columnData.info.lang

    for (const ele of columnData.elements) {
      switch (ele.type) {
        case ELEMENT_LINE_GAP:
          delta.push({
            insert: {
              linegap : {
                editorid: this.id,
                linecount: ele.reference
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
            this.minItemId = Math.min(this.minItemId, item.id)
            switch (item.type) {
              case ITEM_TEXT:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    lang: item.lang
                  }
                })
                break

              case ITEM_MARK:
                delta.push({
                  insert: {
                    mark: {
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break
                
              case ITEM_NO_WORD_BREAK:
                delta.push({
                  insert: {
                    nowb: {
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break

              case ITEM_RUBRIC:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    rubric: {
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_GLIPH:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    gliph: {
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_INITIAL:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    initial: {
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_SIC:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    sic: {
                      correction: item.altText,
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_ABBREVIATION:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    abbr: {
                      expansion: item.altText,
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_DELETION:
                deletionTexts[item.id] = item.theText
                delta.push({
                  insert: item.theText,
                  attributes: {
                    deletion: {
                      technique: item.extraInfo,
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_ADDITION:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    addition: {
                      place: item.extraInfo,
                      target: item.target,
                      targetText: deletionTexts[item.target],
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_UNCLEAR:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    unclear: {
                      reason: item.extraInfo,
                      reading2: item.altText,
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break

              case ITEM_ILLEGIBLE:
                delta.push({
                  insert: {
                    illegible: {
                      length: item.length,
                      reason: item.extraInfo,
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break
                
              case ITEM_CHUNK_MARK:
                delta.push({
                  insert: {
                    chunkmark: {
                      type: item.altText,
                      dareid: item.theText,
                      chunkno: item.target,
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break
                
              case ITEM_CHARACTER_GAP: 
                delta.push({
                  insert: {
                    chgap: {
                      length: item.length,
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break;
                
              case ITEM_PARAGRAPH_MARK:
                delta.push({
                  insert: {
                    pmark: {
                      itemid: item.id,
                      editorid: this.id
                    }
                  }
                })
                break
              
              case ITEM_MATH_TEXT:
                delta.push({
                  insert: item.theText,
                  attributes: {
                    mathtext: {
                      itemid: item.id,
                      editorid: this.id
                    },
                    lang: item.lang
                  }
                })
                break
            }
            languageCounts[item.lang]++
          }
          break
      }
      
      switch(ele.type) {
        case ELEMENT_GLOSS:
          delta.push({
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
            console.log("Addition element")
            console.log(ele)
          delta.push({
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
          let attr = {}
          attr[formats[ele.type]] = true
          delta.push({insert: '\n', attributes: attr})
          break;
      }
      
    }

    this.quillObject.setContents(delta)
    this.lastSavedData = this.quillObject.getContents()
    let mainLang = TranscriptionEditor.getMainLanguage(languageCounts)
//    console.log(languageCounts)
//    console.log(mainLang)
    if (!mainLang) {
      mainLang = this.pageDefaultLang
    }
    
    this.setDefaultLang(mainLang)
  }
  
  onEditorEnable(f) {
    $(this.containerSelector).on('edit-enable', f)
  }
  
  onEditorDisable(f) {
    $(this.containerSelector).on('edit-disable', f)
  }
  
  onEditorSave(f) {
    $(this.containerSelector).on('editor-save', f)
  }
  
  onEditorReset(f) {
    $(this.containerSelector).on('editor-reset', f)
  }

    /**
     * Takes the contents of a quill editor and returns an array of elements
     * and items.
     *
     * @returns {Array|elements}
     */
  getData () {
    return EditorData.getApiDataFromQuillDelta(this.quillObject.getContents(), this)
  }

  static getDeletionRanges (ops) {
    let index = 0
    let ranges = []
    for (const op of ops) {
      if (!op.insert) {
        continue
      }
      if (op.attributes && op.attributes.deletion) {
        ranges.push({
          id: parseInt(op.attributes.deletion.itemid),
          index: index,
          length: op.insert.length
        })
      }
      index += op.insert.length
    }
    return ranges
  }

  static getCoveredDeletions (ranges, index, length) {
    let deletions = []

    for (const range of ranges) {
      if (range.index >= index &&
                    (range.index + range.length) <= (index + length)) {
        deletions.push(range)
      }
    }
    return deletions
  }

  static getAdditionRangeByTarget (ops, target) {
    let index = 0
    if (typeof target === 'string') {
      target = parseInt(target)
    }
    for (const op of ops) {
      if (!op.insert) {
        continue
      }
      if (op.attributes && op.attributes.addition) {
        if (parseInt(op.attributes.addition.target) === target) {
          return {
            index: index,
            length: op.insert.length,
            place: op.attributes.addition.place,
            id: parseInt(op.attributes.addition.itemid)
          }
        }
      }
      index += op.insert.length
    }
    return false
  }

  static hideAllPopovers () {
    $('.popover').remove()
  }

  static setUpPopover (node, title, text, editorid, itemid, noText = false) {
    $(node).popover({
      content: function () {
        let editorObject = TranscriptionEditor.editors[editorid]
        let ednotes = editorObject.getEdnotesForItemId(itemid)

        let theText = node.textContent
        let t = '<h3 class="editor-popover-title">' + title + '</h3>'
        if (!noText) {
          t += '<b>Text</b>: ' + theText + '<br/>'
        }
        t += text
        let ednotesHtml = '<h4>Notes:</h4>'
        if ($.isEmptyObject(ednotes)) {
          ednotesHtml += '&nbsp;&nbsp;<i>None</i>'
        }
        for (const note of ednotes) {
          ednotesHtml += '<blockquote><p>' + note.text + '</p>'
          ednotesHtml += '<footer>' +
                        editorObject.people[note.authorId].fullname +
                        ' @ ' +
                        note.time + '</footer>'
          ednotesHtml += '</blockquote>'
        }
        return t + ednotesHtml
      },
      container: 'body',
      animation: false,
      delay: { 'show': 1500, 'hide': 0},
      html: true,
      placement: 'auto',
      trigger: 'hover'})
  }
}

TranscriptionEditor.editors = []