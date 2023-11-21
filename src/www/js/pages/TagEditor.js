import {OptionsChecker} from "@thomas-inst/optionschecker";

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
        
        switch (this.options.mode) {
            case 'edit':
                this.setupEditMode(this)
                break
            case 'show':
                this.showTags(this.options.tags)
                break
        }
    }

    setupEditMode(thisObject) {
        this.buildStructureOfTagEditor()
        this.getAllTags((alltags) => {
            this.fillDatalistWithTags(alltags)
        })
        this.showGivenTags(thisObject)
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

    showTags (tags) {

        let start = '<ul class="tags" id="tag-list"><li class="tagAdd taglist">'
        let end = '</li></ul>'
        let mid = ''

        for (let tag of tags.sort()) {
            mid = mid + `<li class = "showAddedTag">${tag}</li>`
        }

        $(this.options.containerId).html(start + mid + end)

        return true
    }
    
    showGivenTags (thisObject) {
        for (let tag of this.options.tags.sort().reverse()) {
            let tagId = tag + "_id"
            $('#tag-list').prepend(`
                <li class="addedTag" value=${tag}>${tag}
                    <span class="tagRemove" id=${tagId}><sup style="font-family: Arial">x</sup></span>
                    <input type="hidden" name="tags[]">
                </li>`)
            this.makeRemoveTagEvent(thisObject, tagId)
        }
    }
    
    setupEvents(thisObject) {
        this.makeFocusSearchFieldEvent()
        this.makeAddTagEvent(thisObject)
    }
    
    makeRemoveTagEvent(thisObject, tag_id) {
        let selector = "#" + tag_id
        $(selector).click(function(event) {
            event.preventDefault();
            let value = $(this).parent()[0].getAttribute('value')
            let index = thisObject.options.tags.indexOf(value)
            thisObject.options.tags.splice(index, 1);
            $(this).parent().remove()
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
                    let tagId = value + "_id"
                    $(`<li class="addedTag" value=${value}>` + value + ' ' +
                        `<span class="tagRemove" id=${tagId}>` +
                        '<sup style="font-family: Arial">x</sup></span>' +
                        '<input type="hidden" value="' + value +
                        '" name="tags[]"></li>').insertBefore('.tags .tagAdd')

                    thisObject.makeRemoveTagEvent(thisObject, tagId)
                    thisObject.options.tags.push(value)
                    $(this).val('')
                }
            }
        })
    }

    formatTag(string) {

        while (string[0] === ' ') {
            string = string.slice(1)
        }

        while (string.slice(-1) === ' ') {
            string = string.slice(0, -1)
        }

        string = string.toLowerCase()
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // TO DO, prohibit blanks and special characters in tags
    validateTag(tag) {
        let specialCharacters = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
        return !specialCharacters.test(tag);
    }

    getTags() {
        return this.options.tags.sort()
    }
    
    fillDatalistWithTags(tags) {
        tags.forEach((tag) => {
            $('#list-of-tags').append(`<option value="${tag}">${tag}</option>`)
        })
    }

    saveTags() {

        // Make API Call
        $.post(urlGen.apiTagEditorSaveTags(), {'tags': this.options.tags})
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