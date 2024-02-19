import { NormalPage } from './NormalPage'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './common/SiteLang'
import { urlGen } from './common/SiteUrlGen'
import { ApmPage } from './ApmPage'
import { Tid } from '../Tid/Tid'

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

    let apiChunkData = await this.apmDataProxy.get(urlGen.apiWorkGetChunksWithTranscription(this.workData.dareId));

    this.chunks = apiChunkData['chunks'];

    $('div.chunks-div').html(this.genChunksDivHtml());

  }

  genChunksDivHtml() {
    if (this.chunks.length === 0) {
      return `No chunks with transcription in the system`;
    }

    let html = '<h2>Chunks with Transcription</h2>';
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
      return `<div class="chunk-div">
            <a class="chunk-link" href="${urlGen.siteChunkPage(this.workData.dareId, chunk)}" title="View chunk">${chunk}</a>
            </div>`;
    }).join('');
    html += `</div>`; // chunk-list
    return html;
  }

  async genContentHtml () {
    await super.genContentHtml();
    let breadcrumbHtml = this.getBreadcrumbNavHtml([
      { label: tr('Works'), url:  urlGen.siteWorks()},
      { label: this.workData.dareId, active: true}
    ])

    let authorData = await this.apmDataProxy.getPersonEssentialData(this.workData.authorTid);

    let infoToDisplay =  [
      [ tr('Entity Id'), Tid.toBase36String(this.workData.tid)],
      [ tr('Dare Id'), this.workData.dareId]
    ];

    let infoHtml = infoToDisplay.map ( (displayTuple) => {
      let [ predicateName, predicateValue] = displayTuple;
      return this.getPredicateHtml(predicateName, predicateValue);
    }).join('')


    return `${breadcrumbHtml}
    <h1><a href="${urlGen.sitePerson(this.workData.authorTid)}">${authorData.name}</a>, <em>${this.workData.title}</em></h1>
    <div class="work-info">${infoHtml}</div>
    <div class="chunks-div">${ApmPage.genLoadingMessageHtml('Loading chunk data')}</div>`
  }
}


window.WorkPage = WorkPage;