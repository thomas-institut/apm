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


/**
 * QuillJS editor for transcriptions
 */
_quillIsSetUp = false;

class TranscriptionEditor {
    
    constructor (containerSelector, id, baseUrl, editorId = 1, defaultLang = 'la', handId = 0) {
        if (!_quillIsSetUp) {
            TranscriptionEditor.setupQuill();
            _quillIsSetUp = true;
        }
        
        this.editorId = editorId;
        this.handId = handId;
        this.defaultLang = defaultLang;
        this.pageId = -1;
        this.columnNumber = -1;
        
        let template = Twig.twig({
            id: "editor",
            href: baseUrl + "templates/editor.twig",
            async: false 
        });
        
        let editorHtml = template.render({id: id});
        $(containerSelector).html(editorHtml);
        let quillObject = new Quill('#editor-container-' + id); 
    
        quillObject.on('selection-change', function(range, oldRange, source) {
            if (!range) {
                return;
            }
            if (range.length === 0) {
                $('.selFmtBtn').prop('disabled', true);
                return;
            }
            let selectionHasNoFormat = true;
            for (let i=range.index; i < range.index+range.length; i++) {
                if (!$.isEmptyObject(quillObject.getFormat(i))) {
                    selectionHasNoFormat = false;
                    break;
                }
            }
            if (selectionHasNoFormat) {
                $('.selFmtBtn').prop('disabled', false);
            } else {
                $('#clear-button-' + id).prop('disabled', false);
            }
        });

        $('#rubric-button-' + id).click( function() {
            quillObject.format('rubric', true);
        });
        
        $('#clear-button-' + id).click( function() {
            let range = quillObject.getSelection();
            quillObject.removeFormat(range.index, range.length);
        });

        $('#gliph-button-' + id).click( function() {
            quillObject.format('gliph', true);
        });

        $('#initial-button-' + id).click( function() {
            quillObject.format('initial', true);
        });

        $('#sic-button-' + id).click( function() {
            let value = prompt('Enter correction:');
            quillObject.format('sic', value);
        });

        $('#del-button-' + id).click( function() {
            let value = prompt('Enter technique:');
            quillObject.format('deletion', value);
        });

        $('#illegible-button-' + id).click( function() {
            let range = quillObject.getSelection(true);
            quillObject.insertEmbed(range.index, 'image', {
                alt: 'Quill Cloud',
                url: 'http://quilljs.com/0.20/assets/images/cloud.png'
            }, Quill.sources.USER);
            quillObject.setSelection(range.index + 1, Quill.sources.SILENT);
        });

        $('#td-button-'+id).click(function(){

        });
        
        this.quillObject = quillObject;
    }
    
    getQuillObject() {
        return this.quillObject;
    }
    
   
    
    /**
     * Takes the contents of a quill editor and returns an array of elements
     * and items.
     * 
     * @returns {Array|elements}
     */
    getElements() {
        let ops = this.quillObject.getContents()['ops'];
        let elements = [];

        let curElement = { 
            id : -1,
            pageId : this.pageId,
            columnNumber : this.columnNumber,
            lang : this.defaultLang,
            editorId : this.editorId,
            type: 1, 
            seq : 0,
            items : [] 
        };
        let currentItemSeq  = 0;
        let currentElementSeq = 0;
        
        for (const [i, curOps] of ops.entries()) {
            console.log("Processing ops " + i);
            console.log(JSON.stringify(curOps));
            let type = 'unknown';
            if ('attributes' in curOps) {
                if (curOps['attributes']['rubric']) {
                    type = 'rubric';
                }
                if (curOps['attributes']['gliph']) {
                    type = 'gliph';
                }
                if (curOps['attributes']['initial']) {
                    type = 'initial';
                }
                let item = { 
                    id : -1,
                    seq : currentItemSeq++,
                    type : type, 
                    text : curOps['insert']
                };
                curElement.items.push(item);
                continue;
            }
            type = 'text';
            
            let currentString = '';
            for (const ch of curOps['insert']) {
                if (ch === '\n') {
                    console.log('New line with cs=' + currentString);
                    if (currentString !== '') {
                        let item = { 
                            id : -1,
                            type : type,
                            seq : currentItemSeq,
                            text : currentString
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
                        text : currentString
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

        class RubricBlot extends Inline { 
            static create() {
                let node = super.create();
                node.setAttribute('title', 'Rubric');
                //node.setAttribute('type', 'rubric');
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
                node.setAttribute('correction', correction);
                node.setAttribute('title', 'Correction: ' + correction);
                return node;
            }

            static formats(node) {
                return node.getAttribute('correction');
            }
        };
        SicBlot.blotName = 'sic';
        SicBlot.tagName = 'b';
        SicBlot.className = 'sic';

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


        Quill.register(RubricBlot);
        Quill.register(GliphBlot);
        Quill.register(InitialBlot);
        Quill.register(DeletionBlot);
        Quill.register(SicBlot);
        Quill.register(ImageBlot);
    }
    
}




