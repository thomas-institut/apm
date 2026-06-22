import {OptionsChecker} from "@thomas-inst/optionschecker";
import { trimWhiteSpace } from '../toolbox/Util'


const cacheKeyPrefix = 'apm-tag_hints'

type TagEditorMode = 'edit' | 'show'
type TagTextStyle = Record<string, string>

export interface TagEditorOptions {
  containerSelector: string
  idPrefix?: string
  mode: TagEditorMode
  inputFormId?: string
  tags?: string[]
  getTagHints?: () => Promise<string[]>
  saveTags?: (tags: string[]) => Promise<void>
  onTagClick?: (tag: string, active: boolean, event: any) => void
  onTagHover?: (tag: string, active: boolean, event: any) => void
  showInput?: boolean
  sortTags?: boolean
  prependTags?: boolean
}

interface CleanTagEditorOptions {
  containerSelector: string
  idPrefix: string
  mode: TagEditorMode
  inputFormId: string
  tags: string[]
  getTagHints: () => Promise<string[]>
  saveTags: (tags: string[]) => Promise<void>
  onTagClick: (tag: string, active: boolean, event: any) => void
  onTagHover: (tag: string, active: boolean, event: any) => void
  showInput?: boolean
  sortTags?: boolean
  prependTags?: boolean
}

export class TagEditor {
  private options: CleanTagEditorOptions
  public idPrefix: string
  private activeTags: Set<string>

  constructor(options: TagEditorOptions) {

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
      saveTags: { type: 'function', default: async (tags: string[]) => {
          console.log(`Tags [${tags.join(', ')}] would be saved now`)
        } },
      onTagClick: { type: 'function', default: () => {
      } },
      onTagHover: { type: 'function', default: () => {
      } },
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "TagEditor"});
    this.options = oc.getCleanOptions(options) as CleanTagEditorOptions;

    // console.log(`Options`)
    // console.log(this.options)

    this.idPrefix = this.options.idPrefix;
    this.activeTags = new Set<string>();

    this.render()
  }

  setTags(tags: string[]) {
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
      this.showGivenTagsInEditMode()
      this.appendAddTagField()
      this.fillDatalistWithTags(tags)
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

  getDefaultTagTextStyle(): TagTextStyle {
    const palette = this.getTagColorPalette('__default__')
    return {
      display: 'inline-block',
      backgroundColor: palette.chipBackground,
      fontSize: '0.9em',
      border: `1px solid ${palette.chipBorder}`,
      borderRadius: '3px',
      padding: '2px 5px',
      marginInlineEnd: '1px',
      lineHeight: '1.05',
      verticalAlign: 'middle',
      color: palette.chipText,
      cursor: 'pointer'
    };
  }

  isActiveTag(tag: string) {
    return this.activeTags.has(tag);
  }

  setActiveTag(tag: string, active: boolean) {
    if (active) {
      this.activeTags.add(tag);
      return;
    }
    this.activeTags.delete(tag);
  }

  buildStructureOfTagEditor() {
    $(this.options.containerSelector).html(`
            <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">
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

  appendAddTagField() {
    if (this.options.mode !== 'edit') {
      return
    }
    $(`#${this.idPrefix}-tag-list`).append(`
                <li class="tagAdd taglist">
                    <input list="${this.idPrefix}-list-of-tags" class="tag-input" id="${this.idPrefix}-search-field" placeholder="+">
                    <datalist id="${this.idPrefix}-list-of-tags"></datalist>
                </li>`)
  }

  setupEvents() {
    this.makeFocusSearchFieldEvent()
    this.makeAddTagEvent()
  }

  makeRemoveTagEvent(tag_id: string) {
    let thisObject = this;
    let selector = "#" + tag_id;
    $(selector).click(function(event) {
      event.preventDefault();
      console.log(`Click on remove tag ${tag_id}`)
      let value = $(this).parent()[0].getAttribute('value')!.replace('_', ' ')
      console.log(value)
      let index = thisObject.options.tags.indexOf(value)
      console.log(index)
      thisObject.options.tags.splice(index, 1);
      thisObject.options.saveTags(thisObject.options.tags)
      $(this).parent().remove()
    })
  }

  _appendTagItem(tag: string, includeRemoveButton: boolean) {
    let valueForTagId = tag.replace(/ /g, "_")
    let tagItemId = `${this.idPrefix}-${valueForTagId}-item`
    let tagRemoveId = `${this.idPrefix}-${valueForTagId}-id`
    let tagTextStyle = this.getTagTextStyle(tag)
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
    $(`#${tagItemId}`).css({
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: includeRemoveButton ? '1.25em' : '1.05em',
      marginInlineEnd: includeRemoveButton ? '0.35em' : '0.25em',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap'
    })
    $(`#${tagItemId} span.tag-text`).css(tagTextStyle)
    if (includeRemoveButton) {
      this.makeRemoveTagEvent(tagRemoveId)
      return
    }
    this.makeTagHoverAndClickEvents(tagItemId, tag)
  }

  makeTagHoverAndClickEvents(tagItemId: string, tag: string) {
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

        let value = thisObject.formatTag(String($(this).val() ?? ''))
        let valueForTagId = value.replace(/ /g, "_")

        if (value !== '' && thisObject.isTagValid(value) && thisObject.options.tags.includes(value) === false) {
          thisObject._appendTagItem(value, true)
          $(`#${thisObject.idPrefix}-${valueForTagId}-item`).insertBefore(`${thisObject.options.containerSelector} .tagAdd`)
          let tagId = `${thisObject.idPrefix}-${valueForTagId}-id`
          thisObject.makeRemoveTagEvent(tagId)
          thisObject.options.tags.push(value)
          thisObject.options.saveTags(thisObject.options.tags).then ( () => {
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
  formatTag(string: string) {
    return trimWhiteSpace(string)
  }

  /**
   *
   * @param {string}tag
   * @return {boolean}
   */
  isTagValid(tag: string) {
    let specialCharacters = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
    return !specialCharacters.test(tag);
  }

  fillDatalistWithTags(tags: string[]) {
    tags.forEach((tag) => {
      $(`#${this.idPrefix}-list-of-tags`).append(`<option value="${tag}">${tag}</option>`)
    })
  }

  _applyTagTextStyle(tagItemId: string, tag: string) {
    $(`#${tagItemId} span.tag-text`).css(this.getTagTextStyle(tag))
  }

  getTagTextStyle(tag: string): TagTextStyle {
    const palette = this.getTagColorPalette(tag)
    let tagTextStyle = {
      ...this.getDefaultTagTextStyle(),
      backgroundColor: palette.chipBackground,
      border: `1px solid ${palette.chipBorder}`,
      color: palette.chipText
    }
    if (this.isActiveTag(tag)) {
      tagTextStyle = {
        ...tagTextStyle,
        backgroundColor: palette.chipActiveBackground,
        border: `1px solid ${palette.chipActiveBorder}`,
        color: palette.chipActiveText
      }
    }
    return tagTextStyle
  }


hashStringToHue(string: string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
      hash = ((hash << 5) - hash) + string.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }

getTagColorPalette(tag: string) {
    const hash = this.hashStringToHue(tag)
    const hue = (hash % 240)
    const saturation = 80 + ((hash >>> 3) % 8)
    const lightness = 84 + ((hash >>> 6) % 4)
    const activeLightness = Math.max(74, lightness - 10)
    const borderSaturation = Math.max(42, saturation - 26)
    const borderLightness = Math.max(56, lightness - 16)
    const activeBorderLightness = Math.max(48, activeLightness - 40)
    return {
      chipBackground: `hsl(${hue} ${saturation}% ${lightness}%)`,
      chipBorder: `hsl(${hue} ${borderSaturation}% ${borderLightness}%)`,
      chipText: 'black',
      chipActiveBackground: `hsl(${hue} ${saturation}% ${activeLightness}%)`,
      chipActiveBorder:  `hsl(${hue} ${borderSaturation}% ${activeBorderLightness}%)`,
      chipActiveText: 'black',
      highlightBackground: `hsl(${hue} ${Math.max(74, saturation)}% ${lightness}%)`
    }
  }

getTagColor(tags: string[]) {
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length === 0) {
      return '';
    }

    const colors = uniqueTags.map(tag => this.getTagColorPalette(tag).highlightBackground);
    if (colors.length === 1) {
      return colors[0];
    }

    const segmentWidth = 100 / colors.length;
    const segments = colors.map((color, index) => {
      const start = index * segmentWidth;
      const end = (index + 1) * segmentWidth;
      return `${color} ${start}% ${end}%`;
    });
    return `linear-gradient(90deg, ${segments.join(', ')})`;
  }


  getTags() {
    //this.removeTagsFromOptions()
    return this.options.tags.sort()
  }
}
