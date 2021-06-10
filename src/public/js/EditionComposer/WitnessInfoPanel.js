/**
 * The Witness Info panel in the Editor Composer.
 *
 *  - Table of witnesses
 *  - Witness order
 *  - Sigla (with preset)
 *  - Witness update: update status, check for updates and launch the witness update task
 */
import { Panel } from './Panel'
import { doNothing } from '../toolbox/FunctionUtil'
import {OptionsChecker} from '@thomas-inst/optionschecker'
import * as Util from '../toolbox/Util.mjs'
import { EditableTextField } from '../widgets/EditableTextField'
import * as CollationTableType from '../constants/CollationTableType'
import * as ArrayUtil from '../toolbox/ArrayUtil'
import { transientAlert } from '../widgets/TransientAlert'
import { deepCopy } from '../toolbox/Util.mjs'
import * as WitnessType from '../constants/WitnessType'

const icons = {
  moveUp: '&uarr;',
  moveDown: '&darr;',
  savePreset:'<i class="fas fa-save"></i>',
  loadPreset: '<i class="fas fa-upload"></i>',
  checkOK: '<i class="far fa-check-circle"></i>',
  checkFail: '<i class="fas fa-exclamation-triangle"></i>',
  checkCross: '<i class="fas fa-times"></i>'
}

export class WitnessInfoPanel extends Panel{
  constructor (options = {}) {
    super(options)

    let optionsSpec = {
      containerSelector: { type: 'string', required: true},
      onSiglaChange: { type: 'function', default: doNothing},
      onWitnessOrderChange: { type: 'function', default: doNothing},
      checkForWitnessUpdates: {
        type: 'function',
        default: (lastCheckData) => {
          return new Promise( resolve => {
            console.log(`Should be checking for witness updates`)
            resolve(lastCheckData)
          })
        }
      },
      ctData: { type: 'object', required: true}
    }

    let oc = new OptionsChecker(optionsSpec, 'Witness Info Panel')
    this.options = oc.getCleanOptions(options)
    this.ctData = deepCopy(this.options.ctData)
    this.currentWitnessUpdateData = ''
    this.checkingForWitnessUpdates = false

  }

  generateHtml() {
    return `<div class="witnessinfotable">${this._genWitnessTableHtml()}</div>
       <div class="witness-update-div">
            <span class="witness-update-info"></span>
            <button class="btn  btn-outline-secondary btn-sm check-witness-update-btn"  title="Click to check for updates to witness transcriptions">Check Now</button>
       </div>
       <div id="convert-to-edition-div">
            <button id="convert-to-edition-btn" class="btn btn-primary" title="Click to add a main text">Add Main Text</button>
       </div>`
  }

  postRender () {
    let thisObject = this
    this.updateWitnessInfoDiv(false)
    $(this.options.containerSelector + ' .check-witness-update-btn').on('click', () => {
      if (!thisObject.checkingForWitnessUpdates) {
        thisObject.checkForWitnessUpdates()
      }
    })
    this.convertToEditionDiv = $('#convert-to-edition-div')
    this.convertToEditionButton = $('#convert-to-edition-btn')
    if (this.ctData.type === CollationTableType.COLLATION_TABLE) {
      this.convertToEditionDiv.removeClass('hidden')
      this.convertToEditionButton.on('click', this.genOnClickConvertToEditionButton())
    } else {
      this.convertToEditionDiv.addClass('hidden')
    }
  }

  genOnClickConvertToEditionButton() {
    return () => {
       console.log(`Click on convert to edition button`)
    }
  }

  updateWitnessInfoDiv(reRenderTable = false) {
    // Turn off current event handlers
    $(this.options.containerSelector + ' .move-up-btn').off()
    $(this.options.containerSelector + ' .move-down-btn').off()

    // set table html
    if (reRenderTable) {
      $(this.options.containerSelector + ' .witnessinfotable').html(this._genWitnessTableHtml())
    }


    // set up witness move buttons
    let firstPos = this.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
    let firstMoveUpButton = $(`${this.options.containerSelector} td.witness-pos-${firstPos} > .move-up-btn`)
    firstMoveUpButton.addClass('opacity-0').addClass('disabled')
    let lastPos = this.ctData['witnessOrder'].length -1
    $(this.options.containerSelector + ' td.witness-pos-' + lastPos +  ' > .move-down-btn').addClass('disabled')
    $(this.options.containerSelector + ' .move-up-btn').on('click', this.genOnClickUpDownWitnessInfoButton('up'))
    $(this.options.containerSelector + ' .move-down-btn').on('click',this.genOnClickUpDownWitnessInfoButton('down') )

    // set up siglum editors
    for (let i = 0; i < this.ctData['witnesses'].length; i++) {
      new EditableTextField({
        containerSelector: this.options.containerSelector + ' .siglum-' + i,
        initialText: this.ctData['sigla'][i],
        onConfirm: this.genOnConfirmSiglumEdit(i)
      })
    }
    // update witness update check info
    this.checkForWitnessUpdates()


    // set up sigla presets buttons
    // $(this.options.containerSelector + ' .save-sigla-btn').on('click', this.genOnClickSaveSiglaPreset())
    // $(this.options.containerSelector + ' .load-sigla-btn').on('click', this.genOnClickLoadSiglaPreset())

    // if (this.siglaPresets.length === 0)  {
    //   $(this.options.containerSelector + ' .load-sigla-btn').addClass('hidden')
    // }

    //this.fetchSiglaPresets()

  }

  checkForWitnessUpdates() {
    let thisObject = this
    this.checkingForWitnessUpdates = true
    if (this.currentWitnessUpdateData === '') {
      this.currentWitnessUpdateData = this.getInitialWitnessUpdateData()
    }
    $(this.options.containerSelector + ' .witness-update-info').html(`Checking for witness updates..`)
    $(this.options.containerSelector + ' .check-witness-update-btn').prop('disabled', true)
    this.options.checkForWitnessUpdates(this.currentWitnessUpdateData).then( (newWitnessUpdateCheckData) => {
      thisObject.currentWitnessUpdateData = newWitnessUpdateCheckData
      // console.log(newWitnessUpdateCheckData)
      thisObject.showWitnessUpdateData()
      thisObject.checkingForWitnessUpdates = false
    })
      .catch( () => {
      console.log(`Error checking witness updates`)
      $(`span.witness-update-info`).html(`Error checking witness updates, try again later`)
      $(`button.check-witness-update-btn`).prop('disabled', false)
      thisObject.checkingForWitnessUpdates = false
    })
  }

  showWitnessUpdateData() {
    let infoSpan = $(this.options.containerSelector + ' .witness-update-info')
    let button = $(this.options.containerSelector + ' .check-witness-update-btn')
    let witnessesUpToDate = true
    for(let i=0; i < this.currentWitnessUpdateData['witnesses'].length; i++) {
      let witnessUpdateInfo = this.currentWitnessUpdateData['witnesses'][i]
      if (!witnessUpdateInfo['upToDate']) {
        let warningTd = $(`${this.options.containerSelector} td.outofdate-td-${i}`)
        if (witnessUpdateInfo['lastUpdate'] === -1) {
          // witness no longer defined
          warningTd.html(`<span>${icons.checkFail} Chunk no longer present in this witness`)
        } else {
          witnessesUpToDate = false
          let warningHtml =  `<span>${icons.checkFail} Last version:  `
          warningHtml += `${Util.formatVersionTime(witnessUpdateInfo['lastUpdate'])} `
          warningHtml += `<a title="Click to update witness" class="btn btn-outline-secondary btn-sm witness-update-btn witness-update-btn-${i}">Update</a>`
          warningTd.html(warningHtml)
        }
      }
      if (witnessUpdateInfo['justUpdated']) {
        let warningHtml =  `<span>${icons.checkOK} Just updated. Don't forget to save!`
        let warningTd = $(`${this.options.containerSelector} td.outofdate-td-${i}`)
        warningTd.html(warningHtml)
      }
      $(`${this.options.containerSelector} .witness-update-btn-${i}`).on('click', this.genOnClickWitnessUpdate(i))
    }
    if (witnessesUpToDate) {
      infoSpan.removeClass('text-warning')
      infoSpan.addClass('text-success')
      infoSpan.html(`${icons.checkOK} All witnesses are up to date (last checked ${Util.formatVersionTime(this.currentWitnessUpdateData.timeStamp)})`)
    } else {
      infoSpan.removeClass('text-success')
      infoSpan.addClass('text-warning')
      infoSpan.html(`${icons.checkFail} One or more witnesses out of date (last checked ${Util.formatVersionTime(this.currentWitnessUpdateData.timeStamp)})`)
    }

    button.html('Check now')
      .attr('title', 'Click to check for updates to witness transcriptions')
      .prop('disabled', false)

  }


  getInitialWitnessUpdateData() {
    return {
      status: 'Initial',
      witnesses: this.ctData['witnesses'].map ( witness => {return { id: witness['ApmWitnessId'], upToDate: true}})
    }
  }

  genOnClickWitnessUpdate(witnessIndex) {
    let thisObject = this
    return () => {
      console.log(`Click on witness update ${witnessIndex}`)
    }
  }

  /**
   * generates the on click function for the witness info move buttons
   * Notice that the direction is from the point of view of the table: moving
   * up in the table means actually moving to an lesser position in the witness
   * order array. The top witness in the table is actually position 0.
   * @param direction
   * @returns {function(...[*]=)}
   */
  genOnClickUpDownWitnessInfoButton(direction) {
    let thisObject = this
    return function(ev) {
      if ($(ev.currentTarget).hasClass('disabled')) {
        return false
      }
      let classes = Util.getClassArrayFromJQueryObject($(ev.currentTarget.parentNode))

      let index = thisObject.getWitnessIndexFromClasses(classes)
      let position = thisObject.getWitnessPositionFromClasses(classes)
      let numWitnesses = thisObject.ctData['witnesses'].length
      // console.log('Click move ' + direction + ' button on witness ' + index + ', position ' + position)

      let firstPos = thisObject.ctData['type'] === CollationTableType.COLLATION_TABLE ? 0 : 1
      let lastPos = numWitnesses - 1

      if (direction === 'down' && position === lastPos) {
        // at the last position, cannot move up
        // console.log('Nowhere to move down the table')
        return false
      }

      if (direction === 'up' && position === firstPos) {
        // at the first position, cannot move down
        // console.log('Nowhere to move up')
        return false
      }

      let indexOffset = direction === 'up' ? -1 : 1

      ArrayUtil.swapElements(thisObject.ctData['witnessOrder'],position, position+indexOffset)

      $(thisObject.options.containerSelector + ' .witnessinfotable').html('Updating...')
      thisObject.updateWitnessInfoDiv(true)
      thisObject.options.onWitnessOrderChange(thisObject.ctData['witnessOrder'])
    }
  }

  getWitnessIndexFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witness-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[1])
      }
    }
    return index
  }

  getWitnessPositionFromClasses(classes) {
    let index = -1
    for (let i = 0; i < classes.length; i++) {
      let theClass = classes[i]
      if (/^witness-pos-/.test(theClass)) {
        // noinspection TypeScriptValidateTypes
        return parseInt(theClass.split('-')[2])
      }
    }
    return index
  }


  _genWitnessTableHtml() {
    let html = ''

    html+= '<table class="witnesstable">'
    html+= '<tr><th></th><th>Witness</th><th>Version used</th>'
    html += `<th>Siglum &nbsp;`
    html += `<a class="tb-button load-sigla-btn" title="Load sigla from preset">${icons.loadPreset}</a>&nbsp;`
    html += `<a class="tb-button save-sigla-btn" title="Save current sigla as preset">${icons.savePreset}</a>`
    html += `</th>`
    html += '</tr>'

    for(let i = 0; i < this.ctData['witnessOrder'].length; i++) {
      let wIndex = this.ctData['witnessOrder'][i]
      let witness = this.ctData['witnesses'][wIndex]
      if (witness['witnessType'] === WitnessType.EDITION) {
        continue
      }
      let siglum = this.ctData['sigla'][wIndex]
      let witnessTitle = this.ctData['witnessTitles'][wIndex]
      let witnessClasses = [
        'witness-' + wIndex,
        'witness-type-' + witness['witnessType'],
        'witness-pos-' + i
      ]
      let siglumClass = 'siglum-' + wIndex
      let warningTdClass = 'warning-td-' + wIndex
      let outOfDateWarningTdClass = 'outofdate-td-' + wIndex

      html += '<tr>'

      html += `<td class="${witnessClasses.join(' ')} cte-witness-move-td">`

      html += `<span class="btn move-up-btn" title="Move up">${icons.moveUp}</span>`
      html += `<span class="btn move-down-btn" title="Move down">${icons.moveDown}</span>`
      html += '</td>'

      html += '<td>' + witnessTitle + '</td>'
      html += '<td>' + Util.formatVersionTime(witness['timeStamp']) + '</td>'
      html += '<td class="' + siglumClass + '">'+ siglum + '</td>'

      html += '<td class="' + warningTdClass + '"></td>'
      html += '<td class="' + outOfDateWarningTdClass + '"></td>'
      html += '</tr>'
    }
    html += '</table>'
    return html
  }

  genOnConfirmSiglumEdit(witnessIndex) {
    let thisObject = this
    return function(ev) {
      let newText = Util.removeWhiteSpace(ev.detail['newText'])
      let oldText = ev.detail['oldText']
      let editor = ev.detail['editor']
      if (oldText === newText || newText === '') {
        // just reset the editor's text in case the edited text contained whitespace
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
        return false
      }
      //console.log('Change in siglum for witness index ' + witnessIndex +  ' to ' + newText)
      if (thisObject.ctData['sigla'].indexOf(newText) !== -1) {
        transientAlert($(thisObject.options.containerSelector + ' .warning-td-' + witnessIndex), '',
          "Given siglum '" + newText + "' already exists, no changes made", 2000, 'slow')
        editor.setText(thisObject.ctData['sigla'][witnessIndex])
      }
      // Change the siglum
      thisObject.ctData['sigla'][witnessIndex] = newText

      thisObject.options.onSiglaChange(thisObject.ctData['sigla'])

    }
  }


}