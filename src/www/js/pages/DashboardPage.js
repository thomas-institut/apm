/*
 *  Copyright (C) 2022 Universität zu Köln
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

import { OptionsChecker } from '@thomas-inst/optionschecker'
import { CollapsePanel } from '../widgets/CollapsePanel'
import { UserDocDataCommon } from './common/UserDocDataCommon'

const newMceEditionIcon = '<i class="bi bi-file-plus"></i>'

export class DashboardPage {
  constructor(options) {

    let optionsChecker = new OptionsChecker({
      context: 'DashboardPage',
      optionsDefinition: {
        urlGenerator: { required: true, type: 'object' },
        userId: { type: 'number', default: -1 },
        userInfo: { type: 'object'}
      }
    })
    this.options = optionsChecker.getCleanOptions(options)
    console.log('Dashboard Page options')
    console.log(this.options)
    this.userId = this.options.userId
    this.userName = this.options.userInfo.username
    this.container = $('#dashboard')
    this.container.html(this.genHtml())

    this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', 'Multi-Chunk Editions', [ 'first'])
    this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', 'Chunk Editions')
    this.collationTablesCollapse = this.constructCollapse('#collation-tables', 'Collation Tables')
    this.transcriptionsCollapse = this.constructCollapse('#transcriptions', 'Transcriptions')
    this.adminCollapse = this.constructCollapse('#admin', 'Admin')

    this.adminCollapse.setContent(this.genAdminSectionHtml())

    // now get the data
    this.fetchMultiChunkEditions()
    this.fetchCollationTablesAndEditions()
    this.fetchTranscriptions()

  }

  fetchMultiChunkEditions() {
    $.get(this.options.urlGenerator.apiUserGetMultiChunkEditionInfo(this.userId)).then( (data) => {
      let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data, this.options.urlGenerator)
      let newMceUrl = this.options.urlGenerator.siteMultiChunkEditionNew()
      html += `<p class="new-mce"><a href="${newMceUrl}" title="Click to start a new multi-chunk edition" target="_blank">${newMceEditionIcon} Create new multi-chunk edition</a></p>`
      this.mcEditionsCollapse.setContent(html)
    })
  }

  fetchCollationTablesAndEditions() {
    let p = new SimpleProfiler('fetchCT_Info')
    $.get(this.options.urlGenerator.apiUserGetCollationTableInfo(this.userId)).then( (data) => {
      p.lap('Got data from server')
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], this.options.urlGenerator, data['workInfo'])
      p.lap('Generated HTML')
      this.chunkEditionsCollapse.setContent(listHtml.editions)
      this.collationTablesCollapse.setContent(listHtml.cTables)
      p.stop('Finished')
    })
  }

  fetchTranscriptions() {
    $.get(this.options.urlGenerator.apiUserGetTranscribedPages(this.userId)).then( (data) => {
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data, this.options.urlGenerator))
    })
  }

  genHtml() {
    return `<div id="multi-chunk-editions" class="dashboard-section"></div>
        <div id="chunk-editions" class="dashboard-section"></div>
        <div id="collation-tables" class="dashboard-section"></div>
        <div id="transcriptions" class="dashboard-section"></div>
        <div id="admin" class="dashboard-section"></div>`
  }

  genAdminSectionHtml() {
    return `
        <p><a href="${this.options.urlGenerator.siteUserProfile(this.userName)}">Edit profile / Change Password</a></p>`
  }

  constructCollapse(selector, title, headerClasses = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: this.genLoadingMessageHtml(),
      contentClasses: [ 'dashboard-section-content'],
      headerClasses: headerClasses,
      iconWhenHidden: '<small><i class="bi bi-caret-right-fill"></i></small>',
      iconWhenShown: '<small><i class="bi bi-caret-down-fill"></i></small>',
      iconAtEnd: true,
      headerElement: 'h1',
      initiallyShown: true,
      debug: false
    })
  }

  genLoadingMessageHtml() {
    return `Loading data  <span class="spinner-border spinner-border-sm" role="status"></span>`
  }
}


window.DashboardPage = DashboardPage