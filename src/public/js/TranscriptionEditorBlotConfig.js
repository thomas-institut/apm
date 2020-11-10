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

/* global TranscriptionEditor, ITEM_RUBRIC, ITEM_INITIAL, ITEM_GLIPH, ITEM_MATH_TEXT, ELEMENT_HEAD, ELEMENT_PAGE_NUMBER, ELEMENT_CUSTODES, ITEM_SIC, ITEM_ABBREVIATION, ITEM_UNCLEAR, Item, ITEM_DELETION, ITEM_NO_WORD_BREAK, ITEM_CHARACTER_GAP, ITEM_PARAGRAPH_MARK, ITEM_ILLEGIBLE, ITEM_CHUNK_MARK, ITEM_ADDITION */

class Heading1Blot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(Heading1Blot, {
  type: ITEM_HEADING,
  name: 'heading1',
  title: 'Heading 1',
  icon: '<b>H<sub>1</sub></b>'
})


class BoldBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(BoldBlot, {
  type: ITEM_BOLD,
  name: 'boldtext',
  title: 'Bold',
  icon: '<b>B</b>'
})

class ItalicBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(ItalicBlot, {
  type: ITEM_ITALIC,
  name: 'italictext',
  title: 'Italic',
  icon: '<em>It</em>'
})



class RubricBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(RubricBlot, {
  type: ITEM_RUBRIC, 
  name: 'rubric', 
  title: 'Rubric', 
  icon: 'R'
})



class InitialBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(InitialBlot, {
  type: ITEM_INITIAL, 
  name: 'initial', 
  title: 'Initial', 
  icon: 'I'
})

class GliphBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(GliphBlot, {
  type: ITEM_GLIPH, 
  name: 'gliph', 
  title: 'Gliph', 
  icon: 'G'
})

class MathTextBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(MathTextBlot, {
  type: ITEM_MATH_TEXT, 
  name: 'mathtext', 
  title: 'Math Text', 
  icon: 'M'
})


class SicBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(SicBlot, { 
  type: ITEM_SIC, 
  name: 'sic', 
  title: 'Sic', 
  icon: '<i class="far fa-frown"></i>',
  alttext : { title: 'Correction' }
})

class AbbrBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(AbbrBlot, { 
  type: ITEM_ABBREVIATION, 
  name: 'abbr', 
  title: 'Abbreviation', 
  icon: '<i class="far fa-hand-spock">',
  alttext : { title: 'Expansion' }
})

class UnclearBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(UnclearBlot, { 
  type: ITEM_UNCLEAR, 
  name: 'unclear', 
  title: 'Unclear', 
  icon: '<i class="fas fa-low-vision"></i>',
  alttext : { title: 'Alt. Reading' },
  extrainfo: { title: 'Reason', options : Item.getValidUnclearReasons() }
})

class AdditionBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(AdditionBlot, { 
  type: ITEM_ADDITION, 
  name: 'addition', 
  title: 'Addition', 
  icon: '<i class="fas fa-plus-square"></i>',
  target: { title: 'Replaces',  default: 0}, 
  buttonWithOptions: 'extrainfo',
  extrainfo: { title: 'Placement', options : Item.getValidAdditionPlaces() }
})

class DeletionBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(DeletionBlot, { 
  type: ITEM_DELETION, 
  name: 'deletion', 
  title: 'Deletion', 
  icon: '<i class="fas fa-minus-square"></i>',
  canBeTarget: true,
  buttonWithOptions: 'extrainfo',
  extrainfo: { title: 'Technique', options : Item.getValidDeletionTechniques() }
})

class MarginalMarkBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(MarginalMarkBlot, {
  type: ITEM_MARGINAL_MARK, 
  name: 'marginalmark', 
  title: 'Mark', 
  canBeTarget: true,
  icon: '<i class="fas fa-arrow-up" aria-hidden="true"></i>'
})


class NoWordBreakBlot extends SimpleImgBlot {}
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

class ParagraphMarkBlot extends SimpleImgBlot {}
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

class CharacterGapBlot extends SimpleImgBlot {}
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

class MarkBlot extends SimpleImgBlot {}
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



class IllegibleBlot extends SimpleImgBlot {}
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

class ChunkMarkBlot extends SimpleImgBlot {}
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


class ChapterMarkBlot extends SimpleImgBlot {}
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
    return  `<b>Type:</b> ${typeLabel}<br/><b>Work Id:</b> ${value.extrainfo}<br/><b>Appellation:</b> ${appellation}<br/><b>Title:</b>${chapterTitle}
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



class HeadBlot extends SimpleBlockBlot {}
TranscriptionEditor.registerBlockBlot(HeadBlot, {
  type: ELEMENT_HEAD, 
  name: 'headelement', 
  title: 'Page Head Line',
  icon: 'H'
})


class PageNumberBlot extends SimpleBlockBlot{}
TranscriptionEditor.registerBlockBlot(PageNumberBlot, {
  type: ELEMENT_PAGE_NUMBER, 
  name: 'pagenumber', 
  title: 'Page Number Line',
  icon: 'P'
})

class CustodesBlot extends SimpleBlockBlot{}
TranscriptionEditor.registerBlockBlot(CustodesBlot, {
  type: ELEMENT_CUSTODES, 
  name: 'custodes', 
  title: 'Custodes Line',
  icon: 'C'
})

class GlossBlot extends MarginalBlockBlot{}
TranscriptionEditor.registerBlockBlot(GlossBlot, {
  type: ELEMENT_GLOSS, 
  name: 'gloss', 
  title: 'Marginal Gloss', 
  icon: 'G',
  buttonWithOptions: 'place',
  place: { title: 'Placement', options : Element.getValidMarginalPlacements(), default: 'margin right'}
})

class MarginalSubstitution extends MarginalBlockBlot{}
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



// This should be standard!


class LineGapBlot extends SimpleImgBlot {}
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
