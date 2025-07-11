
import { NormalPage } from './NormalPage';
import { tr } from './common/SiteLang';
import { OptionsChecker } from '@thomas-inst/optionschecker';
import { Tid } from '../Tid/Tid';
import { urlGen } from './common/SiteUrlGen';
import { ApmPage } from './ApmPage';
import { DocumentCreationDialog } from './common/DocumentCreationDialog';
import DataTable from 'datatables.net-dt';

interface DocumentData {
  docInfo: {
    id: number;
    title: string;
    doc_type: number;
    lang: number;
  };
  numPages: number;
  numTranscribedPages: number;
  transcribers: number[];
}

interface DataTableEntry {
  title: string;
  type: string;
  lang: string;
  numPages: number;
  numTranscribedPages: number;
  transcribers: string;
}



export class DocumentsPage extends NormalPage {
  private readonly docs: DocumentData[];
  private readonly canManageDocuments: boolean;
  private dataTablesData: DataTableEntry[] = [];

  constructor(options: any) {
    super(options);
    const oc = new OptionsChecker({
      context: 'DocumentsPage',
      optionsDefinition: {
        docs: { type: 'array', required: true },
        canManageDocuments: { type: 'boolean', required: true }
      }
    });

    const cleanOptions = oc.getCleanOptions(options);
    this.docs = cleanOptions.docs;
    this.canManageDocuments = cleanOptions.canManageDocuments;

    console.log('Documents Page');
    console.log(this.docs);

    this.initPage().then(async () => {
      this.dataTablesData = await this.makeDataForDataTables();
      $('div.docs-table-div').removeClass('hidden');

      new DataTable('table.docs-table', {
        data: this.dataTablesData,
        paging: true,
        searching: true,
        columns: [
          { data: 'title' },
          { data: 'type' },
          { data: 'lang' },
          { data: 'numPages', searchable: false },
          { data: 'numTranscribedPages', searchable: false },
          { data: 'transcribers' }
        ],
        language: this.getDataTablesLanguageOption()
      });
      $('div.data-status').addClass('hidden');
      console.log('Documents Page initialized');
    });
  }

  async initPage(): Promise<void> {
    await super.initPage();
    $('.create-document-btn').on('click', this.genOnClickCreateNewDocument());
  }

  genOnClickCreateNewDocument(): () => Promise<void> {
    return async () => {
      console.log('Click');
      const dialog = new DocumentCreationDialog({
        apmDataProxy: this.apmDataProxy,
        successWaitTime: 1000
      });

      const newDocId = await dialog.createDocument();
      if (newDocId !== false) {
        console.log(`New doc id is ${Tid.toBase36String(newDocId)} (${newDocId})`);
        document.location.href = urlGen.siteDocPage(Tid.toBase36String(newDocId));
      }
    };
  }

  async genContentHtml(): Promise<string> {
    let adminDiv = '';
    if (this.canManageDocuments) {
      adminDiv = `<div class='doc-admin'><h3>${tr('Admin')}</h3>
       <ul>
       <li><button class="btn btn-primary btn-sm create-document-btn">Create New Document</button></li>
       </ul>
      </div>`;
    }

    return `<h1>${tr('Documents')}</h1>
            <div class="data-status">${ApmPage.genLoadingMessageHtml()}</div>
            <div class="docs-table-div hidden">${await this.getDocumentsTableSkeleton()}</div>
            ${adminDiv}`;
  }

  async makeDataForDataTables(): Promise<DataTableEntry[]> {
    const data: DataTableEntry[] = [];
    for (const doc of this.docs) {
      const transcribersHtmlArray: string[] = [];
      for (const transcriberTid of doc.transcribers) {
        const transcriberData = await this.apmDataProxy.getPersonEssentialData(transcriberTid);
        transcribersHtmlArray.push(
            `<a href="${urlGen.sitePerson(Tid.toBase36String(transcriberTid))}" title="Click to view person details">${transcriberData.name}</a>`
        );
      }
      data.push({
        title: `<a href="${urlGen.siteDocPage(Tid.toBase36String(doc.docInfo.id))}">${doc.docInfo.title}</a>`,
        type: await this.apmDataProxy.getEntityName(doc.docInfo.doc_type),
        lang: await this.apmDataProxy.getEntityName(doc.docInfo.lang),
        numPages: doc.numPages,
        numTranscribedPages: doc.numTranscribedPages,
        transcribers: transcribersHtmlArray.join(', ')
      });
    }
    return data;
  }

  async getDocumentsTableSkeleton(): Promise<string> {
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

(window as any).DocumentsPage = DocumentsPage;