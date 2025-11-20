import {OptionsChecker} from "@thomas-inst/optionschecker";
import {deepCopy, trimWhiteSpace} from '../toolbox/Util.ts'


const cacheKeyPrefix = 'apm-tag_hints'

export class TagEditor {

  constructor(options) {

    const optionsDefinition = {
      containerSelector: {type: 'string', required: true},
      idPrefix: { type: 'string', default: 'tag-editor'},
      inputFormId: {type: 'string', required: false, default: 'nil'},
      tags: {type: 'array', required: false, default: []},
      tagHints: { type: 'array', required:false, default: []},
      saveTags: { type: 'function', default: async (tags) => {
          console.log(`Tags [${tags.join(', ')}] would be saved now`)
        } },
      mode: {type: 'string', required: true}
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "TagEditor"});
    this.options = oc.getCleanOptions(options);

    this.idPrefix = this.options.idPrefix;

    this.tags = deepCopy(this.options.tags)

    switch (this.options.mode) {
      case 'edit':
        this.setupEditMode();
        break

      case 'show':
        this.setupShowMode();
        break
    }
  }

  setTags(tags) {
    console.log(`Setting tags: [ ${tags.join(', ')}]`)
    this.tags = [...tags];
    switch (this.options.mode) {
      case 'edit':
        this.setupEditMode();
        break

      case 'show':
        this.setupShowMode();
        break
    }
  }

  setupEditMode() {
    this.buildStructureOfTagEditor()
    this.fillDatalistWithTags(this.options.tagHints)
    this.showGivenTagsInEditMode()
    this.setupEvents()
  }

  setupShowMode() {
    this.buildStructureOfTagEditor()
    this.showGivenTagsInShowMode()
  }

  buildStructureOfTagEditor() {
    switch (this.options.mode) {
      case 'edit':
        $(this.options.containerSelector).html(`
            <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">
                <li class="tagAdd taglist">
                    <input list="${this.idPrefix}-list-of-tags" class="tag-input" id="${this.idPrefix}-search-field" placeholder="">
                    <datalist id="${this.idPrefix}-list-of-tags"></datalist>
                </li>
           </ul>`)
        break

      case 'show':
        $(this.options.containerSelector).html(`
            <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">
                <li class="tagAdd taglist"></li>
           </ul>`)
        break
    }
  }

  showGivenTagsInShowMode () {
    for (let tag of this.tags.sort().reverse()) {
      let valueForTagId = tag.replace(/ /g, "_")
      $(`#${this.idPrefix}-tag-list`).prepend(`
               <li class="addedTag" value=${valueForTagId}><span class="tag-text">${tag}</span>
               </li>`)
    }
  }

  showGivenTagsInEditMode () {
    for (let tag of this.tags.sort().reverse()) {
      let valueForTagId = tag.replace(/ /g, "_")
      let tagId = `${this.idPrefix}-${valueForTagId}-id`

      $(`#${this.idPrefix}-tag-list`).prepend(`
               <li class="addedTag" value=${valueForTagId}><span class="tag-text">${tag}</span>
               <span class="tagRemove" id=${tagId}><sup><i class="fa fa-times"></i></sup></span>
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
      let value = $(this).parent()[0].getAttribute('value').replace('_', ' ')
      let index = thisObject.tags.indexOf(value)
      thisObject.tags.splice(index, 1);
      thisObject.options.saveTags(thisObject.tags)
      $(this).parent().remove()
    })
  }

  makeFocusSearchFieldEvent() {
    $('ul.tags').click(()  => {
      this.focus()
    })
  }

  focus () {
    $(`#${this.idPrefix}-search-field`).focus();
  }

  makeAddTagEvent() {
    let thisObject = this
    $(`#${this.idPrefix}-search-field`).keypress(function(event) {
      if (event.which === 13) {
        event.preventDefault();

        let value = thisObject.formatTag($(this).val())
        let valueForTagId = value.replace(/ /g, "_")

        if (value !== '' && thisObject.isTagValid(value) && !thisObject.tags.includes(value)) {
          let tagId = `${thisObject.idPrefix}-${valueForTagId}-id`
          $(`<li class="addedTag" value="${value}"><span class="tag-text">${value}</span> `   +
            `<span class="tagRemove" id="${tagId}">` +
            '<sup><i class="fa fa-times"></i></sup></span>'
            +'<input type="hidden" value="' + value +
            '" name="tags[]"></li>'
          ).insertBefore(`${thisObject.options.containerSelector} .tagAdd`)

          thisObject.makeRemoveTagEvent(tagId)
          thisObject.tags.push(value)
          thisObject.options.saveTags(thisObject.tags).then ( () => {
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

  getTags() {
    return this.tags.sort()
  }

  setTagHints(tags) {
    this.options.tagHints = tags
    this.fillDatalistWithTags(this.options.tagHints)
  }
}