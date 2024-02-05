import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG, MEDIUM_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { wait } from '../../toolbox/FunctionUtil.mjs'
import { ApmPage } from '../ApmPage'

export class UserProfileEditor {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'UserProfileEditor',
      optionsDefinition: {
        personData: { type: 'object'},
        userData: { type: 'object'},
        canManageUsers: { type: 'boolean'}
      }
    })

    this.options = oc.getCleanOptions(options);
    this.dialog = new ConfirmDialog({
      title: `${tr('Edit User Profile')}: ${this.options.personData['name']}` ,
      size: LARGE_DIALOG,
      acceptButtonLabel: tr('Save Changes'),
      cancelButtonLabel: tr('Cancel'),
      body: this.getEditUserProfileFormHtml(),
      hideOnAccept: false,
      cancelFunction: () => {
        console.log(`User Profile Edit cancelled`)
      }
    });

    let ds = this.dialog.getSelector();
    console.log(`Dialog selector: ${this.dialog.getSelector()}`);

    this.currentEmail = this.options.userData['emailAddress'];
    this.currentPassword = '';

    this.inputEmailAddress = $(`${ds} input.email-input`);
    this.inputPassword1 = $(`${ds} input.password-input-1`);
    this.inputPassword2 = $(`${ds} input.password-input-2`);
    this.infoDiv = $(`${ds} div.info-div`);
    this.inputEmailAddress.val(this.currentEmail);
    this.dialog.hideAcceptButton();
    this.inputEmailAddress.on('keyup', this.genOnInputChange());
    this.inputPassword1.on('keyup', this.genOnInputChange());
    this.inputPassword2.on('keyup', this.genOnInputChange());

    this.dialog.setAcceptFunction( () => {
      if (this.validateInput()) {
        console.log(`Accepting user edit profile changes`)
        this.dialog.hideCancelButton();
        this.dialog.setAcceptButtonLabel(ApmPage.genLoadingMessageHtml("Saving changes"));
        wait(3000).then( () => {
          this.dialog.hide()
          this.dialog.destroy()
        })
      }
    })
  }

  show() {
    this.dialog.show();
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
    let newEmail = this.inputEmailAddress.val().trim();
    let pass1 = this.inputPassword1.val().trim();
    let pass2 = this.inputPassword2.val().trim();
    let changes = false;
    if (newEmail !== this.currentEmail) {
      // changes in email
      changes = true;
      if(!this.isEmailValid(newEmail)) {
        errors.push(`Invalid email`);
      }
    }
    if (pass1 !== '') {
      changes = true;
      if (pass1.length < 8) {
        errors.push(`New password is too short`);
      } else {
        if (pass1 !== pass2) {
          errors.push(`Passwords do not match`);
        }
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

  isEmailValid(email) {
    if (email.length < 5 || email.indexOf('@') === -1 || email[0] === '@' || email[email.length-1] === '@') {
      return false;
    }
    let [,domain] = email.split('@');

    return domain.indexOf('.') !== -1 && domain[0] !== '.' && domain[domain.length-1] !== '.';
  }

  getEditUserProfileFormHtml() {
    return `<div class="user-profile-item"><b>Username</b>: ${this.options.userData['userName']}  <em>(cannot be changed with web interface)</em></div>
    <div class="user-profile-item"><b>User email address</b>: <input type="text" size="32" class="email-input"></div>
    <div class="user-profile-item"><b>New password</b>: <input type="password" class="password-input-1"></div>
    <div class="user-profile-item"><b>New password (again)</b>: <input type="password" class="password-input-2"></div>
    <div class="info-div"></div>
`;
  }
}