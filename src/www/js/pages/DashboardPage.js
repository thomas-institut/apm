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

import { CollapsePanel } from '../widgets/CollapsePanel'
import { UserDocDataCommon } from './common/UserDocDataCommon'
import { tr } from './common/SiteLang'
import { NormalPage } from './NormalPage'
import { urlGen } from './common/SiteUrlGen'

const newMceEditionIcon = '<i class="bi bi-file-plus"></i>'

export class DashboardPage extends NormalPage {
  constructor(options) {
    super(options)
    this.initPage()
  }

  initPage() {
    super.initPage()

    document.title = tr('Dashboard')

    this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', tr('Multi-Chunk Editions'), [ 'first'])
    this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', tr('Chunk Editions'))
    this.collationTablesCollapse = this.constructCollapse('#collation-tables', tr('Collation Tables'))
    this.transcriptionsCollapse = this.constructCollapse('#transcriptions', tr('Transcriptions'))
    this.adminCollapse = this.constructCollapse('#admin',tr('Admin'))
    this.adminCollapse.setContent(this.genAdminSectionHtml())
    // now get the data
    this.fetchMultiChunkEditions()
    this.fetchCollationTablesAndEditions()
    this.fetchTranscriptions()
  }



  fetchMultiChunkEditions() {
    this.fetch(urlGen.apiUserGetMultiChunkEditionInfo(this.userId)).then ( (data) => {
      let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data)
      let newMceUrl = urlGen.siteMultiChunkEditionNew()
      html += `<p class="new-mce"><a href="${newMceUrl}" title="${tr('Click to start a new multi-chunk edition')}" target="_blank">${newMceEditionIcon} ${tr('Create new multi-chunk edition')}</a></p>`
      this.mcEditionsCollapse.setContent(html)
    })
  }

  fetchCollationTablesAndEditions() {
    let p = new SimpleProfiler('fetchCT_Info')
    this.fetch(urlGen.apiUserGetCollationTableInfo(this.userId)).then( (data) => {
      p.lap('Got data from server')
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], data['workInfo'])
      p.lap('Generated HTML')
      this.chunkEditionsCollapse.setContent(listHtml.editions)
      this.collationTablesCollapse.setContent(listHtml.cTables)
      p.stop('Finished')
    })
  }

  fetchTranscriptions() {
    this.fetch(urlGen.apiTranscriptionsByUserDocPageData(this.userId)).then( (data) => {
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data))
    })
  }

  genHtml() {
    return `<div class="dashboard">
        <div id="multi-chunk-editions" class="dashboard-section"></div>
        <div id="chunk-editions" class="dashboard-section"></div>
        <div id="collation-tables" class="dashboard-section"></div>
        <div id="transcriptions" class="dashboard-section"></div>
        <div id="admin" class="dashboard-section"></div>
       </div>`
  }

  genAdminSectionHtml() {
    return `
        <p><a href="${urlGen.siteUserProfile(this.userName)}">${tr("Edit profile / Change Password")}</a></p>`
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
    return `${tr('Loading data')} <span class="spinner-border spinner-border-sm" role="status"></span>`
  }

}


window.DashboardPage = DashboardPage