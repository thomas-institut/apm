import { NormalPage } from './NormalPage'
import { tr } from './common/SiteLang'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { urlGen } from './common/SiteUrlGen'
import { ApmPage } from './ApmPage'

export class DocumentsPage extends NormalPage {

  constructor (options) {
    super(options);
    let oc = new OptionsChecker({
      context: 'DocumentsPage',
      optionsDefinition: {
        docs: { type: 'array', required: true},
        canManageDocuments : { type: 'boolean', required: true}
      }
    });

    let cleanOptions = oc.getCleanOptions(options);
    this.docs = cleanOptions.docs;
    this.canManageDocuments = cleanOptions.canManageDocuments;

    console.log(`Documents Page`);
    console.log(this.docs);


    this.initPage().then( async () => {
      this.dataTablesData = await this.makeDataForDataTables();
      // console.log(this.dataTablesData);
      $('table.docs-table').DataTable({
        data: this.dataTablesData,
        paging: true,
        searching : true,
        // autoWidth: false,
        columns: [
          { data: 'title'},
          { data: 'type'},
          { data: 'lang'},
          { data: 'numPages', searchable: false},
          { data: 'numTranscribedPages', searchable: false},
          { data: 'transcribers'},
        ],
        language: this.getDataTablesLanguageOption()
      });
      $('div.data-status').addClass('hidden');
      console.log('Documents Page initialized');
    })
  }

  async initPage() {
    await super.initPage();

  }

  async genHtml () {
    let adminDiv = '';
    if (this.canManageDocuments) {
      adminDiv = `<div class='doc-admin'><h3>${tr('Admin')}</h3>
       <ul>
       <li><a href="${urlGen.siteDocNewDoc()}">${tr('Create New Document')}</a></li>
</ul>

`
    }

    return `<h1>${tr('Documents')}</h1>
            <div class="data-status">${ApmPage.genLoadingMessageHtml()}</div>
            <div class="docs-table-div">${await this.getDocumentsTableSkeleton()}</div>
            ${adminDiv}`;
  }

  async makeDataForDataTables() {
    let data = [];
    for (let i = 0; i  < this.docs.length; i++) {
      let doc = this.docs[i];
      data.push({
        title: `<a href="${urlGen.siteDocPage(doc['docInfo']['id'])}">${doc['docInfo']['title']}</a>`,
        type:  await this.apmDataProxy.getDocTypeName(doc.docInfo.doc_type),
        lang: await this.apmDataProxy.getLangName(doc['docInfo']['lang']),
        numPages: doc['numPages'],
        numTranscribedPages: doc['numTranscribedPages'],
        transcribers: doc['editors'].map( (transcriber) => {
          return ` <a href="${urlGen.sitePerson(Tid.toBase36String(transcriber['tid']))}" title="Click to view person details">${transcriber['name']}</a>`
        }).join(', '),
      })
    }
    return data;
  }

  async getDocumentsTableSkeleton() {
    return `<table class="docs-table">
                <thead><tr>
                      <th>${tr('Title')}</th>
                      <th>${tr('Type')}</th>
                      <th>${tr('Language')}</th>
                      <th>${tr('Pages')}</th>
                      <th>${tr('Pages:Transcribed')}</th>
                      <th>${tr('Transcribers')}</th>
                      <th></th></tr>
                </thead>
      </table>`;
  }

}


window.DocumentsPage = DocumentsPage;