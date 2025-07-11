
import { NormalPage } from './NormalPage'
import { Tid } from '../Tid/Tid'
import { urlGen } from './common/SiteUrlGen'
import { tr } from './common/SiteLang'
import { ApmPage } from './ApmPage'
import { PersonCreationDialog } from './common/PersonCreationDialog'
import DataTable from 'datatables.net-dt'

interface PersonData {
    tid: number
    name: string
    sortName: string
    dateOfBirth: string | null
    dateOfDeath: string | null
    isUser: boolean
    mergedInto: number | null
}

interface DataTableRow {
    name: {
        display: string
        sort: string
    }
    sortName: string
    tid: string
    other: string
    dateOfBirth: string
    dateOfDeath: string
}

export class PeoplePage extends NormalPage {
    private dataFromServer: PersonData[]
    private peoplePageContentDiv: JQuery
    private dataTablesData: DataTableRow[]

    constructor(options: any) {
        super(options)
        console.log(`People Page`)
        this.dataFromServer = []
        this.peoplePageContentDiv = $()
        this.dataTablesData = []
        this.initPage().then(() => {
            console.log(`People page initialized`)
        })
    }

    async genContentHtml(): Promise<string> {
        return `<h1>${tr('People')}</h1>
        <div class="people-page-content">${ApmPage.genLoadingMessageHtml()}</div>`
    }

    async initPage(): Promise<void> {
        await super.initPage()
        console.log(`Initializing PeoplePage`)
        this.dataFromServer = await this.apmDataProxy.getAllPersonEssentialData()
        this.peoplePageContentDiv = $('div.people-page-content')
        this.peoplePageContentDiv.html(`
            <div class="table-div">${await this.getPersonTableHtml()}</div>
            <div class="post-table-div">
            <button class="btn btn-primary btn-sm create-new-person-btn">Create New Person</button>
            </div>`
        )
        this.dataTablesData = this.makeDataForDataTables()
        new DataTable('table.person-table', {
            data: this.dataTablesData,
            columns: [
                { data: 'name', render: { _: 'display', sort: 'sort' } },
                { data: 'sortName' },
                { data: 'dateOfBirth', type: 'date' },
                { data: 'dateOfDeath', type: 'date' },
                { data: 'tid' },
                { data: 'other' }
            ],
            language: this.getDataTablesLanguageOption()
        })
        $('.create-new-person-btn').on('click', this.genOnClickCreateNewPersonButton())
    }

    genOnClickCreateNewPersonButton(): () => Promise<void> {
        return async () => {
            const dialog = new PersonCreationDialog({
                apmDataProxy: this.apmDataProxy,
                successWaitTime: 1000,
            })

            const newPersonTid = await dialog.createPerson()
            if (newPersonTid !== false) {
                console.log("New person tid is " + Tid.toBase36String(newPersonTid))
                this.initPage().then(() => {
                    console.log(`Data reloaded`)
                })
            }
        }
    }

    makeDataForDataTables(): DataTableRow[] {
        return this.dataFromServer
            .filter((person) => person.mergedInto === null)
            .map((person) => {
                const personWebId = Tid.toBase36String(person.tid)
                return {
                    name: {
                        display: `<a href="${urlGen.sitePerson(personWebId)}" title="${tr("Click to see person details")}">${person.name}</a>`,
                        sort: person.sortName
                    },
                    sortName: person.sortName,
                    tid: Tid.toBase36String(person.tid),
                    other: person.isUser ? tr('User') : '',
                    dateOfBirth: person.dateOfBirth ?? '',
                    dateOfDeath: person.dateOfDeath ?? ''
                }
            })
    }

    async getPersonTableHtml(): Promise<string> {
        return `<table class="person-table">
                <thead><tr>
                      <th>${tr('Name')}</th>
                      <th>${tr('Sort Name')}</th>
                      <th>${tr('Date of Birth')}</th>
                      <th>${tr('Date of Death')}</th>
                      <th>${tr('Entity ID')}</th>
                      <th></th></tr>
                </thead>
      </table>`
    }
}

(window as any).PeoplePage = PeoplePage