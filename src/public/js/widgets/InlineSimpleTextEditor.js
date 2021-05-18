import {OptionsChecker} from '@thomas-inst/optionschecker'

const defaultMinTextFormSize = 5
const defaultMaxTextFormSize = 15

const confirmIconBootstrap = '<i class="bi bi-check-lg"></i>'
const cancelIconBootstrap =  '<i class="bi bi-x-lg"></i>'


const textInputClass = 'textInput'
const cancelButtonClass = 'cancelButton'
const confirmButtonClass = 'confirmButton'

const confirmButtonTitle = 'Confirm'
const cancelButtonTitle = 'Cancel'

export class InlineSimpleTextEditor {

  constructor (options) {
    let optionsSpec = {
      containerSelector: { type: 'string', required: true},
      initialText: { type: 'string', required: true},
      startOnConstruct: { type: 'bool', default: true},
      textInputClasses: { type: 'array', default: []},
      minTextFormSize: { type: 'PositiveInteger', required: false, default: defaultMinTextFormSize},
      maxTextFormSize: { type: 'PositiveInteger', required: false, default: defaultMaxTextFormSize},
      confirmIcon: { type: 'string', default: confirmIconBootstrap},
      cancelIcon: { type: 'string', default: cancelIconBootstrap},
      onConfirm: { type: 'function', default: genReportUnhandledFunction('confirm edit')},
      onCancel: {type: 'function',default: genReportUnhandledFunction('cancel edit')},
      onChange: { type: 'function', default: doNothing}
    }
    let oc = new OptionsChecker(optionsSpec, 'InlineSimpleTextEditor')
    this.options = oc.getCleanOptions(options)
    this.container = $(this.options.containerSelector)
    if (this.container.length === 0) {
      console.warn(`No elements matched the given selector: ${this.options.containerSelector}`)
    }

    if (this.options.startOnConstruct) {
      this.start()
    }
  }

  start() {
    let size = this.options.initialText.length
    if (size < this.options.minTextFormSize) {
      size = this.options.minTextFormSize
    }
    if (size > this.options.maxTextFormSize) {
      size = this.options.maxTextFormSize
    }

    let html = ''
    html += `<input type="text" class="${textInputClass}" value="${this.options.initialText}" size="${size}">`
    html += '&nbsp;'
    html += `<span class="${confirmButtonClass}" title="${confirmButtonTitle}">${this.options.confirmIcon}</span>`
    html += '&nbsp;'
    html += `<span class="${cancelButtonClass}" title="${cancelButtonTitle}">${this.options.cancelIcon}</span>`
    this.container.html(html)
    this.container.addClass(this.options.textInputClasses.join(' '))
    this.textInput = $(this.options.containerSelector + ' input.' + textInputClass)
    this.confirmButton = $(this.options.containerSelector + ' span.' + confirmButtonClass)
    this.cancelButton = $(this.options.containerSelector + ' span.' + cancelButtonClass)

    let thisObject = this
    this.confirmButton.on('click', function() {
      thisObject.options.onConfirm(thisObject.textInput.val(), thisObject.options.initialText)
      return false
    })
    this.cancelButton.on('click', function(){
      thisObject.options.onCancel()
      return false
    })
    this.textInput.on('keydown', this.genOnKeyDown())
      .on('keyup', this.genOnKeyUp())
      .on('focus', function() {
      // send cursor to the end
      thisObject.textInput.get(0).setSelectionRange(10000, 10000)
    })
    this.textInput.trigger('focus')
  }

  genOnKeyDown() {
    let thisObject = this
    return function(ev) {
      //console.log('key down')
      if (ev.which === 13 ) {
        // Enter key
        thisObject.options.onConfirm(thisObject.textInput.val(), thisObject.options.initialText)
        return false
      }
      if (ev.which === 27) {
        // Escape key
        thisObject.options.onCancel()
        return false
      }

      return true
    }
  }

  genOnKeyUp() {
    let thisObject = this
    return function() {
      // generate an edit change event
      thisObject.options.onChange(thisObject.textInput.val())
      return true
    }
  }

  destroy() {
    this.container.html('')
  }

}

function genReportUnhandledFunction(context) {
  return () => {
    console.warn(`InlineSimpleTextEditor: unhandled ${context}`)
  }
}

function doNothing() {}
