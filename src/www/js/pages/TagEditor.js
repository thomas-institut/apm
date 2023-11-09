import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "./common/SiteUrlGen";

export class TagEditor {

    constructor(options) {

        const optionsDefinition = {
            containerSelector: {type: 'string', required: true},
            inputForm: {type: 'string', required: true},
            tagsDiv: {type: 'string', required: true},
            tags: {type: 'array', required: false},
            mode: {type: 'string', required: true}
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        switch (this.options.mode) {
            case 'edit':
                this.makeTagEditor()
                break
            case 'show':
                this.showTags()
                break
        }
    }

    makeTagEditor() {

        let tags = ''
        let tagsDivSelector = '#' + this.options.tagsDiv

        for (let tag of this.options.tags) {
            tags = tags + ' ' + tag
        }

        $(this.options.containerSelector).html(
            `<p><input type="text" class="form-control" id=${this.options.inputForm} placeholder='tags' style="padding: unset">
                                <div id=${this.options.tagsDiv}><div></p>`)

        $(tagsDivSelector).append(tags)

        this.makeTagFormEvent()
    }

    makeTagFormEvent() {

        let formSelector = '#' + this.options.inputForm
        let thisobject = this

        $(formSelector).keypress(function (e) {
            let key = e.which;
            if(key === 13)  {
                let value = ' ' + $(this).val()
                thisobject.addTagToDiv(value)
                $(this).val('')
            }
        })
    }

    addTagToDiv(tag) {
        let tagsDivSelector = '#' + this.options.tagsDiv

        $(tagsDivSelector).append(tag)
    }

    showTags() {
        let tags = ''
        let tagsDivSelector = '#' + this.options.tagsDiv

        for (let tag of this.options.tags) {
            tags = tags + ' ' + tag
        }

        $(this.options.containerSelector).html(
            `<p><div id=${this.options.tagsDiv}><div></p>`)

        $(tagsDivSelector).append(tags)
    }
}


// Load as global variable so that it can be referenced in the Twig template
window.TagEditor = TagEditor