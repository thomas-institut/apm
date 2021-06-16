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


/**
 * The Admin Panel in the EditorComposer.
 *
 *  - Version info list
 *  - Archive button
 */


import {OptionsChecker} from '@thomas-inst/optionschecker'
import * as Util from '../toolbox/Util.mjs'

import { doNothingPromise } from '../toolbox/FunctionUtil'
import { ConfirmDialog } from '../ConfirmDialog'
import * as CollationTableType from '../constants/CollationTableType'
import { Panel } from './Panel'

const archiveButtonId = 'archive-table-btn'
const versionHistoryDiv = 'version-history-div'

export class AdminPanel extends  Panel {
  constructor (options = {}) {
    super(options)
    let optionsSpec = {
      ctType: { type: 'string', required: true},
      archived: { type: 'boolean', required: true},
      versionInfo: { type: 'array', default: []},
      peopleInfo: { type: 'object', default: []},
      onConfirmArchive: { type: 'function', default: () => { return doNothingPromise()}},
      canArchive: { type: 'boolean', default: true},
      cannotArchiveReason: { type: 'string', default: ''}
    }
    let oc = new OptionsChecker(optionsSpec, 'Admin Panel')
    this.options = oc.getCleanOptions(options)
    this.rendered = false
  }

  generateHtml() {
    let label = this.options.ctType === CollationTableType.EDITION ? 'edition' : 'collation table'
    let labelUpperCase = this.options.ctType === CollationTableType.EDITION ? 'Edition' : 'Collation Table'
    return `
    <div id="admin-ops-div">
       <h3>Admin</h3>
       <ul>
         <li><button id="${archiveButtonId}" class="btn btn-danger" title="Click to archive this ${label}">Archive this ${labelUpperCase}</button></li>
       </ul>
    </div>
    <h3>Versions</h3>
    <div id="${versionHistoryDiv}">${this._genVersionTableHtml()}</div>`
  }

  allowArchiving() {
    this.options.canArchive = true
    this.options.cannotArchiveReason = ''
    if (this.rendered) {
      this._showAsAllowedToArchive()
    }
  }

  disallowArchiving(reason) {
    this.options.canArchive = true
    this.options.cannotArchiveReason = reason
    if (this.rendered) {
      this._showAsNotAllowedToArchive()
    }
  }

  // updateVersionInfo(newVersionInfo, newPeopleInfo = []) {
  //   this.options.versionInfo = newVersionInfo
  //   if (newPeopleInfo !== []) {
  //     this.options.personInfo = newPeopleInfo
  //   }
  // }

  postRender() {
    this.verbose && console.log(`Post render admin panel`)
    this.rendered = true
    this.archiveButton =  $(`#${archiveButtonId}`)
    if (this.options.archived) {
      this._showAsArchived()
      return
    }
    if (this.options.canArchive) {
      this._showAsAllowedToArchive()
    } else {
      this._showAsNotAllowedToArchive()
    }
    this.archiveButton.on('click', this._genOnClickArchiveTable())

  }

  _showAsNotAllowedToArchive() {
    let labelUpperCase = this.options.ctType === CollationTableType.EDITION ? 'Edition' : 'Collation Table'
    this.archiveButton
      .html(`Archive this ${labelUpperCase}`)
      .attr('title', this.options.cannotArchiveReason)
      .prop('disabled', true)
  }

  _showAsAllowedToArchive() {
    let label = this.options.ctType === CollationTableType.EDITION ? 'edition' : 'collation table'
    let labelUpperCase = this.options.ctType === CollationTableType.EDITION ? 'Edition' : 'Collation Table'
    this.archiveButton
      .html(`Archive this ${labelUpperCase}`)
      .attr('title', `Click to archive this ${label}`)
      .prop('disabled', false)
  }

  _showAsArchived() {
    let label = this.options.ctType === CollationTableType.EDITION ? 'edition' : 'collation table'
    this.archiveButton
      .html(`Archived`)
      .attr('title', `This ${label} is already archived`)
      .prop('disabled', true)
  }

  _showAsArchiving() {
    this.archiveButton
      .html(`Archiving...<i class="fas fa-spinner fa-spin"></i>` )
      .prop('disabled', true)
  }

  _showUpdatedVersionInfo() {
    $(`#${versionHistoryDiv}`).html(this._genVersionTableHtml())
  }

  _genVersionTableHtml() {
    let html = ''

    html += '<table class="versioninfo">'
    html += '<tr><th>N</th><th>Id</th><th>Author</th><th>Time</th><th>Description</th></tr>'

    for(let i=this.options.versionInfo.length-1; i >= 0; i--)   {
      let version = this.options.versionInfo[i]
      html += '<tr>'
      html += '<td>' + (i+1) + '</td>'
      html += '<td>' + version['id'] + '</td>'
      html += '<td class="author">' + this.options.peopleInfo[version['authorId']].fullname + '</td>'
      html += '<td class="time">' + Util.formatVersionTime(version['timeFrom']) + '</td>'
      html += '<td>' + version['description'] + '</td>'

      html += '<td>'
      if (version['isMinor']) { html += '[m]'}
      if (version['isReview']) { html += ' [r]'}
      html += '</td>'
      html += '</tr>'
    }
    return html
  }


  _genOnClickArchiveTable() {
    let thisObject = this
    let label = this.options.ctType === CollationTableType.EDITION ? 'edition' : 'collation table'
    return () => {
      if (thisObject.options.archived || !thisObject.options.canArchive) {
        thisObject.verbose && console.log(`Click on archive button, but cannot archive`)
        return
      }

      let confirmDialog = new ConfirmDialog({
        body: `
<p>Are you sure you want to archive this ${label}?</p>
<p>The ${label} will no longer be accessible and only an administrator can restore it.</p>`,
        acceptButtonLabel: 'Archive',
        cancelButtonLabel: 'Cancel',
        acceptFunction: () => {
          thisObject._showAsArchiving()
          thisObject.options.onConfirmArchive().then( (newVersionInfo) => {
            console.log("Success archiving table")
            thisObject.options.archived = true
            thisObject.options.versionInfo = newVersionInfo
            thisObject._showAsArchived()
            thisObject._showUpdatedVersionInfo()
          }).catch( () => {
            thisObject.verbose && console.log(`Error archiving table`)
            this.options.archived = false
            thisObject.archiveButton.html(`Error archiving, click to try again`)
          })
        }
      })
      confirmDialog.show()
    }
  }
}