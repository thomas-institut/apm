import {OptionsChecker} from "@thomas-inst/optionschecker";
import {list} from "quill/ui/icons";

let urlGen = new ApmUrlGenerator('')
urlGen.setBase('http://0.0.0.0:8888')

export class TagEditor {

    constructor(options) {

        const optionsDefinition = {
            containerId: {type: 'string', required: true},
            inputFormId: {type: 'string', required: false, default: 'nil'},
            tags: {type: 'array', required: false, default: []},
            mode: {type: 'string', required: true}
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "MetadataEditor"})
        this.options = oc.getCleanOptions(options)
        this.removedTags = []

        switch (this.options.mode) {
            case 'edit':
                this.setupEditMode(this)
                break
            case 'show':
                this.setupShowMode(this.options.tags)
                break
        }
    }

    setupEditMode(thisObject) {
        this.buildStructureOfTagEditor()
        this.getAllTags((alltags) => {
            this.fillDatalistWithTags(alltags)
        })
        this.showGivenTagsInEditMode(thisObject)
        this.setupEvents(thisObject)
    }

    buildStructureOfTagEditor() {
        $(this.options.containerId).html(`
            <ul class="tags" id="tag-list">
                <li class="tagAdd taglist">
                    <input list="list-of-tags" class="form-control" id="search-field" placeholder="+" style="border: none; height: 1.6em; width: 7em">
                    <datalist id="list-of-tags"></datalist>
                </li>
           </ul>`)
    }

    setupShowMode (tags) {

        let start = '<ul class="tags" id="tag-list">'
        let end = '</ul>'
        let mid = ''

        for (let tag of tags.sort()) {
            mid = mid + `<li class = "showAddedTag">${tag}</li>`
        }

        $(this.options.containerId).html(start + mid + end)

        return true
    }
    
    showGivenTagsInEditMode (thisObject) {
        for (let tag of this.options.tags.sort().reverse()) {
            let tagId = this.removeBlanks(tag) + "_id"
            let liItemId = this.removeBlanks(tag) + "_ListItemId"
            $('#tag-list').prepend(`
               <li class="addedTag" value=${thisObject.removeBlanks(tag)} id=${liItemId} style="margin-left: 0em">${tag}
               <span class="tagRemove" id=${tagId}><sup><i class="fa fa-times fa-xs" style="color: darkblue"></i></sup></span>
               <input type="hidden" name="tags[]">
               </li>`)
            this.makeRemoveTagEvent(thisObject, tagId, liItemId)
        }
    }
    
    setupEvents(thisObject) {
        this.makeFocusSearchFieldEvent()
        this.makeAddTagEvent(thisObject)
    }
    
    makeRemoveTagEvent(thisObject, tag_id, list_item_id) {
        let selector = "#" + tag_id
        let selector2 = '#' + list_item_id
        $(selector).on('click', () => {
            let value = $(selector2).attr('value')
            value = thisObject.insertBlank(value)
            thisObject.removedTags.push(value)
            $(selector2).remove()
        })
    }
    
    makeFocusSearchFieldEvent() {
        $('ul.tags').click(function() {
            $('#search-field').focus();
        })
    }

    makeAddTagEvent(thisObject) {
        $('#search-field').keypress(function(event) {
            if (event.which == '13') {

                let value = thisObject.formatTag($(this).val())

                if (value !== '' && thisObject.validateTag(value) && thisObject.options.tags.includes(value) === false) {
                    let tagId = thisObject.removeBlanks(value) + "_id"
                    let listItemId = thisObject.removeBlanks(value) + "_listItemid"
                    $(`<li class="addedTag" id=${listItemId} value=${thisObject.removeBlanks(value)}>` + value + ' ' +
                        `<span class="tagRemove" id=${tagId}>` +
                        '<sup><i class="fa fa-times fa-xs" style="color: darkblue"></i></sup></span>' +
                        '<input type="hidden" value="' + value +
                        '" name="tags[]"></li>').insertBefore('.tags .tagAdd')

                    thisObject.makeRemoveTagEvent(thisObject, tagId, listItemId)
                    thisObject.options.tags.push(value)
                    $(this).val('')
                }
            }
        })
    }

    removeBlanks (string) {
        while (string.includes(' ')) {
            string = string.replace(' ', '')
        }
        return string
    }

    insertBlank (string) {
        return string.replace(/([A-Z])/g, ' $1').trim()
    }

    formatTag(string) {

        while (string[0] === ' ') {
            string = string.slice(1)
        }

        while (string.slice(-1) === ' ') {
            string = string.slice(0, -1)
        }

        while (string.includes('  ')) {
            string = string.replace('  ', ' ')
        }

        string = string.toLowerCase()
        let words = string.split(' ')
        let tag = ''

        for (let word of words) {
            tag = tag + word.charAt(0).toUpperCase() + word.slice(1) + ' '
        }

        if (tag.slice(-1) === ' ') {
            tag = tag.slice(0, -1)
        }

        return tag
    }

    // TO DO, prohibit special characters in tags
    validateTag(tag) {
        let specialCharacters = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
        return !specialCharacters.test(tag);
    }

    getTags() {
        this.removeTagsFromOptions()
        return this.options.tags.sort()
    }
    
    fillDatalistWithTags(tags) {
        tags.forEach((tag) => {
            $('#list-of-tags').append(`<option value="${tag}">${tag}</option>`)
        })
    }

    removeTagsFromOptions () {
        for (let removedTag of this.removedTags) {
            let index = this.options.tags.indexOf(removedTag)
            this.options.tags.splice(index, 1);
        }
        this.removedTags = []
    }

    saveTags() {

        this.removeTagsFromOptions()

        // Make API Call
        $.post(urlGen.apiTagEditorSaveTags(), {'tags': this.options.tags})
            .done((apiResponse) => {

                // Catch Error
                if (apiResponse.status !== 'OK') {
                    console.log(`Error in query`);
                    if (apiResponse.errorData !== undefined) {
                        console.log(apiResponse.errorData);
                    }
                    return
                }
                
                return true
            })
            .fail((status) => {
                console.log(status);
            })
    }
    
    getAllTags(callback) {
        
        // Make API Call
        $.post(urlGen.apiTagEditorGetAllTags())
            .done((apiResponse) => {

                // Catch Error
                if (apiResponse.status !== 'OK') {
                    console.log(`Error in query`);
                    if (apiResponse.errorData !== undefined) {
                        console.log(apiResponse.errorData);
                    }
                    return;
                }

                // Log API response and change to show mode
                console.log(apiResponse);
                callback(apiResponse.tags)
                return true
            })
            .fail((status) => {
                console.log(status);
            })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.TagEditor = TagEditor