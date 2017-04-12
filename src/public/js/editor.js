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

const INVALID =         0;  
const TEXT =            1; // DONE
const RUBRIC =          2; // DONE
const SIC =             3; // DONE
const UNCLEAR =         4;
const ILLEGIBLE =       5;
const GLIPH =           6; // DONE
const ADDITION =        7;  
const DELETION =        8;
const MARK =            9;
const NO_LINEBREAK =   10;
const ABBREVIATION =   11; // DONE
const LINEBREAK    =   12;
const INITIAL      =   13; // DONE

/**
 * QuillJS editor for transcriptions
 */
_quillIsSetUp = false;

class TranscriptionEditor {
    
    constructor (containerSelector, id, baseUrl, editorId = 1, 
            defaultLang = 'la', handId = 0) {
        if (!_quillIsSetUp) {
            TranscriptionEditor.setupQuill();
            _quillIsSetUp = true;
        }
        this.id = id;
        this.editorId = editorId;
        this.handId = handId;
        this.pageId = -1;
        this.columnNumber = -1;
        
        this.containerSelector = containerSelector;
        
        let template = Twig.twig({
            id: "editor",
            href: baseUrl + "templates/editor.twig",
            async: false 
        });
        
        let editorHtml = template.render({id: id});
        $(containerSelector).html(editorHtml);
        this.setDefaultLang(defaultLang);
        let quillObject = new Quill('#editor-container-' + id); 
        let thisObject = this;
        
        $('#sic-modal-' + id).modal({show: false});
    
        quillObject.on('selection-change', function(range, oldRange, source) {
            if (!range) {
                return;
            }
            if (range.length === 0) {
                $('.selFmtBtn').prop('disabled', true);
                thisObject.setDisableLangButtons(true);
                return;
            }
            let selectionHasNoFormat = true;
            thisObject.setDisableLangButtons(false);
            for (let i=range.index; i < range.index+range.length; i++) {
                let format = quillObject.getFormat(i);
                if ($.isEmptyObject(format)) {
                    continue;
                }
                for (const type of ['rubric', 'gliph', 'initial', 'sic', 'abbr']) {
                    if (type in format) {
                        selectionHasNoFormat = false;
                        break;
                    }
                }
                
            }
            if (selectionHasNoFormat) {
                $('.selFmtBtn').prop('disabled', false);
                
            } else {
                $('#clear-button-' + id).prop('disabled', false);
            }
        });

        $('#ar-button-' + id).click( function() {
            quillObject.format('lang', 'ar');
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $('#la-button-' + id).click( function() {
            quillObject.format('lang', 'la');
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $('#he-button-' + id).click( function() {
            quillObject.format('lang', 'he');
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $('#rubric-button-' + id).click( function() {
            quillObject.format('rubric', true);
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $('#clear-button-' + id).click( function() {
            let range = quillObject.getSelection();
            quillObject.removeFormat(range.index, range.length);
            quillObject.setSelection(range.index+range.length);
        });

        $('#gliph-button-' + id).click( function() {
            quillObject.format('gliph', true);
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });

        $('#initial-button-' + id).click( function() {
            quillObject.format('initial', true);
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });

        $('#sic-button-' + id).click( function() {
            let range = quillObject.getSelection();
            let text = quillObject.getText(range.index, range.length);
            $('#sic-modal-text-' + thisObject.id).html(text);
            $('#sic-modal-correction-' + thisObject.id).val('');
            $('#sic-modal-submit-button-' + thisObject.id).click(function() {
                $('#sic-modal-' + thisObject.id).modal('hide');
                let value = $('#sic-modal-correction-' + thisObject.id).val();
                if (value === '') {
                    value = ' ';
                }
                quillObject.format('sic', value);
                quillObject.setSelection(range.index+range.length);
            });
            $('#sic-modal-' + thisObject.id).modal('show');
            
        });
        
        $('#abbr-button-' + id).click( function() {
            let value = prompt('Enter expansion:');
            if (value === null || value==='') {
                return;
            }
            quillObject.format('abbr', value);
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });

        $('#del-button-' + id).click( function() {
            let value = prompt('Enter technique:');
            if (value === null) {
                return;
            }
            quillObject.format('deletion', value);
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });

        $('#illegible-button-' + id).click( function() {
            let range = quillObject.getSelection(true);
            quillObject.insertEmbed(range.index, 'image', {
                alt: 'Quill Cloud',
                url: 'http://quilljs.com/0.20/assets/images/cloud.png'
            }, Quill.sources.USER);
            quillObject.setSelection(range.index + 1, Quill.sources.SILENT);
        });

        
        $('#set-arabic-'+id).click(function(){
            thisObject.setDefaultLang('ar');
            $('#lang-button-'+id).html('ar');
        });
        
        $('#set-latin-'+id).click(function(){
            thisObject.setDefaultLang('la');
            $('#lang-button-'+id).html('la');
        });
        
        $('#set-hebrew-'+id).click(function(){
            thisObject.setDefaultLang('he');
            $('#lang-button-'+id).html('he');
        });
        
        this.quillObject = quillObject;
    }
    
    
    setDefaultLang(lang) {
        if (lang !== 'ar' && lang !== 'he') {
            lang = 'la';
        }
        for (const l of ['ar', 'he', 'la']) {
            if (l === lang) {
                $('#editor-container-' + this.id).addClass(l + 'text');
                continue;
            }
            $('#editor-container-' + this.id).removeClass(l + 'text');
        }
        $('#' + lang + '-button-' + this.id).prop('disabled', true);
        this.defaultLang = lang;
    }
    
    
    setDisableLangButtons(disable = true) {
        for (const lang of ['la', 'ar', 'he']) {
//            if (lang === this.defaultLang) {
//                $('#' + lang + "-button-" + this.id).prop('disabled', true);
//                continue;
//            }
            $('#' + lang + "-button-" + this.id).prop('disabled', disable);
        }
    }
    
    getQuillObject() {
        return this.quillObject;
    }

   /**
    * Loads the given elements and items into the editor
    * @param {array} columnData
    * @returns {none}
    */
    setData(columnData) {
       
        let delta = [];
       
        for(const ele of columnData['elements']) {
            this.pageId = ele.pageId;
            this.columnNumber = ele.columnNumber;
            switch(ele.type) {
                case 1: 
                    // ColumnElement::LINE
                    for (const item of ele.items) {
                        let type='unknown';
                        switch(item.type) {
                            case TEXT: 
                                delta.push({
                                    insert: item.theText,
                                    attributes: {
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                            case RUBRIC:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        'rubric': true, 
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                            case GLIPH:
                                delta.push({
                                    insert: item.theText,
                                    attributes: {
                                        'gliph': true, 
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                            case INITIAL:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        'initial': true, 
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                            case SIC:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        'sic': item.altText, 
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                            case ABBREVIATION:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        'abbr': item.altText, 
                                        'lang' : item.lang
                                    }
                                });
                                break;
                                
                        }
                      
                    }
                    break;
            }
            delta.push({insert: '\n'});
        }
        
        this.quillObject.setContents(delta);
    }
   
    
    /**
     * Takes the contents of a quill editor and returns an array of elements
     * and items.
     * 
     * @returns {Array|elements}
     */
    getData() {
        let ops = this.quillObject.getContents()['ops'];
        let elements = [];

        let curElement = { 
            id : -1,
            pageId : this.pageId,
            columnNumber : this.columnNumber,
            lang : this.defaultLang,
            editorId : this.editorId,
            handId : this.handId,
            type: 1, 
            seq : 0,
            items : [] 
        };
        let currentItemSeq  = 0;
        let currentElementSeq = 0;
        
        for (const [i, curOps] of ops.entries()) {
            console.log("Processing ops " + i);
            console.log(JSON.stringify(curOps));
            let type = TEXT;
            let theLang = curElement.lang;
            let altText = '';
            if ('attributes' in curOps) {
                if (curOps['attributes']['rubric']) {
                    type = RUBRIC;
                }
                if (curOps['attributes']['gliph']) {
                    type = GLIPH;
                }
                if (curOps['attributes']['initial']) {
                    type = INITIAL;
                }
                
                if (curOps['attributes']['sic']) {
                    type = SIC;
                    altText = curOps['attributes']['sic'];
                }
                if (curOps['attributes']['abbr']) {
                    type = ABBREVIATION;
                    altText = curOps['attributes']['abbr'];
                }
                
                if (curOps['attributes']['lang']) {
                    theLang = curOps['attributes']['lang'];
                }
                let item = { 
                    id : -1,
                    seq : currentItemSeq++,
                    type : type, 
                    lang: theLang,
                    theText : curOps['insert'],
                    altText : altText
                };
                curElement.items.push(item);
                continue;
            }
            
            let currentString = '';
            for (const ch of curOps['insert']) {
                if (ch === '\n') {
                    console.log('New line with cs=' + currentString);
                    if (currentString !== '') {
                        let item = { 
                            id : -1,
                            type : type,
                            seq : currentItemSeq,
                            lang: theLang,
                            theText : currentString,
                            altText : ''
                        };
                        curElement.items.push(item);
                    }
                    console.log('nItems = ' + curElement.items.length)
                    if (curElement.items.length !== 0) {
                        elements.push(curElement);
                        currentElementSeq++;
                        curElement = { 
                            id : -1,
                            pageId : this.pageId,
                            columnNumber : this.columnNumber,
                            lang : this.defaultLang,
                            editorId : this.editorId,
                            handId : this.handId,
                            type: 1, 
                            seq : currentElementSeq,
                            items : []    
                        };
                        currentItemSeq = 0;
                    }
                    currentString = '';
                    continue;
                }
                currentString += ch;
            }
            if (currentString !== '') {
                let item = { 
                        id : -1,
                        type : type,
                        seq : currentItemSeq,
                        lang: theLang,
                        theText : currentString,
                        altText : ''
                    };
                curElement.items.push(item);
                currentItemSeq++;
            }
        }
        return {elements : elements};
    }
    
     /**
     *  
     *  Sets up Quill blots for the different items and elements
     * 
     * @returns {none}
     */
    static setupQuill() {
        let Inline = Quill.import('blots/inline');
        let BlockEmbed = Quill.import('blots/embed');
        let Block = Quill.import('blots/block');
        
        
        class LangBlot extends Inline { 
            static create(lang) {
                let node = super.create();
                node.setAttribute('lang', lang);
                for (const l of ['ar', 'he', 'la']) {
                    if (l === lang ) {
                        $(node).addClass(l + 'text');
                        continue; 
                    }
                    $(node).removeClass(l + 'text');
                }
                return node;
            }
            
            static formats(node) {
                return node.getAttribute('lang');
            }
        };
        LangBlot.blotName = 'lang';
        LangBlot.tagName = 'em';
        LangBlot.className = 'language';

        class RubricBlot extends Inline { 
            static create() {
                let node = super.create();
                node.setAttribute('title', 'Rubric');
                return node;
            }
        };
        RubricBlot.blotName = 'rubric';
        RubricBlot.tagName = 'b';
        RubricBlot.className = 'rubric';

        class GliphBlot extends Inline { 
            static create() {
                let node = super.create();
                node.setAttribute('title', 'Gliph');
                return node;
            }
        };
        GliphBlot.blotName = 'gliph';
        GliphBlot.tagName = 'b';
        GliphBlot.className = 'gliph';

        class InitialBlot extends Inline { 
            static create() {
                let node = super.create();
                node.setAttribute('title', 'Initial');
                return node;
            }
        };
        InitialBlot.blotName = 'initial';
        InitialBlot.tagName = 'b';
        InitialBlot.className = 'initial';

        class DeletionBlot extends Inline {
            static create(technique) {
                let node = super.create();
                node.setAttribute('technique', technique);
                return node;
            }

            static formats(node) {
                return node.getAttribute('technique');
            }
        };
        DeletionBlot.blotName = 'deletion';
        DeletionBlot.tagName = 'b';
        DeletionBlot.className = 'deletion';

        class SicBlot extends Inline {
            static create(correction) {
                let node = super.create();
                if (correction === ' ') {
                    node.setAttribute('correction', ' ');
                    node.setAttribute('title', 'SIC');
                    return node;
                }
                node.setAttribute('correction', correction);
                node.setAttribute('title', 'SIC, correction: ' + correction);
                return node;
            }

            static formats(node) {
                return node.getAttribute('correction');
            }
        };
        SicBlot.blotName = 'sic';
        SicBlot.tagName = 'b';
        SicBlot.className = 'sic';
        
        class AbbrBlot extends Inline {
            static create(expansion) {
                let node = super.create();
                node.setAttribute('expansion', expansion);
                node.setAttribute('title', 'ABBR. Expansion: ' + expansion);
                return node;
            }

            static formats(node) {
                return node.getAttribute('expansion');
            }
        };
        AbbrBlot.blotName = 'abbr';
        AbbrBlot.tagName = 'b';
        AbbrBlot.className = 'abbr';

        class ImageBlot extends BlockEmbed {
            static create(value) {
                let node = super.create();
                node.setAttribute('alt', value.alt);
                node.setAttribute('src', value.url);
                return node;
            }

            static value(node) {
                return {
                    alt: node.getAttribute('alt'),
                    url: node.getAttribute('src')
                };
            }
         };

        ImageBlot.blotName = 'image';
        ImageBlot.tagName = 'img';


        Quill.register(LangBlot);
        
        Quill.register(RubricBlot);
        Quill.register(GliphBlot);
        Quill.register(InitialBlot);

        Quill.register(DeletionBlot);
        Quill.register(SicBlot);
        Quill.register(AbbrBlot);
        Quill.register(ImageBlot);
    }
    
}




