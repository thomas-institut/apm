import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import { ApmDataProxy } from './ApmDataProxy'
import { ApmPage } from '../ApmPage'
import { wait } from '../../toolbox/FunctionUtil.mjs'

export class UserProfileEditorDialog {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'UserProfileEditor',
      optionsDefinition: {
        personData: { type: 'object'},
        userData: { type: 'object'},
        canManageUsers: { type: 'boolean'},
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
        title: `${tr('Edit User Profile')}: ${this.options.personData['name']}` ,
        size: LARGE_DIALOG,
        acceptButtonLabel: tr('Save Changes'),
        cancelButtonLabel: tr('Cancel'),
        body: this.getEditUserProfileFormHtml(),
        hideOnAccept: false,
        cancelFunction: () => {
          this.debug && console.log(`User Profile Edit cancelled`)
          resolve(false);
        }
      });

      let ds = this.dialog.getSelector();
      this.debug && console.log(`Dialog selector: ${this.dialog.getSelector()}`);

      this.currentEmail = this.options.userData['emailAddress'];
      this.inputEmailAddress = $(`${ds} input.email-input`);
      this.inputPassword1 = $(`${ds} input.password-input-1`);
      this.inputPassword2 = $(`${ds} input.password-input-2`);
      this.infoDiv = $(`${ds} div.info-div`);
      this.inputEmailAddress.val(this.currentEmail);
      this.dialog.hideAcceptButton();
      this.inputEmailAddress.on('keyup', this.genOnInputChange());
      this.inputPassword1.on('keyup', this.genOnInputChange());
      this.inputPassword2.on('keyup', this.genOnInputChange());

      this.dialog.setAcceptFunction(this.genOnAccept(resolve));

      this.dialog.show();
    })
  }

  genOnAccept(resolve) {
    return () => {
      if (this.validateInput()) {
        let id = this.options.personData.id;
        let email = this.inputEmailAddress.val().trim();
        let password1 = this.inputPassword1.val().trim();
        let password2 = this.inputPassword2.val().trim();
        this.dialog.hideAcceptButton();
        this.dialog.hideCancelButton();
        let loadingMessage = tr('Saving profile');
        this.infoDiv.html(ApmPage.genLoadingMessageHtml(loadingMessage)).removeClass('text-danger');
        this.options.apmDataProxy.updateUserProfile(id, email, password1, password2).then( () => {
          this.infoDiv.html(tr('Profile successfully updated'));
          wait(this.options.successWaitTime).then( () => {
            this.dialog.hide();
            this.dialog.destroy();
            resolve(true)
          })
        }).catch( (resp) => {
          let status = resp.status ?? -1;
          let errorMessage = resp.responseJSON.errorMsg ?? "Unknown error";
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
    let newEmail = this.inputEmailAddress.val().trim();
    let pass1 = this.inputPassword1.val().trim();
    let pass2 = this.inputPassword2.val().trim();
    let changes = false;

    if (newEmail !== this.currentEmail) {
      // changes in email
      changes = true;
      if(!this.isEmailValid(newEmail)) {
        errors.push(tr(`Invalid email`));
      }
    }
    if (pass1 !== '') {
      changes = true;
      if (pass1.length < 8) {
        errors.push(tr(`New password is too short`));
      } else {
        if (pass1 !== pass2) {
          errors.push(tr(`Passwords do not match`));
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

  isUserNameValid(userName) {
    return userName.length > 4 && /^[A-Za-z]+$/.test(userName)
  }

  isEmailValid(email) {
    if (email.length < 5 || email.indexOf('@') === -1 || email[0] === '@' || email[email.length-1] === '@') {
      return false;
    }
    let [,domain] = email.split('@');

    return domain.indexOf('.') !== -1 && domain[0] !== '.' && domain[domain.length-1] !== '.';
  }

  getEditUserProfileFormHtml() {

    let userNameHtml = this.options.userData['userName'];
    return `<div class="user-profile-edit-form" style="display: grid; grid-template-columns: 25% auto">
        <div class="user-profile-item">${tr('Username')}</div>
        <div class="user-profile-input-div">${userNameHtml}</div>
        <div class="user-profile-item">${tr('User Email Address')}</div>
        <div class="user-profile-input-div"><input type="text" size="40" class="email-input"></div>
        <div class="user-profile-item">${tr('New Password')}</div>
        <div class="user-profile-input-div"><input type="password" size="20" class="password-input-1"></div>
        <div class="user-profile-item">${tr('Confirm New Password')}</div>
        <div class="user-profile-input-div"><input type="password" size="20" class="password-input-2"></div>
    </div>
    <div class="info-div"></div>
`;
  }
}