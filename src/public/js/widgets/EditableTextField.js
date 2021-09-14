/*
 *  Copyright (C) 2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import {OptionsChecker} from '@thomas-inst/optionschecker'
import { escapeHtml } from '../toolbox/Util.mjs'

// Events

export const confirmEvent = 'confirm'
export const editChangeEvent = 'edit-change'
export const cancelEvent = 'cancel'

// Internal Defaults
const defaultNormalClass = 'etf-normal'
const defaultEditingClass = 'etf-editing'
const defaultHoverClass =  'etf-hover'

const defaultMinTextFormSize = 5
const defaultMaxTextFormSize = 15

const defaultEditIcon =  '<i class="fas fa-pen"></i>'
const defaultConfirmIcon = '<i class="fas fa-check"></i>'
const defaultCancelIcon = '<i class="fas fa-times"></i>'

// Internal Constants

const theTextClass = 'theText'
const editButtonClass = 'editButton'
const textInputClass = 'textInput'
const cancelButtonClass = 'cancelButton'
const confirmButtonClass = 'confirmButton'

const confirmButtonTitle = 'Confirm'
const cancelButtonTitle = 'Cancel'

export class EditableTextField {

  constructor (options) {
    let optionsDefinition = {
      verbose: { type: 'boolean', default: false},
      containerSelector : { type: 'string', required: true},
      normalClass: { type: 'string', required: false, default: defaultNormalClass},
      editingClass: { type: 'string', required: false, default: defaultEditingClass},
      hoverClass: {type: 'string', required: false, default: defaultHoverClass},
      initialText: { type: 'string', required: true},
      startInEditMode: { type: 'boolean', default: false},
      minTextFormSize: { type: 'NumberGreaterThanZero', required: false, default: defaultMinTextFormSize},
      maxTextFormSize: { type: 'NumberGreaterThanZero', required: false, default: defaultMaxTextFormSize},
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
        default : defaultEditIcon
      },
      confirmIcon: {
        type: 'string',
        required: false,
        default : defaultConfirmIcon
      },
      cancelIcon: {
        type: 'string',
        required: false,
        default: defaultCancelIcon
      }
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDefinition, context:  "EditableTextField"})
    this.options = oc.getCleanOptions(options)
    this.verbose = this.options.verbose
    this.currentText = this.options.initialText
    this.container = $(this.options.containerSelector)
    this.container.removeClass(this.options.normalClass)
    this.container.removeClass(this.options.editingClass)
    // this.verbose && console.log(`Initial text: '${this.currentText}'`)

    this.confirmEnabled = true
    if (this.options.startInEditMode) {
      this.editing = true
      this.setEditContainer()
    } else {
      this.editing = false
      this.setNormalContainer()
    }
    if (this.options.onConfirm !== null){
      this.on(confirmEvent, this.options.onConfirm)
    }

    if (this.options.onEditInputChange !== null) {
      this.on(editChangeEvent, this.options.onEditInputChange)
    }

  }

  destroy() {
    this.container.off()
      .removeClass(this.options.normalClass)
      .removeClass(this.options.editingClass)
      .html('')
  }

  getCurrentText() {
    return this.currentText
  }

  setText(text) {
    if (this.editing) {

      this.textInput.val(text)
      // this.verbose && console.log(`Setting text to '${text}', results in '${this.textInput.val()}'`)
    } else {
      this.currentText = text
      this.setNormalContainer()
    }
  }

  // disableConfirm() {
  //   this.confirmEnabled = false
  // }

  // enableConfirm() {
  //   this.confirmEnabled = true
  // }



  getTextInEditor() {
    // if (this.editing) {
      return this.textInput.val()
    // }
    // return this.getCurrentText()
  }


  setNormalContainer() {
    this.container.off('click mouseenter mouseleave mousedown mouseup')
    let html = ''
    html += `<span title="Click to edit" class="${theTextClass}">${this.currentText}</span>`
    html += '&nbsp;'
    html += `<span title="Edit" class="${editButtonClass} hidden">${this.options.editIcon}</span>`

    this.container.removeClass(this.options.editingClass)
    this.container.removeClass(this.options.hoverClass)
    this.container.html(html)
    this.container.addClass(this.options.normalClass)

    //this.textSpan = $(this.options.containerSelector + ' .' + theTextClass)
    this.editIconSpan =  $(this.options.containerSelector + ' .' + editButtonClass)
    this.container.on('mouseenter', this.genOnMouseEnter())
    this.container.on('mouseleave', this.genOnMouseLeave())
    this.container.on('click', this.genOnClick())
  }

  setEditContainer() {
    this.container.off('click mouseenter mouseleave mouseup mousedown')

    this.container.removeClass(this.options.normalClass)
    this.container.removeClass(this.options.hoverClass)
    let size = this.currentText.length
    if (size < this.options.minTextFormSize) {
      size = this.options.minTextFormSize
    }
    if (size > this.options.maxTextFormSize) {
      size = this.options.maxTextFormSize
    }
    console.log(`Edit container size: ${size}`)
    let html = ''
    html += `<input type="text" class="${textInputClass}" value="${escapeHtml(this.currentText)}" size="${size}" style="width: ${size+1}ch">`
    html += '&nbsp;'
    html += `<span class="${confirmButtonClass}" title="${confirmButtonTitle}">${this.options.confirmIcon}</span>`
    html += '&nbsp;'
    html += `<span class="${cancelButtonClass}" title="${cancelButtonTitle}">${this.options.cancelIcon}</span>`

    this.container.html(html)
    this.container.addClass(this.options.editingClass)
    this.textInput = $(this.options.containerSelector + ' input.' + textInputClass)
    this.confirmButton = $(this.options.containerSelector + ' span.' + confirmButtonClass)
    this.cancelButton = $(this.options.containerSelector + ' span.' + cancelButtonClass)

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
      // send cursor to the end
      thisObject.textInput.get(0).setSelectionRange(10000, 10000)
    })
    this.textInput.trigger('focus')
  }

  cancelEdit() {
    //console.log('cancel on ' + this.options.containerSelector)
    this.editing = false
    this.setNormalContainer()
    this.dispatchEvent(cancelEvent, {})
  }

  confirmEdit() {
    this.verbose && console.log(`Confirm edit: ${this.options.containerSelector}`)
    this.dispatchEvent(confirmEvent, { editor: this, newText: this.getTextInEditor(), oldText: this.getCurrentText() })
    this.editing = false
    this.currentText = this.getTextInEditor()
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
      if (ev.which === 13 && thisObject.confirmEnabled) {
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
    return function() {
      // generate an edit change event
      thisObject.dispatchEvent(editChangeEvent, { textInEditor: thisObject.getTextInEditor()})
      return true
    }
  }

  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, {detail: data})
    this.container.get()[0].dispatchEvent(event)
  }

  /**
   * Attaches a callback function to an editor event
   *
   * @param {String} eventName
   * @param {function} f
   */
  on(eventName, f){
    this.container.on(eventName, f)
    return this
  }

}