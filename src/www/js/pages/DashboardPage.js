import { OptionsChecker } from '@thomas-inst/optionschecker'
import { CollapsePanel } from '../widgets/CollapsePanel'
import { numericFieldSort, stringFieldSort } from '../toolbox/ArrayUtil.mjs'
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
    this.container.html(this.__genHtml())

    this.mcEditionsCollapse = this.__constructCollapse('#multi-chunk-editions', 'Multi-Chunk Editions', [ 'first'])
    this.chunkEditionsCollapse = this.__constructCollapse('#chunk-editions', 'Chunk Editions')
    this.collationTablesCollapse = this.__constructCollapse('#collation-tables', 'Collation Tables')
    this.transcriptionsCollapse = this.__constructCollapse('#transcriptions', 'Transcriptions')
    this.adminCollapse = this.__constructCollapse('#admin', 'Admin')

    this.adminCollapse.setContent(this.__genAdminSectionHtml())

    // now get the data
    this._fetchMultiChunkEditions()
    this._fetchCollationTablesAndEditions()
    this._fetchTranscriptions()

  }

  _fetchMultiChunkEditions() {
    $.get(this.options.urlGenerator.apiUserGetMultiChunkEditionInfo(this.userId)).then( (data) => {
      let html = UserDocDataCommon.generateMultiChunkEditionsListHtml(data, this.options.urlGenerator)
      let newMceUrl = this.options.urlGenerator.siteMultiChunkEditionNew()
      html += `<p class="new-mce"><a href="${newMceUrl}" title="Click to start a new multi-chunk edition" target="_blank">${newMceEditionIcon} Create new multi-chunk edition</a></p>`
      this.mcEditionsCollapse.setContent(html)
    })
  }

  _fetchCollationTablesAndEditions() {
    $.get(this.options.urlGenerator.apiUserGetCollationTableInfo(this.userId)).then( (data) => {
      let listHtml = UserDocDataCommon.generateCtTablesAndEditionsListHtml(data, this.options.urlGenerator)
      this.chunkEditionsCollapse.setContent(listHtml.editions)
      this.collationTablesCollapse.setContent(listHtml.cTables)
    })
  }

  __genCtList(ctInfoArray) {
    if (ctInfoArray.length === 0) {
      return '<p><em>None</em></p>'
    }
    let chunks = {}
    ctInfoArray.forEach( (ctInfo) => {
      chunks[ctInfo.chunk] = true
    })
    let html = ''
   Object.keys(chunks).sort().forEach( (chunk) => {
     html += `<div class="chunk">`
      let ctTables = ctInfoArray.filter( (ctInfo) => {
        return ctInfo.chunk === chunk
      })
      ctTables = numericFieldSort(ctTables, 'chunkNumber')
      html += ctTables.map( ( ctInfo) => {
        let editUrl = this.options.urlGenerator.siteEditCollationTable(ctInfo.id)
        return `<p class='ct-info'><a href="${editUrl}" title="Click to edit in new page/tab" target="_blank">${ctInfo.chunkId} : ${ctInfo.title}</a></p>`
      }).join('')
     html += '</div>'
    })
    return html
  }

  _fetchTranscriptions() {
    $.get(this.options.urlGenerator.apiUserGetTranscribedPages(this.userId)).then( (data) => {
      this.transcriptionsCollapse.setContent(UserDocDataCommon.generateTranscriptionListHtml(data, this.options.urlGenerator))
    })
  }

  __genHtml() {
    return `<div id="multi-chunk-editions" class="dashboard-section"></div>
        <div id="chunk-editions" class="dashboard-section"></div>
        <div id="collation-tables" class="dashboard-section"></div>
        <div id="transcriptions" class="dashboard-section"></div>
        <div id="admin" class="dashboard-section"></div>
`
  }

  __genAdminSectionHtml() {
    return `
        <p><a href="${this.options.urlGenerator.siteUserProfile(this.userName)}">Edit profile / Change Password</a></p>
`
  }

  __constructCollapse(selector, title, headerClasses = []) {
    return new CollapsePanel({
      containerSelector: selector,
      title: title,
      content: this.__genLoadingMessageHtml(),
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

  __genLoadingMessageHtml() {
    return `Loading data  <span class="spinner-border spinner-border-sm" role="status"></span>`
  }
}


window.DashboardPage = DashboardPage