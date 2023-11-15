import {OptionsChecker} from "@thomas-inst/optionschecker";
import {capitalizeFirstLetter} from "../toolbox/Util.mjs";

export class TagEditor {

    constructor(options) {

        const optionsDefinition = {
            containerId: {type: 'string', required: true},
            inputFormId: {type: 'string', required: true},
            tags: {type: 'array', required: false},
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        this.setupTagEditor(this)
    }

    setupTagEditor(thisObject) {
        this.buildStructureOfTagEditor()
        this.fillDatalistWithTags()
        this.showGivenTags()
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

    fillDatalistWithTags() {
        this.options.tags.forEach((tag) => {
            $('#list-of-tags').append(`<option value="${tag}">${tag}</option>`)
        })
    }
    
    showGivenTags () {
        for (let tag of this.options.tags.reverse()) {
            $('#tag-list').prepend(`
                <li class="addedTag">${tag}
                    <span class="tagRemove"><sup style="font-family: Arial">x</sup></span>
                    <input type="hidden" name="tags[]" value=${tag}>
                </li>`)
        }
    }
    
    setupEvents(thisObject) {
        this.makeRemoveTagEvent(thisObject)
        this.makeFocusSearchFieldEvent()
        this.makeAddTagEvent(thisObject)
    }
    
    makeRemoveTagEvent(thisObject) {
        $('.tagRemove').click(function(event) {
            event.preventDefault();
            let index = thisObject.options.tags.indexOf($(this).parent().val())
            console.log(index)
            delete thisObject.options.tags[index]
            console.log(thisObject.options.tags)
            $(this).parent().remove();
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

                let value = thisObject.capitalizeFirstCharacter($(this).val())

                if (value !== '' && thisObject.options.tags.includes(value) === false) {
                    $('<li class="addedTag">' + value + ' ' +
                        '<span class="tagRemove" onclick="$(this).parent().remove()">' +
                        '<sup style="font-family: Arial">x</sup></span>' +
                        '<input type="hidden" value="' + value +
                        '" name="tags[]"></li>').insertBefore('.tags .tagAdd')
                }

                thisObject.options.tags.push(value)
                $(this).val('')
            }
        })
    }

    capitalizeFirstCharacter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Load as global variable so that it can be referenced in the Twig template
window.TagEditor = TagEditor