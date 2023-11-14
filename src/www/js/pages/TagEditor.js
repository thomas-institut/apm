import {OptionsChecker} from "@thomas-inst/optionschecker";
import {urlGen} from "./common/SiteUrlGen";

export class TagEditor {

    constructor(options) {

        const optionsDefinition = {
            containerId: {type: 'string', required: true},
            inputFormId: {type: 'string', required: true},
            tags: {type: 'array', required: false},
        }

        const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "MetadataEditor"})
        this.options = oc.getCleanOptions(options)

        this.makeTagEditor()
    }

    makeTagEditor() {

        // let tags = ''
        //
        // for (let tag of this.options.tags) {
        //     tags = tags + ' ' + tag
        // }
        //
        // $(this.options.containerId).html(
        //     `<p><input type="text" class="form-control" id=${this.options.inputFormId} placeholder='tags' style="padding: unset">
        //                         <div id=${this.options.tagsDiv}><div></p>`)

        $(this.options.containerId).html(`<ul class="tags" id="tag-list">
            <li class="tagAdd taglist">
                <input type="text" class="form-control" id="search-field" placeholder="+" style="border: none">
            </li>
           </ul>`)

        for (let tag of this.options.tags.reverse()) {
            $('#tag-list').prepend(`<li class="addedTag">${tag}
                                        <span onClick=${$(this).parent().remove()} class="tagRemove"><sup>x</sup></span>
                                        <input type="hidden" name="tags[]" value=${tag}></li>`)
            }

        this.makeEvents()
    }

    makeEvents() {
        $.expr[":"].contains = $.expr.createPseudo(function(arg) {
            return function( elem ) {
                return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
            };
        });
        $(document).ready(function() {
            $('#addTagBtn').click(function() {
                $('#tags option:selected').each(function() {
                    $(this).appendTo($('#selectedTags'));
                });
            });
            $('#removeTagBtn').click(function() {
                $('#selectedTags option:selected').each(function(el) {
                    $(this).appendTo($('#tags'));
                });
            });
            $('.tagRemove').click(function(event) {
                event.preventDefault();
                $(this).parent().remove();
            });
            $('ul.tags').click(function() {
                $('#search-field').focus();
            });
            $('#search-field').keypress(function(event) {
                if (event.which == '13') {
                    if (($(this).val() != '') && ($(".tags .addedTag:contains('" + $(this).val() + "') ").length == 0 ))  {



                        $('<li class="addedTag">' + $(this).val() + '<span class="tagRemove" onclick="$(this).parent().remove();"><sup>x</sup></span><input type="hidden" value="' + $(this).val() + '" name="tags[]"></li>').insertBefore('.tags .tagAdd');
                        $(this).val('');

                    } else {
                        $(this).val('');

                    }
                }
            });

        });
    }

    makeAddTagEvent() {

    }

    makeTagFormEvent() {

        let formSelector = '#' + this.options.inputFormId
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

        $(this.options.containerId).html(
            `<p><div id=${this.options.tagsDiv}><div></p>`)

        $(tagsDivSelector).append(tags)
    }
}


// Load as global variable so that it can be referenced in the Twig template
window.TagEditor = TagEditor