class EditableTextField {

  constructor (options) {
    let optionsDefinition = {
      containerSelector : { type: 'string', required: true},
      normalClass: { type: 'string', required: false, default: 'etf-normal'},
      editingClass: { type: 'string', required: false, default: 'etf-editing'},
      hoverClass: {type: 'string', required: false, default: 'etf-hover'},
      initialText: { type: 'string', required: true},
      minTextFormSize: { type: 'PositiveInteger', required: false, default: 5},
      maxTextFormSize: { type: 'PositiveInteger', required: false, default: 15},
      onConfirm : {
        type: 'function',
        required: false,
        default: null
      },
      onEditInputChange: {
        type: 'function',
        required: false,
        default : null
      },
      editIcon: {
        type: 'string',
        required: false,
        default : '<i class="fas fa-pen"></i>'
      },
      confirmIcon: {
        type: 'string',
        required: false,
        default : '<i class="fas fa-check"></i>'
      },
      cancelIcon: {
        type: 'string',
        required: false,
        default: '<i class="fas fa-times"></i>'
      }
    }

    let oc = new OptionsChecker(optionsDefinition, "EditCollationTable")
    this.options = oc.getCleanOptions(options)
    this.currentText = this.options.initialText
    this.container = $(this.options.containerSelector)
    this.container.removeClass(this.options.normalClass)
    this.container.removeClass(this.options.editingClass)

    this.editing = false
    this.setNormalContainer()
    if (this.options.onConfirm !== null){
      this.on('confirm', this.options.onConfirm)
    }

    if (this.options.onEditInputChange !== null) {
      this.on('edit-change', this.options.onEditInputChange)
    }

  }

  getCurrentText() {
    return this.currentText
  }

  setText(text) {
    if (this.editing) {
      this.textInput.val(text)
    } else {
      this.currentText = text
      this.setNormalContainer()
    }

  }

  getTextInEditor() {
    if (this.editing) {
      return this.textInput.val()
    }
    return this.getCurrentText()
  }


  setNormalContainer() {
    this.container.off('click')
    this.container.off('mouseenter')
    this.container.off('mouseleave')
    let html = ''
    html += '<span title="Click to edit" class="theText">' + this.currentText + '</span>'
    html += '&nbsp;'
    html += '<span title="Edit" class="editbutton hidden">' + this.options.editIcon + '</span>'

    this.container.removeClass(this.options.editingClass)
    this.container.removeClass(this.options.hoverClass)
    this.container.html(html)
    this.container.addClass(this.options.normalClass)

    this.textSpan = $(this.options.containerSelector + ' .theText')
    this.editIconSpan =  $(this.options.containerSelector + ' .editbutton')
    this.container.on('mouseenter', this.genOnMouseEnter())
    this.container.on('mouseleave', this.genOnMouseLeave())
    this.container.on('click', this.genOnClick())


  }

  setEditContainer() {
    this.container.off('click')
    this.container.off('mouseenter')
    this.container.off('mouseleave')
    this.container.removeClass(this.options.normalClass)
    this.container.removeClass(this.options.hoverClass)
    let size = this.currentText.length
    if (size < this.options.minTextFormSize) {
      size = this.options.minTextFormSize
    }
    if (size > this.options.maxTextFormSize) {
      size = this.options.maxTextFormSize
    }
    let html = ''
    html += '<input type="text" class="textInput" value="' +  this.currentText + '" size="' + size + '">'
    html += '&nbsp;'
    html += '<span class="confirmButton" title="Confirm">' + this.options.confirmIcon + '</span>'
    html += '&nbsp;'
    html += '<span class="cancelButton" title="Cancel">' + this.options.cancelIcon  + '</span>'

    this.container.html(html)
    this.container.addClass(this.options.editingClass)
    this.textInput = $(this.options.containerSelector + ' input.textInput')
    this.confirmButton = $(this.options.containerSelector + ' span.confirmButton')
    this.cancelButton = $(this.options.containerSelector + ' span.cancelButton')

    let thisObject = this
    this.confirmButton.on('click', function() {
      thisObject.confirmEdit()
      return false
    })
    this.cancelButton.on('click', function(){
      thisObject.cancelEdit()
      return false
    })
    this.textInput.on('keydown', this.genOnKeyDown())
    this.textInput.on('keyup', this.genOnKeyUp())
    this.textInput.on('focus', function() {
      thisObject.textInput.get(0).setSelectionRange(10000, 10000)
    })
    this.textInput.trigger('focus')
  }

  cancelEdit() {
    //console.log('cancel on ' + this.options.containerSelector)
    this.editing = false
    this.setNormalContainer()
  }

  confirmEdit() {
    //console.log('confirm'+ this.options.containerSelector)
    this.dispatchEvent('confirm', { newText: this.getTextInEditor(), oldText: this.getCurrentText() })
    this.currentText = this.getTextInEditor()
    this.editing = false
    this.setNormalContainer()
  }

  genOnMouseEnter() {
    let thisObject = this
    return function() {
      if (!thisObject.editing) {
        thisObject.container.removeClass(thisObject.options.normalClass)
        thisObject.container.addClass(thisObject.options.hoverClass)
        thisObject.editIconSpan.removeClass('hidden')
      }
    }
  }

  genOnMouseLeave() {
    let thisObject = this
    return function() {
      if (!thisObject.editing) {
        thisObject.container.removeClass(thisObject.options.hoverClass)
        thisObject.container.addClass(thisObject.options.normalClass)
        thisObject.editIconSpan.addClass('hidden')
      }
    }
  }

  genOnClick() {
    let thisObject = this
    return function() {
      thisObject.editing = true
      thisObject.setEditContainer()
    }
  }

  genOnKeyDown() {
    let thisObject = this
    return function(ev) {
      //console.log('key down')
      if (!thisObject.editing) {
        return false
      }
      if (ev.which === 13) {
        // Enter key
        thisObject.confirmEdit()
        return false
      }
      if (ev.which === 27) {
        // Escape key
        thisObject.cancelEdit()
        return false
      }

      return true
    }
  }

  genOnKeyUp() {
    let thisObject = this
    return function(ev) {
      // generate an edit change event
      thisObject.dispatchEvent('edit-change', { textInEditor: thisObject.getTextInEditor()})
      return true
    }
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