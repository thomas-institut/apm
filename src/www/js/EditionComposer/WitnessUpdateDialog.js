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
import * as Util from '../toolbox/Util.mjs'
import { failPromise } from '../toolbox/FunctionUtil.mjs'
import { WitnessDiffCalculator } from '../Edition/WitnessDiffCalculator'
import { CtData } from '../CtData/CtData'
import { ApmFormats } from '../pages/common/ApmFormats'

export class WitnessUpdateDialog {

  constructor (options) {
    let optionsSpec = {
      ctData: { type: 'object', required: true},
      witnessIndex: { type: 'number', required: true},
      newWitnessInfo: { type: 'object', required: true},
      getWitnessData: {
        type: 'function',
        required: true
      },
      witnessDiffCalculator: {
        type: 'object',
        objectClass: WitnessDiffCalculator
      },
      updateWitness: {
        // function to call to actually update the witnesses
        // (witnessIndex, changeData) =>  Promise
        type: 'function',
        required: true
      },
      icons: {
        type: 'object',
        required: true
      },
      debug: { type: 'boolean', default: false}
    }

    let oc = new OptionsChecker({optionsDefinition: optionsSpec, context:  'Witness Update Dialog'})
    this.options = oc.getCleanOptions(options)
    this.ctData = CtData.copyFromObject(this.options.ctData)
    this.icons = this.options.icons
    this.debug = this.options.debug

  }

  go() {
    let witnessIndex = this.options.witnessIndex

    let currentWitness = this.ctData['witnesses'][witnessIndex]
    let newWitnessInfo = this.options.newWitnessInfo
    if (newWitnessInfo['upToDate']) {
      console.warn(`Attempt to update witness ${witnessIndex}, which is up to date`)
      return false
    }
    let dialogHtml = this._getDialogHtml(
      witnessIndex,
      this.ctData['witnessTitles'][witnessIndex],
      ApmFormats.timeString(currentWitness['timeStamp']),
      ApmFormats.timeString(newWitnessInfo['lastUpdate'])
    )

    let modalSelector = `#update-modal-${witnessIndex}`
    $(modalSelector).remove()
    $('body').append(dialogHtml)

    let cancelButton = $(`${modalSelector} .cancel-btn`)
    let acceptButton = $(`${modalSelector} .accept-btn`)
    let loadP = $(modalSelector + ' .load')
    let calcP = $(modalSelector + ' .calc-changes')
    let reviewP = $(modalSelector + ' .review-changes')
    let doChangesP = $(modalSelector + ' .do-changes')
    let changesDiv = $(modalSelector + ' .changes')

    // Set step titles
    let loadStepTitle = '1. Load New Version'
    let calcChangesStepTitle = '2. Calculate Changes'
    let reviewChangesStepTitle = '3. Review Changes'
    let doChangesStepTitle = '4. Update Collation Table'

    loadP.html(loadStepTitle)
    calcP.html(calcChangesStepTitle)
    reviewP.html(reviewChangesStepTitle)
    doChangesP.html(doChangesStepTitle)
    cancelButton.on('click', () => {
      $(modalSelector).modal('hide')
      $(modalSelector).remove()
    })
    $(modalSelector).modal({
        backdrop: 'static',
        keyboard: false,
        show: false
    })
    $(modalSelector).on('shown.bs.modal',  () => {
      // 1. Load new version
      // 1.1. move to step 1 in the UI
      loadP.html(`${loadStepTitle} ${this.icons.busy}`)
      loadP.removeClass('status-waiting')
      loadP.addClass('status-running')
      // 1.2. actually load the new version
      this.options.getWitnessData(newWitnessInfo['updatedWitnessId'])
          .then( (newWitnessData) => {
              // Load new version success
              // 2. Calculate changes
              this.debug && console.log('Loaded witness')
              this.debug && console.log(newWitnessData)

              // 2.1 move to step 2 in the UI
              loadP.html(`${loadStepTitle} ${this.icons.checkOK}`)
              loadP.removeClass('status-running')
              loadP.addClass('status-done')
              calcP.html(`${calcChangesStepTitle} ${this.icons.busy}`)
              calcP.removeClass('status-waiting')
              calcP.addClass('status-running')

              // 2.2 the actual calculation
              //let ctRowIndex = this.ctData['witnessOrder'].indexOf(witnessIndex)
              let collationRow = this.ctData['collationMatrix'][witnessIndex]
              let changes =  this.options.witnessDiffCalculator.getChangesBetweenWitnesses(witnessIndex, collationRow, currentWitness, newWitnessData)
              return { changes: changes, newWitness: newWitnessData}
            },
            (failReason) => {
              //  Load new version fail
              loadP.removeClass('status-running')
              loadP.addClass('status-fail')
              loadP.html(`${loadStepTitle}.... ${this.icons.checkCross} FAIL: ${failReason}`)
              console.error('Could not load new version from server')
              console.log(failReason)
              throw failReason //stop the chain
            }
          )
          .then(changeData => {
            let changes = changeData['changes']
            this.debug && console.log(`Calculated changes`)
            this.debug && console.log(changes)
            // 3. Review Changes
            calcP.html(`${calcChangesStepTitle} ${this.icons.checkOK}`)
            calcP.removeClass('status-running')
            calcP.addClass('status-done')

              // show changes
            let changesToShow = changes.ctChanges.filter ( (ch) => {
              return !(ch.type === 'replace' &&
                ch.currentToken.text === ch.newToken.text &&
                ch.currentToken.normalizationSource !== undefined &&
                ch.currentToken.normalizationSource === 'automaticCollation'
              )
            })
              let html = ''
              html += '<h5>Changes:</h5>'
              html += '<ul>'
              if (changesToShow.length !== 0) {

                function getTokenText(token) {
                  if (token === undefined) {
                    console.warn(`Token is undefined`)
                    console.trace()
                    return '<i>empty</i>'
                  }
                  let text = `'${token.text}'`
                  if (token['normalizedText'] !== undefined) {
                    text += ` (normalization: '${token['normalizedText']}')`
                  }
                  return text
                }

                for(const ctChange of changesToShow) {
                  html += '<li>'
                  switch (ctChange.type) {
                    case 'insertColAfter':
                      if (ctChange.isStartOfWitness) {
                        html += `New column will be added at the beginning with the word ${getTokenText(ctChange.newToken)}`
                      } else {
                        html += `New column will be added after column ${ctChange.afterCol+1} (${getTokenText(ctChange.currentToken)}) with the word ${getTokenText(ctChange.newToken)}`
                      }
                      break

                    case 'emptyCell':
                      html += `Column ${ctChange.col+1} will be emptied, currently contains the word ${getTokenText(ctChange.currentToken)}`
                      break

                    case 'replace':
                      html += `Column ${ctChange.col+1} will change from ${getTokenText(ctChange.currentToken)} to ${getTokenText(ctChange.newToken)}`
                      break

                    default:
                      console.log('Unsupported change found in collation table changes')
                      console.log(ctChange)
                  }
                  html += '</li>'
                }
              }
              if (changes.nonCtChanges.length !== 0) {
                html += '<li>Minor changes in the transcription that do not affect the collation table, e.g., added spaces, punctuation, etc.</li>'
              }
              if (changes.ctChanges.length === 0 && changes.nonCtChanges.length === 0) {
                html += '<li>Minor changes in underlying data that do not affect the collation table, e.g., internal APM data, line numbers, etc.</li>'
              }
            if (changes.ctChanges.length !== changesToShow.length) {
              html += '<li>Minor changes related to normalizations that do not affect the collation table</li>'
            }
              html += '</ul>'
              changesDiv.html(html)

              reviewP.removeClass('status-waiting')
              reviewP.addClass('status-running')
              acceptButton.removeClass('hidden')
              acceptButton.on('click',  () => {
                // 4. Do Changes!!
                this.debug && console.log('Changes accepted')
                reviewP.html(`${reviewChangesStepTitle} ${this.icons.checkOK}`)
                reviewP.removeClass('status-running')
                reviewP.addClass('status-done')
                acceptButton.addClass('hidden')
                cancelButton.prop('disabled', true)

                doChangesP.removeClass('status-waiting')
                doChangesP.addClass('status-running')
                doChangesP.html(`${doChangesStepTitle} ${this.icons.busy}`)

                // actually do the changes!
                this.debug && console.log(`Actually doing the changes`)
                this.options.updateWitness(witnessIndex, changes, changeData.newWitness).then( () => {
                  // changes done!
                  doChangesP.removeClass('status-running')
                  doChangesP.addClass('status-done')
                  doChangesP.html(`${doChangesStepTitle} ${this.icons.checkOK}`)
                  cancelButton.html('Done!')
                  cancelButton.prop('disabled', false)
                })
              })
            })
          .catch( reason => {
            console.log(`Errors detected, reason: ${reason}`)
            console.trace()
          })
      })
      // go!
      $(modalSelector).modal('show')
    return true

  }

  _getDialogHtml(witnessIndex, witnessTitle, currentVersion, newVersion) {
    return `<div id="update-modal-${witnessIndex}" class="modal" role="dialog">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Update witness ${witnessTitle}</h5>
            </div>
            <div class="modal-body">
                <div class="info">
                    <p><b>Current version:</b> ${currentVersion}</p>
                    <p style="margin-left: 30px"><i class="fas fa-long-arrow-alt-down"></i></p>
                    <p><b>New version:</b> ${newVersion}</p>
                </div>
                <div class="process">
                    <p class="load status-waiting"></p>
                    <p class="calc-changes status-waiting"></p>
                    <p class="review-changes status-waiting"></p>
                    <div class="changes"></div>
                    <p class="do-changes status-waiting"></p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger accept-btn hidden">Accept Changes and Update</button>
                <button type="button" class="btn btn-primary cancel-btn">Cancel</button>
            </div>
      </div>
    </div>
</div>    
    `
  }

}