import { OptionsChecker } from '@thomas-inst/optionschecker'
import { ConfirmDialog, LARGE_DIALOG } from './ConfirmDialog'
import { tr } from './SiteLang'
import {deepAreEqual} from "@/toolbox/ObjectUtil";

/**
 * A class to show a generic form dialog for clients that need to get some data from the user
 * and only continue normal operations until something is done with the data or the user cancels. For example,
 * a new entity must be created, the client app shows a dialog asking for initial entity data, the user clicks
 * a create button, the entity is created and only then the input dialog is hidden. If there is any problem
 * in the creation, an error message is shown in the dialog and the user is allowed to click on the create button
 * again to retry.
 *
 * All the data entry, confirm, cancel and process mechanism is encapsulated by this class. At construction time, the
 * client provides functions to generate the form's html, to read data from the form, to validate the data and to
 * process the data. The client the just calls this class' _process_ method, which returns a promise that resolves
 * to whatever the client provides when the process went well or false if the user cancelled the operation.
 *
 **/
export class GetDataAndProcessDialog {
  private options: any;
  private readonly debug: boolean = false;
  private dialog!: ConfirmDialog;
  private dialogSelector: string = '';
  private infoArea: JQuery = $();

  /**
   * Constructs a new GetDataAndProcessDialog.
   *
   * Options:
   *
   *  * size: the dialog's size, using ConfirmDialog constants, default LARGE_DIALOG
   *  * title: the dialog's title
   *  * getBodyHtml: function that returns a promise to a string with the dialog's body, which
   *     should normally include a form of some sort
   *  * confirmButtonLabel: text to show in the confirm button, default 'Process'
   *  * cancelButtonLabel: text to show in the cancel button, default 'Cancel'
   *  * getDataFromForm: a function that returns a promise to an object with the form's data. This class
   *    does not do anything with this data except to pass it to other client provided functions
   *  * initialData: object with the form's initial data.
   *  * validateData: a function that takes a data object and returns a promise to a boolean that will be true
   *    if the given data is valid and false otherwise.
   *  * processData: a function that takes a data object and the JQuery element to the dialog's info area and
   *    returns a promise to an object of the form:  _{ success: <boolean>, result: <any>}_. This function is
   *    responsible for updating the info area to inform the user of the status of the data processing, including
   *    any possible error message.
   * * debug: if true, the class will print debug messages in the JS console.
   * @param options
   */
  constructor (options: any) {
    let oc = new OptionsChecker({
      context: 'FormConfirm Dialog',
      optionsDefinition: {
        size: { type: 'string', default: LARGE_DIALOG},
        title: { type: 'string', default: 'Please confirm'},
        loadingBodyHtml: { type: 'string', default: 'Loading...'},
        getBodyHtml: { type: 'function', default: async () => {return `` } },
        processButtonLabel: { type: 'string', default: 'Process' },
        cancelButtonLabel: { type: 'string', default: 'Cancel' },
        initialData: { type: 'object', default: {}},
        validateData: { type: 'function', default: async (data: any) => { return true } },
        getDataFromForm: { type: 'function', default: async (dialogSelector: string) => { return {} }},
        processData: { type: 'function', default: async (data: any, infoArea: any) => { return { success: false} }},
        debug: { type: 'boolean', default: false},
      }
    });

    this.options = oc.getCleanOptions(options);
    this.debug = this.options.debug;
  }

  /**
   * Shows the dialog and returns a promise that resolves to false
   * if the user clicked the cancel button or to an object with the
   * form's return data if the user clicked the confirm button and the data
   * process did not have any problem.
   *
   * When the promise is fulfilled, the dialog will be hidden.
   *
   * @return {Promise<boolean|object>}
   */
  process() {
    return new Promise(async (resolve) => {
      this.dialog = new ConfirmDialog({
        title: this.options.title ,
        size: this.options.size,
        acceptButtonLabel: this.options.processButtonLabel,
        cancelButtonLabel: this.options.cancelButtonLabel,
        body: this.options.loadingBodyHtml,
        hideOnAccept: false,
        debug: this.options.debug,
        cancelFunction: () => {
          this.hide();
          resolve(false);
        }
      });
      this.dialog.hideAcceptButton();
      this.dialog.setBody(await this.getBodyHtml());
      this.dialogSelector = this.dialog.getSelector();
      this.debug && console.log(`Dialog selector: ${this.dialogSelector}`);
      this.infoArea = $(`${this.dialogSelector} .info-area`);
      $(`${this.dialogSelector} .dialog-body :input`).on('change', this.genOnInputChange())
        .on('keyup', this.genOnInputChange());
      this.dialog.setAcceptFunction( async () => {
        let data = await this.options.getDataFromForm(this.dialogSelector);
        if (deepAreEqual(data, this.options.initialData)) {
          this.dialog.hideAcceptButton();
          this.infoArea.html('');
          return;
        }
        let validationResult = await this.options.validateData(data);
        if (validationResult === true) {
          this.dialog.hideAcceptButton();
          let processResult = await this.options.processData(data, this.infoArea);
          if (processResult['success'] === true) {
            this.hide();
            resolve(processResult['result'] ?? true);
          }
        } else if (validationResult === false) {
          this.infoArea.html(this.getErrorHtml(tr('Input data is not valid')));
        } else {
          this.infoArea.html(validationResult.toString());
        }
      });
      this.dialog.show();
    })
  }

  /**
   *
   * @return {(function(): Promise<void>)|*}
   * @private
   */
  genOnInputChange(): (() => Promise<void>) {
    return async (): Promise<void> => {
      let data = await this.options.getDataFromForm(this.dialogSelector);
      if (deepAreEqual(data, this.options.initialData)) {
        this.infoArea.html('');
        return;
      }
      let validationResult = await this.options.validateData(data);
      if (validationResult === true) {
        this.infoArea.html('');
        this.dialog.showAcceptButton();
      } else {
        this.dialog.hideAcceptButton();
        if (validationResult === false) {
          this.infoArea.html(this.getErrorHtml(tr('Input data is not valid')));
        } else {
          this.infoArea.html(validationResult.toString());
        }
      }
    }
  }

  /**
   * Hides the dialog and destroys all of its resources in the web page.
   *
   * Normally this is only called internally.
   */
  hide() {
    this.dialog.hide();
    this.dialog.destroy();
  }

  /**
   *
   * @return {Promise<string>}
   * @private
   */
  async getBodyHtml(): Promise<string> {
    return `<div class="dialog-body">${await this.options.getBodyHtml()}</div>
        <div class="info-area"></div>
`
  }

  /**
   *
   * @param {string}msg
   * @return {string}
   * @private
   */
  getErrorHtml(msg: string): string {
    return `<span class="text-danger">${msg}</span>`
  }
}