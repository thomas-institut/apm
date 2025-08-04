import { NormalPage } from './NormalPage'
import { tr } from './common/SiteLang'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { Tid } from '../Tid/Tid'
import { urlGen } from './common/SiteUrlGen'
import { ApmPage } from './ApmPage'
import { DocumentCreationDialog } from './common/DocumentCreationDialog'

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
      $('div.docs-table-div').removeClass('hidden');

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
          { data: 'institution'},
          { data: 'numPages', searchable: false},
          { data: 'numTranscribedPages', searchable: false},
          { data: 'transcribers'},
          { data: 'locationAliases', visible: false},
        ],
        language: this.getDataTablesLanguageOption()
      });
      $('div.data-status').addClass('hidden');
      console.log('Documents Page initialized');
    })
  }

  async initPage() {
    await super.initPage();
    $(".create-document-btn").on('click', this.genOnClickCreateNewDocument());
  }

  genOnClickCreateNewDocument() {
      return async () => {
        console.log(`Click`)
        let dialog = new DocumentCreationDialog({
          apmDataProxy: this.apmDataProxy,
          successWaitTime: 1000,
        });

        let newDocId = await dialog.createDocument();
        if (newDocId !== false) {
          console.log(`New doc id is ${Tid.toBase36String(newDocId)} (${newDocId})`);
          document.location = urlGen.siteDocPage(Tid.toBase36String(newDocId));
        }
      }
  }

  async genContentHtml () {
    let adminDiv = '';
    if (this.canManageDocuments) {
      adminDiv = `<div class='doc-admin'><h3>${tr('Admin')}</h3>
       <ul>
       <li><button class="btn btn-primary btn-sm create-document-btn">Create New Document</button></li>
</ul>

`
    }

    return `<h1>${tr('Documents')}</h1>
            <div class="data-status">${ApmPage.genLoadingMessageHtml()}</div>
            <div class="docs-table-div hidden">${await this.getDocumentsTableSkeleton()}</div>
            ${adminDiv}`;
  }

  async makeDataForDataTables() {
    let data = [];
    for (let i = 0; i  < this.docs.length; i++) {
      let doc = this.docs[i];
      let transcribersHtmlArray = [];
      for (let tIndex = 0; tIndex < doc['transcribers'].length; tIndex++) {
        let transcriberTid = parseInt(doc['transcribers'][tIndex]);
        let transcriberData = await this.apmDataProxy.getPersonEssentialData(transcriberTid);
        transcribersHtmlArray.push(`<a href="${urlGen.sitePerson(Tid.toBase36String(transcriberTid))}" title="Click to view person details">${transcriberData.name}</a>`)
      }

      let locationData = await this.getLocationData(doc['docInfo']['tid']);
      
      data.push({
        title: `<a href="${urlGen.siteDocPage(Tid.toBase36String(doc['docInfo']['id']))}">${doc['docInfo']['title']}</a>`,
        type:  await this.apmDataProxy.getEntityName(doc['docInfo']['doc_type']),
        lang: await this.apmDataProxy.getEntityName(doc['docInfo']['lang']),
        numPages: doc['numPages'],
        numTranscribedPages: doc['numTranscribedPages'],
        transcribers: transcribersHtmlArray.join(', '),
        institution: locationData['institution'],
        locationAliases: locationData['aliases'],
      })
    }
    return data;
  }

  async getLocationData(tid) {

    let institution = ''
    let locationAliases = ''
    let entityData = await this.apmDataProxy.getEntityData(tid)

    for (let statement of entityData.statements) { // iterate over all statements of the document entity

      if (statement.predicate === 7608) { // this checks for the storedAt relation to get its object, the institution 
        let instTid = statement.object
        institution = await this.apmDataProxy.getEntityName(instTid)
        let instEntityData = await this.apmDataProxy.getEntityData(instTid)

        for (let instStatement of instEntityData.statements) { // iterate over all statements of the institution entity

          if (instStatement.predicate === 8006) { // this checks for the locatedIn relation to get its object, the city
            let cityTid = instStatement.object
            institution = institution + ', ' + await this.apmDataProxy.getEntityName(cityTid)
            let cityEntityData = await this.apmDataProxy.getEntityData(cityTid)

            for (let cityStatement of cityEntityData.statements) { // get all alternate names of the city
              if (cityStatement.predicate === 2007) { 
                locationAliases = locationAliases + " - " + cityStatement.object
              }
            }

            for (let cityStatement of cityEntityData.statements) { // iterate over all statements of the city entity

              if (cityStatement.predicate === 8006) { // this checks for the locatedIn relation to get its object, the country
                let countryTid = cityStatement.object
                institution = institution + ', ' + await this.apmDataProxy.getEntityName(countryTid)
                let countryEntityData = await this.apmDataProxy.getEntityData(countryTid)

                for (let countryStatement of countryEntityData.statements) { // get all alternate names of the country
                  if (countryStatement.predicate === 2007) { 
                    locationAliases = locationAliases + " - " + countryStatement.object
                  }
                }
                
                break;
              }
            }
            
            break;
          }
        }
        
        break;
      }
    }

    return {institution: institution, aliases: locationAliases}
  }


  async getDocumentsTableSkeleton() {
    return `<table class="docs-table">
                <thead><tr>
                      <th>${tr('Title')}</th>
                      <th>${tr('Type')}</th>
                      <th>${tr('Language')}</th>
                      <th>${tr('Institution')}</th>
                      <th>${tr('Pages')}</th>
                      <th>${tr('Pages:Transcribed')}</th>
                      <th>${tr('Transcribers')}</th>
                      </tr>
                </thead>
      </table>`;
  }

}


window.DocumentsPage = DocumentsPage;