/*
 *  Copyright (C) 2021 Universität zu Köln
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

const defaultIdPrefix = 'confirm-dialog-'

const STATUS_READY = 'ready'
const STATUS_DONE = 'done'

export const SMALL_DIALOG = 'sm'
export const LARGE_DIALOG = 'lg'
export const MEDIUM_DIALOG  = ''
export const EXTRA_LARGE_DIALOG = 'xl'

export const DIALOG = 'dialog'
export const INLINE = 'inline'

export class ConfirmDialog {


  constructor (userOptions) {
    let optionsDef = {
      id: { type: 'string', default: ''},
      style: { type: 'string', default: DIALOG},
      containerSelector: { type: 'string', default: ''},
      acceptButtonLabel: { type: 'string', default: 'Accept'},
      cancelButtonLabel: { type: 'string', default: 'Cancel'},
      title: { type: 'string', default: 'Please confirm'},
      size: { type: 'string', default: LARGE_DIALOG},
      body: { type: 'string', default: 'Please confirm.'},
      acceptFunction: { type: 'function', default: (id, formObject) => { }},
      hideOnAccept: { type: 'boolean', default: true},
      cancelFunction: { type: 'function', default: (id, formObject) => { }},
      // TODO: change this to reuseForm
      reuseDialog: { type: 'boolean', default: false }
    }

    let oc = new OptionsChecker({optionsDefinition: optionsDef, context: 'ConfirmForm'})

    this.options = oc.getCleanOptions(userOptions)

    if (this.options.id === '') {
      this.options.id =  defaultIdPrefix + ( 1 + Math.floor( Math.random() * 10000))
    }

    this.style = this.options.style

    if (this.style === DIALOG) {
      if (this.options.containerSelector !== '') {
        console.warn(`ConfirmForm ${this.options.id}: Option 'containerSelector' is superfluous for a dialog style form`)
      }
      this.formSelector = `#${this.options.id}`
      $(this.formSelector).remove()
      $('body').append(this._genHtml())
    } else {
      if (this.options.containerSelector === '') {
        throw new Error(`ConfirmForm ${this.options.id}: need a containerSelector for an inline style form`)
      }
      this.formSelector = this.options.containerSelector
      $(this.formSelector).addClass('hidden').html(this._genHtml())
    }

    this.formElement = $(this.formSelector)
    this.acceptButton =  $(`${this.formSelector} .accept-btn`)
    this.cancelButton =  $(`${this.formSelector} .cancel-btn`)
    this.acceptButton.on('click', (ev) => {
      if (this.options.hideOnAccept) {
        this.hide()
        if (!this.options.reuseDialog) {
          this.destroy()
        }
      }
      this.options.acceptFunction(this.getDialogId(), this)
    })
    this.cancelButton.on('click', (ev)=>{
      this.hide()
      this.options.cancelFunction(this.getDialogId(), this)
      if (!this.options.reuseDialog) {
        this.destroy()
      }
    })
    if (this.style === DIALOG) {
      this.formElement.modal({
        backdrop: 'static',
        keyboard: false,
        show: false
      })
    }
    this.status = STATUS_READY
  }

  destroy() {
    if (this.style === DIALOG) {
      this.formElement.remove()
    } else {
      this.formElement.html('')
    }
    this.status = STATUS_DONE
  }

  setAcceptFunction(newFunction) {
    this.options.acceptFunction = newFunction
  }

  setCancelFunction(newFunction) {
    this.options.cancelFunction = newFunction
  }

  show() {
    if (this.status === STATUS_READY) {
      this.__showForm()
    } else {
      console.warn(`ConfirmForm ${this.getDialogId()}: Form is not available anymore`)
    }
  }

  getDialogId() {
    return this.options.id
  }

  getSelector() {
    return this.formSelector
  }

  setTitle(title) {
    if (this.status === STATUS_READY) {
      this.options.title = title
      $(`${this.formSelector} .form-title`).html(title)
    }
  }

  setBody(bodyHtml) {
    if (this.status === STATUS_READY) {
      this.options.message = bodyHtml
      $(`${this.formSelector} .form-body`).html(bodyHtml)
    }
  }

  hideAcceptButton() {
    if (this.status === STATUS_READY) {
      this.acceptButton.hide()
    }
  }

  hideCancelButton() {
    if (this.status === STATUS_READY) {
      this.cancelButton.hide()
    }
  }

  showCancelButton() {
    if (this.status === STATUS_READY) {
      this.cancelButton.show()
    }
  }

  showAcceptButton() {
    if (this.status === STATUS_READY) {
      this.acceptButton.show()
    }
  }

  setAcceptButtonLabel(newLabel) {
    this.options.acceptButtonLabel = newLabel
    if (this.status === STATUS_READY) {
      this.acceptButton.html(newLabel)
    }
  }

  setCancelButtonText(text) {
    if (this.status === STATUS_READY) {
      this.cancelButton.text(text)
    }
  }

  hide() {
    if (this.status !== STATUS_READY) {
      return
    }
    if (this.style === DIALOG) {
      this.formElement.hide()
    } else {
      this.formElement.addClass('hidden')
    }
  }

  __showForm() {
    if (this.style === DIALOG) {
      this.formElement.show()
    } else {
      this.formElement.removeClass('hidden')
    }
  }


  _genHtml() {
    let headerExtraClass = ''
    let bodyExtraClass = ''
    let footerExtraClass = ''
    let titleExtraClass = ''
    let preHtml = ''
    let postHtml = ''
    if (this.style === DIALOG) {
      headerExtraClass = 'modal-header'
      bodyExtraClass = 'modal-body'
      footerExtraClass = 'modal-footer'
      titleExtraClass = 'modal-title'
      preHtml = `
        <div id="${this.options.id}" class="modal" role="dialog">
        <div class="modal-dialog ${this.options.size === MEDIUM_DIALOG ? '' : 'modal-' + this.options.size}">
            <div class="modal-content">`

      postHtml = `</div></div></div>`
    }

    return `${preHtml}
            <div class="form-header ${headerExtraClass}">
                <h5 class="form-title ${titleExtraClass}">${this.options.title}</h5>
            </div>
            <div class="form-body ${bodyExtraClass}">
                ${this.options.body}
            </div>
            <div class="form-footer ${footerExtraClass}">
                <button type="button" class="btn btn-danger accept-btn">${this.options.acceptButtonLabel}</button>
                <button type="button" class="btn btn-primary cancel-btn">${this.options.cancelButtonLabel}</button>
            </div>
            ${postHtml}`
  }
}