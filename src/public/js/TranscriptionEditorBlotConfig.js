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

/* global TranscriptionEditor, ITEM_RUBRIC, ITEM_INITIAL, ITEM_GLIPH, ITEM_MATH_TEXT, ELEMENT_HEAD, ELEMENT_PAGE_NUMBER, ELEMENT_CUSTODES, ITEM_SIC, ITEM_ABBREVIATION, ITEM_UNCLEAR, Item, ITEM_DELETION, ITEM_NO_WORD_BREAK, ITEM_CHARACTER_GAP, ITEM_PARAGRAPH_MARK, ITEM_ILLEGIBLE */


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
  icon: '<i class="fa fa-frown-o"></i>',
  alttext : { title: 'Correction' }
})

class AbbrBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(AbbrBlot, { 
  type: ITEM_ABBREVIATION, 
  name: 'abbr', 
  title: 'Abbreviation', 
  icon: '<i class="fa fa-hand-spock-o">',
  alttext : { title: 'Expansion' }
})

class UnclearBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(UnclearBlot, { 
  type: ITEM_UNCLEAR, 
  name: 'unclear', 
  title: 'Unclear', 
  icon: '<i class="fa fa-low-vision"></i>',
  alttext : { title: 'Alt. Reading' },
  extrainfo: { title: 'Reason', options : Item.getValidUnclearReasons() }
})

class DeletionBlot extends SimpleFormatBlot {}
TranscriptionEditor.registerFormatBlot(DeletionBlot, { 
  type: ITEM_DELETION, 
  name: 'deletion', 
  title: 'Deletion', 
  icon: '<i class="fa fa-minus-square"></i>',
  canBeTarget: true,
  extrainfo: { title: 'Technique', options : Item.getValidDeletionTechniques() }
})

class NoWordBreakBlot extends SimpleImgBlot {}
TranscriptionEditor.registerImageBlot(NoWordBreakBlot, { 
  type: ITEM_NO_WORD_BREAK,
  name: 'nowb',
  title: 'Non word-breaking dash',
  icon: '<i class="fa fa-minus"></i>',
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
  icon: '<i class="fa fa-square-o"></i>',
  imageAlt:'[...]',
  length: { default: 5 },
  getImageUrl: function (baseUrl, size, value) { 
    return baseUrl + '/api/images/charactergap/' + value.length + '/' + size
  }
})

class IllegibleBlot extends SimpleImgBlot {}
TranscriptionEditor.registerImageBlot(IllegibleBlot, { 
  type: ITEM_ILLEGIBLE,
  name: 'illegible',
  title: 'Illegible',
  icon: '<i class="fa fa-eye-slash">',
  imageAlt:'[illegible]',
  extrainfo: { title: 'Reason', options : Item.getValidIllegibleReasons(), default: 'illegible' },
  length: { default: 5 },
  getImageUrl: function (baseUrl, size, value) { 
    return baseUrl + '/api/images/illegible/' + size + '/' + value.length
  }
})

class HeadBlot extends SimpleBlockBlot {}
TranscriptionEditor.registerBlockBlot(HeadBlot, {
  type: ELEMENT_HEAD, 
  name: 'headelement', 
  title: 'Head', 
  icon: 'H'
})


class PageNumberBlot extends SimpleBlockBlot{}
TranscriptionEditor.registerBlockBlot(PageNumberBlot, {
  type: ELEMENT_PAGE_NUMBER, 
  name: 'pagenumber', 
  title: 'Page Number', 
  icon: 'P'
})

class CustodesBlot extends SimpleBlockBlot{}
TranscriptionEditor.registerBlockBlot(CustodesBlot, {
  type: ELEMENT_CUSTODES, 
  name: 'custodes', 
  title: 'Custodes', 
  icon: 'C'
})


TranscriptionEditor.registerSpecialCharacter('⊙')
