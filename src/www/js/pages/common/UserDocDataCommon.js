
// functions to display user doc data: transcriptions, collation tables, etc


import { numericFieldSort, stringFieldSort } from '../../toolbox/ArrayUtil.mjs'
import { tr } from './SiteLang'
import { urlGen} from './SiteUrlGen'
import { Tid } from '../../Tid/Tid'

function noneParagraph() {
  return `<p class="none"><em>${tr('None')}</em></p>`
}

export class UserDocDataCommon {

  static generateMultiChunkEditionsListHtml(apiData) {
    if (apiData.length === 0) {
      return noneParagraph()
    }
    return apiData.map( (mceInfo)=> {
      let url = urlGen.siteMultiChunkEdition(mceInfo.id)
      return `<p class="mce-title"><a href="${url}" title="${tr('Click to edit in new tab/window')}" target="_blank">${mceInfo.title}</a></p>`
    }).join('')
  }

  static generateTranscriptionListHtml(apiData) {
    // in JS docInfoArray is not actually an array but an object
    let docArray = Object.keys(apiData['docInfoArray']).map( (key) => { return apiData['docInfoArray'][key] })
    let html
    if (docArray.length === 0) {
      html= noneParagraph()
    } else {
      let docs = stringFieldSort(docArray, 'title')
      html = docs.map( (docInfo) => {
        let docUrl = urlGen.siteDocPage(docInfo.id)
        let pageListHtml = docInfo['pageIds'].map( (pageId) => {
          let pageInfo = apiData['pageInfoArray'][pageId]
          let pageUrl = urlGen.sitePageView(pageInfo.docId, pageInfo.sequence)
          return `<a href="${pageUrl}" title="${tr('Click to view page in new tab/window')}" target="_blank">${pageInfo['foliation']}</a>`
        }).join('&nbsp; ')
        return `<p class="doc-title"><a href="${docUrl}" title="${tr('Click to open document in new tab/window')}" target="_blank">${docInfo.title}</a></p>
                <p class="page-list">${pageListHtml}</p>`
      }).join('')
    }
    return html
  }

  static expandChunkIdsInApiData(apiData) {
    return apiData.map ( (ctInfo) => {
      let chunkIdFields = ctInfo.chunkId.split('-')
      ctInfo.work = chunkIdFields[0]
      ctInfo.chunkNumber = parseInt(chunkIdFields[1])
      return ctInfo
    })
  }

  static generateCtTablesAndEditionsListHtml(apiData, workInfoObject = {}) {
    let expandedData = this.expandChunkIdsInApiData(apiData)
    let editions = expandedData.filter( (ctInfo) => { return ctInfo['type'] === 'edition'})
    let cTables = expandedData.filter( (ctInfo) => { return ctInfo['type'] === 'ctable'})
    return {
      editions: this.__genCtList(editions, workInfoObject, false),
      cTables: this.__genCtList(cTables, workInfoObject, true)
    }
  }



  static getWorksFromCtInfoArray(ctInfoArray) {
    let works = {}
    ctInfoArray.forEach( (ctInfo) => {
      works[ctInfo.work] = true
    })
    return Object.keys(works)
  }

  static __genCtList(ctInfoArray, workInfoObject, isCollationTable = true) {
    if (ctInfoArray.length === 0) {
      return noneParagraph();
    }
    let html = ''
    this.getWorksFromCtInfoArray(ctInfoArray).sort().forEach( (work) => {
      html += `<div class="work">`;
      let ctTables = ctInfoArray.filter( (ctInfo) => {
        return ctInfo.work === work;
      })
      let workInfo = workInfoObject[work];
      let workTitle;
      if (workInfo === undefined) {
        workTitle = work;
      } else {
        let workUrl = urlGen.siteWorkPage(Tid.toBase36String(workInfo['entityId']));
        let authorUrl = urlGen.sitePerson(Tid.toBase36String(workInfo['authorId']));
        workTitle = `<a href="${authorUrl}">${workInfo['author_name']}</a>, <a href="${workUrl}"><em>${workInfo['title']}</em> (${work})</a>`
      }
      html += `<p class="work-title">${workTitle}</p>`
      ctTables = numericFieldSort(ctTables, 'chunkNumber')
      html += ctTables.map( ( ctInfo) => {
        let editUrl = isCollationTable ? urlGen.siteCollationTableEdit(ctInfo.id) : urlGen.siteChunkEdition(ctInfo.id);
        let chunkUrl = urlGen.siteChunkPage(ctInfo.work, ctInfo.chunkNumber)
        return `<p class='ct-info'><a href="${chunkUrl}" title="${tr('Click to see chunk {{chunk}} in new tab/window', { chunk:ctInfo.chunkId })}" target="_blank>">${ctInfo.chunkNumber}</a> : 
 <a href="${editUrl}" title="${tr('Click to edit in new tab/window')}" target="_blank">${ctInfo.title}</a></p>`
      }).join('')
      html += '</div>'
    })
    return html
  }

}