import {OptionsChecker} from "@thomas-inst/optionschecker";
import {trimWhiteSpace} from '@/toolbox/Util'

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
  onTagClick?: (tag: string, active: boolean, event: JQuery.ClickEvent<HTMLElement>) => void
  onTagHover?: (tag: string, active: boolean, event: JQuery.MouseEnterEvent<HTMLElement> | JQuery.MouseLeaveEvent<HTMLElement>) => void
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
  onTagClick: (tag: string, active: boolean, event: JQuery.ClickEvent<HTMLElement>) => void
  onTagHover: (tag: string, active: boolean, event: JQuery.MouseEnterEvent<HTMLElement> | JQuery.MouseLeaveEvent<HTMLElement>) => void
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
      idPrefix: {type: 'string', default: 'tag-editor'},
      mode: {type: 'string', required: true},
      inputFormId: {type: 'string', required: false, default: 'nil'},
      tags: {type: 'array', required: false, default: []},
      getTagHints: {
        type: 'function', default: async () => {
          return []
        }
      },
      saveTags: {
        type: 'function', default: async (tags: string[]) => {
          console.log(`Tags [${tags.join(', ')}] would be saved now`)
        }
      },
      onTagClick: {
        type: 'function', default: () => {
        }
      },
      onTagHover: {
        type: 'function', default: () => {
        }
      },
    }

    const oc = new OptionsChecker({optionsDefinition: optionsDefinition, context: "TagEditor"});
    this.options = oc.getCleanOptions(options) as CleanTagEditorOptions;

    this.idPrefix = this.options.idPrefix;
    this.activeTags = new Set<string>();

    this.render()
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Replaces the current tags and re-renders the editor.
   *
   * @param {string[]}tags
   * @return {void}
   */
  setTags(tags: string[]) {
    console.log(`Setting tags: [ ${tags.join(', ')}]`)
    this.options.tags = [...tags];
    this.render()
  }

  /**
   * Returns the current tags sorted alphabetically.
   *
   * @return {string[]}
   */
  getTags() {
    return this.options.tags.sort()
  }

  /**
   * Checks whether a tag is currently active.
   *
   * @param {string}tag
   * @return {boolean}
   */
  isActiveTag(tag: string) {
    return this.activeTags.has(tag);
  }

  /**
   * Sets the active state of a tag.
   *
   * @param {string}tag
   * @param {boolean}active
   * @return {void}
   */
  setActiveTag(tag: string, active: boolean) {
    if (active) {
      this.activeTags.add(tag);
      return;
    }
    this.activeTags.delete(tag);
  }

  /**
   * Returns a single color or a gradient for the given tags.
   *
   * @param {string[]}tags
   * @return {string}
   */
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

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Renders the editor according to its configured mode.
   *
   * @return {void}
   */
  private render() {
    switch (this.options.mode) {
      case 'edit':
        this.setupEditMode();
        break

      case 'show':
        this.setupShowMode();
        break
    }
  }

  /**
   * Builds and initializes the editor in edit mode.
   *
   * @return {void}
   */
  private setupEditMode() {
    this.buildStructureOfTagEditor()
    this.options.getTagHints().then((tags) => {
      this.showGivenTagsInEditMode()
      this.appendAddTagField()
      this.fillDatalistWithTags(tags)
      this.setupEvents()
    })
  }

  /**
   * Builds and initializes the editor in show mode.
   *
   * @return {void}
   */
  private setupShowMode() {
    this.buildStructureOfTagEditor()
    this.showGivenTagsInShowMode()
  }

  /**
   * Creates the base DOM structure of the tag editor.
   *
   * @return {void}
   */
  private buildStructureOfTagEditor() {
    $(this.options.containerSelector).html(`
                    <ul class="tag-editor-tags-ul" id="${this.idPrefix}-tag-list">
                   </ul>`)
  }

  /**
   * Renders all configured tags in show mode.
   *
   * @return {void}
   */
  private showGivenTagsInShowMode() {
    for (let tag of this.getOrderedTags()) {
      this.appendTagItem(tag, false)
    }
  }

  /**
   * Renders all configured tags in edit mode.
   *
   * @return {void}
   */
  private showGivenTagsInEditMode() {
    for (let tag of this.getOrderedTags()) {
      this.appendTagItem(tag, true)
    }
  }

  /**
   * Appends the input field and datalist used for adding tags.
   *
   * @return {void}
   */
  private appendAddTagField() {
    if (this.options.mode !== 'edit') {
      return
    }

    $(`#${this.idPrefix}-tag-list`).append(`
                        <li class="tagAdd taglist">
                            <input list="${this.idPrefix}-list-of-tags" class="tag-input" id="${this.idPrefix}-search-field" placeholder="+">
                            <datalist id="${this.idPrefix}-list-of-tags"></datalist>
                        </li>`)
  }

  /**
   * Appends one tag item to the list.
   *
   * @param {string}tag
   * @param {boolean}includeRemoveButton
   * @return {void}
   */
  private appendTagItem(tag: string, includeRemoveButton: boolean) {
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

  /**
   * Returns the configured tags sorted alphabetically.
   *
   * @return {string[]}
   */
  private getOrderedTags() {
    let tags = [...this.options.tags]
    tags.sort()
    return tags
  }

  /**
   * Appends the given tag hints to the datalist.
   *
   * @param {string[]}tags
   * @return {void}
   */
  private fillDatalistWithTags(tags: string[]) {
    tags.forEach((tag) => {
      $(`#${this.idPrefix}-list-of-tags`).append(`<option value="${tag}">${tag}</option>`)
    })
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Registers all event handlers used in edit mode.
   *
   * @return {void}
   */
  private setupEvents() {
    this.makeFocusSearchFieldEvent()
    this.makeAddTagEvent()
  }

  /**
   * Registers the click handler for removing a tag.
   *
   * @param {string}tagId
   * @return {void}
   */
  private makeRemoveTagEvent(tagId: string) {
    let self = this;
    let selector = "#" + tagId;

    $(selector).click(function(event: JQuery.ClickEvent<HTMLElement>) {
      event.preventDefault();
      console.log(`Click on remove tag ${tagId}`)
      let value = $(this).parent()[0].getAttribute('value')!.replace('_', ' ')
      console.log(value)
      let index = self.options.tags.indexOf(value)
      console.log(index)
      self.options.tags.splice(index, 1);
      self.options.saveTags(self.options.tags)
      $(this).parent().remove()
    })
  }

  /**
   * Registers hover and click handlers for a tag in show mode.
   *
   * @param {string}tagItemId
   * @param {string}tag
   * @return {void}
   */
  private makeTagHoverAndClickEvents(tagItemId: string, tag: string) {
    let selector = `#${tagItemId}`

    $(selector).on('click', (event: JQuery.ClickEvent<HTMLElement>) => {
      const active = !this.isActiveTag(tag)
      this.setActiveTag(tag, active)
      this.applyTagTextStyle(tagItemId, tag)
      this.options.onTagClick(tag, active, event)
    })

    $(selector).on('mouseenter', (event: JQuery.MouseEnterEvent<HTMLElement>) => {
      this.options.onTagHover(tag, true, event)
    })

    $(selector).on('mouseleave', (event: JQuery.MouseLeaveEvent<HTMLElement>) => {
      this.options.onTagHover(tag, false, event)
    })
  }

  /**
   * Registers a click handler that focuses the search field.
   *
   * @return {void}
   */
  private makeFocusSearchFieldEvent() {
    $('ul.tags').click((event: JQuery.ClickEvent<HTMLElement>) => {
      $(`#${this.idPrefix}-search-field`).focus();
    })
  }

  /**
   * Registers the keypress handler used to add new tags.
   *
   * @return {void}
   */
  private makeAddTagEvent() {
    let self = this

    $(`#${this.idPrefix}-search-field`).keypress(function(event: JQuery.KeyPressEvent<HTMLElement>) {
      if (event.which === 13) {
        event.preventDefault();

        let value = self.formatTag(String($(this).val() ?? ''))
        let valueForTagId = value.replace(/ /g, "_")

        if (value !== '' && self.isTagValid(value) && !self.options.tags.includes(value)) {
          self.appendTagItem(value, true)
          $(`#${self.idPrefix}-${valueForTagId}-item`).insertBefore(`${self.options.containerSelector} .tagAdd`)
          let tagId = `${self.idPrefix}-${valueForTagId}-id`
          self.makeRemoveTagEvent(tagId)
          self.options.tags.push(value)
          self.options.saveTags(self.options.tags).then(() => {
            $(this).val('')
          })
        }

        event.stopPropagation();
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Tag input helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalizes a tag string before validation and storage.
   *
   * @param {string}string
   * @return {string}
   */
  private formatTag(string: string) {
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

  // ---------------------------------------------------------------------------
  // Tag styling
  // ---------------------------------------------------------------------------

  /**
   * Applies the current text style to a rendered tag item.
   *
   * @param {string}tagItemId
   * @param {string}tag
   * @return {void}
   */
  public applyTagTextStyle(tagItemId: string, tag: string) {
    $(`#${tagItemId} span.tag-text`).css(this.getTagTextStyle(tag))
  }

  /**
   * Returns the CSS style for a tag depending on its active state.
   *
   * @param {string}tag
   * @return {TagTextStyle}
   */
  private getTagTextStyle(tag: string): TagTextStyle {
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

  /**
   * Returns the default CSS style for tag text.
   *
   * @return {TagTextStyle}
   */
  private getDefaultTagTextStyle(): TagTextStyle {
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

  /**
   * Returns the color palette used to render a tag.
   *
   * @param {string}tag
   * @return {{chipBackground: string, chipBorder: string, chipText: string, chipActiveBackground: string, chipActiveBorder: string, chipActiveText: string, highlightBackground: string}}
   */
  private getTagColorPalette(tag: string) {
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
      chipActiveBorder: `hsl(${hue} ${borderSaturation}% ${activeBorderLightness}%)`,
      chipActiveText: 'black',
      highlightBackground: `hsl(${hue} ${Math.max(74, saturation)}% ${lightness}%)`
    }
  }

  // ---------------------------------------------------------------------------
  // Color utilities
  // ---------------------------------------------------------------------------

  /**
   * Maps a string deterministically to a hue value.
   *
   * @param {string}string
   * @return {number}
   */
  private hashStringToHue(string: string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
      hash = ((hash << 5) - hash) + string.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }
}