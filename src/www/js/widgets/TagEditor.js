import {OptionsChecker} from "@thomas-inst/optionschecker";
import { trimWhiteSpace } from '../toolbox/Util.mjs'


const cacheKeyPrefix = 'apm-tag_hints'

export class TagEditor {

  constructor(options) {

    const optionsDefinition = {
      containerSelector: {type: 'string', required: true},
      idPrefix: { type: 'string', default: 'tag-editor'},
      inputFormId: {type: 'string', required: false, default: 'nil'},
      tags: {type: 'array', required: false, default: []},
      getTagHints: { type: 'function', default: async () => {
          return []
        }
        },
      saveTags: { type: 'function', default: async (tags) => {
          console.log(`Tags [${tags.join(', ')}] would be saved now`)
        } },
      mode: {type: 'string', required: true}
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "TagEditor"});
    this.options = oc.getCleanOptions(options);

    console.log(`Options`)
    console.log(this.options)

    this.idPrefix = this.options.idPrefix;



    switch (this.options.mode) {
      case 'edit':
        this.setupEditMode();
        break

      case 'show':
        this.showGivenTagsInShowMode(this.options.tags);
        break
    }
  }

  setTags(tags) {
    console.log(`Setting tags: [ ${tags.join(', ')}]`)
    this.options.tags = [...tags];
    switch (this.options.mode) {
      case 'edit':
        this.setupEditMode();
        break

      case 'show':
        this.showGivenTagsInShowMode(this.options.tags);
        break
    }

  }


  setupEditMode() {
    this.buildStructureOfTagEditor()
    this.options.getTagHints().then( (tags) => {
      this.fillDatalistWithTags(tags)
      this.showGivenTagsInEditModeInEditMode()
      this.setupEvents()
    })
  }

  buildStructureOfTagEditor() {
    $(this.options.containerSelector).html(`
            <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">
                <li class="tagAdd taglist">
                    <input list="${this.idPrefix}-list-of-tags" class="tag-input" id="${this.idPrefix}-search-field" placeholder="+">
                    <datalist id="${this.idPrefix}-list-of-tags"></datalist>
                </li>
           </ul>`)
  }

  showGivenTagsInShowMode (tags) {

    let start = '<ul class="tags" id="tag-list">'
    let end = '</ul>'
    let mid = ''

    for (let tag of tags.sort()) {
      mid = mid + `<li class = "showAddedTag">${tag}</li>`
    }

    $(this.options.containerId).html(start + mid + end)

    return true
  }

  showGivenTagsInEditModeInEditMode () {
    for (let tag of this.options.tags.sort().reverse()) {
      let tagId = `${this.idPrefix}-${tag}-id`
      $(`#${this.idPrefix}-tag-list`).prepend(`
               <li class="addedTag" value=${tag}><span class="tag-text">${tag}</span>
               <span class="tagRemove" id=${tagId}><sup>x</sup></span>
               <input type="hidden" name="tags[]">
               </li>`)
      this.makeRemoveTagEvent(tagId)
    }
  }

  setupEvents() {
    this.makeFocusSearchFieldEvent()
    this.makeAddTagEvent()
  }

  makeRemoveTagEvent(tag_id) {
    let thisObject = this;
    let selector = "#" + tag_id;
    $(selector).click(function(event) {
      event.preventDefault();
      console.log(`Click on remove tag ${tag_id}`)
      let value = $(this).parent()[0].getAttribute('value')
      let index = thisObject.options.tags.indexOf(value)
      thisObject.options.tags.splice(index, 1);
      thisObject.options.saveTags(thisObject.options.tags)
      $(this).parent().remove()
    })
  }

  makeFocusSearchFieldEvent() {
    $('ul.tags').click(()  => {
      $(`#${this.idPrefix}-search-field`).focus();
    })
  }

  makeAddTagEvent() {
    let thisObject = this
    $(`#${this.idPrefix}-search-field`).keypress(function(event) {
      if (event.which === 13) {
        event.preventDefault();

        let value = thisObject.formatTag($(this).val())
        let valueForTagId = value.replace(/ /g, "_")

        if (value !== '' && thisObject.isTagValid(value) && thisObject.options.tags.includes(value) === false) {
          let tagId = `${thisObject.idPrefix}-${valueForTagId}-id`
          $(`<li class="addedTag" value="${value}"><span class="tag-text">${value}</span> `   +
            `<span class="tagRemove" id="${tagId}">` +
            '<sup>x</sup></span>'
            +'<input type="hidden" value="' + value +
            '" name="tags[]"></li>'
          ).insertBefore(`${thisObject.options.containerSelector} .tagAdd`)

          thisObject.makeRemoveTagEvent(tagId)
          thisObject.options.tags.push(value)
          thisObject.options.saveTags(thisObject.options.tags).then ( () => {
            // console.log(`Tag ${value} added`)
            $(this).val('')
          })
        }
        event.stopPropagation();
      }
    })
  }

  /**
   *
   * @param {string}string
   * @return {string}
   */
  formatTag(string) {
    return trimWhiteSpace(string)
  }

  /**
   * 
   * @param {string}tag
   * @return {boolean}
   */
  isTagValid(tag) {
    let specialCharacters = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
    return !specialCharacters.test(tag);
  }

  fillDatalistWithTags(tags) {
    tags.forEach((tag) => {
      $(`#${this.idPrefix}-list-of-tags`).append(`<option value="${tag}">${tag}</option>`)
    })
  }

}
