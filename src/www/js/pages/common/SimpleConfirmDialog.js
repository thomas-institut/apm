import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, MEDIUM_DIALOG } from './ConfirmDialog'

export class SimpleConfirmDialog {

  constructor (options) {
    let oc = new OptionsChecker({
      context: 'SimpleConfirmDialog',
      optionsDefinition: {
        confirmButtonLabel: { type: 'string', default: 'Confirm'},
        cancelButtonLabel: { type: 'string', default: 'Cancel'},
        title: { type: 'string', default: 'Please confirm'},
        body: { type: 'string', default: 'Please confirm.'},
        debug: { type: 'boolean', default: false },
      }
    })
    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;

  }

  static getUserConfirmation(msg, confirmLabel = 'Confirm', cancelLabel = 'Cancel', title = "Please confirm") {
    return (new SimpleConfirmDialog({
      confirmButtonLabel: confirmLabel,
      cancelButtonLabel: cancelLabel,
      title: title,
      body: msg,
    })).userConfirmsAction();
  }

  /**
   * Returns a promise to a boolean. If true, the user has click the
   * confirm button in the shown dialog.
   *
   * @return {Promise<boolean>}
   */
  userConfirmsAction() {
    return new Promise((resolve) => {
      let confirmDialog = new ConfirmDialog({
        body:  this.options.body,
        acceptButtonLabel:  this.options.confirmButtonLabel,
        cancelButtonLabel: this.options.cancelButtonLabel,
        size: MEDIUM_DIALOG,
        title: this.options.title,
        hideOnAccept: true,
        reuseDialog: false,
        acceptFunction: () => {
          resolve(true);
        },
        cancelFunction: () => {
          resolve(false);
        }
      })
      confirmDialog.show()
    })
  }

}