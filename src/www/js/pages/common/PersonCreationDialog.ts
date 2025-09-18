import { OptionsChecker } from '@thomas-inst/optionschecker'
import { tr } from './SiteLang'
import { ApmApiClient } from '../../Api/ApmApiClient'
import { ApmPage } from '../ApmPage'
import { wait } from '@/toolbox/wait'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'
import {getStringVal} from "@/toolbox/UiToolBox";


interface PersonCreationDialogOptions {
  successWaitTime: number;
  apmDataProxy: ApmApiClient;
  debug?: boolean;
}

export class PersonCreationDialog {
  private options: PersonCreationDialogOptions;
  private readonly debug: boolean;
  private dialog!: GetDataAndProcessDialog;
  constructor (options:PersonCreationDialogOptions) {
    let oc = new OptionsChecker({
      context: 'PersonCreationDialog',
      optionsDefinition: {
        successWaitTime: { type: 'number', default: 500},
        apmDataProxy: { type: 'object', objectClass: ApmApiClient},
        debug: { type: 'boolean', default: true},
      }
    })

    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug ?? false;
  }

  createPerson():Promise<any> {
    this.dialog = new GetDataAndProcessDialog({
      title: tr('Create Person'),
      processButtonLabel: tr('Create Person'),
      getBodyHtml: () => {
        return `<div class="new-user-edit-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-user-item">${tr('Name')}</div>
        <div class="new-user-input-div"><input type="text" size="50" class="name-input"></div>
        <div class="new-user-item">${tr('Sort Name')}</div>
        <div class="new-user-input-div"><input type="text" size="50" class="sort-name-input"></div>
    </div>`;
      },
      initialData: { name: '', sortName: ''},
      getDataFromForm: async (dialogSelector:string) => {
        let inputName = $(`${dialogSelector} input.name-input`);
        let inputSortName = $(`${dialogSelector} input.sort-name-input`);
        return { name: getStringVal(inputName).trim(), sortName: getStringVal(inputSortName).trim() };
      },
      validateData: async (data: any) => {
        let name = data['name'];
        let sortName = data['sortName'];

        if (name !== '' && sortName !== '') {
          return true;
        }
        return `<span class="text-danger">Neither name nor sort name should be empty</span>`
      },
      processData: (data:any, infoArea:any) => {
        return new Promise((resolve) => {
          let name = data['name'];
          let sortName = data['sortName'];
          console.log(`Data from form`, data);
          infoArea.html(`<span class="text-info">${ApmPage.genLoadingMessageHtml(tr('Creating new person'))}</span>`)
          this.options.apmDataProxy.personCreate(name, sortName).then( (resp:any) => {
            infoArea.html(ApmPage.genLoadingMessageHtml(tr('Person successfully created, reloading page')));
            wait(this.options.successWaitTime).then( () => {
              resolve({ success: true, result: resp.tid})
            })
          }).catch( (resp:any) => {
            this.debug && console.log('Response', resp);
            let status = resp.status ?? resp.httpStatus ?? -1;
            let errorMessage = resp.responseJSON?.errorMsg ?? tr("Unknown error");
            infoArea.html(`<span class="text-danger">${tr('The server found an error')}: <b>(${status}) ${errorMessage}</b></span>`);
            resolve({ success: false});
          })
        })
      }
    })
    return this.dialog.process();
  }
}