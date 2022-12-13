
// functions to display user doc data: transcriptions, collation tables, etc


import { numericFieldSort, stringFieldSort } from '../../toolbox/ArrayUtil.mjs'

const noneParagraph = '<p class="none"><em>None</em></p>'

export class UserDocDataCommon {

  static generateMultiChunkEditionsListHtml(apiData, urlGenerator) {
    if (apiData.length === 0) {
      return noneParagraph
    }
    return apiData.map( (mceInfo)=> {
      let url = urlGenerator.siteEditMultiChunkEdition(mceInfo.id)
      return `<p class="mce-title"><a href="${url}" title="Click to edit in new tab/window" target="_blank">${mceInfo.title}</a></p>`
    }).join('')
  }

  static generateTranscriptionListHtml(apiData, urlGenerator) {
    // in JS docInfoArray is not actually an array but an object
    let docArray = Object.keys(apiData['docInfoArray']).map( (key) => { return apiData['docInfoArray'][key] })
    let html
    if (docArray.length === 0) {
      html= noneParagraph
    } else {
      let docs = stringFieldSort(docArray, 'title')
      html = docs.map( (docInfo) => {
        let docUrl = urlGenerator.siteDocPage(docInfo.id)
        let pageListHtml = docInfo['pageIds'].map( (pageId) => {
          let pageInfo = apiData['pageInfoArray'][pageId]
          let pageUrl = urlGenerator.sitePageView(pageInfo.docId, pageInfo.sequence)
          return `<a href="${pageUrl}" title="Click to view page in new tab/window" target="_blank">${pageInfo['foliation']}</a>`
        }).join('&nbsp; ')
        return `<p class="doc-title"><a href="${docUrl}" title="Click to open document in new tab/window" target="_blank">${docInfo.title}</a></p>
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

  static generateCtTablesAndEditionsListHtml(apiData, urlGenerator, workInfoObject = {}) {
    let expandedData = this.expandChunkIdsInApiData(apiData)
    let editions = expandedData.filter( (ctInfo) => { return ctInfo['type'] === 'edition'})
    let cTables = expandedData.filter( (ctInfo) => { return ctInfo['type'] === 'ctable'})
    return {
      editions: this.__genCtList(editions, urlGenerator, workInfoObject),
      cTables: this.__genCtList(cTables, urlGenerator, workInfoObject)
    }
  }

  static fetchWorkInfoFromExpandedApiData(expandedApiData, urlGenerator) {
    return new Promise( async (resolve) => {
      let workList = this.getWorksFromCtInfoArray(expandedApiData)
      let workInfoObject = {}
      for (let i = 0; i < workList.length; i++) {
        workInfoObject[workList[i]] =  await $.get(urlGenerator.apiWorkGetInfo(workList[i]))
      }
      resolve(workInfoObject)
    })
  }

  static getWorksFromCtInfoArray(ctInfoArray) {
    let works = {}
    ctInfoArray.forEach( (ctInfo) => {
      works[ctInfo.work] = true
    })
    return Object.keys(works)
  }

  static __genCtList(ctInfoArray, urlGenerator, workInfoObject) {
    if (ctInfoArray.length === 0) {
      return noneParagraph
    }
    let html = ''
    this.getWorksFromCtInfoArray(ctInfoArray).sort().forEach( (work) => {
      html += `<div class="work">`
      let ctTables = ctInfoArray.filter( (ctInfo) => {
        return ctInfo.work === work
      })
      let workInfo = workInfoObject[work]
      let workTitle
      if (workInfo === undefined) {
        workTitle = work
      } else {
        workTitle = `${workInfo['author_name']}, <em>${workInfo['title']}</em> (${work})`
      }
      html += `<p class="work-title">${workTitle}</p>`
      ctTables = numericFieldSort(ctTables, 'chunkNumber')
      html += ctTables.map( ( ctInfo) => {
        let editUrl = urlGenerator.siteEditCollationTable(ctInfo.id)
        let chunkUrl = urlGenerator.siteChunkPage(ctInfo.work, ctInfo.chunkNumber)
        return `<p class='ct-info'><a href="${chunkUrl}" title="Click to see chunk ${ctInfo.chunkId} in a new page/tab" target="_blank>">${ctInfo.chunkNumber}</a> : 
 <a href="${editUrl}" title="Click to edit in new page/tab" target="_blank">${ctInfo.title}</a></p>`
      }).join('')
      html += '</div>'
    })
    return html
  }

}