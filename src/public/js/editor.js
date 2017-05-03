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
        this.edNotes = [];
        this.people = [];
        this.maxItemId = 0;
        
        this.containerSelector = containerSelector;
        this.setDefaultLang(defaultLang);
        this.templateLoaded = false;
        let thisObject = this;
        
        
        let Parchment = Quill.import('parchment');
        
        let template = Twig.twig({
            id: "editor",
            href: baseUrl + "templates/editor.twig",
            async: false
        });
        
        let editorHtml = template.render({id: id});
        $(containerSelector).html(editorHtml);

        let quillObject = new Quill('#editor-container-' + id); 
        $('#item-modal-' + id).modal({show: false});
        $('#alert-modal-' + id).modal({show: false});
    
        quillObject.on('selection-change', function(range, oldRange, source) {
            if (!range) {
                return;
            }
            if (range.length === 0) {
                $('.selFmtBtn').prop('disabled', true);
                thisObject.setDisableLangButtons(true);
                $('#edit-button-' + id).prop('disabled', true);
                return;
            }
            let text = quillObject.getText(range);
            if (text.search('\n') !== -1) {
                $('.selFmtBtn').prop('disabled', true);
                thisObject.setDisableLangButtons(false);
                return;
            }
            let selectionHasNoFormat = true;
            thisObject.setDisableLangButtons(false);
            for (let i=range.index; i < range.index+range.length; i++) {
                let format = quillObject.getFormat(i);
                if ($.isEmptyObject(format)) {
                    continue;
                }
                for (const type of ['rubric', 'gliph', 'initial', 'sic', 'abbr', 'deletion']) {
                    if (type in format) {
                        selectionHasNoFormat = false;
                        break;
                    }
                }
            }
            if (selectionHasNoFormat) {
                $('.selFmtBtn').prop('disabled', false);
                $('#edit-button-' + id).prop('disabled', true);
                
            } else {
                $('#edit-button-' + id).prop('disabled', false);
                $('#clear-button-' + id).prop('disabled', false);
            }
        });
        
        quillObject.on('text-change', function(delta, oldDelta, source) {
            let retain = 0;
            let toDelete = 0;
            if (source === 'api') {
                return;
            }
            for(const op of delta.ops) {
                if (op.retain) {
                    retain = op.retain;
                    continue;
                }
                if (op.delete) {
                    toDelete = op.delete;
                }
                if (op.insert) {
                    return;
                }
            }
            if (toDelete > 0) {
                console.log('Procession deletion in editor: @' +retain+"-"+toDelete);
                
                return;
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
            let range = quillObject.getSelection();
            let text = quillObject.getText(range.index, range.length);
            quillObject.format('rubric', {
                itemid: thisObject.getOneItemId(),
                editorid: thisObject.id
            });
            quillObject.setSelection(range.index+range.length);
        });
        
        $('#note-button-' + id).click( function() {
            let range = quillObject.getSelection();
            if (range.length > 0) {
                return;
            }
            //quillObject.insertText(range.index, "\uf06a ");
            //quillObject.setSelection(range.index, 1);
            //quillObject.removeFormat(range.index, 1);
            quillObject.format('mark', {
                itemid: thisObject.getOneItemId(),
                editorid: thisObject.id
            });
            //quillObject.removeFormat(range.index+1, 1);
            quillObject.setSelection(range.index+1);
            
        });
        
        $(containerSelector).on('dblclick', '.rubric', function(event){
            let blot = Parchment.find(event.target);
            let range = {
                index: blot.offset(quillObject.scroll), 
                length: blot.length() 
            };
            quillObject.setSelection(range);
            $('#edit-button-' + id).prop('disabled', false);
            
        });
        
        $('#clear-button-' + id).click( function() {
            let range = quillObject.getSelection();
            // Check for non-textual items
            let nonTextualItemsPresent = false;
            for (let i=range.index; i < range.index+range.length; i++) {
                let format = quillObject.getFormat(i,1);
                for (const type of ['rubric', 'gliph', 'initial', 'sic', 'abbr', 'deletion']) {
                    if (type in format) {
                        nonTextualItemsPresent = true;
                        break;
                    }
                }
            }
            
            function removeFormat(quillObject, range) {
                for (let i=range.index; i < range.index+range.length; i++) {
                    let format = quillObject.getFormat(i,1);
                    if ($.isEmptyObject(format)) {
                        continue;
                    }
                    let lang = format['lang'];
                    let elementType = '';
                    for (const type of ['head', 'gloss', 'custodes']) {
                        if (type in format) {
                            elementType = type;
                            break;
                        }
                    }
                    quillObject.removeFormat(i,1);
                    quillObject.formatText(i,1, 'lang', lang);
                    if (elementType !== '') {
                        quillObject.formatLine(i,1, elementType, true);
                    }
                }
                quillObject.setSelection(range.index+range.length);
            }
            
            
            if (nonTextualItemsPresent) {
                $('#alert-modal-text-' + thisObject.id).html('Are you sure you want to clear formatting of this text?</p><p>Formats and notes will be lost.</p><p class="text-danger">This can NOT be undone!');
                $('#alert-modal-submit-button-' + thisObject.id).on('click', function() {
                    $('#alert-modal-' + thisObject.id).modal('hide');
                    removeFormat(quillObject, range);
                });
                $('#alert-modal-' + thisObject.id).modal('show');
            } else {
                removeFormat(quillObject, range);
            }
            
        });

        $('#gliph-button-' + id).click( function() {
            quillObject.format('gliph', {
                itemid: thisObject.getOneItemId(),
                editorid: thisObject.id
            });
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $(containerSelector).on('dblclick', '.gliph', function(event){
            let blot = Parchment.find(event.target);
            let range = {
                index: blot.offset(quillObject.scroll), 
                length: blot.length() 
            };
            quillObject.setSelection(range);
            $('#edit-button-' + id).prop('disabled', false);
        });

        $('#initial-button-' + id).click( function() {
            quillObject.format('initial', {
                itemid: thisObject.getOneItemId(),
                editorid: thisObject.id
            });
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        });
        
        $(containerSelector).on('dblclick', '.initial', function(event){
            let blot = Parchment.find(event.target);
            let range = {
                index: blot.offset(quillObject.scroll), 
                length: blot.length() 
            };
            quillObject.setSelection(range);
            $('#edit-button-' + id).prop('disabled', false);
        });

        $('#sic-button-' + id).click( function() {
            let range = quillObject.getSelection();
            let text = quillObject.getText(range.index, range.length);
            $('#item-modal-title-' + thisObject.id).html('Sic');
            $('#item-modal-text-' + thisObject.id).html(text);
            $('#item-modal-alttext-label-'+ thisObject.id).html('Correction:');
            $('#item-modal-alttext-' + thisObject.id).val('');
            $('#item-modal-alttext-fg-' + thisObject.id).show();
            $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
            $('#item-modal-ednotes-' + thisObject.id).html('');
            $('#item-note-' + thisObject.id).val('');
            $('#item-note-time-' + thisObject.id).html('New note');
            $('#item-note-id-' + thisObject.id).val('new');
            $('#item-modal-submit-button-' + thisObject.id).off();
            $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
                $('#item-modal-' + thisObject.id).modal('hide');
                let correction = $('#item-modal-alttext-' + thisObject.id).val();
                if (correction === '') {
                    correction = ' ';
                }
                let itemid = thisObject.getOneItemId();
                quillObject.format('sic', { 
                    correction: correction,
                    itemid : itemid,
                    editorid: thisObject.id
                });
                quillObject.setSelection(range.index+range.length);
                // Take care of notes!
                let noteText = $('#item-note-' + thisObject.id).val();
                if (noteText != '') {
                    thisObject.addNewNote(itemid, noteText);
                }
            });
            $('#item-modal-' + thisObject.id).modal('show');
            
        });
        
        $(containerSelector).on('dblclick', '.sic', function(event){
            let blot = Parchment.find(event.target);
            let range = {
                index: blot.offset(quillObject.scroll), 
                length: blot.length() 
            };
            quillObject.setSelection(range);
            $('#edit-button-' + id).prop('disabled', false);
        });
        
        $('#abbr-button-' + id).click( function() {
            let range = quillObject.getSelection();
            let text = quillObject.getText(range.index, range.length);
            $('#item-modal-title-' + thisObject.id).html('Abbreviation');
            $('#item-modal-text-' + thisObject.id).html(text);
            $('#item-modal-alttext-' + thisObject.id).val('');
            $('#item-modal-alttext-label-'+ thisObject.id).html('Expansion:');
            $('#item-modal-alttext-fg-' + thisObject.id).show();
            $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
            $('#item-modal-ednotes-' + thisObject.id).html('');
            $('#item-note-' + thisObject.id).val('');
            $('#item-note-time-' + thisObject.id).html('New note');
            $('#item-note-id-' + thisObject.id).val('new');
            $('#item-modal-submit-button-' + thisObject.id).off();
            $('#item-modal-submit-button-' + thisObject.id).on('click', function () {
                $('#item-modal-' + thisObject.id).modal('hide');
                let expansion = $('#item-modal-alttext-' + thisObject.id).val();
                if (expansion === '') {
                    expansion = ' ';
                }
                let itemid = thisObject.getOneItemId();
                quillObject.format('abbr', { 
                    expansion: expansion,
                    itemid : itemid,
                    editorid: thisObject.id
                });
                quillObject.setSelection(range.index+range.length);
                // Take care of notes!
                let noteText = $('#item-note-' + thisObject.id).val();
                if (noteText != '') {
                    thisObject.addNewNote(itemid, noteText);
                }
            });
            $('#item-modal-' + thisObject.id).modal('show');
        });
        
        $(containerSelector).on('dblclick', '.abbr', function(event){
            let blot = Parchment.find(event.target);
            let range = {
                index: blot.offset(quillObject.scroll), 
                length: blot.length() 
            };
            quillObject.setSelection(range);
            $('#edit-button-' + id).prop('disabled', false);
        });
        
        $('#edit-button-' + id).click( function() {
            let range = quillObject.getSelection();
            let format = quillObject.getFormat(range);
            let text = quillObject.getText(range.index, range.length);
            let altText = '';
            let itemid = -1;
            $('#item-modal-title-' + thisObject.id).html('Unknown');
            if (format['abbr']) {
                altText = format['abbr']['expansion'];
                itemid = format['abbr']['itemid'];
                $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
                $('#item-modal-alttext-' + thisObject.id).val(altText);
                $('#item-modal-alttext-label-' + thisObject.id).html('Expansion:');
                $('#item-modal-alttext-fg-' + thisObject.id).show();
                $('#item-modal-title-' + thisObject.id).html('Abbreviation');
            }
            if (format['sic']) {
                altText = format['sic']['correction'];
                itemid = format['sic']['itemid'];
                $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
                $('#item-modal-alttext-' + thisObject.id).val(altText);
                $('#item-modal-alttext-label-' + thisObject.id).html('Correction');
                $('#item-modal-alttext-fg-' + thisObject.id).show();
                $('#item-modal-title-' + thisObject.id).html('Sic');
            }
            if (format['deletion']) {
                itemid = format['deletion']['itemid'];
                let technique = format['deletion']['technique'];
                $('#item-modal-alttext-fg-' + thisObject.id).hide();
                $('#item-modal-extrainfo-label-' + thisObject.id).html('Technique:');
                $('#item-modal-extrainfo-fg-' + thisObject.id).show();
                let optionsHtml = '';
                for (const tech of Item.getValidDeletionTechniques()) {
                    optionsHtml += '<option value="' + tech + '"' ; 
                    if (tech == technique) {
                        optionsHtml += ' selected';
                    }
                    optionsHtml += '>' + tech + "</option>";
                }
                $('#item-modal-extrainfo-' + thisObject.id).html(optionsHtml);
                $('#item-modal-title-' + thisObject.id).html('Deletion');
            }
            if (format['rubric']) {
                itemid= format['rubric']['itemid'];
                $('#item-modal-title-' + thisObject.id).html('Rubric');
                $('#item-modal-alttext-fg-' + thisObject.id).hide();
                $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
            }
            if (format['initial']) {
                itemid= format['initial']['itemid'];
                $('#item-modal-title-' + thisObject.id).html('Initial');
                $('#item-modal-alttext-fg-' + thisObject.id).hide();
                $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
            }
            if (format['gliph']) {
                itemid= format['gliph']['itemid'];
                $('#item-modal-title-' + thisObject.id).html('Gliph');
                $('#item-modal-alttext-fg-' + thisObject.id).hide();
                $('#item-modal-extrainfo-fg-' + thisObject.id).hide();
            }
            
            let ednotes = thisObject.getEdnotesForItemId(itemid);
            let noteToEdit = thisObject.getLatestNoteForItemAndAuthor(itemid, 
                        thisObject.editorId);
            if ( ($.isEmptyObject(noteToEdit) && ednotes.length>0) || 
                        (ednotes.length > 1)) {
                let ednotesHtml = '<h3>Other notes</h3>';
                for (const note of ednotes) {
                    if (note.id === noteToEdit.id) {
                        continue;
                    }
                    ednotesHtml += '<blockquote><p>' + note.text + '</p>';
                    ednotesHtml += '<footer>' + 
                        thisObject.people[note.authorId]['fullname'] +
                        ' @ ' +
                        note.time + '</footer>';
                    ednotesHtml += '</blockquote>';
                }
                $('#item-modal-ednotes-' + thisObject.id).html(ednotesHtml);
            } else {
                $('#item-modal-ednotes-' + thisObject.id).html('');
            }
            if (!$.isEmptyObject(noteToEdit)) {
                $('#item-note-' + thisObject.id).val(noteToEdit.text);
                $('#item-note-id-' + thisObject.id).val(noteToEdit.id);
                $('#item-note-time-' + thisObject.id).html(
                        'Note last edited <time datetime="' +
                        noteToEdit.time + 
                        '" title="' + 
                        noteToEdit.time + 
                        '">' + 
                        thisObject.timeSince(noteToEdit.time) + 
                        ' ago</time>'
                    );
            } else {
                $('#item-note-' + thisObject.id).val('');
                $('#item-note-time-' + thisObject.id).html('New note');
                $('#item-note-id-' + thisObject.id).val('new');
            }
            
            $('#item-modal-text-' + thisObject.id).html(text);

            $('#item-modal-submit-button-' + thisObject.id).off();
            $('#item-modal-submit-button-' + thisObject.id).on('click', function (){
                $('#item-modal-' + thisObject.id).modal('hide');
                // First, take care of the value
                if (format['sic']) {
                    let altText = $('#item-modal-alttext-' + thisObject.id).val();
                    if (altText === '') {
                        altText = ' ';
                    }
                    quillObject.format('sic', {correction: altText, itemid: itemid, editorid:thisObject.id });
                }
                if (format['abbr']) {
                    let altText = $('#item-modal-alttext-' + thisObject.id).val();
                    if (altText === '') {
                        altText = ' ';
                    }
                    quillObject.format('abbr', {expansion: altText, itemid: itemid, editorid:thisObject.id });
                }
                if (format['deletion']) {
                    let technique = $('#item-modal-extrainfo-' + thisObject.id).val();
                    quillObject.format('deletion', {technique: technique, itemid: itemid, editorid:thisObject.id });
                }
                quillObject.setSelection(range.index+range.length);
                // Then, care of editorial notes
                let noteId = $('#item-note-id-' + thisObject.id).val();
                let noteText = $('#item-note-' + thisObject.id).val();
                if (noteId == 'new') {
                    thisObject.addNewNote(parseInt(itemid), noteText);
                } else {
                    thisObject.updateNote(noteId, noteText);
                }

            });
            $('#item-modal-' + thisObject.id).modal('show');
        });
        
       

//        $('#del-button-' + id).click( function() {
//            let value = prompt('Enter technique:');
//            if (value === null) {
//                return;
//            }
//            quillObject.format('deletion', value);
//            let range = quillObject.getSelection();
//            quillObject.setSelection(range.index+range.length);
//        });

//        $('#illegible-button-' + id).click( function() {
//            let range = quillObject.getSelection(true);
//            quillObject.insertEmbed(range.index, 'image', {
//                alt: 'Quill Cloud',
//                url: 'http://quilljs.com/0.20/assets/images/cloud.png'
//            }, Quill.sources.USER);
//            quillObject.setSelection(range.index + 1, Quill.sources.SILENT);
//        });

        function setDeletion(technique) {
            quillObject.format('deletion', {
                itemid: thisObject.getOneItemId(),
                editorid: thisObject.id,
                technique: technique
            });
            let range = quillObject.getSelection();
            quillObject.setSelection(range.index+range.length);
        }

        $('#del-strikeout-'+id).click(function(){
            setDeletion('strikeout');
        });
        $('#del-dots-above-'+id).click(function(){
            setDeletion('dots-above');
        });
        $('#del-dot-above-dot-under-'+id).click(function(){
            setDeletion('dot-above-dot-under');
        });
        $('#del-dots-underneath-'+id).click(function(){
            setDeletion('dots-underneath');
        });
        $('#del-dot-above-'+id).click(function(){
            setDeletion('dot-above');
        });
        
        $('#line-button-' + id).click(function (){
            quillObject.format('head', false);
            quillObject.format('gloss', false);
        });

        
        $('#gloss-button-' + id).click(function (){
            quillObject.format('gloss', true);
        });
        
        $('#head-button-' + id).click(function (){
            quillObject.format('head', true);
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
        
        thisObject.quillObject = quillObject;
        TranscriptionEditor.editors[this.id] = thisObject;
        
    }
    
    
    getEdnotesForItemId(itemId) {
        let ednotes = [];
        for (const note of this.edNotes) {
            if (note.type===2 && note.target==itemId) {
                ednotes.push(note);
            }
        }
        return ednotes;
    }
    
    getMySqlDate(d) {
        return d.getFullYear() + '-' +
            ('00' + (d.getMonth()+1)).slice(-2) + '-' +
            ('00' + d.getDate()).slice(-2) + ' ' + 
            ('00' + d.getHours()).slice(-2) + ':' + 
            ('00' + d.getMinutes()).slice(-2) + ':' + 
            ('00' + d.getSeconds()).slice(-2);
    }
    
    timeSince(dateString) {

        let date = Date.parse(dateString);
        
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = seconds / 31536000;
        
        if (interval > 1) {
            return interval.toFixed(1) + " years";
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            return interval.toFixed(1) + " months";
        }
        interval = seconds / 86400;
        if (interval > 1) {
            return interval.toFixed(1) + " days";
        }
        interval = seconds / 3600;
        if (interval > 1) {
            return interval.toFixed(1) + " hours";
        }
        interval = seconds / 60;
        if (interval > 1) {
            let minutes = Math.floor(interval);
            if (minutes === 1) {
                return "1 minute";
            }
            return minutes + " minutes";
        }
        let secs = Math.floor(seconds);
        if (secs === 1) {
            return "1 second";
        }
        return  secs + " seconds";
    }
    
    addNewNote(itemId, text) {
        this.edNotes.push({
            id: -1,
            authorId: this.editorId,
            target: itemId,
            type: 2,
            text: text,
            time: this.getMySqlDate(new Date()),
            lang: 'en'
        })
    }
    
    updateNote(noteId, text) {
        let indexToErase = -1;
        for (let i=0; i < this.edNotes.length; i++) {
            if (this.edNotes[i].id == noteId) {
                if (text.trim() === '') {
                    indexToErase = i;
                    break;
                }
                this.edNotes[i].text = text,
                this.edNotes[i].time = this.getMySqlDate(new Date());
                break;
            }
        }
        if (indexToErase !== -1) {
            this.edNotes.splice(indexToErase, 1);
        }
    }
    
    getLatestNoteForItemAndAuthor(itemId, authorId) {
        let latestTime = '';
        let latestNote = {};
        for (const note of this.edNotes) {
            if (note.type===2 && note.target==itemId 
                    && note.authorId === authorId 
                    && note.time > latestTime) {
                latestTime = note.time;
                latestNote = note;
            }
        }
        return latestNote;
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
    
    getOneItemId() {
        this.maxItemId++;
        return this.maxItemId;
    }

   /**
    * Loads the given elements and items into the editor
    * @param {array} columnData
    * @returns {none}
    */
    setData(columnData) {
       
        let delta = [];
        let formats = [];
        formats[ELEMENT_HEAD] = 'head';
        formats[ELEMENT_CUSTODES] = 'custodes';
        formats[ELEMENT_GLOSS] = 'gloss';
        
        this.edNotes = columnData.ednotes;
        this.people = columnData.people;
       
        for(const ele of columnData['elements']) {
            this.pageId = ele.pageId;
            this.columnNumber = ele.columnNumber;
            switch(ele.type) {
                case ELEMENT_LINE: 
                case ELEMENT_HEAD:
                case ELEMENT_CUSTODES:
                case ELEMENT_GLOSS:
                case ELEMENT_PAGE_NUMBER:
                    for (const item of ele.items) {
                        let type='unknown';
                        this.maxItemId = Math.max(this.maxItemId, item.id);
                        switch(item.type) {
                            case ITEM_TEXT: 
                                delta.push({
                                    insert: item.theText,
                                    attributes: {
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_MARK: 
                                delta.push({
                                    insert: "\uf06a",
                                    attributes: { 
                                        mark: {
                                            itemid: item.id,
                                            editorid: this.id
                                        }
                                    }
                                });
                                break;
                                
                            case ITEM_RUBRIC:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        rubric: {
                                            itemid: item.id,
                                            editorid: this.id
                                        }, 
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_GLIPH:
                                delta.push({
                                    insert: item.theText,
                                    attributes: {
                                        gliph: {
                                            itemid: item.id,
                                            editorid: this.id
                                        }, 
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_INITIAL:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        initial: {
                                            itemid: item.id,
                                            editorid: this.id
                                        }, 
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_SIC:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        sic: { 
                                            correction: item.altText,
                                            itemid: item.id,
                                            editorid: this.id
                                        },
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_ABBREVIATION:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        abbr : {
                                            expansion: item.altText, 
                                            itemid: item.id,
                                            editorid: this.id
                                        },
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                            case ITEM_DELETION:
                                delta.push({
                                    insert: item.theText,
                                    attributes: { 
                                        deletion: { 
                                            technique: item.extraInfo,
                                            itemid: item.id,
                                            editorid: this.id
                                        },
                                        lang : item.lang
                                    }
                                });
                                break;
                                
                        }
                      
                    }
                    break;
            }
            if (formats[ele.type] === undefined) {
                delta.push({insert: '\n'});
            } else {
                let attr = {};
                attr[formats[ele.type]] = true;
                delta.push({insert: '\n', attributes: attr});
            }
           
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
        let itemIds = []; 

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
            let type = ITEM_TEXT;
            let theLang = curElement.lang;
            let altText = '';
            let extraInfo = '';
            if (curOps['insert'] !== '\n' && 'attributes' in curOps) {
                let itemId = -1;
                if (curOps['attributes']['rubric']) {
                    type = ITEM_RUBRIC;
                    itemId = curOps['attributes']['rubric']['itemid'];
                }
                if (curOps['attributes']['mark']) {
                    type = ITEM_MARK;
                    itemId = curOps['attributes']['mark']['itemid'];
                }
                if (curOps['attributes']['gliph']) {
                    type = ITEM_GLIPH;
                    itemId = curOps['attributes']['gliph']['itemid'];
                }
                if (curOps['attributes']['initial']) {
                    type = ITEM_INITIAL;
                    itemId = curOps['attributes']['initial']['itemid'];
                }
                
                if (curOps['attributes']['sic']) {
                    type = ITEM_SIC;
                    altText = curOps['attributes']['sic']['correction'];
                    itemId = curOps['attributes']['sic']['itemid'];
                }
                if (curOps['attributes']['abbr']) {
                    type = ITEM_ABBREVIATION;
                    altText = curOps['attributes']['abbr']['expansion'];
                    itemId = curOps['attributes']['abbr']['itemid'];
                }
                
                 if (curOps['attributes']['deletion']) {
                    type = ITEM_DELETION;
                    extraInfo = curOps['attributes']['deletion']['technique'];
                    itemId = curOps['attributes']['deletion']['itemid'];
                }
                
                if (curOps['attributes']['lang']) {
                    theLang = curOps['attributes']['lang'];
                }
                itemId = parseInt(itemId);
                let item = { 
                    id : itemId,
                    seq : currentItemSeq++,
                    type : type, 
                    lang: theLang,
                    theText : curOps['insert'],
                    altText : altText, 
                    extraInfo: extraInfo
                };
                curElement.items.push(item);
                itemIds.push(itemId);
                continue;
            }
            
            let currentString = '';
            for (const ch of curOps['insert']) {
                if (ch === '\n') {
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
                    if (curElement.items.length !== 0) {
                        let elementType = ELEMENT_LINE;
                        if ('attributes' in curOps) {
                            if (curOps['attributes']['gloss']) {
                                elementType = ELEMENT_GLOSS;
                            };
                            if (curOps['attributes']['head']) {
                                elementType = ELEMENT_HEAD;
                            }
                            if (curOps['attributes']['custodes']) {
                                elementType = ELEMENT_CUSTODES;
                            }
                        }
                        curElement['type'] = elementType;
                        elements.push(curElement);
                        currentElementSeq++;
                        curElement = { 
                            id : -1,
                            pageId : this.pageId,
                            columnNumber : this.columnNumber,
                            lang : this.defaultLang,
                            editorId : this.editorId,
                            handId : this.handId,
                            type: ELEMENT_LINE, 
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
        // filter out stray notes
        let filteredEdnotes = [];
        console.log(itemIds);
        for (const note of this.edNotes) {
            if (itemIds.includes(note.target)){
                filteredEdnotes.push(note);
            }
        }
        
        return {elements : elements, ednotes: filteredEdnotes, people: this.people};
    }
    
    
    static setUpPopover(node, title, text, editorid, itemid, notext=false) {
        
        $(node).popover({
            content: function () {
                
                let editorObject = TranscriptionEditor.editors[editorid];
                let ednotes = editorObject.getEdnotesForItemId(itemid);

                let theText = node.textContent;
                let t = '<h3 class="editor-popover-title">' + title + '</h3>';
                if (!notext) {
                    t += '<b>Text</b>: ' + theText + '<br/>';
                }
                t+= text;
                let ednotesHtml = '<h4>Notes:</h4>';
                if ($.isEmptyObject(ednotes)) {
                    ednotesHtml += '&nbsp;&nbsp;<i>None</i>';
                }
                for (const note of ednotes) {
                    ednotesHtml += '<blockquote><p>' + note.text + '</p>';
                    ednotesHtml += '<footer>' + 
                        editorObject.people[note.authorId]['fullname'] +
                        ' @ ' +
                        note.time + '</footer>';
                    ednotesHtml += '</blockquote>';
                }
                return t + ednotesHtml;
            }, 
            container: 'body', 
            animation: false,
            delay : { 'show': 1000, 'hide': 0},
            html: true, 
            placement: 'auto', 
            trigger: 'hover'});
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
        
        TranscriptionEditor.editors = [];
        
        
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
            static create(value) {
                let node = super.create();
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                TranscriptionEditor.setUpPopover(node, 'Rubric', '', value.editorid, value.itemid);
                return node;
            }
            
            static formats(node) {
                return {
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
        };
        RubricBlot.blotName = 'rubric';
        RubricBlot.tagName = 'b';
        RubricBlot.className = 'rubric';
        
        class MarkBlot extends BlockEmbed { 
            static create(value) {
                let node = super.create(value);
                //node.innerHtml = 'NOTE';
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                //node.setAttribute('contenteditable', false);
                //TranscriptionEditor.setUpPopover(node, 'Note', '', value.editorid, value.itemid, true);
                return node;
            }
            
            static formats(node) {
                return {
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
            
            index() {
                return 1;
            }
        };
        MarkBlot.blotName = 'mark';
        MarkBlot.tagName = 'b';
        MarkBlot.className = 'mark';

        class GliphBlot extends Inline { 
            static create(value) {
                let node = super.create();
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                TranscriptionEditor.setUpPopover(node, 'Gliph', '', value.editorid, value.itemid);
                return node;
            }
            
            static formats(node) {
                return {
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
        };
        GliphBlot.blotName = 'gliph';
        GliphBlot.tagName = 'b';
        GliphBlot.className = 'gliph';

        class InitialBlot extends Inline { 
            static create(value) {
                let node = super.create();
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                TranscriptionEditor.setUpPopover(node, 'Initial', '', value.editorid, value.itemid);
                return node;
            }
            
            static formats(node) {
                return {
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
        };
        InitialBlot.blotName = 'initial';
        InitialBlot.tagName = 'b';
        InitialBlot.className = 'initial';

        class DeletionBlot extends Inline {
            static create(value) {
                let node = super.create();
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                node.setAttribute('technique', value.technique);
                TranscriptionEditor.setUpPopover(node, 'Deletion', 
                        '<b>Technique</b>: ' + value.technique, value.editorid, value.itemid);
                return node;
            }

            static formats(node) {
                return {
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid'),
                    technique: node.getAttribute('technique')
                };
            }
        };
        DeletionBlot.blotName = 'deletion';
        DeletionBlot.tagName = 'b';
        DeletionBlot.className = 'deletion';

        class SicBlot extends Inline {
            static create(value) {
                let node = super.create();
                if (value.correction === ' ') {
                    node.setAttribute('correction', ' ');
                    node.setAttribute('itemid', value.itemid);
                    node.setAttribute('editorid', value.editorid);
                    TranscriptionEditor.setUpPopover(node, 'Sic', '', value.editorid, value.itemid);
                    return node;
                }
                node.setAttribute('correction', value.correction);
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                TranscriptionEditor.setUpPopover(node, 'Sic',  '<b>Correction</b>: ' + 
                        value.correction, value.editorid, value.itemid);
                return node;
            }

            static formats(node) {
                return { 
                    correction: node.getAttribute('correction'),  
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
        };
        SicBlot.blotName = 'sic';
        SicBlot.tagName = 'b';
        SicBlot.className = 'sic';
        
        class AbbrBlot extends Inline {
            static create(value) {
                let node = super.create();
                node.setAttribute('expansion', value.expansion);
                node.setAttribute('itemid', value.itemid);
                node.setAttribute('editorid', value.editorid);
                TranscriptionEditor.setUpPopover(node, 'Abbreviation',  '<b>Expansion</b>: ' + 
                        value.expansion, value.editorid, value.itemid);
                return node;
            }

            static formats(node) {
                return { 
                    expansion: node.getAttribute('expansion'),  
                    itemid: node.getAttribute('itemid'),
                    editorid: node.getAttribute('editorid')
                };
            }
        };
        AbbrBlot.blotName = 'abbr';
        AbbrBlot.tagName = 'b';
        AbbrBlot.className = 'abbr';
        

        class GlossBlot extends Block { 
            static formats(node) {
                return true;
            }
        }
        GlossBlot.blotName = 'gloss';
        GlossBlot.tagName = 'p';
        GlossBlot.className = 'gloss';
        
        class HeadBlot extends Block { }
        HeadBlot.blotName = 'head';
        HeadBlot.tagName = 'h3';

//        class ImageBlot extends BlockEmbed {
//            static create(value) {
//                let node = super.create();
//                node.setAttribute('alt', value.alt);
//                node.setAttribute('src', value.url);
//                return node;
//            }
//
//            static value(node) {
//                return {
//                    alt: node.getAttribute('alt'),
//                    url: node.getAttribute('src')
//                };
//            }
//         };
//
//        ImageBlot.blotName = 'image';
//        ImageBlot.tagName = 'img';


        Quill.register(LangBlot);
        
        Quill.register(RubricBlot);
        Quill.register(GliphBlot);
        Quill.register(InitialBlot);
        
        Quill.register(MarkBlot);

        Quill.register(DeletionBlot);
        Quill.register(SicBlot);
        Quill.register(AbbrBlot);
        
        Quill.register(GlossBlot);
        Quill.register(HeadBlot);
//        Quill.register(ImageBlot);
    }
    
}




