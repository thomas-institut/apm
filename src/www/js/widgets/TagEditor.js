import {OptionsChecker} from "@thomas-inst/optionschecker";

let urlGen = new ApmUrlGenerator('')
urlGen.setBase('http://0.0.0.0:8888')

export class TagEditor {

    constructor(options) {

        const optionsDefinition = {
            container: {type: 'string', required: true},
            tags: {type: 'array', required: false, default: []},
            mode: {type: 'string', required: true}
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        // Collecting visually removed tags for removing them from this.options.tags when saving
        this.removedTags = []

        switch (this.options.mode) {
            case 'edit':
                this.setupEditMode()
                break
            case 'show':
                this.setupShowMode()
                break
        }
    }

    setupEditMode() {
        this.buildTagEditor()
        this.getAllTags((tags) => {
            this.fillDatalistWithTags(tags)
        })
        this.showGivenTags()
        this.setupEvents()
    }

    setupShowMode () {
        const start = '<ul class="tags" id="tag-list">'
        const end = '</ul>'
        let mid = ''

        for (let tag of this.options.tags.sort()) {
            mid += `<li class = "showAddedTag">${tag}</li>`
        }

        $(this.options.container).html(start + mid + end)
    }

    buildTagEditor() {
        $(this.options.container).html(`
            <ul class="tags" id="tag-list">
                <li class="tagAdd taglist">
                    <input list="list-of-tags" class="form-control" id="search-field" placeholder="+" 
                                                                style="border: none; height: 1.6em; width: 7em">
                    <datalist id="list-of-tags"></datalist>
                </li>
           </ul>`)
    }

    fillDatalistWithTags(tags) {
        tags.forEach((tag) => {
            $('#list-of-tags').append(`<option value="${tag}">${tag}</option>`)
        })
    }
    
    showGivenTags () {
        for (let tag of this.options.tags.sort().reverse()) {
            const thisObject = this
            let removeTagCrossId = this.removeBlanks(tag) + "_id"
            let liElementId = this.removeBlanks(tag) + "_listElementId"
            
            $('#tag-list').prepend(`
               <li class="addedTag" value=${thisObject.removeBlanks(tag)} id=${liElementId} style="margin-left: 0em">${tag}
                    <span class="tagRemove" id=${removeTagCrossId}>
                        <sup>
                            <i class="fa fa-times fa-xs" style="color: darkblue"></i>
                        </sup>
                    </span>
                    <input type="hidden" name="tags[]">
               </li>`)
            
            this.makeRemoveTagEvent(thisObject, removeTagCrossId, liElementId)
        }
    }

    makeRemoveTagEvent(thisObject, removeTagCrossId, listElementId) {
        let removeTagCrossSelector = "#" + removeTagCrossId
        let listElementSelector = '#' + listElementId
        $(removeTagCrossSelector).on('click', () => {
            let value = $(listElementSelector).attr('value')
            value = thisObject.insertBlank(value)
            thisObject.removedTags.push(value)
            $(listElementSelector).remove()
        })
    }
    
    setupEvents() {
        this.makeFocusSearchFieldEvent()
        this.makeAddTagEvent()
    }
    
    makeFocusSearchFieldEvent() {
        $('ul.tags').click(function() {
            $('#search-field').focus();
        })
    }

    makeAddTagEvent() {
        const thisObject = this

        $('#search-field').keypress(function(event) {
            if (event.which == '13') {

                let tag = thisObject.formatTag($(this).val())

                // Validate tag, not empty, no special characters, not already existing or already visually removed
                if (thisObject.validateTag(tag) &&
                    (!thisObject.options.tags.includes(tag) || thisObject.removedTags.includes(tag))) {

                    // Delete tag from removedTags if added again and do not add it again to options.tags
                    if (thisObject.removedTags.includes(tag)) {
                        console.log(thisObject.removedTags)
                        const index = thisObject.removedTags.indexOf(tag)
                        thisObject.removedTags.splice(index, 1)
                        console.log(thisObject.removedTags)
                    } else {
                        thisObject.options.tags.push(tag)
                    }

                    // show new li element
                    let tagId = thisObject.removeBlanks(tag) + "_id"
                    let listElementId = thisObject.removeBlanks(tag) + "_listElementId"

                    $(`<li class="addedTag" id=${listElementId} value=${thisObject.removeBlanks(tag)}>` + tag + ' ' +
                        `<span class="tagRemove" id=${tagId}>` +
                            '<sup><i class="fa fa-times fa-xs" style="color: darkblue"></i></sup> </span>' +
                        '<input type="hidden" value="' + tag +
                        '" name="tags[]"></li>').insertBefore('.tags .tagAdd')

                    thisObject.makeRemoveTagEvent(thisObject, tagId, listElementId)
                    $(this).val('')
                }
            }
        })
    }

    validateTag(tag) {
        if (tag === '') {
            return false
        }

        let specialCharacters = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
        return !specialCharacters.test(tag);
    }

    // Little help-functions
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

    getTags() {
        this.removeTagsFromOptions()
        return this.options.tags.sort()
    }

    removeTagsFromOptions () {
        for (let removedTag of this.removedTags) {
            let index = this.options.tags.indexOf(removedTag)
            this.options.tags.splice(index, 1);
        }
        this.removedTags = []
    }

    // API Calls
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
                    return
                }

                // Log API response and change to show mode
                console.log(apiResponse);
                callback(apiResponse.tags)
            })
            .fail((status) => {
                console.log(status);
            })
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.TagEditor = TagEditor