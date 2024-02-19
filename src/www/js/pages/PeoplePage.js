import { NormalPage } from './NormalPage'
import { Tid } from '../Tid/Tid'
import { urlGen } from './common/SiteUrlGen'
import { tr } from './common/SiteLang'
import { ApmPage } from './ApmPage'
import { CreatePersonDialog } from './common/CreatePersonDialog'

export class PeoplePage extends NormalPage {

    constructor(options) {
        super(options);
        console.log(`People Page`);
        // console.log(options);
        this.data = null;
        this.initPage().then( () => {
            console.log(`People page initialized`);
        })
    }

    async genContentHtml() {
        return `<h1>${tr('People')}</h1>
        <div class="people-page-content">${ApmPage.genLoadingMessageHtml()}</div>`;
    }

    async initPage() {
        await super.initPage();
        console.log(`Initializing PeoplePage`)
        this.dataFromServer = await this.apmDataProxy.getAllPersonEssentialData();
        this.peoplePageContentDiv = $('div.people-page-content');
        this.peoplePageContentDiv.html( `
            <div class="table-div">${await this.getPersonTableHtml()}</div>
            <div class="post-table-div">
            <button class="btn btn-primary btn-sm create-new-person-btn">Create New Person</button>
            </div>`
        );
        this.dataTablesData = this.makeDataForDataTables();
        $('table.person-table').DataTable({
            data: this.dataTablesData,
            columns: [
              { data: 'name', render: { _: 'display', sort: 'sort'}},
              { data: 'sortName'},
              { data: 'tid'},
              { data: 'other'}
            ],
            language: this.getDataTablesLanguageOption()
        });
        $('.create-new-person-btn').on('click', this.genOnClickCreateNewPersonButton())

    }

    genOnClickCreateNewPersonButton() {
      return () => {
        (new CreatePersonDialog({
          apmDataProxy: this.apmDataProxy
        })).show().then((newPersonTid) => {
          if (newPersonTid !== -1) {
            console.log("New person tid is " + Tid.toBase36String(newPersonTid));
            this.initPage().then(() => {
              console.log(`Data reloaded`)
            })
          }
        })
       }
    }

    makeDataForDataTables() {
        return this.dataFromServer.map( (person) => {
          let personWebId = Tid.toBase36String(person.tid);
          return {
            name: {
              display: `<a href="${urlGen.sitePerson(personWebId)}" title="${tr("Click to see person details")}">${person.name}</a>`,
              sort: person['sortName']
            },
            sortName: person['sortName'],
            tid: Tid.toBase36String(person.tid),
            other: person.isUser ? tr('User') : ''
        };
        })
    }

    async getPersonTableHtml() {
        return `<table class="person-table">
                <thead><tr>
                      <th>${tr('Name')}</th>
                      <th>${tr('Sort Name')}</th>
                      <th>${tr('Entity ID')}</th>
                      <th></th></tr>
                </thead>
      </table>`;
    }

}


window.PeoplePage = PeoplePage