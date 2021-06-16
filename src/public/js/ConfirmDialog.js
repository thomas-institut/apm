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

export class ConfirmDialog {


  constructor (userOptions) {
    let optionsDef = {
      id: { type: 'string', default: ''},
      acceptButtonLabel: { type: 'string', default: 'Accept'},
      cancelButtonLabel: { type: 'string', default: 'Cancel'},
      title: { type: 'string', default: 'Please confirm'},
      body: { type: 'string', default: 'Please confirm.'},
      acceptFunction: { type: 'function', default: (id, dialogObject) => { }},
      hideOnAccept: { type: 'boolean', default: true},
      cancelFunction: { type: 'function', default: (id, dialogObject) => { }},
      reuseDialog: { type: 'boolean', default: false }
    }

    let oc = new OptionsChecker(optionsDef, 'ConfirmDialog')

    this.options = oc.getCleanOptions(userOptions)


    if (this.options.id === '') {
      this.options.id =  defaultIdPrefix + ( 1 + Math.floor( Math.random() * 10000))
    }
    this.modalSelector = `#${this.options.id}`

    $(this.modalSelector).remove()
    $('body').append(this._genHtml())
    this.modalElement = $(this.modalSelector)
    this.acceptButton =  $(`${this.modalSelector} .accept-btn`)
    this.cancelButton =  $(`${this.modalSelector} .cancel-btn`)
    let thisObject = this
    this.acceptButton.on('click', (ev) => {
      if (thisObject.options.hideOnAccept) {
        thisObject.modalElement.modal('hide')
        if (!thisObject.options.reuseDialog) {
          thisObject.modalElement.remove()
          thisObject.status = STATUS_DONE
        }
      }
      thisObject.options.acceptFunction(thisObject.getDialogId(), thisObject)
    })
    this.cancelButton.on('click', (ev)=>{
      thisObject.modalElement.modal('hide')
      thisObject.options.cancelFunction(thisObject.getDialogId(), thisObject)
      if (!thisObject.options.reuseDialog) {
        thisObject.destroy()
      }
    })
    this.modalElement.modal({
      backdrop: 'static',
      keyboard: false,
      show: false
    })
    this.status = STATUS_READY
  }

  destroy() {
    this.modalElement.remove()
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
      this.modalElement.modal('show')
    } else {
      console.warn(`ConfirmDialog: dialog with id ${this.getDialogId()} is not available anymore`)
    }
  }

  getDialogId() {
    return this.options.id
  }

  getSelector() {
    return this.modalSelector
  }

  setTitle(title) {
    if (this.status === STATUS_READY) {
      this.options.title = title
      $(`${this.modalSelector} .modal-title`).html(title)
    }
  }

  setBody(bodyHtml) {
    if (this.status === STATUS_READY) {
      this.options.message = bodyHtml
      $(`${this.modalSelector} .modal-body`).html(bodyHtml)
    }
  }

  hideAcceptButton() {
    if (this.status === STATUS_READY) {
      this.acceptButton.hide()
    }
  }

  showAcceptButton() {
    if (this.status === STATUS_READY) {
      this.acceptButton.show()
    }
  }

  setCancelButtonText(text) {
    if (this.status === STATUS_READY) {
      this.cancelButton.text(text)
    }
  }


  _genHtml() {
    return `
<div id="${this.options.id}" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${this.options.title}</h5>
            </div>
            <div class="modal-body">
                ${this.options.body}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger accept-btn">${this.options.acceptButtonLabel}</button>
                <button type="button" class="btn btn-primary cancel-btn">${this.options.cancelButtonLabel}</button>
            </div>
        </div>
    </div>
</div>      
      `
  }
}