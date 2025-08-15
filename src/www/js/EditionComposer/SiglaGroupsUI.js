import { ConfirmDialog, MEDIUM_DIALOG, SMALL_DIALOG } from '@/pages/common/ConfirmDialog'
import { varsAreEqual } from '@/lib/ToolBox/ArrayUtil'
import { trimWhiteSpace } from '../toolbox/Util.mjs'

export class SiglaGroupsUI {

  /**
   * Generates the sigla groups table
   *
   * @param {Object[]}siglaGroups
   * @param {Object[]}sigla
   * @param {Object}icons
   * @return {string}
   */
  static genSiglaGroupsTable(siglaGroups, sigla, icons) {
    if (siglaGroups.length === 0) {
      return `<em>No sigla groups defined</em>`
    }
    return [ '<table class="sigla-groups-table">',
      siglaGroups.map( (sg, i) => {
        return `<tr>
            <td><span class="sigla-group-siglum sigla-group-siglum-${i}">${sg['siglum']}</span></td>
            <td>=</td>
            <td><span class="sigla-group-sigla sigla-group-sigla-${i}">${this.getSiglaStringForWitnessIndexArray(sigla, sg.witnesses)}</td>
            <td>
                <a class="edit-sigla-group-btn-${i} tb-button" title="Edit" href="#">${icons.editSiglaGroup}</a> 
                <a class="delete-sigla-group-btn-${i} tb-button" title="Delete" href="#">${icons.deleteSiglaGroup}</a>
            </td>
            </tr>`
      }).join(''),
      '</table>'
    ].join('')
  }

  static getSiglaStringForWitnessIndexArray(sigla, witnessIndexes) {
    return  witnessIndexes.map( (w) => { return sigla[w]}).join('')
  }

  static addEditSiglaGroup(siglaGroups, index, sigla) {
    return new Promise( (resolve, reject) => {
      let isNew = index === -1
      let siglaGroup = { siglum: '', witnesses: []}
      if (!isNew) {
        siglaGroup = siglaGroups[index]
      }
      let siglaCheckboxesHtml = sigla.map( (siglum, index) => {
        let checkedString = siglaGroup.witnesses.indexOf(index) !== -1 ? 'checked' : ''

        return `<div class="form-check form-check-inline">
                  <input class="form-check-input siglum-checkbox siglum-checkbox-${index}" type="checkbox" value="entry-${index}" ${checkedString}>
                  <label for="siglum-checkbox-${index}" class="form-check-label">${siglum}</label>
                  </div>`
      }).join('')

      let dialogBody = ` <div class="group-preview"></div>
        <form>
        <div class="form-group row">
            <label for="group-siglum-input" class="col-sm-3 col-form-label">Group Siglum</label>
            <div class="col-sm-9">
                <input type="text" class="group-siglum-input" value="${siglaGroup.siglum}">
            </div>
        </div>
        <div class="form-group row">
            <label class="col-sm-3 col-form-label" style="padding-top: 0">Witnesses</label>
            <div class="col-sm-9">
               ${siglaCheckboxesHtml}
            </div>
        </div>
        </form>`

      let dialog = new ConfirmDialog({
        title: siglaGroup.witnesses.length === 0 ? 'Add New Sigla Group' : 'Edit Sigla Group',
        size: MEDIUM_DIALOG,
        acceptButtonLabel: isNew ? 'New Group' : 'Replace Group',
        body: dialogBody,
        hideOnAccept: false,
        cancelFunction: () => {
          console.log(`Canceled add/edit sigla group`)
          reject('Canceled')
        }
      })
      let dialogSelector = dialog.getSelector()
      $(`${dialogSelector} .group-preview`).html(this.genSiglaGroupPreviewHtml(siglaGroup, siglaGroup, siglaGroups, sigla))
      dialog.hideAcceptButton()
      $(`${dialogSelector} .group-siglum-input`).on('keyup', () => {
        this._updateSiglaGroupDialogAcceptButton(dialog, siglaGroup, siglaGroups, sigla)
      })
      $(`${dialogSelector} .siglum-checkbox`).on('change', () => {
        this._updateSiglaGroupDialogAcceptButton(dialog, siglaGroup, siglaGroups, sigla)
      })
      dialog.setAcceptFunction( () => {
        let editedSiglaGroup = this._readSiglaGroupFromDialog(dialogSelector, sigla)
        dialog.hide()
        dialog.destroy()
        resolve(editedSiglaGroup)
      })
      dialog.show()
    })
  }

  static confirmDeleteSiglaGroup(siglaGroups, index, sigla) {
    return new Promise ( (resolve, reject) => {
      let siglaGroup = siglaGroups[index]
      let dialogBody = `<p>Are you sure you want to delete this sigla group?</p> 
                  <div class="group-preview">${this.genSiglaGroupPreviewHtml(siglaGroup, siglaGroup, siglaGroups, sigla)}</div>`

      let dialog = new ConfirmDialog({
        title: 'Delete Sigla Group',
        size: SMALL_DIALOG,
        acceptButtonLabel: 'Yes, delete',
        cancelButtonLabel: 'No',
        body: dialogBody,
        acceptFunction: () => { resolve() },
        cancelFunction: () => { reject('Canceled')}
      })
      dialog.show()
    })

  }


  static genSiglaGroupPreviewHtml(newSiglaGroup, originalSiglaGroup, siglaGroups, sigla) {
    if (newSiglaGroup.siglum === '') {
      return '<span class="text-warning">Enter a siglum</span>'
    }

    if (sigla.indexOf(newSiglaGroup.siglum) !== -1) {
      return '<span class="text-danger">The given group siglum is one of the witnesses\' sigla</span>'
    }

    if (siglaGroups.filter( (sg) => {
      return sg.siglum !== originalSiglaGroup.siglum
    }).map( (sg) => { return sg.siglum}).indexOf(newSiglaGroup.siglum) !== -1) {
      return '<span class="text-danger">The given group siglum is already in use in another group</span>'
    }

    if (newSiglaGroup.witnesses.length < 2) {
      return '<span class="text-warning">Select at least 2 sigla</span>'
    }
    if (originalSiglaGroup.witnesses.length === 0 || varsAreEqual(newSiglaGroup, originalSiglaGroup)) {
      return `<span class="text-primary">${newSiglaGroup.siglum} = ${this.getSiglaStringForWitnessIndexArray(sigla, newSiglaGroup.witnesses)}</span>`
    }

    return `<span class="text-primary">${originalSiglaGroup.siglum} = ${this.getSiglaStringForWitnessIndexArray(sigla, originalSiglaGroup.witnesses)}</span> 
            <span style="margin: 0 1em;">&rarr;</span> 
            <span class="text-info">${newSiglaGroup.siglum} = ${this.getSiglaStringForWitnessIndexArray(sigla, newSiglaGroup.witnesses)}</span>`
  }

  static _updateSiglaGroupDialogAcceptButton(dialog, originalSiglaGroup, siglaGroups, sigla) {
    let dialogSelector = dialog.getSelector()
    let editedSiglaGroup = this._readSiglaGroupFromDialog(dialogSelector, sigla)
    $(`${dialogSelector} .group-preview`).html(this.genSiglaGroupPreviewHtml(editedSiglaGroup, originalSiglaGroup, siglaGroups, sigla))
    if (!this._isSiglaGroupValid(editedSiglaGroup, originalSiglaGroup, siglaGroups, sigla)) {
      dialog.hideAcceptButton()
    } else {
      // new Sigla group is valid
      if (originalSiglaGroup.witnesses.length !== 0 && varsAreEqual(editedSiglaGroup, originalSiglaGroup)) {
        // no change in group
        dialog.hideAcceptButton()
      } else {
        // new group or changes in group
        dialog.showAcceptButton()
      }
    }
  }

  static  _readSiglaGroupFromDialog(dialogSelector, sigla) {
    let witnesses = []
   sigla.forEach( (s, i) => {
      if ($(`${dialogSelector} .siglum-checkbox-${i}`).prop('checked')) {
        witnesses.push(i)
      }
    })
    return {
      siglum: trimWhiteSpace($(`${dialogSelector} .group-siglum-input`).val()),
      witnesses: witnesses
    }
  }

  static _isSiglaGroupValid(newSiglaGroup, originalSiglaGroup, siglaGroups, sigla) {
    if (newSiglaGroup.siglum === '') {
      return false
    }

    if (sigla.indexOf(newSiglaGroup.siglum) !== -1) {
      return false
    }

    if (siglaGroups.filter( (sg) => {
      return sg.siglum !== originalSiglaGroup.siglum
    }).map( (sg) => { return sg.siglum}).indexOf(newSiglaGroup.siglum) !== -1) {
      return false
    }

    return newSiglaGroup.witnesses.length >= 2;

  }



}