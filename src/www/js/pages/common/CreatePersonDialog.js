import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { ApmDataProxy } from './ApmDataProxy'
import { ApmPage } from '../ApmPage'
import { wait } from '../../toolbox/FunctionUtil.mjs'

export class CreatePersonDialog {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'CreatePersonDialog',
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
    return new Promise((resolve) => {
      this.dialog = new ConfirmDialog({
        title: tr('Create Person') ,
        size: LARGE_DIALOG,
        acceptButtonLabel: tr('Create Person'),
        cancelButtonLabel: tr('Cancel'),
        body: this.getEditUserProfileFormHtml(),
        hideOnAccept: false,
        cancelFunction: () => {
          this.debug && console.log(`Create person cancelled`)
          resolve(false);
        }
      });

      let ds = this.dialog.getSelector();
      this.debug && console.log(`Dialog selector: ${this.dialog.getSelector()}`);

      this.inputName = $(`${ds} input.name-input`);
      this.inputSortName = $(`${ds} input.sort-name-input`);
      this.infoDiv = $(`${ds} div.info-div`);
      this.dialog.hideAcceptButton();
      this.inputName.on('keyup', this.genOnInputChange());
      this.inputSortName.on('keyup', this.genOnInputChange());
      this.dialog.setAcceptFunction(this.genOnAccept(resolve));
      this.dialog.show();
    })
  }

  genOnAccept(resolve) {
    return () => {
      if (this.validateInput()) {
        let name = this.inputName.val().trim();
        let sortName = this.inputSortName.val().trim();
        this.dialog.hideAcceptButton();
        this.dialog.hideCancelButton();
        let loadingMessage = tr('Creating new person');
        this.infoDiv.html(ApmPage.genLoadingMessageHtml(loadingMessage)).removeClass('text-danger');
        this.options.apmDataProxy.createPerson(name, sortName).then( (resp) => {
          this.infoDiv.html(tr('Person successfully created'));
          wait(this.options.successWaitTime).then( () => {
            this.dialog.hide();
            this.dialog.destroy();
            resolve(resp.tid)
          })
        }).catch( (resp) => {
          let status = resp.status ?? -1;
          let errorMessage = resp.responseJSON.errorMsg ?? tr("Unknown error");
          this.infoDiv.html(`${tr('The server found an error')}: <b>(${status}) ${errorMessage}</b>`)
            .addClass('text-danger');
          this.dialog.showAcceptButton();
          this.dialog.showCancelButton();
        })
      }
    }
  }

  genOnInputChange() {
    return () => {
     if (this.validateInput()) {
        this.dialog.showAcceptButton();
      } else {
        this.dialog.hideAcceptButton();
      }
    }
  }

  validateInput() {
    let errors = [];
    let name = this.inputName.val().trim();
    let sortName = this.inputSortName.val().trim();
    let changes = false;

    if (name !== '') {
      // changes in name
      changes = true;
    }
    if (sortName !== '') {
      // changes in sortName
      changes = true;
    }

    if (changes) {
      this.infoDiv.html(errors.map( (e) => {
        return `<p>${e}.</p>`;
      }).join('')).addClass('text-danger');
    } else {
      this.infoDiv.html('');
    }

    return changes && errors.length === 0;
  }

  isUserNameValid(userName) {
    return userName.length > 4 && /^[A-Za-z]+$/.test(userName)
  }
  getEditUserProfileFormHtml() {
    return `<div class="new-user-edit-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-user-item">${tr('Name')}</div>
        <div class="new-user-input-div"><input type="text" size="50" class="name-input"></div>
        <div class="new-user-item">${tr('Sort Name')}</div>
        <div class="new-user-input-div"><input type="text" size="50" class="sort-name-input"></div>
    </div>
    <div class="info-div"></div>`;
  }
}