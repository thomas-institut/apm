import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { ApmDataProxy } from './ApmDataProxy'
import { ApmPage } from '../ApmPage'
import { wait } from '../../toolbox/FunctionUtil.mjs'
import { GetDataAndProcessDialog } from './GetDataAndProcessDialog'

export class PersonCreationDialog {
  constructor (options) {
    let oc = new OptionsChecker({
      context: 'CreatePersonDialog2',
      optionsDefinition: {
        successWaitTime: { type: 'number', default: 500},
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy},
        debug: { type: 'boolean', default: true},
      }
    })

    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
  }

  createPerson() {
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
      getDataFromForm: async (dialogSelector) => {
        let inputName = $(`${dialogSelector} input.name-input`);
        let inputSortName = $(`${dialogSelector} input.sort-name-input`);
        return { name: inputName.val().trim(), sortName: inputSortName.val().trim() };
      },
      validateData: async (data) => {
        let name = data['name'];
        let sortName = data['sortName'];

        if (name !== '' && sortName !== '') {
          return true;
        }
        return `<span class="text-danger">Neither name nor sort name should be empty</span>`
      },
      processData: (data, infoArea) => {
        return new Promise((resolve) => {
          let name = data['name'];
          let sortName = data['sortName'];
          infoArea.html(`<span class="text-info">${ApmPage.genLoadingMessageHtml(tr('Creating new person'))}</span>`)
          this.options.apmDataProxy.createPerson(name, sortName).then( (resp) => {
            infoArea.html(tr('Person successfully created'));
            wait(this.options.successWaitTime).then( () => {
              resolve({ success: true, result: resp.tid})
            })
          }).catch( (resp) => {
            this.debug && console.log('Response', resp);
            let status = resp.status ?? -1;
            let errorMessage = resp.responseJSON.errorMsg ?? tr("Unknown error");
            infoArea.html(`<span class="text-danger">${tr('The server found an error')}: <b>(${status}) ${errorMessage}</b></span>`);
            resolve({ success: false});
          })
        })
      }
    })
    return this.dialog.process();
  }
}