
class NiceToggle {

  constructor (options) {

    let optionsDefinition = {
      containerSelector : { type: 'string', required: true},
      title: { type: 'string', required: false, default: ''},
      onClass: { type: 'string', required: false, default: 'nicetoggle-on'},
      onPopoverText: { type: 'string', required: false, default: 'Click to turn OFF'},
      offClass: { type: 'string', required: false, default: 'nicetoggle-off'},
      offPopoverText: { type: 'string', required: false, default: 'Click to turn ON'},
      hoverClass: {type: 'string', required: false, default: 'nicetoggle-hover'},
      initialValue: { type: 'bool', required: false, default: true},
      onToggle : {
        type: 'function',
        required: false,
        default: null
      },
      onIcon: {
        type: 'string',
        required: false,
        default : 'ON'
      },
      offIcon: {
        type: 'string',
        required: false,
        default : 'OFF'
      }
    }
    let oc = new OptionsChecker(optionsDefinition, "EditableTextField")
    this.options = oc.getCleanOptions(options)

    this.container = $(this.options.containerSelector)
    this.container.html(this.getWidgetHtml())
    $(this.getButtonSelector()).on('click', this.genOnClickButton())
    $(this.getButtonSelector()).on('mouseenter', this.genOnMouseEnterButton())
    $(this.getButtonSelector()).on('mouseleave', this.genOnMouseLeaveButton())
    this.isOn = true

  }

  genOnClickButton() {
    let thisObject = this
    return function() {
      if (thisObject.isOn) {
        thisObject.toggleOff()
      } else {
        thisObject.toggleOn()
      }
    }
  }
  genOnMouseEnterButton() {
    let thisObject = this
    return function() {
      $(thisObject.getButtonSelector()).addClass(thisObject.options.hoverClass)
    }
  }

  genOnMouseLeaveButton() {
    let thisObject = this
    return function() {
      $(thisObject.getButtonSelector()).removeClass(thisObject.options.hoverClass)
    }
  }

  getWidgetHtml() {

    let html = ''

    html += `<span class="nicetoggle-title">${this.options.title}</span>`
    html += `<span title="${this.options.onPopoverText}" class="nicetoggle-button ${this.options.onClass}">${this.options.onIcon}</span>`

    return html
  }

  toggleOn() {
    $(this.getButtonSelector()).attr('title', this.options.onPopoverText)
      .removeClass(this.options.offClass)
      .addClass(this.options.onClass)
      .html(this.options.onIcon)
    this.isOn = true
    this.dispatchEvent('toggle', { toggleStatus: this.getToggleStatus()})
  }

  toggleOff() {
    $(this.getButtonSelector()).attr('title', this.options.offPopoverText)
      .removeClass(this.options.onClass)
      .addClass(this.options.offClass)
      .html(this.options.offIcon)
    this.isOn = false
    this.dispatchEvent('toggle', { toggleStatus: this.getToggleStatus()})
  }

  getToggleStatus() {
    return this.isOn
  }

  getButtonSelector() {
    return `${this.options.containerSelector} .nicetoggle-button`
  }
  getTitleSelector() {
    return `${this.options.containerSelector} .nicetoggle-title`
  }

  dispatchEvent(eventName, data = {})
  {
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f)
  {

    this.container.on(eventName, f)
  }

}