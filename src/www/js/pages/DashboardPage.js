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
import { ApmPage } from './ApmPage'
import { Tid } from '../Tid/Tid'
import { NewChunkEditionDialog } from './common/NewChunkEditionDialog'

const newMceEditionIcon = '<i class="bi bi-file-plus"></i>'

export class DashboardPage extends NormalPage {
  constructor(options) {
    super(options)
    console.log(`Dashboard Page`)
    console.log(options)
    this.initPage().then( () => {
      console.log(`Dashboard page initialized`)
    })
  }

  async initPage() {
    await super.initPage()
    document.title = tr('Dashboard')
    this.mcEditionsCollapse = this.constructCollapse('#multi-chunk-editions', tr('Multi-Chunk Editions'), [ 'first'])
    this.chunkEditionsCollapse = this.constructCollapse('#chunk-editions', tr('Chunk Editions'))
    this.collationTablesCollapse = this.constructCollapse('#collation-tables', tr('Collation Tables'))
    this.transcriptionsCollapse = this.constructCollapse('#transcriptions', tr('Transcriptions'))
    this.adminCollapse = this.constructCollapse('#admin',tr('Admin'))
    this.adminCollapse.setContent(this.genAdminSectionHtml())

    await Promise.all( [
      this.fetchMultiChunkEditions(),
      this.fetchCollationTablesAndEditions(),
      this.fetchTranscriptions()
    ])

    $('.new-chunk-edition-btn').on('click', (ev) => {
      ev.preventDefault();
      let d = new NewChunkEditionDialog({ apmDataProxy: this.apmDataProxy});
      d.createNewChunkEdition();
    })
  }

  async fetchMultiChunkEditions() {
    let data = await this.apmDataProxy.get(urlGen.apiUserGetMultiChunkEditionInfo(this.userTid))
    let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data)
    let newMceUrl = urlGen.siteMultiChunkEditionNew()
    html += `<p class="new-mce"><a href="${newMceUrl}" title="${tr('Click to start a new multi-chunk edition')}" target="_blank">${newMceEditionIcon} ${tr('Create new multi-chunk edition')}</a></p>`
    this.mcEditionsCollapse.setContent(html)
  }

  async fetchCollationTablesAndEditions() {
   let data = await this.apmDataProxy.get(urlGen.apiUserGetCollationTableInfo(this.userTid))
   let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data['tableInfo'], data['workInfo']);
   let newChunkEditionHtml = `<p class="new-mce"><a href="" class="new-chunk-edition-btn" 
        title="${tr("Click to create a new chunk edition")}">${newMceEditionIcon} Create new chunk edition</a></p>`;
   this.chunkEditionsCollapse.setContent(listHtml.editions + newChunkEditionHtml);
   this.collationTablesCollapse.setContent(listHtml.cTables)


  }

  async fetchTranscriptions() {
    let data = await this.apmDataProxy.get(urlGen.apiTranscriptionsByUserDocPageData(this.userTid))
    this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data))
  }

  getExtraClassesForPageContentDiv () {
    return [ 'dashboard'];
  }

  /**
   *
   * @return {Promise<string>}
   */
  async genContentHtml() {
    return `<div id="multi-chunk-editions" class="dashboard-section"></div>
        <div id="chunk-editions" class="dashboard-section"></div>
        <div id="collation-tables" class="dashboard-section"></div>
        <div id="transcriptions" class="dashboard-section"></div>
        <div id="admin" class="dashboard-section"></div> `
  }

  genAdminSectionHtml() {
    return `
        <p><a href="${urlGen.sitePerson(Tid.toBase36String(this.userTid))}">${tr("Edit profile / Change Password")}</a></p>`
  }

  constructCollapse(selector, title, headerClasses = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: ApmPage.genLoadingMessageHtml(),
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



}


window.DashboardPage = DashboardPage