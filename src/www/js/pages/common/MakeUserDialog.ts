import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { ApmDataProxy } from './ApmDataProxy'
import { ApmPage } from '../ApmPage'
import { wait } from '../../toolbox/FunctionUtil'
import {getStringVal} from "../../toolbox/UiToolBox";

export class MakeUserDialog {

  private options: any;
  private readonly debug: boolean;
  private dialog!: ConfirmDialog;
  private currentUserName: string = '';
  private inputUserName!: JQuery<HTMLElement>;
  private infoDiv!: JQuery<HTMLElement>;

  constructor (options:any) {
    let oc = new OptionsChecker({
      context: 'MakeUserDialog',
      optionsDefinition: {
        personData: { type: 'object'},
        successWaitTime: { type: 'number', default: 500},
        apmDataProxy: { type: 'object', objectClass: ApmDataProxy},
        debug: { type: 'boolean', default: true},
      }
    })

    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
  }

  show() {
    return new Promise((resolve) => {
      this.dialog = new ConfirmDialog({
        title: `${tr('Make User')}: ${this.options.personData['name']}` ,
        size: LARGE_DIALOG,
        acceptButtonLabel: tr('Make User'),
        cancelButtonLabel: tr('Cancel'),
        body: this.getEditUserProfileFormHtml(),
        hideOnAccept: false,
        cancelFunction: () => {
          this.debug && console.log(`Make User cancelled`)
          resolve(-1);
        }
      });

      let ds = this.dialog.getSelector();
      this.debug && console.log(`Dialog selector: ${this.dialog.getSelector()}`);

      this.currentUserName = '';
      this.inputUserName = $(`${ds} input.username-input`);
      this.infoDiv = $(`${ds} div.info-div`);
      this.inputUserName.val(this.currentUserName);
      this.dialog.hideAcceptButton();
      this.inputUserName.on('keyup', this.genOnInputChange());
      this.dialog.setAcceptFunction(this.genOnAccept(resolve));
      this.dialog.show();
    })
  }

  genOnAccept(resolve: any) {
    return () => {
      if (this.validateInput()) {
        let id = this.options.personData.id;
        let username = getStringVal(this.inputUserName).trim();
        this.dialog.hideAcceptButton();
        this.dialog.hideCancelButton();
        let loadingMessage = tr('Making new user');
        this.infoDiv.html(ApmPage.genLoadingMessageHtml(loadingMessage)).removeClass('text-danger');
        this.options.apmDataProxy.createUser(id, username).then( () => {
          this.infoDiv.html(tr('User successfully created'));
          wait(this.options.successWaitTime).then( () => {
            this.dialog.hide();
            this.dialog.destroy();
            resolve(true)
          })
        }).catch( (resp:any) => {
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
    let newUserName = getStringVal(this.inputUserName).trim();
    let changes = false;

    if (newUserName !== this.currentUserName) {
      // changes in username
      changes = true;
      if(!this.isUserNameValid(newUserName)) {
        errors.push(tr(`Invalid username`));
      }
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

  isUserNameValid(userName: string) {
    return userName.length > 4 && /^[A-Za-z]+$/.test(userName)
  }

  getEditUserProfileFormHtml() {
    return `<div class="new-user-edit-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="new-user-item">${tr('Username')}</div>
        <div class="new-user-input-div"><input type="text" size="20" class="username-input"></div>
    </div>
    <div class="info-div"></div>`;
  }
}