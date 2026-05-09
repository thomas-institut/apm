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

import { TranscriptionEditor } from './TranscriptionEditor'
import {
  Item,
  ITEM_ABBREVIATION, ITEM_ADDITION,
  ITEM_BOLD, ITEM_CHAPTER_MARK, ITEM_CHARACTER_GAP, ITEM_CHUNK_MARK, ITEM_DELETION,
  ITEM_GLIPH,
  ITEM_HEADING, ITEM_ILLEGIBLE,
  ITEM_INITIAL,
  ITEM_ITALIC, ITEM_MARGINAL_MARK, ITEM_MARK,
  ITEM_MATH_TEXT, ITEM_NO_WORD_BREAK, ITEM_PARAGRAPH_MARK,
  ITEM_RUBRIC,
  ITEM_SIC, ITEM_UNCLEAR
} from './Item'
import {
  ELEMENT_CUSTODES,
  ELEMENT_GLOSS,
  ELEMENT_HEAD,
  ELEMENT_LINE_GAP,
  ELEMENT_PAGE_NUMBER,
  ELEMENT_SUBSTITUTION, Element
} from './Element'
import { MarginalBlockBlot, SimpleBlockBlot, SimpleFormatBlot, SimpleImgBlot } from './TranscriptionEditorBlots'

//
// BOT CLASSES
//
class Heading1Blot extends SimpleFormatBlot {}
class BoldBlot extends SimpleFormatBlot {}
class ItalicBlot extends SimpleFormatBlot {}
class RubricBlot extends SimpleFormatBlot {}
class InitialBlot extends SimpleFormatBlot {}
class GliphBlot extends SimpleFormatBlot {}
class SicBlot extends SimpleFormatBlot {}
class MathTextBlot extends SimpleFormatBlot {}
class AbbrBlot extends SimpleFormatBlot {}
class UnclearBlot extends SimpleFormatBlot {}
class AdditionBlot extends SimpleFormatBlot {}
class DeletionBlot extends SimpleFormatBlot {}
class NoWordBreakBlot extends SimpleImgBlot {}
class ParagraphMarkBlot extends SimpleImgBlot {}
class MarginalMarkBlot extends SimpleFormatBlot {}
class CharacterGapBlot extends SimpleImgBlot {}
class MarkBlot extends SimpleImgBlot {}
class IllegibleBlot extends SimpleImgBlot {}
class ChunkMarkBlot extends SimpleImgBlot {}
class ChapterMarkBlot extends SimpleImgBlot {}
class HeadBlot extends SimpleBlockBlot {}
class PageNumberBlot extends SimpleBlockBlot{}
class CustodesBlot extends SimpleBlockBlot{}
class GlossBlot extends MarginalBlockBlot{}
class MarginalSubstitution extends MarginalBlockBlot{}
class LineGapBlot extends SimpleImgBlot {}

export function configureTranscriptionEditorBlots() {

  TranscriptionEditor.registerFormatBlot(Heading1Blot, {
    type: ITEM_HEADING,
    name: 'heading1',
    title: 'Heading 1',
    icon: '<b>H<sub>1</sub></b>'
  })

  TranscriptionEditor.registerFormatBlot(BoldBlot, {
    type: ITEM_BOLD,
    name: 'boldtext',
    title: 'Bold',
    icon: '<b>B</b>'
  })


  TranscriptionEditor.registerFormatBlot(ItalicBlot, {
    type: ITEM_ITALIC,
    name: 'italictext',
    title: 'Italic',
    icon: '<em>It</em>'
  })

  TranscriptionEditor.registerFormatBlot(RubricBlot, {
    type: ITEM_RUBRIC,
    name: 'rubric',
    title: 'Rubric',
    icon: 'R'
  })

  TranscriptionEditor.registerFormatBlot(InitialBlot, {
    type: ITEM_INITIAL,
    name: 'initial',
    title: 'Initial',
    icon: 'I'
  })

  TranscriptionEditor.registerFormatBlot(GliphBlot, {
    type: ITEM_GLIPH,
    name: 'gliph',
    title: 'Gliph',
    icon: 'G'
  })


  TranscriptionEditor.registerFormatBlot(MathTextBlot, {
    type: ITEM_MATH_TEXT,
    name: 'mathtext',
    title: 'Math Text',
    icon: 'M'
  })


  TranscriptionEditor.registerFormatBlot(SicBlot, {
    type: ITEM_SIC,
    name: 'sic',
    title: 'Sic',
    icon: '<i class="far fa-frown"></i>',
    alttext : { title: 'Correction' }
  })


  TranscriptionEditor.registerFormatBlot(AbbrBlot, {
    type: ITEM_ABBREVIATION,
    name: 'abbr',
    title: 'Abbreviation',
    icon: '<i class="far fa-hand-spock">',
    alttext : { title: 'Expansion' }
  })


  TranscriptionEditor.registerFormatBlot(UnclearBlot, {
    type: ITEM_UNCLEAR,
    name: 'unclear',
    title: 'Unclear',
    canBeTarget: true,
    icon: '<i class="fas fa-low-vision"></i>',
    alttext : { title: 'Alt. Reading' },
    extrainfo: { title: 'Reason', options : Item.getValidUnclearReasons() }
  })


  TranscriptionEditor.registerFormatBlot(AdditionBlot, {
    type: ITEM_ADDITION,
    name: 'addition',
    title: 'Addition',
    icon: '<i class="fas fa-plus-square"></i>',
    target: { title: 'Replaces',  default: 0},
    buttonWithOptions: 'extrainfo',
    extrainfo: { title: 'Placement', options : Item.getValidAdditionPlaces() }
  })


  TranscriptionEditor.registerFormatBlot(DeletionBlot, {
    type: ITEM_DELETION,
    name: 'deletion',
    title: 'Deletion',
    icon: '<i class="fas fa-minus-square"></i>',
    canBeTarget: true,
    buttonWithOptions: 'extrainfo',
    extrainfo: { title: 'Technique', options : Item.getValidDeletionTechniques() }
  })


  TranscriptionEditor.registerFormatBlot(MarginalMarkBlot, {
    type: ITEM_MARGINAL_MARK,
    name: 'marginalmark',
    title: 'Mark',
    canBeTarget: true,
    icon: '<i class="fas fa-arrow-up" aria-hidden="true"></i>'
  })

  TranscriptionEditor.registerImageBlot(NoWordBreakBlot, {
    type: ITEM_NO_WORD_BREAK,
    name: 'nowb',
    title: 'Non word-breaking dash',
    icon: '<i class="fas fa-minus"></i>',
    imageAlt:'[-]',
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/nowb/' + size
    }
  })


  TranscriptionEditor.registerImageBlot(ParagraphMarkBlot, {
    type: ITEM_PARAGRAPH_MARK,
    name: 'pmark',
    title: 'Paragraph Mark',
    icon: '¶',
    imageAlt:'[¶]',
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/paragraphmark/' + size
    }
  })


  TranscriptionEditor.registerImageBlot(CharacterGapBlot, {
    type: ITEM_CHARACTER_GAP,
    name: 'chgap',
    title: 'Character Gap',
    icon: '<i class="far fa-square"></i>',
    imageAlt:'[...]',
    thelength: { default: 5 },
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/charactergap/' + value.thelength + '/' + size
    }
  })


  TranscriptionEditor.registerImageBlot(MarkBlot, {
    type: ITEM_MARK,
    name: 'mark',
    title: 'Editorial Note(s)',
    noButton: true,
    withPopover: true,
    withEditOnDoubleClick: true,
    icon: 'M',
    imageAlt:'[note]',
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/mark/' + size
    }
  })




  TranscriptionEditor.registerImageBlot(IllegibleBlot, {
    type: ITEM_ILLEGIBLE,
    name: 'illegible',
    title: 'Illegible',
    icon: '<i class="fas fa-eye-slash">',
    imageAlt:'[illegible]',
    withPopover: true,
    //forceInputDialog: true,
    withEditOnDoubleClick: true,
    extrainfo: { title: 'Reason', options : Item.getValidIllegibleReasons(), default: 'illegible'},
    thelength: { title: 'Length', default: 5,  min: 1, max: 5 },
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/illegible/' + size + '/' + value.thelength
    }
  })

  TranscriptionEditor.registerImageBlot(ChunkMarkBlot, {
    type: ITEM_CHUNK_MARK,
    name: 'chunkmark',
    title: 'Chunk Mark',
    icon: '{}',
    imageAlt:'[Chunk]',
    text: { default: 'AW1' },
    multiPartText: false,
    withPopover: true,
    getPopoverText: function(value) {
      return  `<b>Type:</b> ${value.alttext}<br/><b>Work Id:</b> ${value.text}<br/><b>Chunk Number:</b> ${value.target}
<br/><b>Local ID:</b> ${value.extrainfo}<br/><b>Segment Number:</b> ${value.thelength}` },
    target: { default: 1 },
    alttext: { default: 'start' },
    extrainfo: { title: 'Local Id', options: [ 'A', 'B', 'C'], default: 'A'},
    thelength: { default: 1 },
    noButton: true,
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl +
        '/api/images/chunkmark/' +
        value.text + '/' +
        value.target + '/' +
        value.extrainfo + '/' +
        value.thelength + '/' +
        value.alttext + '/ltr/' +
        size
    }
  })


  TranscriptionEditor.registerImageBlot(ChapterMarkBlot, {
    type: ITEM_CHAPTER_MARK,
    name: 'chaptermark',
    title: 'Chapter Mark',
    icon: 'Ch',
    imageAlt:'[Chapter]',
    withPopover: true,
    getPopoverText: function(value) {
      let fields = value.text.split("\t")
      let appellation = fields[0]
      let chapterTitle = fields[1]
      let typeLabel = value.alttext === 'start' ? 'Start' : 'End'
      return  `<b>Type:</b> ${typeLabel}<br/><b>Work Id:</b> ${value.extrainfo}<br/><b>Appellation:</b> ${appellation}<br/><b>Title:</b> ${chapterTitle}
<br/><b>Level:</b> ${value.thelength}<br/><b>Number:</b> ${value.target}` },
    text: { default: "Chapter\tChapterTitle"},
    multiPartText: true,
    multiPartTextSeparator: "\t",
    target: { default: 1 },
    alttext: { default: 'start' },
    extrainfo: {  default: 'AW00'},
    thelength: { default: 1 },
    noButton: true,
    getImageUrl: function (baseUrl, size, value) {
      let fields = value.text.split("\t")
      let appellation = fields[0]
      let chapterTitle = fields[1]
      return baseUrl +
        '/api/images/chaptermark/' +
        value.extrainfo + '/' +
        value.thelength + '/' +
        value.target + '/' +
        value.alttext + '/ltr/' +
        size
    }
  })




  TranscriptionEditor.registerBlockBlot(HeadBlot, {
    type: ELEMENT_HEAD,
    name: 'headelement',
    title: 'Page Head Line',
    icon: 'H'
  })



  TranscriptionEditor.registerBlockBlot(PageNumberBlot, {
    type: ELEMENT_PAGE_NUMBER,
    name: 'pagenumber',
    title: 'Page Number Line',
    icon: 'P'
  })


  TranscriptionEditor.registerBlockBlot(CustodesBlot, {
    type: ELEMENT_CUSTODES,
    name: 'custodes',
    title: 'Custodes Line',
    icon: 'C'
  })


  TranscriptionEditor.registerBlockBlot(GlossBlot, {
    type: ELEMENT_GLOSS,
    name: 'gloss',
    title: 'Marginal Gloss',
    icon: 'G',
    buttonWithOptions: 'place',
    place: { title: 'Placement', options : Element.getValidMarginalPlacements(), default: 'margin right'}
  })


  TranscriptionEditor.registerBlockBlot(MarginalSubstitution, {
    type: ELEMENT_SUBSTITUTION,
    name: 'substelement',
    title: 'Marginal Addition',
    icon: 'A',
    //buttonWithOptions: 'place',
    target: { title: 'Replaces / At'},
    place: { title: 'Placement', options : Element.getValidMarginalPlacements()}
  })


  TranscriptionEditor.registerSpecialCharacter('⊙')

  TranscriptionEditor.registerImageBlot(LineGapBlot, {
    type: ELEMENT_LINE_GAP,
    name: 'linegap',
    title: 'Line Gap',
    icon: 'Gap',
    imageAlt:'[... Line Gap ...]',
    noButton: true,
    renumberLinesOnImageLoad: true,
    thelength: { default: 5 },
    getImageUrl: function (baseUrl, size, value) {
      return baseUrl + '/api/images/linegap/' + value.thelength + '/' + size
    }
  })

  TranscriptionEditor.registerLineGapBlot(LineGapBlot)
}

