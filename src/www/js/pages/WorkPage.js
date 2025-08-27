import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import { ApmPage } from './ApmPage'
import { Tid } from '../Tid/Tid'
import { numericSort } from '../lib/ToolBox/ArrayUtil.ts'

export class WorkPage extends NormalPage {

  constructor (options) {
    super(options)
    let oc = new OptionsChecker({
      context: 'WorkPage',
      optionsDefinition: {
        workData: { type: 'object'}
      }
    });

    let cleanOptions = oc.getCleanOptions(options);
    console.log(`Work Page Options`);
    console.log(cleanOptions);

    this.workData = options.workData;
    this.chunks = [];

    this.initPage().then( () =>{
      console.log(`Work Page initialized`);
    })
  }

  async initPage () {
    await super.initPage();

    let apiChunkData = await this.apmDataProxy.get(urlGen.apiWorkGetChunksWithTranscription(this.workData.workId));
    console.log(`Transcription Data`, apiChunkData);
    let apiCollationTableData = await this.apmDataProxy.get(urlGen.apiCollationTable_activeForWork(this.workData.workId));
    console.log(`Collation Table Data`, apiCollationTableData)

    this.aggregatedData = this.aggregateChunkData(apiChunkData['chunks'], apiCollationTableData);

    this.chunks = this.aggregatedData.allChunks;

    $('div.chunks-div').html(this.genChunksDivHtml());

  }


  aggregateChunkData(apiTranscriptionData, apiCollationTableData) {
    // tx data is just an array of chunk ids
    let chunksWithTx = apiTranscriptionData;
    let allChunks = apiTranscriptionData;
    let chunksWithCT = [];
    let chunksWithEdition = [];
    apiCollationTableData.forEach( (ctData) => {
      let chunkNumber = parseInt(ctData['chunkId'].split('-')[1]) ?? -1;
      if (chunkNumber === -1) {
        console.warn(`Chunk number not detected in chunkId ${ctData['chunkId']}`);
        return;
      }
      if (allChunks.indexOf(chunkNumber) === -1) {
        allChunks.push(chunkNumber);
      }
      if (ctData['type'] === 'edition') {
        if (chunksWithEdition.indexOf(chunkNumber) === -1) {
          chunksWithEdition.push(chunkNumber);
        }
      } else {
        if (chunksWithCT.indexOf(chunkNumber) === -1) {
          chunksWithCT.push(chunkNumber)
        }
      }
    })
    return {
      allChunks: numericSort(allChunks),
      chunksWithTx: numericSort(chunksWithTx),
      chunksWithCT: numericSort(chunksWithCT),
      chunksWithEdition: numericSort(chunksWithEdition)
    }

  }

  genChunksDivHtml() {
    if (this.chunks.length === 0) {
      return `No chunks with transcription, editions or collation tables in the system`;
    }

    let html = '<h2>Chunks with Data</h2>';
    let maxChunk = Math.max(...this.chunks);
    let cellSize = 'small';
    if (maxChunk >= 100) {
      cellSize = 'medium';
    }
    if (maxChunk >= 1000) {
      cellSize = 'large';
    }
    html += `<div class="chunk-list chunk-list-${cellSize}">`;
    html += this.chunks.map( ( chunk) => {
      let chunkLabel = `${chunk}`;
      if (this.aggregatedData.chunksWithEdition.indexOf(chunk) !== -1) {
        chunkLabel = `<small>*</small>${chunkLabel}`;
      }
      return `<div class="chunk-div">
            <a class="chunk-link" href="${urlGen.siteChunkPage(this.workData.workId, chunk)}" title="View chunk">${chunkLabel}</a>
            </div>`;
    }).join('');
    html += `</div>`; // chunk-list
    return html;
  }

  async genContentHtml () {
    await super.genContentHtml();
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: tr('Works'), url:  urlGen.siteWorks()},
      { label: this.workData.workId, active: true}
    ])

    let authorData = await this.apmDataProxy.getPersonEssentialData(this.workData.authorId);

    let infoToDisplay =  [
      [ tr('Entity Id'), Tid.toBase36String(this.workData.entityId)],
      [ tr('Work Id'), this.workData.workId]
    ];

    let infoHtml = infoToDisplay.map ( (displayTuple) => {
      let [ predicateName, predicateValue] = displayTuple;
      return this.getPredicateHtml(predicateName, predicateValue);
    }).join('')

    let entityAdminHtml = '';
    if (this.isUserRoot()) {
      entityAdminHtml = `<div class="entity-admin">
                <a class="entity-page-button" href="${urlGen.siteAdminEntity(this.workData.entityId)}">[ ${tr('Entity Page')} ]</a>
                <a class="dev-metadata-editor-button" href="${urlGen.siteDevMetadataEditor(this.workData.entityId)}">[ ${tr('Dev Metadata Editor')} ]</a>
                </div>`
    }


    return `${breadcrumbHtml}
    <h1><a href="${urlGen.sitePerson(this.workData.authorId)}">${authorData.name}</a>, <em>${this.workData.title}</em></h1>
    <div class="work-info">${infoHtml}</div>
    <div class="section entity-admin">${entityAdminHtml}</div>
    <div class="section chunks-div">${ApmPage.genLoadingMessageHtml('Loading chunk data')}</div>
`
  }
}


window.WorkPage = WorkPage;