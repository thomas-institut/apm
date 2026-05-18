import {OptionsChecker} from "@thomas-inst/optionschecker";
import { trimWhiteSpace } from '../toolbox/Util.ts'


const cacheKeyPrefix = 'apm-tag_hints'

export class TagEditor {

  constructor(options) {

    const optionsDefinition = {
      containerSelector: {type: 'string', required: true},
      idPrefix: { type: 'string', default: 'tag-editor'},
      mode: {type: 'string', required: true},
      inputFormId: {type: 'string', required: false, default: 'nil'},
      tags: {type: 'array', required: false, default: []},
      getTagHints: { type: 'function', default: async () => {
          return []
        }
      },
      saveTags: { type: 'function', default: async (tags) => {
          console.log(`Tags [${tags.join(', ')}] would be saved now`)
        } },
      onTagClick: { type: 'function', default: () => {
      } },
      onTagHover: { type: 'function', default: () => {
      } },
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "TagEditor"});
    this.options = oc.getCleanOptions(options);

    // console.log(`Options`)
    // console.log(this.options)

    this.idPrefix = this.options.idPrefix;
    this.activeTags = new Set();

    this.render()
  }

  setTags(tags) {
    console.log(`Setting tags: [ ${tags.join(', ')}]`)
    this.options.tags = [...tags];
    this.render()
  }

  render() {
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
    this.options.getTagHints().then( (tags) => {
      this.fillDatalistWithTags(tags)
      this.showGivenTagsInEditMode()
      this.setupEvents()
    })
  }

  setupShowMode() {
    this.buildStructureOfTagEditor()
    this.showGivenTagsInShowMode()
  }

  getOrderedTags() {
    let tags = [...this.options.tags]
    tags.sort()
    return tags
  }

  getDefaultTagTextStyle() {
    return {
      display: 'inline-block',
      fontSize: '0.9em',
      background: '#e8d5f5',
      border: '1px solid #b89fd4',
      borderRadius: '3px',
      padding: '1px 7px',
      marginRight: '4px',
      verticalAlign: 'middle',
      color: '#5a3a7a',
      cursor: 'pointer'
    };
  }

  getActiveTagTextStyle() {
    return {
      background: '#b89fd4',
      border: '1px solid #7c5a9e',
      color: '#fff'
    };
  }

  isActiveTag(tag) {
    return this.activeTags.has(tag);
  }

  setActiveTag(tag, active) {
    if (active) {
      this.activeTags.add(tag);
      return;
    }
    this.activeTags.delete(tag);
  }

  buildStructureOfTagEditor() {
    let inputHtml = ''
    if (this.options.mode === 'edit') {
      inputHtml = `
                <li class="tagAdd taglist">
                    <input list="${this.idPrefix}-list-of-tags" class="tag-input" id="${this.idPrefix}-search-field" placeholder="+">
                    <datalist id="${this.idPrefix}-list-of-tags"></datalist>
                </li>`
    }
    $(this.options.containerSelector).html(`
            <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">${inputHtml}
           </ul>`)
  }

  showGivenTagsInShowMode () {
    for (let tag of this.getOrderedTags()) {
      this._appendTagItem(tag, false)
    }
  }

  showGivenTagsInEditMode () {
    for (let tag of this.getOrderedTags()) {
      this._appendTagItem(tag, true)
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
      console.log(value)
      let index = thisObject.options.tags.indexOf(value)
      console.log(index)
      thisObject.options.tags.splice(index, 1);
      thisObject.options.saveTags(thisObject.options.tags)
      $(this).parent().remove()
    })
  }

  _appendTagItem(tag, includeRemoveButton) {
    let valueForTagId = tag.replace(/ /g, "_")
    let tagItemId = `${this.idPrefix}-${valueForTagId}-item`
    let tagRemoveId = `${this.idPrefix}-${valueForTagId}-id`
    let tagTextStyle = {...this.getDefaultTagTextStyle()}
    if (this.isActiveTag(tag)) {
      tagTextStyle = {...tagTextStyle, ...this.getActiveTagTextStyle()}
    }
    let removeButtonHtml = ''
    let hiddenInputHtml = ''
    if (includeRemoveButton) {
      removeButtonHtml = `<span class="tagRemove" id="${tagRemoveId}"><sup>x</sup></span>`
      hiddenInputHtml = '<input type="hidden" name="tags[]">'
    }
    $(`#${this.idPrefix}-tag-list`)['append'](`
               <li class="addedTag" id="${tagItemId}" value=${valueForTagId}><span class="tag-text">${tag}</span>
               ${removeButtonHtml}
               ${hiddenInputHtml}
               </li>`)
    $(`#${tagItemId} span.tag-text`).css(tagTextStyle)
    if (includeRemoveButton) {
      this.makeRemoveTagEvent(tagRemoveId)
      return
    }
    this.makeTagHoverAndClickEvents(tagItemId, tag)
  }

  makeTagHoverAndClickEvents(tagItemId, tag) {
    let selector = `#${tagItemId}`
    $(selector).on('click', (event) => {
      const active = !this.isActiveTag(tag)
      this.setActiveTag(tag, active)
      this._applyTagTextStyle(tagItemId, tag)
      this.options.onTagClick(tag, active, event)
    })
    $(selector).on('mouseenter', (event) => {
      this.options.onTagHover(tag, true, event)
    })
    $(selector).on('mouseleave', (event) => {
      this.options.onTagHover(tag, false, event)
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

  _applyTagTextStyle(tagItemId, tag) {
    let tagTextStyle = {...this.getDefaultTagTextStyle()}
    if (this.isActiveTag(tag)) {
      tagTextStyle = {...tagTextStyle, ...this.getActiveTagTextStyle()}
    }
    $(`#${tagItemId} span.tag-text`).css(tagTextStyle)
  }

  getTags() {
    //this.removeTagsFromOptions()
    return this.options.tags.sort()
  }
}
